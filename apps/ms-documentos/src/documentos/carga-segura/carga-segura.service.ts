import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CARGA_SEGURA_STORAGE } from './carga-segura.constants';
import { CargaSeguraCompensation } from './carga-segura.compensation';
import { CargaSeguraError } from './carga-segura.errors';
import { calculateCargaSeguraFingerprint } from './carga-segura.fingerprint';
import { CargaSeguraPersistence } from './carga-segura.persistence';
import { CargaSeguraRepository } from './carga-segura.repository';
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
  constructor(
    private readonly config: ConfigService,
    private readonly repository: CargaSeguraRepository,
    @Inject(CARGA_SEGURA_STORAGE)
    private readonly storage: CargaSeguraStorage,
    private readonly persistence: CargaSeguraPersistence,
    private readonly compensation: CargaSeguraCompensation,
  ) {}

  async ejecutar(command: CargaSeguraCommand): Promise<CargaSeguraResult> {
    this.assertEnabled();

    const normalized = this.normalizeCommand(command);
    const hashSha256 = this.calculateHash(normalized.archivo);

    const fingerprint = calculateCargaSeguraFingerprint({
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
    });

    const reserva = await this.repository.reservar({
      workspaceId: normalized.workspaceId,
      empresaCodigo: normalized.empresaCodigo,
      clienteDestinoId: normalized.clienteDestinoId,
      expedienteId: normalized.expedienteId,
      actorId: normalized.actorId,
      idempotencyKey: normalized.idempotencyKey,
      payloadFingerprint: fingerprint.fingerprint,
      requestId: normalized.requestId,
      correlationId: normalized.correlationId ?? normalized.requestId,
      canalIngreso: normalized.canalIngreso,
      nombreArchivo: normalized.nombreArchivo,
      contentType: normalized.contentType,
      tamanoBytes: normalized.tamanoBytes,
      hashSha256,
      metadata: normalized.metadata,
    });

    if (reserva.kind !== 'RESERVED') {
      return this.resolveExistingOperation(reserva);
    }

    return this.processReserved(reserva.operacion, normalized, hashSha256);
  }

  private async processReserved(
    operacion: CargaSeguraOperacionRow,
    command: CargaSeguraCommand,
    hashSha256: string,
  ): Promise<CargaSeguraResult> {
    const bucket = this.resolveBucket();

    const storageKey = buildCargaSeguraStorageKey({
      operacionId: operacion.id,
      empresaCodigo: command.empresaCodigo,
      nombreArchivo: command.nombreArchivo,
    });

    let stored: Awaited<ReturnType<CargaSeguraStorage['putObject']>>;

    try {
      stored = await this.storage.putObject({
        provider: 'r2',
        bucket,
        key: storageKey,
        body: command.archivo,
        contentType: command.contentType,
        hashSha256,
      });
    } catch (error) {
      await this.repository.marcarFallida({
        operacionId: operacion.id,
        errorCodigo: 'CARGA_SEGURA_STORAGE_FAILED',
        errorDetalle: this.errorMessage(error),
      });

      throw error;
    }

    const almacenada = await this.repository.marcarAlmacenada({
      operacionId: operacion.id,
      storageProvider: stored.provider,
      storageBucket: stored.bucket,
      storageKey: stored.key,
    });

    if (!almacenada) {
      const actual =
        (await this.repository.buscarPorId(operacion.id)) ?? operacion;

      const compensation = await this.compensation.compensate({
        operacion: actual,
        objetoCreadoPorOperacion: stored.preexisting === false,
        objetoPreexistente: stored.preexisting,
        esReplay: false,
        errorCodigo: 'CARGA_SEGURA_PERSISTENCE_FAILED',
        errorDetalle: 'No se pudo marcar la operación como almacenada',
      });

      if (compensation.kind === 'RECONCILIATION_REQUIRED') {
        return {
          kind: 'RECONCILIATION_REQUIRED',
          operacionId: operacion.id,
          errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
        };
      }

      throw new CargaSeguraError(
        'CARGA_SEGURA_PERSISTENCE_FAILED',
        'No se pudo marcar la operación como almacenada',
        {
          operacionId: operacion.id,
        },
      );
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
        objetoCreadoPorOperacion: stored.preexisting === false,
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
