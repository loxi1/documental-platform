import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CARGA_SEGURA_STORAGE } from '../carga-segura/carga-segura.constants';
import { buildCargaSeguraStorageKey } from '../carga-segura/carga-segura.storage';
import { DocumentosRepository } from '../documentos.repository';
import { OrquestarConfirmacionDocumentalV2UseCase } from '../../documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase';
import type { CargaSeguraStorage } from '../carga-segura/carga-segura.storage';
import type { CargaSeguraHttpResolvedIdentity as Identity } from '../carga-segura/http/carga-segura-http.validation';
import { validateCargaSeguraFileSignature } from '../carga-segura/http/carga-segura-file-signature';
import { sanitizeCargaSeguraFilename } from '../carga-segura/http/carga-segura-filename';
import { validateCargaSeguraFileSize } from '../carga-segura/http/carga-segura-http.validation';
import { TmpRepository, TmpRow, TmpIntegration, assertTmpIntegration } from './tmp.repository';

import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { NatsSubjects } from '@documental/shared';
import { NATS_CLIENT } from '../../nats/nats-client.provider';
import { DocumentosPreviewService } from '../documentos-preview.service';

@Injectable()
export class TmpService {
  constructor(private readonly repository: TmpRepository, private readonly config: ConfigService,
    @Inject(CARGA_SEGURA_STORAGE) private readonly storage: CargaSeguraStorage,
    @Inject(NATS_CLIENT)
    private readonly nats: ClientProxy,
    private readonly preview: DocumentosPreviewService,
    @Optional() private readonly documentos?: DocumentosRepository,
    @Optional() private readonly documentalV2?: OrquestarConfirmacionDocumentalV2UseCase,
) {}

  async reserve(actor: Identity, file: { originalname: string; mimetype: string; buffer: Buffer }) {
    validateCargaSeguraFileSize(file?.buffer);
    const mime = validateCargaSeguraFileSignature(file.mimetype, file.buffer);
    const name = sanitizeCargaSeguraFilename(file.originalname, mime);
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const bucket = this.config.get<string>('R2_BUCKET') || this.config.get<string>('R2_BUCKET_NAME') || this.config.get<string>('STORAGE_R2_BUCKET');
    if (!bucket) throw new ServiceUnavailableException('Storage TEMP no configurado');
    const fingerprint = createHash('sha256').update(JSON.stringify([actor.actorId, actor.clienteDestinoId, name, mime, hash])).digest('hex');
    const row = await this.repository.locked(`reserve:${actor.workspaceId}:${actor.empresaCodigo}:${actor.idempotencyKey}`, async c => {
      return this.repository.reserve(c, actor, { name, mime, hash, size: file.buffer.length }, fingerprint, bucket);
    });
      // La reserva y promoción tienen el mismo bloqueo por tempId, incluso durante recuperación.
      return this.repository.locked(String(row.id), async locked => {
        const current = await this.repository.own(locked, Number(row.id), actor);
        if (current.estado === 'iniciada') {
          const put = await this.storage.putObject({ ...this.source(current), body: file.buffer, contentType: mime, hashSha256: hash });
          await this.verify(current, current.storage_key);
          if (put?.kind === 'CREATED' && put.provider === 'r2' && put.bucket === current.storage_bucket && put.key === current.storage_key) await this.repository.markPhysicalOwnership(locked, current);
          await this.repository.staged(locked, Number(row.id));
        }
        return this.result(await this.repository.own(locked, Number(row.id), actor));
      });
  }
  async replaceLostRegularizacionOp(
    id: number,
    actor: Identity,
    ordenPagoId: number,
    tipoRegularizador: string,
    file: { originalname: string; mimetype: string; buffer: Buffer },
  ) {
    this.id(id);
    if (typeof actor.idempotencyKey !== 'string' || !actor.idempotencyKey.trim()) throw new BadRequestException('Idempotency-Key requerido');

    if (!Number.isSafeInteger(ordenPagoId) || ordenPagoId <= 0) {
      throw new BadRequestException('ordenPagoId inválido');
    }

    const tipo = String(tipoRegularizador ?? '').trim().toUpperCase();
    if (!['FACTURA', 'RECIBO_HONORARIO'].includes(tipo)) {
      throw new BadRequestException('tipoRegularizador inválido');
    }

    validateCargaSeguraFileSize(file?.buffer);
    const mime = validateCargaSeguraFileSignature(file.mimetype, file.buffer);
    const name = sanitizeCargaSeguraFilename(file.originalname, mime);
    const hash = createHash('sha256').update(file.buffer).digest('hex');

    const bucket =
      this.config.get<string>('R2_BUCKET') ||
      this.config.get<string>('R2_BUCKET_NAME') ||
      this.config.get<string>('STORAGE_R2_BUCKET');

    if (!bucket) {
      throw new ServiceUnavailableException('Storage TEMP no configurado');
    }

    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          actor.actorId,
          actor.clienteDestinoId,
          name,
          mime,
          hash,
        ]),
      )
      .digest('hex');

    return this.repository.locked(String(id), async c => {
      const row = await this.repository.own(c, id, actor);

      if (row.promovida_en) {
        throw new ConflictException('TEMP_REGULARIZACION_OP_YA_PROMOVIDO');
      }

      if (!['iniciada', 'almacenada'].includes(row.estado) || row.documento_id || row.archivo_id || row.metadata?.integration) throw new ConflictException('TEMP_REPLACEMENT_DOCUMENT_PROTECTED');
      const identity = row.metadata?.regularizacionOp;
      if (
        !identity ||
        identity.consumer !== 'REGULARIZACION_OP' ||
        Number(identity.ordenPagoId) !== ordenPagoId ||
        String(identity.tipoRegularizador ?? '').toUpperCase() !== tipo
      ) {
        throw new ConflictException('TEMP_REGULARIZACION_OP_CONFLICT');
      }

      const previousAttempt = row.metadata?.replacement;
      if (previousAttempt?.attemptIdentity === actor.idempotencyKey) {
        if (previousAttempt.fingerprint !== fingerprint) throw new ConflictException('TEMP_REPLACEMENT_IDEMPOTENCY_CONFLICT');
        if (row.estado !== 'almacenada' || row.storage_key !== previousAttempt.storageKey) throw new ConflictException('TEMP_REPLACEMENT_INCOMPLETE');
        await this.verify(row, row.storage_key);
        await this.cleanupPreviousPdf(c, row);
        return { ...this.result(await this.repository.own(c, id, actor)), cleanup: row.metadata?.replacement?.cleanup };
      }
      if (previousAttempt?.cleanup?.status === 'PENDING_RECONCILIATION' || previousAttempt?.cleanup?.status === 'PENDING') {
        await this.cleanupPreviousPdf(c, row);
        const checked = await this.repository.own(c, id, actor);
        if (checked.metadata?.replacement?.cleanup?.status !== 'DELETED') throw new ConflictException('TEMP_REPLACEMENT_CLEANUP_PENDING');
      }

      const generationId = randomUUID();
      const generation = {
        storageKey: `documentos/tmp/${actor.workspaceId}/${id}/${generationId}`,
        generationId,
        attemptIdentity: actor.idempotencyKey,
      };
      let created: { provider: 'r2'; bucket: string; key: string } | null = null;
      let putUncertain = false;
      let replacementResult: any;
      let committedRow: TmpRow | undefined;
      try {
        replacementResult = await this.repository.transaction(c, async tx => {
          const updated = await this.repository.replaceLostRegularizacionOp(
            tx, row, actor, { name, mime, size: file.buffer.length, hash }, fingerprint, bucket, generation,
          );
          // A fresh generation must never target the historical object.
          if (updated.storage_key !== generation.storageKey || updated.storage_key === row.storage_key) {
            throw new ConflictException('TEMP_REPLACEMENT_KEY_CONFLICT');
          }
          const target = this.source(updated);
          putUncertain = true;
          const put = await this.storage.putObject({ ...target, body: file.buffer, contentType: mime, hashSha256: hash });
          if (put.kind === 'CREATED' && put.provider === target.provider && put.bucket === target.bucket && put.key === target.key) {
            created = target;
            putUncertain = false;
          } else if (put.kind === 'PREEXISTING') {
            // Matching bytes do not confer ownership, including for later cleanup.
            putUncertain = false;
          } else {
            throw new ConflictException('TEMP_REPLACEMENT_PUT_RESULT_INVALID');
          }
          try { await this.verify(updated, updated.storage_key); }
          catch (verificationError) {
            if (put.kind === 'PREEXISTING') throw new ConflictException({ code: 'TEMP_REPLACEMENT_PREEXISTING_CONFLICT', message: 'El objeto preexistente no coincide. Se conservó sin modificar; requiere reconciliación.', details: { tempId: id, generationId } });
            throw verificationError;
          }
          if (put.kind === 'PREEXISTING') throw new ConflictException({ code: 'TEMP_REPLACEMENT_PREEXISTING_UNOWNED', message: 'El objeto preexistente coincide, pero su propiedad no está acreditada. Se conservó; reintente con una generación nueva.', details: { tempId: id, generationId } });
          await this.repository.staged(tx, Number(updated.id));
          const finalRow = await this.repository.own(tx, Number(updated.id), actor);
          if (finalRow.estado !== 'almacenada' || finalRow.storage_key !== generation.storageKey) throw new ConflictException('TEMP_REPLACEMENT_INCOMPLETE');
          committedRow = finalRow;
          return this.result(finalRow);
        });
      } catch (error) {
        // A lost COMMIT response is not proof of rollback. Re-read under the
        // same advisory lock before considering compensation of our new key.
        let current: TmpRow;
        try { current = await this.repository.own(c, id, actor); }
        catch {
          throw new ServiceUnavailableException({ code: 'TEMP_REPLACEMENT_RECONCILIATION_REQUIRED', message: 'No se pudo acreditar el resultado del reemplazo. Conservar objetos y reconciliar.', details: { tempId: id, generationId } });
        }
        if (current.storage_key === generation.storageKey || putUncertain) {
          throw new ServiceUnavailableException({ code: 'TEMP_REPLACEMENT_RECONCILIATION_REQUIRED', message: 'Resultado de almacenamiento o commit indeterminado. No se eliminó el objeto.', details: { tempId: id, generationId } });
        }
        if (created) {
          try { await this.storage.deleteObject(created); }
          catch {
            throw new ServiceUnavailableException({ code: 'TEMP_REPLACEMENT_COMPENSATION_FAILED', message: 'Falló la compensación del objeto nuevo. Requiere reconciliación.', details: { tempId: id, generationId } });
          }
        }
        throw error;
      }
      // Cleanup failure must never turn a committed replacement into an upload failure.
      const committed = committedRow!;
      await this.cleanupPreviousPdf(c, committed);
      return { ...replacementResult, cleanup: committed.metadata?.replacement?.cleanup };
    });
  }

  private async cleanupPreviousPdf(c: any, row: TmpRow) {
    const cleanup = row.metadata?.replacement?.cleanup;
    if (!cleanup || cleanup.status === 'DELETED') return;
    const pending = { ...cleanup, status: 'PENDING_RECONCILIATION' };
    try {
      if (!cleanup.owned || cleanup.oldOcrPending || row.promovida_en || row.documento_id || row.archivo_id || row.metadata?.integration ||
          cleanup.key === row.storage_key || !(cleanup.key === `documentos/tmp/${row.workspace_id}/${row.id}` || String(cleanup.key).startsWith(`documentos/tmp/${row.workspace_id}/${row.id}/`)) ||
          !(await this.repository.oldObjectUnreferenced(c, row, cleanup.bucket, cleanup.key))) {
        pending.error = 'OWNERSHIP_OR_REFERENCE_NOT_CLEARED';
      } else {
        await this.storage.deleteObject({ provider: 'r2', bucket: cleanup.bucket, key: cleanup.key });
        pending.status = 'DELETED'; pending.error = null;
      }
    } catch { pending.error = 'OLD_PDF_DELETE_FAILED'; }
    row.metadata.replacement.cleanup = pending;
    try { await this.repository.cleanupState(c, row, pending); }
    catch { row.metadata.replacement.cleanup = { ...pending, status: 'PENDING_RECONCILIATION', error: 'CLEANUP_RESULT_NOT_PERSISTED' }; }
  }

  async bindRegularizacionOp(
    id: number,
    actor: Identity,
    ordenPagoId: number,
    tipoRegularizador: string,
  ) {
    this.id(id);

    if (!Number.isSafeInteger(ordenPagoId) || ordenPagoId <= 0) {
      throw new BadRequestException('ordenPagoId inválido');
    }

    const tipo = String(tipoRegularizador ?? '').trim().toUpperCase();
    if (!['FACTURA', 'RECIBO_HONORARIO'].includes(tipo)) {
      throw new BadRequestException('tipoRegularizador inválido');
    }

    return this.repository.locked(String(id), async c => {
      const row = await this.repository.own(c, id, actor);

      if (row.promovida_en || String(row.estado ?? '').toLowerCase() !== 'almacenada') {
        throw new ConflictException('TEMP_REGULARIZACION_OP_NO_ELEGIBLE');
      }

      const existing = row.metadata?.regularizacionOp;
      if (
        existing &&
        (
          existing.consumer !== 'REGULARIZACION_OP' ||
          Number(existing.ordenPagoId) !== ordenPagoId ||
          String(existing.tipoRegularizador ?? '').toUpperCase() !== tipo
        )
      ) {
        throw new ConflictException('TEMP_REGULARIZACION_OP_CONFLICT');
      }

      await this.repository.bindRegularizacionOp(
        c,
        id,
        actor,
        ordenPagoId,
        tipo,
      );

      return { tempId: id, ordenPagoId, tipoRegularizador: tipo };
    });
  }

  private recoverMaterializationAttempt(row: TmpRow, actor: Identity, ordenPagoId: number, tipo: string) {
    const claim = row.metadata?.integration;
    const operation = row.metadata?.regularizacionOp;
    // Only the owner of this exact live candidate may resume its matching consumer claim.
    const consumer = tipo === 'FACTURA' ? 'OP_FACTURA_REGULARIZER_MATERIALIZATION'
      : tipo === 'RECIBO_HONORARIO' ? 'OP_RECIBO_HONORARIO_REGULARIZER_MATERIALIZATION' : null;
    if (!consumer || row.estado !== 'almacenada' || row.promovida_en || row.archivo_id ||
        !Number.isSafeInteger(Number(row.documento_id)) || Number(row.documento_id) <= 0 ||
        Number(row.actor_id) !== actor.actorId || Number(row.workspace_id) !== actor.workspaceId ||
        row.empresa_codigo !== actor.empresaCodigo || Number(row.cliente_destino_id) !== actor.clienteDestinoId ||
        operation?.consumer !== 'REGULARIZACION_OP' || operation.ordenPagoId !== ordenPagoId ||
        operation.tipoRegularizador !== tipo || claim?.consumer !== consumer ||
        claim.completed !== false || typeof claim.identity !== 'string' || !claim.identity.trim() ||
        claim.identity !== claim.identity.trim().toLowerCase() || row.metadata?.promocionIdentity !== claim.identity) return null;
    return { tempId: Number(row.id), idempotencyKey: claim.identity };
  }

  // Solo TEMP pendiente de regularización OP: identidad persistida, no bandera del cliente.
  private isPendingOpRegularization(row: TmpRow): boolean {
    const context = row.metadata?.regularizacionOp;
    return !row.promovida_en && row.estado === 'almacenada' &&
      context?.consumer === 'REGULARIZACION_OP' &&
      ['FACTURA', 'RECIBO_HONORARIO'].includes(context?.tipoRegularizador) &&
      Number.isSafeInteger(Number(context?.ordenPagoId)) && Number(context.ordenPagoId) > 0;
  }

  async recoverRegularizacionOp(
    actor: Identity,
    ordenPagoId: number,
    tipoRegularizador: string,
  ) {
    if (!Number.isSafeInteger(ordenPagoId) || ordenPagoId <= 0) {
      throw new BadRequestException('ordenPagoId inválido');
    }

    const tipo = String(tipoRegularizador ?? '').trim().toUpperCase();
    if (!['FACTURA', 'RECIBO_HONORARIO'].includes(tipo)) {
      throw new BadRequestException('tipoRegularizador inválido');
    }

    return this.repository.locked(
      `regularizacion-op:${actor.workspaceId}:${actor.empresaCodigo}:${ordenPagoId}:${tipo}`,
      async c => {
        const row = await this.repository.findRegularizacionOp(
          c,
          actor,
          ordenPagoId,
          tipo,
        );

        if (!row) return null;

        if (row.promovida_en) {
          const consumer = tipo === 'FACTURA'
            ? 'OP_FACTURA_REGULARIZER_MATERIALIZATION'
            : 'OP_RECIBO_HONORARIO_REGULARIZER_MATERIALIZATION';
          if (!['almacenada', 'completada'].includes(row.estado) ||
              row.metadata?.integration?.consumer !== consumer ||
              row.metadata?.integration?.completed !== true ||
              !Number.isSafeInteger(Number(row.documento_id)) || Number(row.documento_id) <= 0 ||
              !Number.isSafeInteger(Number(row.archivo_id)) || Number(row.archivo_id) <= 0) {
            throw new ConflictException('TEMP_REGULARIZACION_OP_PROMOTED_IDENTITY_CONFLICT');
          }
          const persisted = await this.repository.promotedRegularizacionOpIdentity(c, row, actor, ordenPagoId, tipo);
          if (persisted.storage_provider !== row.destino_storage_provider ||
              persisted.storage_provider !== 'r2' ||
              persisted.storage_bucket !== row.destino_storage_bucket ||
              persisted.storage_key !== row.destino_storage_key ||
              persisted.hash_sha256 !== row.hash_sha256 || row.destino_hash_sha256 !== row.hash_sha256 ||
              Number(row.destino_tamano_bytes) !== Number(row.tamano_bytes)) {
            throw new ConflictException('TEMP_REGULARIZACION_OP_PROMOTED_IDENTITY_CONFLICT');
          }
          const stat = await this.storage.statObject({ provider: 'r2', bucket: persisted.storage_bucket, key: persisted.storage_key });
          if (!stat.exists || stat.hashSha256 !== row.hash_sha256 || stat.tamanoBytes !== Number(row.tamano_bytes)) {
            throw new ConflictException('TMP_STORAGE_VERIFICATION_FAILED');
          }
          const preview = await this.preview.getArchivoPreviewUrl(Number(persisted.archivoId));
          return {
            tempId: Number(row.id), estado: 'PROMOTED' as const, disponible: true,
            ordenPagoId, tipoRegularizador: tipo,
            documentoId: Number(persisted.documentoId), archivoId: Number(persisted.archivoId),
            nombreOriginal: row.nombre_archivo_original ?? null, mime: row.content_type ?? null,
            preview,
            documento: {
              serie: persisted.serie, numero: persisted.numero, fechaEmision: persisted.fechaEmision,
              rucEmisor: persisted.rucEmisor, razonSocialEmisor: persisted.razonSocialEmisor,
              moneda: persisted.moneda, montoTotal: persisted.montoTotal,
            },
          };
        }

        const expiraEn = row.expira_en instanceof Date
          ? row.expira_en
          : new Date(row.expira_en);

        if (
          (!row.expira_en || Number.isNaN(expiraEn.getTime()) || expiraEn.getTime() <= Date.now()) &&
          !(this.isPendingOpRegularization(row) &&
            Number(row.metadata.regularizacionOp.ordenPagoId) === ordenPagoId &&
            row.metadata.regularizacionOp.tipoRegularizador === tipo)
        ) {
          return {
            tempId: Number(row.id),
            disponible: false,
            motivo: 'TEMP_EXPIRADO',
          };
        }

        const stat = await this.storage.statObject(this.source(row));

        if (!stat?.exists) {
          return {
            tempId: Number(row.id),
            disponible: false,
            motivo: 'TMP_STORAGE_NOT_FOUND',
          };
        }

        const preview = await this.preview.getTempPreviewUrl({
          tempId: Number(row.id),
          filename: row.nombre_archivo_original ?? null,
          storageProvider: row.storage_provider,
          storageBucket: row.storage_bucket,
          storageKey: row.storage_key,
        });

        return {
          tempId: Number(row.id),
          disponible: true,
          nombreOriginal: row.nombre_archivo_original ?? null,
          mime: row.content_type ?? null,
          preview,
          ocrCandidate: row.metadata?.ocrCandidate ?? null,
          tipoRegularizador: tipo,
          materializationAttempt: this.recoverMaterializationAttempt(row, actor, ordenPagoId, tipo),
        };
      },
    );
  }

  async consult(id: number, actor: Identity) {
    this.id(id);
    return this.repository.locked(String(id), async c => {
      let row = await this.repository.own(c, id, actor);
      // Recupera un put exitoso cuya confirmación DB se interrumpió, sin volver a subir.
      if (row.estado === 'iniciada') {
        const stat = await this.storage.statObject(this.source(row));
        if (stat.exists) { await this.verify(row, row.storage_key); await this.repository.staged(c, id); row = await this.repository.own(c, id, actor); }
      }
      return this.result(row);
    });
  }
  private documentalInput(raw: any, complete: boolean) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      Object.keys(raw).some(k => !['tipoDocumental','expedienteId','documentoBaseId','grupoFacturaId',
        'tipoRelacion','esPrincipal','orden','metadata','observacion'].includes(k)))
      throw new BadRequestException('TMP_DOCUMENTAL_INPUT_INVALID');
    const x = JSON.parse(JSON.stringify(raw));
    if (!['OC','OS','FACTURA'].includes(x.tipoDocumental) || !Number.isSafeInteger(x.expedienteId) || x.expedienteId <= 0)
      throw new BadRequestException('TMP_DOCUMENTAL_CONTEXT_INVALID');
    const principal = x.tipoDocumental !== 'FACTURA';
    if (x.esPrincipal !== principal || x.tipoRelacion !== (principal ? `principal_${x.tipoDocumental.toLowerCase()}` : 'adjunto_factura') ||
      (!principal && (!Number.isSafeInteger(x.documentoBaseId) || x.documentoBaseId <= 0)))
      throw new BadRequestException('TMP_DOCUMENTAL_RELATION_INVALID');
    if (!x.metadata || typeof x.metadata !== 'object' || Array.isArray(x.metadata))
      throw new BadRequestException('TMP_DOCUMENTAL_METADATA_REQUIRED');
    if ((x.metadata.tipoDocumental != null && x.metadata.tipoDocumental !== x.tipoDocumental) ||
      (x.metadata.tipoRelacion != null && x.metadata.tipoRelacion !== x.tipoRelacion) ||
      (x.grupoFacturaId != null && (!Number.isSafeInteger(x.grupoFacturaId) || x.grupoFacturaId <= 0)) ||
      (x.orden != null && (!Number.isSafeInteger(x.orden) || x.orden < 0)))
      throw new BadRequestException('TMP_DOCUMENTAL_CONTEXT_INVALID');
    if (complete) {
      const f = x.metadata.fechaEmision;
      const d = typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) ? new Date(`${f}T00:00:00.000Z`) : new Date(NaN);
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== f || Number(f.slice(0,4)) < 1900)
        throw new BadRequestException('TMP_DOCUMENTAL_DATE_INVALID');
    }
    return x;
  }
  private assertDocumentalLive(row: TmpRow) {
    if (row.estado !== 'almacenada' || !row.expira_en || !Number.isFinite(new Date(row.expira_en).getTime()) || new Date(row.expira_en).getTime() <= Date.now())
      throw new ConflictException('TMP_DOCUMENTAL_EXPIRED_OR_NOT_STAGED');
  }
  async documental(id: number, actor: Identity, raw: unknown, draft = false) {
    this.id(id);
    const input = this.documentalInput(raw, !draft);
    if (!draft && (!this.documentos || !this.documentalV2))
      throw new ServiceUnavailableException('TMP_DOCUMENTAL_DEPENDENCIES_REQUIRED');
    for (const [key, expected] of Object.entries({ empresaCodigo: actor.empresaCodigo,
      clienteAbreviatura: actor.empresaCodigo, workspaceId: actor.workspaceId, clienteDestinoId: actor.clienteDestinoId })) {
      if (input.metadata[key] != null && String(input.metadata[key]) !== String(expected))
        throw new ConflictException('TMP_DOCUMENTAL_TENANT_CONFLICT');
    }
    const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
    const fingerprint = createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex');
    const consumer = 'COMPRAS_TEMP_DOCUMENTAL';
    const key = await this.repository.locked(String(id), async c => {
      const row = await this.repository.own(c, id, actor);
      const claim = row.metadata?.integration;
      if (claim) {
        if (draft || claim.consumer !== consumer || claim.identity !== actor.idempotencyKey ||
          row.metadata?.documentalFingerprint !== fingerprint) throw new ConflictException('TMP_DOCUMENTAL_IDEMPOTENCY_CONFLICT');
        return row.metadata.destinoReservado;
      }
      this.assertDocumentalLive(row);
      if (row.metadata?.destinoReservado || row.promovida_en) throw new ConflictException('TMP_DOCUMENTAL_ALREADY_RESERVED');
      await this.repository.assertDocumentalScope(c, row, input);
      if (draft) {
        await this.repository.saveDocumentalMetadata(c, id, { ...row.metadata, borradorDocumental: input });
        return null;
      }
      await this.documentos!.validarTemporalAntesDeReserva(c, row, input);
      const destination = buildCargaSeguraStorageKey({ operacionId: id, empresaCodigo: row.empresa_codigo,
        nombreArchivo: row.nombre_archivo_original, fecha: new Date(`${input.metadata.fechaEmision}T00:00:00.000Z`) });
      await this.repository.saveDocumentalMetadata(c, id, { ...row.metadata, borradorDocumental: input,
        documentalFingerprint: fingerprint, destinoReservado: destination, promocionIdentity: actor.idempotencyKey,
        integration: { consumer, identity: actor.idempotencyKey, completed: false } });
      return destination;
    });
    if (draft) return this.consult(id, actor);
    if (!this.documentos || !this.documentalV2) throw new ServiceUnavailableException('TMP_DOCUMENTAL_DEPENDENCIES_REQUIRED');
    await this.promote(id, actor, key, { consumer, identity: actor.idempotencyKey,
      persist: async (tx, row, destination) => {
        await this.repository.assertDocumentalScope(tx, row, input);
        const created = await this.documentos!.materializarTemporalConExecutor(tx, row, destination, input, actor);
        const confirmed = await this.documentalV2!.integrarTemporalConExecutor(tx, created.confirmed, input,
          { usuarioId: actor.actorId, requestId: actor.requestId, correlationId: actor.correlationId });
        await tx`UPDATE documentos.carga_operaciones SET documento_id=${created.documentoId}, archivo_id=${created.archivoId},
          metadata=jsonb_set(metadata,'{documentalResult}',${JSON.stringify({ ...confirmed, archivoId: created.archivoId,
            documentoId: created.documentoId, tempId: id })}::jsonb) WHERE id=${id}`;
      } });
    return this.repository.locked(String(id), async c => {
      const row = await this.repository.own(c, id, actor);
      if (!row.metadata?.integration?.completed || !row.metadata?.documentalResult) throw new ConflictException('TMP_DOCUMENTAL_INCOMPLETE');
      return row.metadata.documentalResult;
    });
  }
  async promote(id: number, actor: Identity, destination: unknown, integration?: TmpIntegration) {
    this.id(id);
    return this.repository.locked(String(id), async c => {
      let row = await this.repository.own(c, id, actor);
      assertTmpIntegration(row, integration);
      this.destination(row, destination, actor.idempotencyKey);
      const key = destination as string;
      if (row.metadata.destinoReservado && (row.metadata.destinoReservado !== key || row.metadata.promocionIdentity !== actor.idempotencyKey)) {
        throw new ConflictException('TMP_DESTINATION_CONFLICT');
      }
      if (row.estado === 'completada') return this.result(row);
      if (row.estado === 'iniciada') throw new ConflictException('TMP_NOT_STAGED');
      if (!row.promovida_en) {
        await this.repository.bind(c, row, key, actor.idempotencyKey);
        await this.verify(row, row.storage_key);
        await this.storage.copyObject({ provider: 'r2', bucket: row.storage_bucket, sourceKey: row.storage_key, destinationKey: key,
          operationIdentity: `tmp:${row.id}:${actor.idempotencyKey}`, hashSha256: row.hash_sha256,
          tamanoBytes: Number(row.tamano_bytes), contentType: row.content_type || 'application/octet-stream' });
        await this.verify(row, key);
        await this.repository.promoted(c, row, actor, key, integration);
        row = await this.repository.own(c, id, actor);
      } else {
        await this.verify(row, key);
      }
      // El destino y su auditoría ya están confirmados. Un fallo de cleanup no los revierte.
      try { await this.storage.deleteObject(this.source(row)); }
      catch { return this.result(row); }
      await this.repository.cleaned(c, id);
      return this.result(await this.repository.own(c, id, actor));
    });
  }
  private id(id: number) { if (!Number.isSafeInteger(id) || id <= 0) throw new BadRequestException('tempId inválido'); }
  private destination(row: TmpRow, key: unknown, identity: string) {
    // Las reservas anteriores conservan su destino literal e identidad de promoción.
    const parts = typeof key === 'string' ? key.split('/') : [];
    const historical = parts[1] === 'carga-segura';
    const offset = historical ? 1 : 0;
    if (parts.length !== 5 + offset || parts[0] !== 'documentos' ||
      !/^\d{4}$/.test(parts[1 + offset]) || !/^(0[1-9]|1[0-2])$/.test(parts[2 + offset]) ||
      parts[3 + offset] !== row.empresa_codigo || !/^[a-zA-Z0-9_-]+$/.test(parts[3 + offset]) ||
      !parts[4 + offset].startsWith(`${row.id}__`) || !/^[a-zA-Z0-9._-]+$/.test(parts[4 + offset]) ||
      parts[4 + offset].includes('..') || parts[4 + offset].length > 220) {
      throw new BadRequestException('Destino fuera del namespace autorizado');
    }
    if (historical) {
      if (!row.metadata?.destinoReservado) {
        throw new BadRequestException('Destino histórico fuera del namespace autorizado para nuevas promociones');
      }
      if (typeof identity !== 'string' || !identity.trim() ||
        row.metadata.destinoReservado !== key || row.metadata.promocionIdentity !== identity) {
        throw new ConflictException('TMP_DESTINATION_CONFLICT');
      }
    }
  }
  private source(row: TmpRow) { return { provider: 'r2' as const, bucket: row.storage_bucket as string, key: row.storage_key as string }; }
  private async verify(row: TmpRow, key: string) {
    const stat = await this.storage.statObject({ ...this.source(row), key });
    if (!stat.exists || stat.tamanoBytes !== Number(row.tamano_bytes) || stat.hashSha256 !== row.hash_sha256) {
      throw new ConflictException('TMP_STORAGE_VERIFICATION_FAILED');
    }
  }
  private result(row: TmpRow) {
    return { tempId: Number(row.id), estado: row.estado === 'completada' ? 'PROMOTED' : row.promovida_en ? 'CLEANUP_PENDING' : row.estado === 'iniciada' ? 'RESERVED' : 'STAGED',
      actorId: Number(row.actor_id), workspaceId: Number(row.workspace_id), empresaCodigo: row.empresa_codigo,
      clienteDestinoId: Number(row.cliente_destino_id), nombreOriginal: row.nombre_archivo_original, mime: row.content_type,
      tamanoBytes: Number(row.tamano_bytes), hashSha256: row.hash_sha256, storageKey: row.storage_key,
      borradorDocumental: row.metadata?.borradorDocumental ?? null,
      ocrCandidate: row.metadata?.ocrCandidate ?? null, documentalResult: row.metadata?.documentalResult ?? null,
      expiraEn: row.expira_en, creadoEn: row.iniciada_en, destinoStorageKey: row.destino_storage_key ?? null };
  }

  async previewUrl(id: number, actor: Identity) {
    this.id(id);

    return this.repository.locked(String(id), async c => {
      const row = await this.repository.own(c, id, actor);

      if (String(row.estado ?? '').toLowerCase() !== 'almacenada') {
        throw new ConflictException('TEMP_PREVIEW_ESTADO_NO_ELEGIBLE');
      }

      const expiraEn = row.expira_en instanceof Date
        ? row.expira_en
        : new Date(row.expira_en);

      if (
        (!row.expira_en || Number.isNaN(expiraEn.getTime()) || expiraEn.getTime() <= Date.now()) &&
        !this.isPendingOpRegularization(row)
      ) {
        throw new ConflictException('TEMP_EXPIRADO');
      }

      const storageKey = String(row.storage_key ?? '').trim();
      if (!storageKey) {
        throw new ConflictException('TEMP_STORAGE_KEY_NO_DISPONIBLE');
      }

      const stat = await this.storage.statObject(this.source(row));
      if (!stat?.exists) {
        throw new ConflictException('TMP_STORAGE_NOT_FOUND');
      }

      return this.preview.getTempPreviewUrl({
        tempId: id,
        filename: row.nombre_archivo_original ?? null,
        storageProvider: row.storage_provider,
        storageBucket: row.storage_bucket,
        storageKey,
      });
    });
  }

  async procesarOcr(
    tempId: number,
    actor: Identity,
    tipoEsperado: string,
  ) {
    this.id(tempId);
    const tipo = String(tipoEsperado ?? '').trim().toUpperCase();

    if (!['OC', 'OS', 'FACTURA', 'RECIBO_HONORARIO'].includes(tipo)) {
      throw new BadRequestException('TEMP_OCR_TIPO_NO_PERMITIDO');
    }

    const decision = await this.repository.locked(String(tempId), async c => {
      const row = await this.repository.own(c, tempId, actor);

      if (String(row.estado ?? '').toLowerCase() !== 'almacenada') {
        throw new ConflictException('TEMP_OCR_ESTADO_NO_ELEGIBLE');
      }

      const storageKey = String(row.storage_key ?? '').trim();
      if (!storageKey) {
        throw new ConflictException('TEMP_STORAGE_KEY_NO_DISPONIBLE');
      }

      const storageProvider = String(row.storage_provider ?? '').trim().toLowerCase();
      if (storageProvider !== 'r2') {
        throw new ConflictException('TEMP_STORAGE_PROVIDER_NO_DISPONIBLE');
      }

      const expiraEn = row.expira_en instanceof Date
        ? row.expira_en
        : new Date(row.expira_en);

      if ((!row.expira_en || Number.isNaN(expiraEn.getTime()) || expiraEn.getTime() <= Date.now()) &&
          !(this.isPendingOpRegularization(row) && row.metadata.regularizacionOp.tipoRegularizador === tipo)) {
        throw new ConflictException('TEMP_EXPIRADO');
      }

      const candidate = row.metadata?.ocrCandidate;

      if (candidate) {
        if (candidate.tipoEsperado !== tipo) {
          throw new ConflictException('TEMP_OCR_TIPO_CONFLICT');
        }

        if (candidate.status === 'DONE') {
          return {
            dispatch: false as const,
            done: true as const,
            resultado: candidate.resultado,
          };
        }

        if (candidate.status === 'PROCESSING') {
          return {
            dispatch: false as const,
            done: false as const,
          };
        }

        throw new ConflictException('TEMP_OCR_ESTADO_CANDIDATO_INVALIDO');
      }

      const stat = await this.storage.statObject({
        provider: 'r2',
        bucket: row.storage_bucket,
        key: storageKey,
      });

      if (!stat?.exists) {
        throw new ConflictException('TMP_STORAGE_NOT_FOUND');
      }

      const attemptId = randomUUID();
      await this.repository.ocrProcessing(c, tempId, tipo, { storageKey, attemptId });

      return {
        dispatch: true as const,
        row,
        storageKey,
        attemptId,
      };
    });

    if (!decision.dispatch) {
      if (decision.done) {
        return {
          ...(decision.resultado && typeof decision.resultado === 'object'
            ? decision.resultado
            : {}),
          tempId,
          documentoId: null,
          archivoId: null,
          temporal: true,
          persistido: false,
          tipoEsperado: tipo,
          ocrEstado: 'DONE',
        };
      }

      return {
        tempId,
        documentoId: null,
        archivoId: null,
        temporal: true,
        persistido: false,
        tipoEsperado: tipo,
        ocrEstado: 'PROCESSING',
      };
    }

    const row = decision.row;
    const clienteAbreviatura = String(
      row.empresa_codigo ?? '',
    ).trim().toUpperCase();

    if (!clienteAbreviatura) {
      throw new BadRequestException('TEMP_OCR_CLIENTE_NO_DISPONIBLE');
    }

    const requestId = String(actor.requestId ?? '').trim() || undefined;

    const ocrRequestSubject =
      process.env.OCR_REQUEST_SUBJECT?.trim() ||
      NatsSubjects.OcrProcesarArchivo;

    const resultado = await firstValueFrom(
      this.nats
        .send(ocrRequestSubject, {
          documentoId: null,
          archivoId: null,
          storageProvider: 'r2',
          storageKey: decision.storageKey,
          nombreOriginal: row.nombre_archivo_original ?? undefined,
          tipoSolicitud: 'clasificar_extraer',
          requestId,
          clienteAbreviatura,
          areaOrigen: 'FINANZAS',
          tipoEsperado: tipo,
          canalIngreso: 'TEMP_REGULARIZACION_OP',
        })
        .pipe(timeout(120000)),
    );

    const accepted = await this.repository.locked(String(tempId), async c => {
      const current = await this.repository.own(c, tempId, actor);
      const candidate = current.metadata?.ocrCandidate;

      // Admission and OCR acceptance use the same tmp:tempId advisory lock.
      // Once human confirmation reserves its input, late OCR must not mutate it.
      if (current.metadata?.integration?.consumer === 'COMPRAS_TEMP_DOCUMENTAL') return false;

      if (current.storage_key !== decision.storageKey || candidate?.storageKey !== decision.storageKey || candidate?.attemptId !== decision.attemptId) {
        const cleanup = current.metadata?.replacement?.cleanup;
        if (cleanup?.key === decision.storageKey && cleanup.oldOcrPending) {
          cleanup.oldOcrPending = false;
          await this.cleanupPreviousPdf(c, current);
        }
        return false;
      }
      if (
        candidate?.status !== 'PROCESSING' ||
        candidate?.tipoEsperado !== tipo
      ) {
        throw new ConflictException('TEMP_OCR_CLAIM_INVALIDO');
      }

      const persisted = await this.repository.ocrDone(c, tempId, tipo, resultado, { storageKey: decision.storageKey, attemptId: decision.attemptId });
      if (persisted === false) return false;
      return true;
    });
    if (!accepted) throw new ConflictException('TEMP_OCR_STALE_RESULT_DISCARDED');

    return {
      ...(resultado && typeof resultado === 'object' ? resultado : {}),
      tempId,
      documentoId: null,
      archivoId: null,
      temporal: true,
      persistido: false,
      tipoEsperado: tipo,
      ocrEstado: 'DONE',
    };
  }

}
