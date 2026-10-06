import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { sql } from '@documental/database';
import type { CargaSeguraHttpResolvedIdentity as Identity } from '../carga-segura/http/carga-segura-http.validation';

export type TmpConnection = Awaited<ReturnType<typeof sql.reserve>>;
type Connection = TmpConnection;
export type TmpRow = Record<string, any>;
// Extensión interna: ningún endpoint acepta callbacks o identidades consumidoras.
export interface TmpIntegration {
  consumer: string;
  identity: string;
  persist(tx: Connection, row: TmpRow, destination: string): Promise<void>;
}
export function assertTmpIntegration(row: TmpRow, integration?: TmpIntegration) {
  const required = row.metadata?.integration;
  if (required && (!integration || required.consumer !== integration.consumer || required.identity !== integration.identity)) {
    throw new ConflictException('TMP_INTEGRATION_REQUIRED');
  }
  if (integration && !required) throw new ConflictException('TMP_INTEGRATION_NOT_RESERVED');
  if (required && row.promovida_en && required.completed !== true) throw new ConflictException('TMP_INTEGRATION_INCOMPLETE');
}
@Injectable()
export class TmpRepository {
  async transaction<T>(c: Connection, work: (tx: Connection) => Promise<T>): Promise<T> {
    // postgres-js reserve() mantiene la conexión, pero no expone begin() en runtime.
    await c.unsafe('BEGIN');
    try {
      const result = await work(c);
      await c.unsafe('COMMIT');
      return result;
    } catch (error) {
      await c.unsafe('ROLLBACK');
      throw error;
    }
  }
  async locked<T>(key: string, work: (connection: Connection) => Promise<T>): Promise<T> {
    const connection = await sql.reserve();
    try {
      await connection`SELECT pg_advisory_lock(hashtextextended(${`tmp:${key}`}, 0))`;
      return await work(connection);
    } finally {
      try { await connection`SELECT pg_advisory_unlock(hashtextextended(${`tmp:${key}`}, 0))`; }
      finally { connection.release(); }
    }
  }
  async reserve(c: Connection, actor: Identity, file: { name: string; mime: string; size: number; hash: string }, fingerprint: string, bucket: string): Promise<TmpRow> {
    return this.transaction(c, async tx => {
      const previous = await tx`SELECT * FROM documentos.carga_operaciones WHERE operacion_tipo='tmp'
        AND workspace_id=${actor.workspaceId} AND empresa_codigo=${actor.empresaCodigo} AND idempotency_key=${actor.idempotencyKey}`;
      if (previous.length) {
        if (previous[0].payload_fingerprint !== fingerprint) throw new ConflictException('TMP_IDEMPOTENCY_CONFLICT');
        return previous[0];
      }
      const [row] = await tx`INSERT INTO documentos.carga_operaciones
        (operacion_tipo,workspace_id,empresa_codigo,cliente_destino_id,actor_id,idempotency_key,
         payload_fingerprint,request_id,correlation_id,canal_ingreso,nombre_archivo_original,content_type,
         tamano_bytes,hash_sha256,storage_provider,storage_bucket,expira_en)
        VALUES ('tmp',${actor.workspaceId},${actor.empresaCodigo},${actor.clienteDestinoId},${actor.actorId},${actor.idempotencyKey},
          ${fingerprint},${actor.requestId},${actor.correlationId},'TMP',${file.name},${file.mime},${file.size},${file.hash},'r2',${bucket},now()+interval '24 hours') RETURNING *`;
      const key = `documentos/tmp/${actor.workspaceId}/${row.id}`;
      await tx`UPDATE documentos.carga_operaciones SET storage_key=${key} WHERE id=${row.id}`;
      await this.audit(tx, row.id, actor, 'TMP_RESERVADO', { storageKey: key, hash: file.hash, tamanoBytes: file.size });
      return { ...row, storage_key: key };
    });
  }
  async own(c: Connection, id: number, actor: Identity): Promise<TmpRow> {
    const [row] = await c`SELECT * FROM documentos.carga_operaciones WHERE id=${id} AND operacion_tipo='tmp'
      AND actor_id=${actor.actorId} AND workspace_id=${actor.workspaceId} AND empresa_codigo=${actor.empresaCodigo}
      AND cliente_destino_id=${actor.clienteDestinoId}`;
    if (!row) throw new NotFoundException('TEMP no disponible');
    return row;
  }
  async staged(c: Connection, id: number) {
    await c`UPDATE documentos.carga_operaciones SET estado='almacenada', almacenada_en=now(), actualizado_en=now() WHERE id=${id} AND estado='iniciada'`;
  }

  async replaceLostRegularizacionOp(
    c: Connection,
    row: TmpRow,
    actor: Identity,
    file: { name: string; mime: string; size: number; hash: string },
    fingerprint: string,
    bucket: string,
  ): Promise<TmpRow> {
    const regularizacionOp = row.metadata?.regularizacionOp;

    if (
      !regularizacionOp ||
      regularizacionOp.consumer !== 'REGULARIZACION_OP'
    ) {
      throw new ConflictException('TEMP_REGULARIZACION_OP_NO_VINCULADO');
    }

    const metadata = {
      ...row.metadata,
      regularizacionOp,
    };

    // La generación física anterior se perdió: su OCR ya no corresponde.
    delete metadata.ocrCandidate;
    delete metadata.destinoReservado;
    delete metadata.promocionIdentity;

    const [updated] = await c`
      UPDATE documentos.carga_operaciones
      SET payload_fingerprint = ${fingerprint},
          request_id = ${actor.requestId},
          correlation_id = ${actor.correlationId},
          nombre_archivo_original = ${file.name},
          content_type = ${file.mime},
          tamano_bytes = ${file.size},
          hash_sha256 = ${file.hash},
          storage_provider = 'r2',
          storage_bucket = ${bucket},
          estado = 'iniciada',
          almacenada_en = NULL,
          promovida_en = NULL,
          destino_storage_key = NULL,
          expira_en = now() + interval '24 hours',
          metadata = ${JSON.stringify(metadata)}::jsonb,
          actualizado_en = now()
      WHERE id = ${row.id}
        AND operacion_tipo = 'tmp'
        AND actor_id = ${actor.actorId}
        AND workspace_id = ${actor.workspaceId}
        AND empresa_codigo = ${actor.empresaCodigo}
        AND cliente_destino_id = ${actor.clienteDestinoId}
        AND promovida_en IS NULL
      RETURNING *
    `;

    if (!updated) {
      throw new ConflictException('TEMP_REGULARIZACION_OP_REEMPLAZO_CONFLICT');
    }

    await this.audit(c, row.id, actor, 'TMP_REGULARIZACION_OP_REEMPLAZADO', {
      storageKey: updated.storage_key,
      hash: file.hash,
      tamanoBytes: file.size,
      ordenPagoId: regularizacionOp.ordenPagoId,
      tipoRegularizador: regularizacionOp.tipoRegularizador,
    });

    return updated;
  }

  async bindRegularizacionOp(
    c: Connection,
    id: number,
    actor: Identity,
    ordenPagoId: number,
    tipoRegularizador: string,
  ) {
    const identity = {
      consumer: 'REGULARIZACION_OP',
      ordenPagoId,
      tipoRegularizador,
    };

    await c`
      UPDATE documentos.carga_operaciones
      SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{regularizacionOp}',
            ${JSON.stringify(identity)}::jsonb
          ),
          actualizado_en = now()
      WHERE id = ${id}
        AND operacion_tipo = 'tmp'
        AND actor_id = ${actor.actorId}
        AND workspace_id = ${actor.workspaceId}
        AND empresa_codigo = ${actor.empresaCodigo}
        AND cliente_destino_id = ${actor.clienteDestinoId}
    `;
  }

  async findRegularizacionOp(
    c: Connection,
    actor: Identity,
    ordenPagoId: number,
    tipoRegularizador: string,
  ): Promise<TmpRow | null> {
    const [row] = await c`
      SELECT *
      FROM documentos.carga_operaciones
      WHERE operacion_tipo = 'tmp'
        AND actor_id = ${actor.actorId}
        AND workspace_id = ${actor.workspaceId}
        AND empresa_codigo = ${actor.empresaCodigo}
        AND cliente_destino_id = ${actor.clienteDestinoId}
        AND metadata->'regularizacionOp'->>'consumer' = 'REGULARIZACION_OP'
        AND metadata->'regularizacionOp'->>'ordenPagoId' = ${String(ordenPagoId)}
        AND metadata->'regularizacionOp'->>'tipoRegularizador' = ${tipoRegularizador}
        AND promovida_en IS NULL
      ORDER BY id DESC
      LIMIT 1
    `;

    return row ?? null;
  }
  async bind(c: Connection, row: TmpRow, destination: string, identity: string) {
    const metadata = { ...row.metadata, destinoReservado: destination, promocionIdentity: identity };
    await c`UPDATE documentos.carga_operaciones SET metadata=${JSON.stringify(metadata)}::jsonb, actualizado_en=now() WHERE id=${row.id}`;
  }

  async ocrProcessing(c: Connection, id: number, tipoEsperado: string) {
    const candidate = {
      status: 'PROCESSING',
      tipoEsperado,
      startedAt: new Date().toISOString(),
    };
    await c`UPDATE documentos.carga_operaciones
      SET metadata=jsonb_set(metadata, '{ocrCandidate}', ${JSON.stringify(candidate)}::jsonb),
          actualizado_en=now()
      WHERE id=${id} AND operacion_tipo='tmp'`;
  }

  async ocrDone(c: Connection, id: number, tipoEsperado: string, resultado: unknown) {
    const candidate = {
      status: 'DONE',
      tipoEsperado,
      completedAt: new Date().toISOString(),
      resultado,
    };
    await c`UPDATE documentos.carga_operaciones
      SET metadata=jsonb_set(metadata, '{ocrCandidate}', ${JSON.stringify(candidate)}::jsonb),
          actualizado_en=now()
      WHERE id=${id} AND operacion_tipo='tmp'`;
  }
  async promoted(c: Connection, row: TmpRow, actor: Identity, destination: string, integration?: TmpIntegration) {
    await this.transaction(c, async tx => {
      if (integration) {
        const [current] = await tx`SELECT * FROM documentos.carga_operaciones WHERE id=${row.id} FOR UPDATE`;
        assertTmpIntegration(current, integration);
        if (current.metadata.destinoReservado !== destination || current.metadata.promocionIdentity !== actor.idempotencyKey) {
          throw new ConflictException('TMP_DESTINATION_CONFLICT');
        }
        await integration.persist(tx, current, destination);
        await tx`UPDATE documentos.carga_operaciones SET metadata=jsonb_set(metadata, '{integration,completed}', 'true'::jsonb) WHERE id=${row.id}`;
      }
      await tx`UPDATE documentos.carga_operaciones SET estado='requiere_reconciliacion',requiere_reconciliacion=true,
        destino_storage_provider=storage_provider,destino_storage_bucket=storage_bucket,destino_storage_key=${destination},
        destino_hash_sha256=hash_sha256,destino_tamano_bytes=tamano_bytes,promovida_en=now(),actualizado_en=now() WHERE id=${row.id}`;
      await this.audit(tx, row.id, actor, 'TMP_PROMOVIDO', { destino: destination, hash: row.hash_sha256, tamanoBytes: Number(row.tamano_bytes) });
    });
  }
  async cleaned(c: Connection, id: number) {
    await c`UPDATE documentos.carga_operaciones SET estado='completada',requiere_reconciliacion=false,
      completada_en=now(),actualizado_en=now() WHERE id=${id}`;
  }
  private async audit(tx: any, id: number, actor: Identity, action: string, result: object) {
    const requestId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actor.requestId) ? actor.requestId : null;
    await tx`INSERT INTO core.auditoria_eventos(workspace_id,request_id,usuario_id,empresa_codigo,modulo,entidad,entidad_id,accion,descripcion,despues)
      VALUES (${actor.workspaceId},${requestId},${actor.actorId},${actor.empresaCodigo},'documentos','tmp',${String(id)},${action},${action},
        ${JSON.stringify({ tempId: Number(id), requestId: actor.requestId, clienteDestinoId: actor.clienteDestinoId, correlationId: actor.correlationId, ...result })}::jsonb)`;
  }
}
