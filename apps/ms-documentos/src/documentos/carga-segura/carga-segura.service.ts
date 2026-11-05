import { createHash, randomUUID } from 'node:crypto';
import { TmpRepository, type TmpConnection } from '../tmp/tmp.repository';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CARGA_SEGURA_STORAGE } from './carga-segura.constants';
import { CargaSeguraCompensation } from './carga-segura.compensation';
import { CargaSeguraError } from './carga-segura.errors';
import { calculateCargaSeguraR2Fingerprint, calculateCargaSeguraFingerprint } from './carga-segura.fingerprint';
import { CargaSeguraPersistence } from './carga-segura.persistence';
import { CargaSeguraRepository } from './carga-segura.repository';
import { PeriodoDocumentalR2Repository } from '../periodo-documental-r2.repository';
import {
  buildCargaSeguraStorageKey,
  type CargaSeguraStorage,
} from './carga-segura.storage';
import type {
  CargaSeguraCommand,
  CargaSeguraOperacionRow,
  CargaSeguraResult,
  ReservaCargaSeguraResult,
} from './carga-segura.types';

@Injectable()
export class CargaSeguraService {
  private readonly logger = new Logger(CargaSeguraService.name);
  constructor(
    private readonly config: ConfigService,
    private readonly repository: CargaSeguraRepository,
    @Inject(CARGA_SEGURA_STORAGE)
    private readonly storage: CargaSeguraStorage,
    private readonly persistence: CargaSeguraPersistence,
    private readonly compensation: CargaSeguraCompensation,
    private readonly periodoR2: PeriodoDocumentalR2Repository,
    private readonly tmpRepository: TmpRepository,
  ) {}

  async ejecutar(command: CargaSeguraCommand): Promise<CargaSeguraResult> {
    this.assertEnabled();

    const normalized = this.normalizeCommand(command);
    const bucket = this.resolveBucket();
    const hashSha256 = this.calculateHash(normalized.archivo);

    const payload = {
      workspaceId: normalized.workspaceId,
      empresaCodigo: normalized.empresaCodigo,
      clienteDestinoId: normalized.clienteDestinoId,
      expedienteId: normalized.expedienteId,
      actorId: normalized.actorId,
      canalIngreso: normalized.canalIngreso,
      tipoDocumental: normalized.tipoDocumental,
      tipoRelacion: normalized.tipoRelacion,
      esPrincipal: normalized.esPrincipal,
      nombreArchivo: normalized.nombreArchivo,
      contentType: normalized.contentType,
      tamanoBytes: normalized.tamanoBytes,
      hashSha256,
    };
    // P3: el cliente nunca puede suministrar evidencia de fase ni identidad interna,
    // incluso a través de canales legacy. Rechazar ANTES de reservar o enviar PUT.
    if (['r2IdentityV2', 'r2RecoveryV1'].some(key =>
      Object.prototype.hasOwnProperty.call(normalized.metadata ?? {}, key))) {
      throw this.invalidRequest('Metadata interna reservada');
    }
    const legacy = calculateCargaSeguraFingerprint(payload);
    const esR2 = this.isR2Almacen(normalized);
    if (esR2) {
      this.positiveInteger(normalized.grupoFacturaId as number, 'grupoFacturaId');
      this.positiveInteger(normalized.documentoBaseId as number, 'documentoBaseId');
      this.positiveInteger(normalized.clienteDestinoId as number, 'clienteDestinoId');
      this.positiveInteger(normalized.expedienteId as number, 'expedienteId');
      const guia = normalized.canalIngreso === 'ALMACEN_LEGACY_UPLOAD_GUIA';
      if (normalized.esPrincipal || normalized.tipoDocumental !== (guia ? 'GUIA_REMISION' : 'NOTA_INGRESO') ||
        normalized.tipoRelacion !== (guia ? 'adjunto_guia' : 'adjunto_nota_ingreso')) {
        throw this.invalidRequest('Contrato de Almacén incompatible');
      }
    }
    const fingerprint = esR2 ? calculateCargaSeguraR2Fingerprint({ ...payload,
      grupoFacturaId: normalized.grupoFacturaId as number,
      documentoBaseId: normalized.documentoBaseId as number }) : legacy;

    const reserva = await this.repository.reservar({
      workspaceId: normalized.workspaceId,
      empresaCodigo: normalized.empresaCodigo,
      clienteDestinoId: normalized.clienteDestinoId,
      expedienteId: normalized.expedienteId,
      actorId: normalized.actorId,
      idempotencyKey: normalized.idempotencyKey,
      payloadFingerprint: fingerprint.fingerprint,
      fingerprintVersion: fingerprint.version,
      ...(esR2 ? { legacyPayloadFingerprint: legacy.fingerprint } : {}),
      requestId: normalized.requestId,
      correlationId: normalized.correlationId ?? normalized.requestId,
      canalIngreso: normalized.canalIngreso,
      nombreArchivo: normalized.nombreArchivo,
      contentType: normalized.contentType,
      tamanoBytes: normalized.tamanoBytes,
      hashSha256,
      metadata: esR2 ? { ...normalized.metadata, r2RecoveryV1: {
        version: 1, phase: 'PRE_PUT', attempt: 1, fencingToken: randomUUID(),
      }, r2IdentityV2: {
        version: 2, workspaceId: normalized.workspaceId, empresaCodigo: normalized.empresaCodigo,
        clienteDestinoId: normalized.clienteDestinoId, expedienteId: normalized.expedienteId,
        actorId: normalized.actorId, grupoFacturaId: normalized.grupoFacturaId,
        documentoBaseId: normalized.documentoBaseId,
      } } : normalized.metadata,
    });

    if (reserva.kind !== 'RESERVED') {
      if (esR2 && reserva.kind !== 'IDEMPOTENCY_CONFLICT') {
        const row = reserva.operacion;
        const scoped = row.workspaceId === normalized.workspaceId && row.empresaCodigo === normalized.empresaCodigo &&
          row.clienteDestinoId === normalized.clienteDestinoId && row.expedienteId === normalized.expedienteId &&
          row.actorId === normalized.actorId && row.canalIngreso === normalized.canalIngreso;
        // Reintento tras un PUT confirmado por metadata, pero sin COMMIT documental.
        // No reenvía PUT ni recupera PRE_PUT: conserva mutex, identidad y CAS terminal.
        const recovery = row.metadata?.r2RecoveryV1 as Record<string, unknown> | undefined;
        const identity = row.metadata?.r2IdentityV2 as Record<string, unknown> | undefined;
        if (scoped && row.estado === 'iniciada' && !row.requiereReconciliacion &&
            row.documentoId == null && row.archivoId == null && recovery?.version === 1 &&
            recovery.phase === 'PUT_STARTED' && identity?.version === 2 &&
            identity.grupoFacturaId === normalized.grupoFacturaId &&
            identity.documentoBaseId === normalized.documentoBaseId &&
            row.hashSha256 === hashSha256 && row.storageBucket === bucket &&
            typeof row.storageKey === 'string' && recovery.storageKey === row.storageKey &&
            recovery.storageBucket === bucket && typeof recovery.fencingToken === 'string' &&
            typeof recovery.attempt === 'number' && Number.isSafeInteger(recovery.attempt) && recovery.attempt > 0) {
          try {
            return await this.tmpRepository.lockedBounded(
              `${normalized.workspaceId}:${normalized.empresaCodigo}:${row.id}`, async connection => {
                const object = await this.storage.statObject({ provider: 'r2', bucket, key: row.storageKey! });
                if (!object.exists || object.hashSha256 !== hashSha256 || object.tamanoBytes !== normalized.tamanoBytes ||
                    !await this.periodoR2.verificarIdentidadGrupo(normalized as any, {
                      grupoFacturaId: normalized.grupoFacturaId!, documentoBaseId: normalized.documentoBaseId!,
                    })) return { kind: 'RECONCILIATION_REQUIRED', operacionId: row.id,
                      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION' };
                const { r2IdentityV2, r2RecoveryV1, ...metadata } = row.metadata!;
                const persisted = await this.persistence.persistirProtegidaR2(connection,
                  { operacion: row, command: { ...normalized, metadata } }, {
                    fencingToken: recovery.fencingToken as string, attempt: recovery.attempt as number,
                    storageBucket: bucket, storageKey: row.storageKey!,
                  });
                return { kind: 'CREATED', ...persisted, hashSha256 };
              });
          } catch {
            return { kind: 'RECONCILIATION_REQUIRED', operacionId: row.id,
              errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION' };
          }
        }
        const proven = scoped && row.estado === 'completada' && this.validId(row.documentoId) &&
          await this.periodoR2.verificarIdentidadGrupo(normalized as any, {
            grupoFacturaId: normalized.grupoFacturaId as number,
            documentoBaseId: normalized.documentoBaseId as number, documentoId: row.documentoId!,
          });
        if (!proven) return { kind: 'RECONCILIATION_REQUIRED', operacionId: row.id,
          errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION' };
      }
      return this.resolveExistingOperation(reserva);
    }

    return this.processReserved(reserva.operacion, normalized, hashSha256, bucket);
  }

  private async processReserved(
    operacion: CargaSeguraOperacionRow,
    command: CargaSeguraCommand,
    hashSha256: string,
    bucket: string,
  ): Promise<CargaSeguraResult> {

    let stored: Awaited<ReturnType<CargaSeguraStorage['putObject']>>;
    let etapa: 'RESOLUCION_R2' | 'STORAGE' = 'RESOLUCION_R2';
    let attemptedKey: string | null = null;
    let enteredProtectedR2 = false;

    try {
      const esCanalGuia =
        command.canalIngreso === 'ALMACEN_LEGACY_UPLOAD_GUIA';

      const esCanalNI =
        command.canalIngreso === 'ALMACEN_LEGACY_UPLOAD_NOTA_INGRESO';

      let fechaDocumental: Date | undefined;

      if (esCanalGuia || esCanalNI) {
        if (!await this.periodoR2.verificarIdentidadGrupo(command as any, {
          grupoFacturaId: command.grupoFacturaId as number,
          documentoBaseId: command.documentoBaseId as number,
        })) throw this.invalidRequest('Identidad del grupo y documento base incompatible');
        const contratoValido = esCanalGuia
          ? command.tipoDocumental === 'GUIA_REMISION' &&
            command.tipoRelacion === 'adjunto_guia'
          : command.tipoDocumental === 'NOTA_INGRESO' &&
            command.tipoRelacion === 'adjunto_nota_ingreso';

        if (!contratoValido) {
          throw new CargaSeguraError(
            'CARGA_SEGURA_SOLICITUD_INVALIDA',
            'El canal de Almacén no coincide con el tipo documental y su relación',
          );
        }

        if (
          !Number.isSafeInteger(command.expedienteId) ||
          !Number.isSafeInteger(command.grupoFacturaId) ||
          Number(command.expedienteId) <= 0 ||
          Number(command.grupoFacturaId) <= 0
        ) {
          throw new CargaSeguraError(
            'CARGA_SEGURA_SOLICITUD_INVALIDA',
            'La carga de Almacén requiere expediente y grupo Factura válidos',
          );
        }

        const periodo = await this.periodoR2.resolver(
          {
            workspaceId: command.workspaceId,
            empresaCodigo: command.empresaCodigo,
            clienteDestinoId: command.clienteDestinoId,
            expedienteId: command.expedienteId as number,
          },
          {
            operacion: esCanalGuia ? 'NUEVA_GUIA' : 'NUEVA_NI',
            grupoFacturaId: command.grupoFacturaId as number,
          },
        );

        fechaDocumental = periodo.fecha;
      }

      const esSustento = ['TRANSFERENCIA', 'PAGO_TRANSFERENCIA', 'DETRACCION', 'PAGO_DETRACCION']
        .includes(command.tipoDocumental) ||
        ['adjunto_transferencia', 'adjunto_detraccion'].includes(command.tipoRelacion ?? '');
      if (esSustento) {
        const contratoValido = !command.esPrincipal && (
          (['TRANSFERENCIA', 'PAGO_TRANSFERENCIA'].includes(command.tipoDocumental) &&
            command.tipoRelacion === 'adjunto_transferencia') ||
          (['DETRACCION', 'PAGO_DETRACCION'].includes(command.tipoDocumental) &&
            command.tipoRelacion === 'adjunto_detraccion'));
        if (!contratoValido) {
          throw new CargaSeguraError('CARGA_SEGURA_SOLICITUD_INVALIDA',
            'El sustento de pago no coincide con su relación documental');
        }
        const periodo = await this.periodoR2.resolverSustento({
          workspaceId: command.workspaceId, empresaCodigo: command.empresaCodigo,
          clienteDestinoId: command.clienteDestinoId, expedienteId: command.expedienteId as number,
        }, { grupoFacturaId: command.grupoFacturaId as number,
          documentoBaseId: command.documentoBaseId as number });
        fechaDocumental = periodo.fecha;
      }

      const storageKey = buildCargaSeguraStorageKey({
        operacionId: operacion.id,
        empresaCodigo: command.empresaCodigo,
        nombreArchivo: command.nombreArchivo,
        ...(fechaDocumental ? { fecha: fechaDocumental } : {}),
      });

      if (this.isR2Almacen(command)) {
        // Only a server-owned P3 reservation may reach the protected PUT path.
        // Missing protocol metadata must fail closed, never fall back to legacy PUT.
        const protocol = operacion.metadata?.r2RecoveryV1 as Record<string, unknown> | undefined;
        if (protocol?.version !== 1) {
          return { kind: 'RECONCILIATION_REQUIRED', operacionId: operacion.id,
            errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION' };
        }
        enteredProtectedR2 = true;
        return await this.processReservedR2(operacion, command, hashSha256, bucket, storageKey);
      }

      etapa = 'STORAGE';
      attemptedKey = storageKey;
      stored = await this.storage.putObject({
        provider: 'r2',
        bucket,
        key: storageKey,
        body: command.archivo,
        contentType: command.contentType,
        hashSha256,
      });
    } catch (error) {
      // P3: never invoke legacy failure transitions on a fenced R2 operation.
      if (this.isR2Almacen(command)) {
        if (!enteredProtectedR2) {
          await this.tryMarkR2PrePutFailure(operacion, command);
          throw error;
        }
        this.logger.warn({ event: 'P3_PROTECTED_PROTOCOL_UNCERTAIN', operacionId: operacion.id });
        return { kind: 'RECONCILIATION_REQUIRED', operacionId: operacion.id,
          errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION' };
      }
      const errorCodigo =
        error instanceof CargaSeguraError
          ? error.code
          : etapa === 'RESOLUCION_R2'
            ? 'CARGA_SEGURA_R2_RESOLUCION_FALLIDA'
            : 'CARGA_SEGURA_STORAGE_FAILED';

      try {
        // An attempted PUT can have succeeded remotely even when its response failed.
        const applied = attemptedKey !== null
          ? await this.repository.marcarRequiereReconciliacion({
              operacionId: operacion.id, storageProvider: 'r2', storageBucket: bucket,
              storageKey: attemptedKey, errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
              errorDetalle: 'STORAGE_OUTCOME_UNCERTAIN',
            })
          : await this.repository.marcarFallida({
              operacionId: operacion.id, errorCodigo, errorDetalle: this.errorMessage(error),
            });
        if (!applied) this.logger.warn({ event: 'CARGA_SEGURA_FAILURE_NOT_RECORDED', operacionId: operacion.id });
      } catch {
        this.logger.warn({ event: 'CARGA_SEGURA_FAILURE_RECORD_ERROR', operacionId: operacion.id });
      }

      throw error;
    }

    if (stored.kind === 'PREEXISTING') {
      await this.markPostStorageReconciliation(
        operacion.id,
        stored,
        'OBJECT_PREEXISTING',
      );

      return {
        kind: 'RECONCILIATION_REQUIRED',
        operacionId: operacion.id,
        errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
      };
    }

    let almacenada: CargaSeguraOperacionRow | null;

    try {
      almacenada = await this.repository.marcarAlmacenada({
        operacionId: operacion.id,
        storageProvider: stored.provider,
        storageBucket: stored.bucket,
        storageKey: stored.key,
      });
    } catch {
      await this.markPostStorageReconciliation(
        operacion.id,
        stored,
        'MARCAR_ALMACENADA_ERROR',
      );

      return {
        kind: 'RECONCILIATION_REQUIRED',
        operacionId: operacion.id,
        errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
      };
    }

    if (!almacenada) {
      await this.markPostStorageReconciliation(
        operacion.id,
        stored,
        'MARCAR_ALMACENADA_NO_APLICADA',
      );

      return {
        kind: 'RECONCILIATION_REQUIRED',
        operacionId: operacion.id,
        errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
      };
    }

    try {
      const persisted = await this.persistence.persistir({
        operacion: almacenada,
        command,
      });

      return {
        kind: 'CREATED',
        operacionId: persisted.operacionId,
        documentoId: persisted.documentoId,
        archivoId: persisted.archivoId,
        hashSha256,
      };
    } catch (error) {
      const actual =
        (await this.repository.buscarPorId(operacion.id)) ?? almacenada;

      const compensation = await this.compensation.compensate({
        operacion: actual,
        storageObject: stored,
        objetoCreadoPorOperacion: stored.kind === 'CREATED',
        objetoPreexistente: stored.preexisting,
        esReplay: false,
        errorCodigo: 'CARGA_SEGURA_PERSISTENCE_FAILED',
        errorDetalle: this.errorMessage(error),
      });

      if (compensation.kind === 'RECONCILIATION_REQUIRED') {
        return {
          kind: 'RECONCILIATION_REQUIRED',
          operacionId: operacion.id,
          errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
        };
      }

      if (
        error instanceof CargaSeguraError &&
        error.code === 'PRINCIPAL_ACTIVO_EXISTENTE'
      ) {
        throw error;
      }

      throw new CargaSeguraError(
        'CARGA_SEGURA_PERSISTENCE_FAILED',
        'La persistencia documental falló y fue compensada',
        {
          operacionId: operacion.id,
          cause: this.errorMessage(error),
        },
      );
    }
  }

  /** P3: one advisory-locked session; no SQL transaction spans remote PUT. */
  private async processReservedR2(
    operacion: CargaSeguraOperacionRow, command: CargaSeguraCommand,
    hashSha256: string, bucket: string, storageKey: string,
  ): Promise<CargaSeguraResult> {
    const recovery = operacion.metadata?.r2RecoveryV1 as Record<string, unknown> | undefined;
    const fence = {
      fencingToken: String(recovery?.fencingToken ?? ''),
      attempt: Number(recovery?.attempt), storageBucket: bucket, storageKey,
    };
    const required = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
    if (recovery?.version !== 1 || recovery.phase !== 'PRE_PUT' ||
      !fence.fencingToken || !required(fence.attempt) ||
      !required(command.clienteDestinoId) || !required(command.expedienteId) ||
      !required(command.grupoFacturaId) || !required(command.documentoBaseId)) {
      return { kind: 'RECONCILIATION_REQUIRED', operacionId: operacion.id,
        errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION' };
    }
    const pending = (): CargaSeguraResult => ({ kind: 'RECONCILIATION_REQUIRED',
      operacionId: operacion.id, errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION' });
    try {
      return await this.tmpRepository.lockedBounded(
        `${command.workspaceId}:${command.empresaCodigo}:${operacion.id}`,
        async (connection: TmpConnection): Promise<CargaSeguraResult> => {
          const claimed = await this.tmpRepository.transaction(connection, tx =>
            this.repository.marcarPutStartedProtegidoR2(tx, {
              operacionId: operacion.id, workspaceId: command.workspaceId,
              empresaCodigo: command.empresaCodigo,
              clienteDestinoId: command.clienteDestinoId as number,
              expedienteId: command.expedienteId as number, actorId: command.actorId,
              grupoFacturaId: command.grupoFacturaId as number,
              documentoBaseId: command.documentoBaseId as number,
              canalIngreso: command.canalIngreso as 'ALMACEN_LEGACY_UPLOAD_GUIA' | 'ALMACEN_LEGACY_UPLOAD_NOTA_INGRESO',
              ...fence,
            }));
          // Only a confirmed COMMIT can reach this line; any rejection returns no PUT.
          if (!claimed) return pending();
          let stored: Awaited<ReturnType<CargaSeguraStorage['putObject']>>;
          try {
            stored = await this.storage.putObject({ provider: 'r2', bucket,
              key: storageKey, body: command.archivo,
              contentType: command.contentType, hashSha256 });
          } catch {
            await this.tryMarkR2Reconciliation(connection, operacion, command, fence);
            return pending();
          }
          if (stored.kind !== 'CREATED' || stored.provider !== 'r2' ||
            stored.bucket !== bucket || stored.key !== storageKey) {
            await this.tryMarkR2Reconciliation(connection, operacion, command, fence);
            return pending();
          }
          try {
            const persisted = await this.persistence.persistirProtegidaR2(connection,
              { operacion, command }, fence);
            return { kind: 'CREATED', operacionId: persisted.operacionId,
              documentoId: persisted.documentoId, archivoId: persisted.archivoId, hashSha256 };
          } catch {
            // Even after a successful PUT, terminal COMMIT may be uncertain.
            await this.tryMarkR2Reconciliation(connection, operacion, command, fence);
            return pending();
          }
        },
      );
    } catch {
      // Mutex/connection/CAS/COMMIT uncertainty: fail closed; no legacy compensation.
      return pending();
    }
  }

  private async tryMarkR2Reconciliation(
    connection: TmpConnection, operacion: CargaSeguraOperacionRow,
    command: CargaSeguraCommand,
    fence: { fencingToken: string; attempt: number; storageBucket: string; storageKey: string },
  ): Promise<void> {
    try {
      await this.tmpRepository.transaction(connection, tx =>
        this.repository.marcarReconciliacionProtegidaR2(tx, {
          operacionId: operacion.id, workspaceId: command.workspaceId,
          empresaCodigo: command.empresaCodigo, ...fence,
          errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
        }));
    } catch {
      // No unfenced fallback; a disconnected session cannot safely write terminal state.
    }
  }

  private async tryMarkR2PrePutFailure(
    operacion: CargaSeguraOperacionRow,
    command: CargaSeguraCommand,
  ): Promise<void> {
    const recovery = operacion.metadata?.r2RecoveryV1 as Record<string, unknown> | undefined;
    if (recovery?.version !== 1 || recovery.phase !== 'PRE_PUT' ||
        typeof recovery.fencingToken !== 'string' || !recovery.fencingToken ||
        typeof recovery.attempt !== 'number' ||
        !Number.isSafeInteger(recovery.attempt) || recovery.attempt <= 0) return;
    const { fencingToken, attempt } = recovery;
    try {
      const applied = await this.tmpRepository.lockedBounded(
        `${command.workspaceId}:${command.empresaCodigo}:${operacion.id}`,
        connection => this.tmpRepository.transaction(connection, tx =>
          this.repository.marcarFalloPrePutProtegidoR2(tx, {
            operacionId: operacion.id, workspaceId: command.workspaceId,
            empresaCodigo: command.empresaCodigo,
            fencingToken, attempt,
          })),
      );
      if (!applied) this.logger.warn({ event: 'P3_PRE_PUT_FAILURE_NOT_RECORDED', operacionId: operacion.id });
    } catch {
      this.logger.warn({ event: 'P3_PRE_PUT_FAILURE_RECORD_ERROR', operacionId: operacion.id });
    }
  }

  private async markPostStorageReconciliation(
    operacionId: number,
    storageObject: Pick<
      Awaited<ReturnType<CargaSeguraStorage['putObject']>>,
      'provider' | 'bucket' | 'key'
    >,
    reason: string,
  ): Promise<void> {
    const updated = await this.repository.marcarRequiereReconciliacion({
      operacionId,
      storageProvider: storageObject.provider,
      storageBucket: storageObject.bucket,
      storageKey: storageObject.key,
      errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
      errorDetalle: `postStorageReason=${reason}`,
    });

    if (!updated) {
      throw new CargaSeguraError(
        'CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED',
        'No se pudo registrar la referencia storage para reconciliación',
        { operacionId },
      );
    }
  }

  private isR2Almacen(command: CargaSeguraCommand): boolean {
    return ['ALMACEN_LEGACY_UPLOAD_GUIA', 'ALMACEN_LEGACY_UPLOAD_NOTA_INGRESO'].includes(command.canalIngreso);
  }

  private resolveExistingOperation(
    reserva: Exclude<ReservaCargaSeguraResult, { kind: 'RESERVED' }>,
  ): CargaSeguraResult {
    const operacion = reserva.operacion;

    if (reserva.kind === 'IDEMPOTENCY_CONFLICT') {
      return {
        kind: 'IDEMPOTENCY_CONFLICT',
        operacionId: operacion.id,
      };
    }

    if (
      operacion.estado === 'completada' &&
      this.validId(operacion.documentoId) &&
      this.validId(operacion.archivoId)
    ) {
      return {
        kind: reserva.kind === 'REPLAYED' ? 'REPLAYED' : 'DUPLICATE',
        operacionId: operacion.id,
        documentoId: operacion.documentoId!,
        archivoId: operacion.archivoId!,
        hashSha256: operacion.hashSha256,
      };
    }

    if (operacion.estado === 'iniciada' || operacion.estado === 'almacenada') {
      return {
        kind: 'RECONCILIATION_REQUIRED',
        operacionId: operacion.id,
        errorCode: 'CARGA_SEGURA_OPERACION_EN_PROGRESO',
      };
    }

    return {
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: operacion.id,
      errorCode: operacion.errorCodigo ?? 'ARCHIVO_REQUIERE_RECONCILIACION',
    };
  }

  private normalizeCommand(command: CargaSeguraCommand): CargaSeguraCommand {
    const normalized: CargaSeguraCommand = {
      ...command,
      documentoBaseId: command.documentoBaseId ?? null,
      grupoFacturaId: command.grupoFacturaId ?? null,
      empresaCodigo: this.requiredText(command.empresaCodigo, 'empresaCodigo'),
      idempotencyKey: this.requiredText(
        command.idempotencyKey,
        'idempotencyKey',
      ),
      canalIngreso: this.requiredText(command.canalIngreso, 'canalIngreso'),
      tipoDocumental: this.requiredText(
        command.tipoDocumental,
        'tipoDocumental',
      ),
      tipoRelacion:
        command.tipoRelacion === null
          ? null
          : this.requiredText(command.tipoRelacion, 'tipoRelacion'),
      nombreArchivo: this.requiredText(command.nombreArchivo, 'nombreArchivo'),
      contentType: this.requiredText(
        command.contentType,
        'contentType',
      ).toLowerCase(),
      requestId: this.nullableText(command.requestId),
      correlationId: this.nullableText(command.correlationId),
      metadata: command.metadata ?? {},
    };

    this.positiveInteger(normalized.workspaceId, 'workspaceId');
    this.positiveInteger(normalized.actorId, 'actorId');
    this.nullablePositiveInteger(
      normalized.clienteDestinoId,
      'clienteDestinoId',
    );
    this.nullablePositiveInteger(normalized.expedienteId, 'expedienteId');
    this.nullablePositiveInteger(
      normalized.documentoBaseId ?? null,
      'documentoBaseId',
    );
    this.nullablePositiveInteger(
      normalized.grupoFacturaId ?? null,
      'grupoFacturaId',
    );

    if (
      normalized.idempotencyKey.length > 128 ||
      /[\u0000-\u001f\u007f]/.test(normalized.idempotencyKey)
    ) {
      throw this.invalidRequest('idempotencyKey es inválida');
    }

    if (!Buffer.isBuffer(normalized.archivo)) {
      throw this.invalidRequest('archivo debe ser un Buffer');
    }

    if (normalized.archivo.length <= 0) {
      throw this.invalidRequest('archivo no puede estar vacío');
    }

    if (
      !Number.isSafeInteger(normalized.tamanoBytes) ||
      normalized.tamanoBytes <= 0 ||
      normalized.tamanoBytes !== normalized.archivo.length
    ) {
      throw this.invalidRequest('tamanoBytes no coincide con el archivo', {
        tamanoBytes: normalized.tamanoBytes,
        bufferLength: normalized.archivo.length,
      });
    }

    if (normalized.esPrincipal && normalized.expedienteId === null) {
      throw this.invalidRequest('Un documento principal requiere expedienteId');
    }

    return normalized;
  }

  private assertEnabled(): void {
    const value =
      this.config.get<string>('DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED') ??
      process.env.DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED;

    if (value !== 'true') {
      throw new CargaSeguraError(
        'CARGA_SEGURA_DESHABILITADA',
        'La carga documental segura está deshabilitada',
      );
    }
  }

  private resolveBucket(): string {
    const bucket = this.firstNonEmpty(
      this.config.get<string>('R2_BUCKET'),
      process.env.R2_BUCKET,
      this.config.get<string>('R2_BUCKET_NAME'),
      process.env.R2_BUCKET_NAME,
      this.config.get<string>('STORAGE_R2_BUCKET'),
      process.env.STORAGE_R2_BUCKET,
    );

    if (!bucket) {
      throw new CargaSeguraError(
        'CARGA_SEGURA_STORAGE_FAILED',
        'R2_BUCKET no está configurado',
      );
    }

    return bucket;
  }

  private calculateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private validId(value: number | null): value is number {
    return Number.isSafeInteger(value) && Number(value) > 0;
  }

  private requiredText(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw this.invalidRequest(`${field} es obligatorio`);
    }

    return normalized;
  }

  private nullableText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }

  private positiveInteger(value: number, field: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw this.invalidRequest(`${field} debe ser un entero positivo`);
    }
  }

  private nullablePositiveInteger(value: number | null, field: string): void {
    if (value !== null) {
      this.positiveInteger(value, field);
    }
  }

  private firstNonEmpty(
    ...values: Array<string | null | undefined>
  ): string | undefined {
    return values
      .find((value) => typeof value === 'string' && value.trim().length > 0)
      ?.trim();
  }

  private invalidRequest(
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ): CargaSeguraError {
    return new CargaSeguraError(
      'CARGA_SEGURA_SOLICITUD_INVALIDA',
      message,
      details,
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
