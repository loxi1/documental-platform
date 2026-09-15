import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CARGA_SEGURA_STORAGE } from '../carga-segura/carga-segura.constants';
import type { CargaSeguraStorage } from '../carga-segura/carga-segura.storage';
import type { CargaSeguraHttpResolvedIdentity as Identity } from '../carga-segura/http/carga-segura-http.validation';
import { validateCargaSeguraFileSignature } from '../carga-segura/http/carga-segura-file-signature';
import { sanitizeCargaSeguraFilename } from '../carga-segura/http/carga-segura-filename';
import { validateCargaSeguraFileSize } from '../carga-segura/http/carga-segura-http.validation';
import { TmpRepository, TmpRow, TmpIntegration, assertTmpIntegration } from './tmp.repository';

@Injectable()
export class TmpService {
  constructor(private readonly repository: TmpRepository, private readonly config: ConfigService,
    @Inject(CARGA_SEGURA_STORAGE) private readonly storage: CargaSeguraStorage) {}

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
          await this.storage.putObject({ ...this.source(current), body: file.buffer, contentType: mime, hashSha256: hash });
          await this.verify(current, current.storage_key);
          await this.repository.staged(locked, Number(row.id));
        }
        return this.result(await this.repository.own(locked, Number(row.id), actor));
      });
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
  async promote(id: number, actor: Identity, destination: unknown, integration?: TmpIntegration) {
    this.id(id);
    return this.repository.locked(String(id), async c => {
      let row = await this.repository.own(c, id, actor);
      assertTmpIntegration(row, integration);
      this.destination(row, destination);
      const key = destination as string;
      if (row.metadata.destinoReservado && (row.metadata.destinoReservado !== key || row.metadata.promocionIdentity !== actor.idempotencyKey)) {
        throw new ConflictException('TMP_DESTINATION_CONFLICT');
      }
      if (row.estado === 'completada') return this.result(row);
      if (row.estado === 'iniciada') throw new ConflictException('TMP_NOT_STAGED');
      if (!row.promovida_en) {
        await this.repository.bind(c, row, key, actor.idempotencyKey);
        await this.verify(row, row.storage_key);
        const existing = await this.storage.statObject({ ...this.source(row), key });
        if (!existing.exists) await this.storage.copyObject({ provider: 'r2', bucket: row.storage_bucket, sourceKey: row.storage_key, destinationKey: key });
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
  private destination(row: TmpRow, key: unknown) {
    // Reutiliza el namespace definitivo existente y la identidad global de carga_operaciones.
    const parts = typeof key === 'string' ? key.split('/') : [];
    if (parts.length !== 6 || parts[0] !== 'documentos' || parts[1] !== 'carga-segura' ||
      !/^\d{4}$/.test(parts[2]) || !/^(0[1-9]|1[0-2])$/.test(parts[3]) || parts[4] !== row.empresa_codigo ||
      !parts[5].startsWith(`${row.id}__`) || !/^[a-zA-Z0-9_-]+$/.test(parts[4]) ||
      !/^[a-zA-Z0-9._-]+$/.test(parts[5]) || parts[5].includes('..') || parts[5].length > 220) {
      throw new BadRequestException('Destino fuera del namespace autorizado');
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
      creadoEn: row.iniciada_en, destinoStorageKey: row.destino_storage_key ?? null };
  }
}
