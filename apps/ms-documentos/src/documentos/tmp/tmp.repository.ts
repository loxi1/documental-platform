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
    generation: { storageKey: string; generationId: string; attemptIdentity: string },
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
      replacement: { ...generation, ownership: 'CREATED', previousStorageKey: row.storage_key, fingerprint,
        cleanup: { bucket: row.storage_bucket, key: row.storage_key, status: 'PENDING',
          owned: row.metadata?.physicalFile?.key === row.storage_key && row.metadata?.physicalFile?.bucket === row.storage_bucket || row.metadata?.replacement?.storageKey === row.storage_key && row.metadata?.replacement?.ownership === 'CREATED',
          oldOcrPending: row.metadata?.ocrCandidate?.status === 'PROCESSING' } },
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
          storage_key = ${generation.storageKey},
          estado = 'iniciada',
          almacenada_en = NULL,
          promovida_en = NULL,
          destino_storage_key = NULL,
          expira_en = now() + interval '24 hours',
          metadata = ${JSON.stringify(metadata)}::text::jsonb,
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
      previousStorageKey: row.storage_key,
      generationId: generation.generationId,
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

    if (row) return row;

    // Historical TEMP operations are not unique per OP/type. Never choose an
    // arbitrary promoted document when the pending candidate no longer exists.
    const promoted = await c`
      SELECT * FROM documentos.carga_operaciones
      WHERE operacion_tipo='tmp' AND actor_id=${actor.actorId}
        AND workspace_id=${actor.workspaceId} AND empresa_codigo=${actor.empresaCodigo}
        AND cliente_destino_id=${actor.clienteDestinoId}
        AND metadata->'regularizacionOp'->>'consumer'='REGULARIZACION_OP'
        AND metadata->'regularizacionOp'->>'ordenPagoId'=${String(ordenPagoId)}
        AND metadata->'regularizacionOp'->>'tipoRegularizador'=${tipoRegularizador}
        AND promovida_en IS NOT NULL
      ORDER BY id DESC LIMIT 2
    `;
    if (promoted.length > 1) throw new ConflictException('TEMP_REGULARIZACION_OP_RECOVERY_AMBIGUOUS');
    return promoted[0] ?? null;
  }

  async promotedRegularizacionOpIdentity(c: Connection, row: TmpRow, actor: Identity, ordenPagoId: number, tipo: string) {
    const rows = await c`
      SELECT d.id AS "documentoId", a.id AS "archivoId",
        d.serie, d.numero, d.fecha_emision::text AS "fechaEmision",
        d.ruc_emisor AS "rucEmisor", d.razon_social_emisor AS "razonSocialEmisor",
        d.moneda, d.monto_total::text AS "montoTotal",
        a.storage_provider, a.storage_bucket, a.storage_key, a.hash_sha256
      FROM documentos.documentos_operativos_principales p
      JOIN documentos.contenedores_operativos co ON co.id=p.contenedor_operativo_id
      JOIN documentos.documentos principal ON principal.id=p.documento_id
      JOIN documentos.documentos d ON d.id=${row.documento_id}
      JOIN documentos.documentos_archivos a ON a.id=${row.archivo_id} AND a.documento_id=d.id
      WHERE p.id=${ordenPagoId} AND p.tipo_principal='ORDEN_PAGO'
        AND p.estado='activo' AND p.es_principal_activo=true AND co.estado='activo'
        AND principal.tipo_documental='ORDEN_PAGO'
        AND principal.estado NOT IN ('anulado','observado','duplicado_versionado')
        AND co.empresa_codigo=${actor.empresaCodigo} AND co.cliente_destino_id=${actor.clienteDestinoId}
        AND principal.cliente_abreviatura=${actor.empresaCodigo}
        AND d.cliente_abreviatura=${actor.empresaCodigo} AND d.tipo_documental=${tipo} AND d.estado='confirmado'
        AND a.workspace_id=${actor.workspaceId} AND a.empresa_codigo=${actor.empresaCodigo}
        AND a.cliente_destino_id=${actor.clienteDestinoId} AND a.carga_operacion_id=${row.id}
        AND a.estado NOT IN ('anulado','duplicado_absorbido') AND a.es_version_actual=true
        AND NOT EXISTS (
          SELECT 1 FROM documentos.grupos_factura g
          WHERE g.factura_documento_id=d.id AND g.estado<>'anulado'
        )
        AND NOT EXISTS (
          SELECT 1 FROM documentos.grupo_factura_documentos rel
          JOIN documentos.grupos_factura g ON g.id=rel.grupo_factura_id
          WHERE rel.estado='activo' AND rel.documento_id=d.id
            AND (g.documento_operativo_principal_id<>p.id OR g.origen_obligacion<>'ORDEN_PAGO' OR g.estado='anulado')
        )
        AND NOT EXISTS (
          SELECT 1 FROM documentos.grupos_factura g
          JOIN documentos.grupo_factura_documentos rel ON rel.grupo_factura_id=g.id
          WHERE g.documento_operativo_principal_id=p.id AND g.origen_obligacion='ORDEN_PAGO'
            AND rel.estado='activo' AND rel.tipo_relacion IN ('regularizador_factura','regularizador_recibo_honorario')
            AND rel.documento_id<>d.id
        )
    `;
    if (rows.length !== 1) throw new ConflictException('TEMP_REGULARIZACION_OP_PROMOTED_IDENTITY_CONFLICT');
    return rows[0];
  }
  async bind(c: Connection, row: TmpRow, destination: string, identity: string) {
    const metadata = { ...row.metadata, destinoReservado: destination, promocionIdentity: identity };
    await c`UPDATE documentos.carga_operaciones SET metadata=${JSON.stringify(metadata)}::jsonb, actualizado_en=now() WHERE id=${row.id}`;
  }

  async markPhysicalOwnership(c: Connection, row: TmpRow) {
    await c`UPDATE documentos.carga_operaciones SET metadata=jsonb_set(metadata, '{physicalFile}', ${JSON.stringify({ key: row.storage_key, bucket: row.storage_bucket })}::jsonb) WHERE id=${row.id}`;
  }
  async cleanupState(c: Connection, row: TmpRow, cleanup: Record<string, any>) {
    await c`UPDATE documentos.carga_operaciones SET metadata=jsonb_set(metadata, '{replacement,cleanup}', ${JSON.stringify(cleanup)}::jsonb) WHERE id=${row.id} AND storage_key=${row.storage_key}`;
  }
  async oldObjectUnreferenced(c: Connection, row: TmpRow, bucket: string, key: string): Promise<boolean> {
    const [result] = await c`SELECT NOT EXISTS (
      SELECT 1 FROM documentos.carga_operaciones WHERE
        (storage_bucket=${bucket} AND storage_key=${key}) OR
        (destino_storage_bucket=${bucket} AND destino_storage_key=${key}) OR
        metadata->'ocrCandidate'->>'storageKey'=${key} OR
        (id <> ${row.id} AND metadata #>> '{replacement,cleanup,key}'=${key})
    ) AND NOT EXISTS (
      SELECT 1 FROM documentos.documentos_archivos WHERE (storage_bucket=${bucket} OR storage_bucket IS NULL) AND (storage_key=${key} OR ruta_archivo=${key})
    ) AND NOT EXISTS (
      SELECT 1 FROM documentos.ocr_resultados WHERE metadata->>'storageKey'=${key}
        OR metadata->>'storage_key'=${key}
    ) AS safe`;
    return result?.safe === true;
  }

  async ocrProcessing(c: Connection, id: number, tipoEsperado: string, identity?: { storageKey: string; attemptId: string }) {
    const candidate = {
      status: 'PROCESSING',
      ...identity,
      tipoEsperado,
      startedAt: new Date().toISOString(),
    };
    await c`UPDATE documentos.carga_operaciones
      SET metadata=jsonb_set(metadata, '{ocrCandidate}', ${JSON.stringify(candidate)}::jsonb),
          actualizado_en=now()
      WHERE id=${id} AND operacion_tipo='tmp'`;
  }

  async ocrDone(c: Connection, id: number, tipoEsperado: string, resultado: unknown, identity?: { storageKey: string; attemptId: string }) {
    const candidate = {
      status: 'DONE',
      ...identity,
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
