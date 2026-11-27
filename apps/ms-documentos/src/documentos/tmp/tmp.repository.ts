import { createHash } from 'node:crypto';
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { sql } from '@documental/database';
import type { CargaSeguraHttpResolvedIdentity as Identity } from '../carga-segura/http/carga-segura-http.validation';

export type TmpConnection = Awaited<ReturnType<typeof sql.reserve>>;
type Connection = TmpConnection;
// Solo se establece tras validar JWT y contexto; no proviene de headers/body.
export const COMPRAS_FACTURA_ACCESS = Symbol('comprasFacturaAccess');
export type ComprasFacturaContext = { expedienteId: number; documentoBaseId: number;
  tipoDocumental: 'FACTURA'; tipoRelacion: 'adjunto_factura'; origen: 'COMPRAS' };
export type TmpActor = Identity & { [COMPRAS_FACTURA_ACCESS]?: ComprasFacturaContext };
export function comprasFacturaContext(expedienteId: unknown, documentoBaseId: unknown): ComprasFacturaContext {
  if (![expedienteId, documentoBaseId].every(v => typeof v === 'number' || typeof v === 'string' && /^[1-9]\d*$/.test(v))) throw new ConflictException('TMP_COMPRAS_CONTEXT_INVALID');
  const e = Number(expedienteId), d = Number(documentoBaseId);
  if (![e, d].every(v => Number.isSafeInteger(v) && v > 0)) throw new ConflictException('TMP_COMPRAS_CONTEXT_INVALID');
  return { origen: 'COMPRAS', tipoDocumental: 'FACTURA', tipoRelacion: 'adjunto_factura', expedienteId: e, documentoBaseId: d };
}
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
  /** P3 only: session mutex on one reserved connection; no SQL transaction spans storage PUT. */
  async lockedBounded<T>(
    key: string,
    work: (connection: Connection) => Promise<T>,
    timeoutMs = 3000,
  ): Promise<T> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > 30000) {
      throw new RangeError('P3_LOCK_TIMEOUT_INVALID');
    }
    const connection = await sql.reserve();
    const lockKey = `tmp:carga-segura-r2:${key}`;
    let acquired = false;
    let primaryError: unknown;
    let failed = false;
    try {
      const deadline = performance.now() + timeoutMs;
      do {
        const [row] = await connection`SELECT pg_try_advisory_lock(hashtextextended(${lockKey}, 0)) AS acquired`;
        if (row?.acquired === true) {
          acquired = true;
          break;
        }
        if (performance.now() >= deadline) break;
        await new Promise(resolve => setTimeout(resolve, Math.min(50, Math.max(1, deadline - performance.now()))));
      } while (true);
      if (!acquired) throw new Error('P3_MUTEX_BUSY');
      return await work(connection);
    } catch (error) {
      failed = true;
      primaryError = error;
      throw error;
    } finally {
      try {
        if (acquired) {
          const [row] = await connection`SELECT pg_advisory_unlock(hashtextextended(${lockKey}, 0)) AS released`;
          if (row?.released !== true && !failed) throw new Error('P3_MUTEX_RELEASE_UNCONFIRMED');
        }
      } catch (cleanupError) {
        if (!failed) throw cleanupError;
        // The original failure is authoritative; the session may already be disconnected.
        void primaryError;
      } finally {
        connection.release();
      }
    }
  }

  async reserve(c: Connection, actor: Identity, file: { name: string; mime: string; size: number; hash: string }, fingerprint: string, bucket: string, context?: ComprasFacturaContext): Promise<TmpRow> {
    return this.transaction(c, async tx => {
      const aliasKey = actor.idempotencyKey;
      const previous = await tx`SELECT * FROM documentos.carga_operaciones WHERE operacion_tipo='tmp'
        AND workspace_id=${actor.workspaceId} AND empresa_codigo=${actor.empresaCodigo}
        AND (idempotency_key=${aliasKey} OR (metadata->'comprasTempAliases') ? ${aliasKey}) FOR UPDATE`;
      const equivalent = context ? this.comprasEquivalence(actor, file, bucket, context) : null;
      if (previous.length) {
        if (previous.length !== 1) throw new ConflictException('TMP_IDEMPOTENCY_CONFLICT');
        const row = previous[0];
        if (row.idempotency_key === aliasKey) {
          if (row.payload_fingerprint !== fingerprint || (context && !this.matchesCompras(row,actor,file,bucket,context)))
            throw new ConflictException('TMP_IDEMPOTENCY_CONFLICT');
        } else {
          const alias = row.metadata?.comprasTempAliases?.[aliasKey];
          if (!equivalent || alias?.fingerprint !== fingerprint || alias?.equivalence !== equivalent
              || !this.matchesCompras(row, actor, file, bucket, context!))
            throw new ConflictException('TMP_IDEMPOTENCY_CONFLICT');
        }
        return row;
      }
      if (context) {
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`tmp:compras-factura:${equivalent}`}, 0))`;
        const candidates = await tx`SELECT * FROM documentos.carga_operaciones WHERE operacion_tipo='tmp'
          AND actor_id=${actor.actorId} AND workspace_id=${actor.workspaceId} AND empresa_codigo=${actor.empresaCodigo}
          AND cliente_destino_id=${actor.clienteDestinoId} AND hash_sha256=${file.hash}
          AND content_type=${file.mime} AND tamano_bytes=${file.size} AND storage_provider='r2' AND storage_bucket=${bucket}
          AND metadata->'comprasFactura'=${tx.json(JSON.stringify(context))}::jsonb
          AND expira_en>now() ORDER BY id FOR UPDATE`;
        if (candidates.length > 1) throw new ConflictException('TMP_COMPRAS_EQUIVALENCIA_AMBIGUA: utiliza Facturas pendientes de confirmar.');
        if (candidates.length === 1) {
          const row = candidates[0];
          if (!this.matchesCompras(row, actor, file, bucket, context) || !['iniciada','almacenada'].includes(row.estado)
              || row.promovida_en || row.documento_id || row.archivo_id || row.metadata?.integration
              || row.metadata?.destinoReservado || row.metadata?.promocionIdentity || row.metadata?.regularizacionOp)
            throw new ConflictException('TMP_COMPRAS_CONFIRMACION_RESERVADA: utiliza Facturas pendientes de confirmar.');
          const alias = {fingerprint, equivalence: equivalent};
          const updated = await tx`UPDATE documentos.carga_operaciones SET metadata=jsonb_set(metadata,
            '{comprasTempAliases}', COALESCE(metadata->'comprasTempAliases','{}'::jsonb)
              || ${tx.json(JSON.stringify({[aliasKey]:alias}))}::jsonb),actualizado_en=now()
            WHERE id=${row.id} RETURNING *`;
          if (updated.length !== 1) throw new ConflictException('TMP_IDEMPOTENCY_CONFLICT');
          await this.audit(tx,row.id,actor,'TMP_COMPRAS_REUTILIZADO',{equivalence:equivalent});
          return updated[0];
        }
      }
      const [row] = await tx`INSERT INTO documentos.carga_operaciones
        (operacion_tipo,workspace_id,empresa_codigo,cliente_destino_id,actor_id,idempotency_key,
         payload_fingerprint,request_id,correlation_id,canal_ingreso,nombre_archivo_original,content_type,
         tamano_bytes,hash_sha256,storage_provider,storage_bucket,expira_en,metadata)
        VALUES ('tmp',${actor.workspaceId},${actor.empresaCodigo},${actor.clienteDestinoId},${actor.actorId},${actor.idempotencyKey},
          ${fingerprint},${actor.requestId},${actor.correlationId},'TMP',${file.name},${file.mime},${file.size},${file.hash},'r2',${bucket},now()+interval '24 hours',${tx.json(JSON.stringify(context ? { comprasFactura: context } : {}))}) RETURNING *`;
      const key = `documentos/tmp/${actor.workspaceId}/${row.id}`;
      await tx`UPDATE documentos.carga_operaciones SET storage_key=${key} WHERE id=${row.id}`;
      await this.audit(tx, row.id, actor, 'TMP_RESERVADO', { storageKey: key, hash: file.hash, tamanoBytes: file.size });
      return { ...row, storage_key: key };
    });
  }
  private comprasEquivalence(actor: Identity, file: {mime:string;size:number;hash:string}, bucket:string, context:ComprasFacturaContext) {
    if (context.origen !== 'COMPRAS' || context.tipoDocumental !== 'FACTURA' || context.tipoRelacion !== 'adjunto_factura'
        || ![context.expedienteId,context.documentoBaseId].every(v=>Number.isSafeInteger(v)&&v>0))
      throw new ConflictException('TMP_COMPRAS_CONTEXT_INVALID');
    return createHash('sha256').update(JSON.stringify([actor.actorId,actor.workspaceId,actor.empresaCodigo,actor.clienteDestinoId,
      context.origen,context.tipoDocumental,context.tipoRelacion,context.expedienteId,context.documentoBaseId,
      file.hash,file.mime,file.size,bucket])).digest('hex');
  }
  private matchesCompras(row:TmpRow, actor:Identity, file:{mime:string;size:number;hash:string},bucket:string,context:ComprasFacturaContext) {
    const saved=row.metadata?.comprasFactura;
    return Number(row.actor_id)===actor.actorId && Number(row.workspace_id)===actor.workspaceId
      && row.empresa_codigo===actor.empresaCodigo && Number(row.cliente_destino_id)===actor.clienteDestinoId
      && row.hash_sha256===file.hash && row.content_type===file.mime && Number(row.tamano_bytes)===file.size
      && row.storage_provider==='r2' && row.storage_bucket===bucket
      && saved && Object.keys(context).every(key=>saved[key]===context[key as keyof ComprasFacturaContext]);
  }
  async own(c: Connection, id: number, actor: TmpActor): Promise<TmpRow> {
    const context = actor[COMPRAS_FACTURA_ACCESS];
    if (context) {
      // workspaceId identifica una asignación personal, no el ámbito compartido.
      // Validar ambas asignaciones sin cambiar el workspace ni actor de la carga.
      const [row] = await c`SELECT * FROM documentos.carga_operaciones carga WHERE id=${id} AND operacion_tipo='tmp'
        AND empresa_codigo=${actor.empresaCodigo}
        AND cliente_destino_id=${actor.clienteDestinoId}
        AND metadata->'comprasFactura'=${c.json(JSON.stringify(context))}::jsonb
        AND EXISTS (
          SELECT 1 FROM auth.usuario_workspaces origen
          JOIN auth.usuario_workspaces acceso
            ON acceso.id=${actor.workspaceId} AND acceso.usuario_id=${actor.actorId}
            AND acceso.sistema_id=origen.sistema_id
            AND acceso.empresa_codigo=origen.empresa_codigo
            AND acceso.cliente_destino_id=origen.cliente_destino_id
          JOIN core.sistemas sistema ON sistema.id=acceso.sistema_id
          WHERE origen.id=carga.workspace_id AND origen.usuario_id=carga.actor_id
            AND origen.empresa_codigo=carga.empresa_codigo
            AND origen.cliente_destino_id=carga.cliente_destino_id
            AND sistema.codigo='DOCUMENTAL' AND sistema.estado='activo'
            AND acceso.estado='activo'
            AND (acceso.vigencia_desde IS NULL OR acceso.vigencia_desde<=CURRENT_DATE)
            AND (acceso.vigencia_hasta IS NULL OR acceso.vigencia_hasta>=CURRENT_DATE)
        )`;
      if (!row || row.metadata?.regularizacionOp ||
          (row.metadata?.integration && row.metadata.integration.consumer !== 'COMPRAS_TEMP_DOCUMENTAL'))
        throw new NotFoundException('TEMP no disponible');
      await this.assertDocumentalScope(c, row, context);
      return row;
    }
    const [row] = await c`SELECT * FROM documentos.carga_operaciones WHERE id=${id} AND operacion_tipo='tmp'
      AND actor_id=${actor.actorId} AND workspace_id=${actor.workspaceId} AND empresa_codigo=${actor.empresaCodigo}
      AND cliente_destino_id=${actor.clienteDestinoId}`;
    if (!row) throw new NotFoundException('TEMP no disponible');
    return row;
  }
  async listCompras(c: Connection, actor: TmpActor, context: ComprasFacturaContext): Promise<TmpRow[]> {
    await this.assertDocumentalScope(c, { empresa_codigo: actor.empresaCodigo, cliente_destino_id: actor.clienteDestinoId }, context);
    return c`SELECT * FROM documentos.carga_operaciones carga WHERE operacion_tipo='tmp'
      AND empresa_codigo=${actor.empresaCodigo}
      AND cliente_destino_id=${actor.clienteDestinoId}
      AND metadata->'comprasFactura'=${c.json(JSON.stringify(context))}::jsonb
      AND EXISTS (
        SELECT 1 FROM auth.usuario_workspaces origen
        JOIN auth.usuario_workspaces acceso
          ON acceso.id=${actor.workspaceId} AND acceso.usuario_id=${actor.actorId}
          AND acceso.sistema_id=origen.sistema_id
          AND acceso.empresa_codigo=origen.empresa_codigo
          AND acceso.cliente_destino_id=origen.cliente_destino_id
        JOIN core.sistemas sistema ON sistema.id=acceso.sistema_id
        WHERE origen.id=carga.workspace_id AND origen.usuario_id=carga.actor_id
          AND origen.empresa_codigo=carga.empresa_codigo
          AND origen.cliente_destino_id=carga.cliente_destino_id
          AND sistema.codigo='DOCUMENTAL' AND sistema.estado='activo'
          AND acceso.estado='activo'
          AND (acceso.vigencia_desde IS NULL OR acceso.vigencia_desde<=CURRENT_DATE)
          AND (acceso.vigencia_hasta IS NULL OR acceso.vigencia_hasta>=CURRENT_DATE)
      )
      AND estado='almacenada' AND promovida_en IS NULL AND documento_id IS NULL AND archivo_id IS NULL
      AND expira_en > now() AND NOT (metadata ? 'regularizacionOp')
      AND (metadata->'integration' IS NULL OR metadata#>>'{integration,consumer}'='COMPRAS_TEMP_DOCUMENTAL')
      ORDER BY iniciada_en, id`;
  }
  async saveDocumentalMetadata(c: Connection, id: number, metadata: Record<string, any>) {
    await c`UPDATE documentos.carga_operaciones SET metadata=${c.json(JSON.stringify(metadata))}::jsonb
      || CASE WHEN metadata ? 'comprasTempAliases' THEN jsonb_build_object('comprasTempAliases',metadata->'comprasTempAliases') ELSE '{}'::jsonb END,
      actualizado_en=now() WHERE id=${id} AND operacion_tipo='tmp'`;
  }
  async assertDocumentalScope(c: Connection, row: TmpRow, input: any) {
    const [e] = await c`SELECT id FROM documentos.expedientes WHERE id=${input.expedienteId}
      AND empresa_codigo=${row.empresa_codigo} AND cliente_destino_id=${row.cliente_destino_id}`;
    if (!e) throw new ConflictException('TMP_EXPEDIENTE_SCOPE_CONFLICT');
    if (input.tipoDocumental === 'FACTURA') {
      const [principal] = await c`SELECT d.id FROM documentos.documentos d
        JOIN documentos.expediente_documentos ed ON ed.documento_id=d.id
        WHERE d.id=${input.documentoBaseId} AND ed.expediente_id=${input.expedienteId}
          AND ed.es_principal=true AND d.tipo_documental IN ('OC','OS')
          AND d.estado='confirmado' AND d.cliente_abreviatura=${row.empresa_codigo}`;
      if (!principal) throw new ConflictException('TMP_PRINCIPAL_SCOPE_CONFLICT');
    }
    if (input.grupoFacturaId != null) {
      const [g] = await c`SELECT g.id FROM documentos.grupos_factura g
        JOIN documentos.documentos_operativos_principales p ON p.id=g.documento_operativo_principal_id
        JOIN documentos.contenedores_operativos co ON co.id=p.contenedor_operativo_id
        WHERE g.id=${input.grupoFacturaId} AND g.estado<>'anulado' AND p.estado='activo'
          AND p.es_principal_activo=true AND p.documento_id=${input.documentoBaseId}
          AND co.estado='activo' AND co.expediente_v1_id=${input.expedienteId}
          AND co.empresa_codigo=${row.empresa_codigo} AND co.cliente_destino_id=${row.cliente_destino_id}`;
      if (!g) throw new ConflictException('TMP_GRUPO_SCOPE_CONFLICT');
    }
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
          metadata = ${JSON.stringify(metadata)}::text::jsonb
            || CASE WHEN metadata ? 'comprasTempAliases' THEN jsonb_build_object('comprasTempAliases',metadata->'comprasTempAliases') ELSE '{}'::jsonb END,
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
    await c`UPDATE documentos.carga_operaciones SET metadata=${c.json(JSON.stringify(metadata))}::jsonb
      || CASE WHEN metadata ? 'comprasTempAliases' THEN jsonb_build_object('comprasTempAliases',metadata->'comprasTempAliases') ELSE '{}'::jsonb END, actualizado_en=now() WHERE id=${row.id}`;
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

  async ocrProcessing(c: Connection, id: number, tipoEsperado: string, identity?: { storageKey: string; attemptId: string; contextoCarga?: { areaOrigen: string; canalIngreso: string | null } }) {
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

  async ocrDone(c: Connection, id: number, tipoEsperado: string, resultado: unknown, identity?: { storageKey: string; attemptId: string; contextoCarga?: { areaOrigen: string; canalIngreso: string | null } }) {
    const candidate = {
      status: 'DONE',
      ...identity,
      tipoEsperado,
      completedAt: new Date().toISOString(),
      resultado,
    };
    const updated = await c`UPDATE documentos.carga_operaciones
      SET metadata=jsonb_set(metadata, '{ocrCandidate}', ${JSON.stringify(candidate)}::jsonb),
          actualizado_en=now()
      WHERE id=${id} AND operacion_tipo='tmp'
        AND (metadata #>> '{integration,consumer}') IS DISTINCT FROM 'COMPRAS_TEMP_DOCUMENTAL'
      RETURNING id`;
    return updated.length === 1;
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
