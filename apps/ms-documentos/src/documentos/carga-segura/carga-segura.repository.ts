import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

import { CARGA_SEGURA_R2_FINGERPRINT_VERSION, CARGA_SEGURA_FINGERPRINT_VERSION } from './carga-segura.constants';
import type {
  CargaSeguraOperacionRow,
  ReservaCargaSeguraResult,
  ReservarCargaSeguraInput,
} from './carga-segura.types';

const MAX_RESERVATION_ATTEMPTS = 2;

@Injectable()
export class CargaSeguraRepository {
  async reservar(
    input: ReservarCargaSeguraInput,
  ): Promise<ReservaCargaSeguraResult> {
    for (let attempt = 1; attempt <= MAX_RESERVATION_ATTEMPTS; attempt += 1) {
      const inserted = await this.insertarReserva(input);

      if (inserted) {
        return {
          kind: 'RESERVED',
          operacion: inserted,
        };
      }

      const byIdempotency = await this.buscarPorIdempotencia(input);

      if (byIdempotency) {
        return {
          kind:
            this.fingerprintMatches(byIdempotency, input)
              ? 'REPLAYED'
              : 'IDEMPOTENCY_CONFLICT',
          operacion: byIdempotency,
        };
      }

      const byHash = await this.buscarPorHashBloqueante(
        input.workspaceId,
        input.empresaCodigo,
        input.hashSha256,
      );

      if (byHash) {
        return {
          kind: 'DUPLICATE',
          operacion: byHash,
        };
      }
    }

    throw new Error(
      'No fue posible clasificar la reserva concurrente de carga segura',
    );
  }

  private fingerprintMatches(row: CargaSeguraOperacionRow, input: ReservarCargaSeguraInput): boolean {
    if (row.fingerprintVersion === CARGA_SEGURA_FINGERPRINT_VERSION) {
      return row.payloadFingerprint === (input.legacyPayloadFingerprint ?? input.payloadFingerprint);
    }
    return row.fingerprintVersion === CARGA_SEGURA_R2_FINGERPRINT_VERSION &&
      input.fingerprintVersion === CARGA_SEGURA_R2_FINGERPRINT_VERSION &&
      row.payloadFingerprint === input.payloadFingerprint;
  }

  /** P3: claim CAS durable; caller holds lockedBounded session and uses transaction(). */
  async marcarPutStartedProtegidoR2(
    connection: import('../tmp/tmp.repository').TmpConnection,
    input: {
      operacionId: number; workspaceId: number; empresaCodigo: string;
      clienteDestinoId: number; expedienteId: number; actorId: number;
      grupoFacturaId: number; documentoBaseId: number;
      canalIngreso: 'ALMACEN_LEGACY_UPLOAD_GUIA' | 'ALMACEN_LEGACY_UPLOAD_NOTA_INGRESO';
      fencingToken: string; attempt: number; storageBucket: string; storageKey: string;
    },
  ): Promise<boolean> {
    const ids = [input.operacionId, input.workspaceId, input.clienteDestinoId,
      input.expedienteId, input.actorId, input.grupoFacturaId, input.documentoBaseId,
      input.attempt];
    if (ids.some(v => !Number.isSafeInteger(v) || v <= 0) ||
      !input.empresaCodigo || !input.fencingToken || !input.storageBucket ||
      !input.storageKey || !['ALMACEN_LEGACY_UPLOAD_GUIA',
        'ALMACEN_LEGACY_UPLOAD_NOTA_INGRESO'].includes(input.canalIngreso)) {
      throw new Error('P3_CAS_INPUT_INVALID');
    }
    const rows = await connection`
      UPDATE documentos.carga_operaciones
      SET metadata = jsonb_set(metadata, '{r2RecoveryV1}',
            (metadata->'r2RecoveryV1') || jsonb_build_object(
              'phase', 'PUT_STARTED', 'storageBucket', ${input.storageBucket}::text,
              'storageKey', ${input.storageKey}::text), false),
          storage_provider = 'r2', storage_bucket = ${input.storageBucket}::text,
          storage_key = ${input.storageKey}::text, actualizado_en = now()
      WHERE id = ${input.operacionId}::bigint AND operacion_tipo = 'carga_segura'
        AND workspace_id = ${input.workspaceId}::integer
        AND empresa_codigo = ${input.empresaCodigo}::text
        AND cliente_destino_id = ${input.clienteDestinoId}::bigint
        AND expediente_id = ${input.expedienteId}::bigint
        AND actor_id = ${input.actorId}::bigint
        AND canal_ingreso = ${input.canalIngreso}::text
        AND estado = 'iniciada' AND NOT requiere_reconciliacion
        AND expira_en > now()
        AND documento_id IS NULL AND archivo_id IS NULL
        AND storage_key IS NULL
        AND metadata->'r2IdentityV2'->>'version' = '2'
        AND metadata->'r2IdentityV2'->>'workspaceId' = ${String(input.workspaceId)}::text
        AND metadata->'r2IdentityV2'->>'empresaCodigo' = ${input.empresaCodigo}::text
        AND metadata->'r2IdentityV2'->>'clienteDestinoId' = ${String(input.clienteDestinoId)}::text
        AND metadata->'r2IdentityV2'->>'expedienteId' = ${String(input.expedienteId)}::text
        AND metadata->'r2IdentityV2'->>'actorId' = ${String(input.actorId)}::text
        AND metadata->'r2IdentityV2'->>'grupoFacturaId' = ${String(input.grupoFacturaId)}::text
        AND metadata->'r2IdentityV2'->>'documentoBaseId' = ${String(input.documentoBaseId)}::text
        AND metadata->'r2RecoveryV1'->>'version' = '1'
        AND metadata->'r2RecoveryV1'->>'phase' = 'PRE_PUT'
        AND metadata->'r2RecoveryV1'->>'attempt' = ${String(input.attempt)}::text
        AND metadata->'r2RecoveryV1'->>'fencingToken' = ${input.fencingToken}::text
        AND NOT (metadata->'r2RecoveryV1' ? 'storageBucket')
        AND NOT (metadata->'r2RecoveryV1' ? 'storageKey')
      RETURNING id
    `;
    return rows.length === 1;
  }

  /** No automatic retry eligibility is inferred from a resolution failure. */
  async marcarFalloPrePutProtegidoR2(
    connection: import('../tmp/tmp.repository').TmpConnection,
    input: { operacionId: number; workspaceId: number; empresaCodigo: string;
      fencingToken: string; attempt: number },
  ): Promise<boolean> {
    if ([input.operacionId, input.workspaceId, input.attempt].some(v =>
      !Number.isSafeInteger(v) || v <= 0) || !input.empresaCodigo || !input.fencingToken) {
      throw new Error('P3_FENCING_INPUT_INVALID');
    }
    const rows = await connection`
      UPDATE documentos.carga_operaciones
      SET estado = 'fallida', fallida_en = now(), actualizado_en = now(),
          error_codigo = 'CARGA_SEGURA_R2_RESOLUCION_FALLIDA',
          error_detalle = 'P3_PRE_PUT_RESOLUTION_FAILED',
          metadata = jsonb_set(metadata, '{r2RecoveryV1}',
            (metadata->'r2RecoveryV1') || jsonb_build_object('retryEligible', false), false)
      WHERE id = ${input.operacionId}::bigint
        AND operacion_tipo = 'carga_segura'
        AND workspace_id = ${input.workspaceId}::integer
        AND empresa_codigo = ${input.empresaCodigo}::text
        AND canal_ingreso IN ('ALMACEN_LEGACY_UPLOAD_GUIA', 'ALMACEN_LEGACY_UPLOAD_NOTA_INGRESO')
        AND estado = 'iniciada' AND NOT requiere_reconciliacion
        AND documento_id IS NULL AND archivo_id IS NULL
        AND storage_provider IS NULL AND storage_bucket IS NULL AND storage_key IS NULL
        AND metadata->'r2RecoveryV1'->>'version' = '1'
        AND metadata->'r2RecoveryV1'->>'phase' = 'PRE_PUT'
        AND metadata->'r2RecoveryV1'->>'fencingToken' = ${input.fencingToken}::text
        AND metadata->'r2RecoveryV1'->>'attempt' = ${String(input.attempt)}::text
        AND NOT (metadata->'r2RecoveryV1' ? 'storageBucket')
        AND NOT (metadata->'r2RecoveryV1' ? 'storageKey')
      RETURNING id
    `;
    return rows.length === 1;
  }

  async buscarPorId(id: number): Promise<CargaSeguraOperacionRow | null> {
    const rows = await sql`
      SELECT
        ${this.selection()}
      FROM documentos.carga_operaciones
      WHERE id = ${id}::bigint
      LIMIT 1
    `;

    return this.first(rows);
  }

  private async insertarReserva(
    input: ReservarCargaSeguraInput,
  ): Promise<CargaSeguraOperacionRow | null> {
    const rows = await sql`
      INSERT INTO documentos.carga_operaciones (
        workspace_id,
        empresa_codigo,
        cliente_destino_id,
        expediente_id,
        actor_id,
        idempotency_key,
        payload_fingerprint,
        fingerprint_version,
        request_id,
        correlation_id,
        canal_ingreso,
        estado,
        requiere_reconciliacion,
        nombre_archivo_original,
        content_type,
        tamano_bytes,
        hash_sha256,
        metadata,
        expira_en
      )
      VALUES (
        ${input.workspaceId}::integer,
        ${input.empresaCodigo}::text,
        ${input.clienteDestinoId ?? null}::integer,
        ${input.expedienteId ?? null}::bigint,
        ${input.actorId}::integer,
        ${input.idempotencyKey}::text,
        ${input.payloadFingerprint}::text,
        ${input.fingerprintVersion ?? CARGA_SEGURA_FINGERPRINT_VERSION}::text,
        ${input.requestId ?? null}::text,
        ${input.correlationId ?? null}::text,
        ${input.canalIngreso}::text,
        'iniciada',
        false,
        ${input.nombreArchivo}::text,
        ${input.contentType}::text,
        ${input.tamanoBytes}::bigint,
        ${input.hashSha256}::text,
        ${JSON.stringify(input.metadata ?? {})}::jsonb,
        now() + interval '24 hours'
      )
      ON CONFLICT DO NOTHING
      RETURNING
        ${this.selection()}
    `;

    return this.first(rows);
  }

  private async buscarPorIdempotencia(
    input: Pick<
      ReservarCargaSeguraInput,
      'workspaceId' | 'empresaCodigo' | 'idempotencyKey'
    >,
  ): Promise<CargaSeguraOperacionRow | null> {
    const rows = await sql`
      SELECT
        ${this.selection()}
      FROM documentos.carga_operaciones
      WHERE operacion_tipo = 'carga_segura' AND workspace_id = ${input.workspaceId}::integer
        AND empresa_codigo = ${input.empresaCodigo}::text
        AND idempotency_key = ${input.idempotencyKey}::text
      LIMIT 1
    `;

    return this.first(rows);
  }

  private async buscarPorHashBloqueante(
    workspaceId: number,
    empresaCodigo: string,
    hashSha256: string,
  ): Promise<CargaSeguraOperacionRow | null> {
    const rows = await sql`
      SELECT
        ${this.selection()}
      FROM documentos.carga_operaciones
      WHERE operacion_tipo = 'carga_segura' AND workspace_id = ${workspaceId}::integer
        AND empresa_codigo = ${empresaCodigo}::text
        AND hash_sha256 = ${hashSha256}::text
        AND estado IN (
          'iniciada',
          'almacenada',
          'completada',
          'requiere_reconciliacion'
        )
      ORDER BY id DESC
      LIMIT 1
    `;

    return this.first(rows);
  }

  async marcarAlmacenada(input: {
    operacionId: number;
    storageProvider: string;
    storageBucket: string;
    storageKey: string;
  }): Promise<CargaSeguraOperacionRow | null> {
    const rows = await sql`
      UPDATE documentos.carga_operaciones
      SET
        estado = 'almacenada',
        requiere_reconciliacion = false,
        storage_provider = ${input.storageProvider}::text,
        storage_bucket = ${input.storageBucket}::text,
        storage_key = ${input.storageKey}::text,
        almacenada_en = now(),
        actualizado_en = now(),
        error_codigo = NULL,
        error_detalle = NULL
      WHERE id = ${input.operacionId}::bigint
        AND estado = 'iniciada'
        AND NOT (COALESCE(metadata, '{}'::jsonb) ? 'r2RecoveryV1')
      RETURNING
        ${this.selection()}
    `;

    return this.first(rows);
  }

  /** P3: reconciliación fail-closed con token y fase, sobre la conexión reservada. */
  async marcarReconciliacionProtegidaR2(
    connection: import('../tmp/tmp.repository').TmpConnection,
    input: {
      operacionId: number;
      workspaceId: number;
      empresaCodigo: string;
      fencingToken: string; attempt: number;
      storageBucket: string;
      storageKey: string;
      errorCodigo: string;
    },
  ): Promise<boolean> {
    if (!Number.isSafeInteger(input.operacionId) || input.operacionId <= 0 ||
        !Number.isSafeInteger(input.workspaceId) || input.workspaceId <= 0 ||
        (!Number.isSafeInteger(input.attempt) || input.attempt <= 0) || !input.empresaCodigo || !input.fencingToken || !input.storageBucket ||
        !input.storageKey || !input.errorCodigo) {
      throw new Error('P3_FENCING_INPUT_INVALID');
    }
    const rows = await connection`
      UPDATE documentos.carga_operaciones
      SET estado = 'requiere_reconciliacion',
          requiere_reconciliacion = true,
          almacenada_en = COALESCE(almacenada_en, now()),
          storage_provider = 'r2',
          storage_bucket = ${input.storageBucket}::text,
          storage_key = ${input.storageKey}::text,
          error_codigo = ${input.errorCodigo}::text,
          error_detalle = 'P3_STORAGE_OUTCOME_UNCERTAIN',
          metadata = jsonb_set(metadata, '{r2RecoveryV1}',
            (metadata->'r2RecoveryV1') || jsonb_build_object('phase', 'RECONCILIATION_REQUIRED'), false),
          actualizado_en = now()
      WHERE id = ${input.operacionId}::bigint
        AND operacion_tipo = 'carga_segura'
        AND workspace_id = ${input.workspaceId}::integer
        AND empresa_codigo = ${input.empresaCodigo}::text
        AND canal_ingreso IN ('ALMACEN_LEGACY_UPLOAD_GUIA', 'ALMACEN_LEGACY_UPLOAD_NOTA_INGRESO')
        AND estado = 'iniciada'
        AND metadata->'r2RecoveryV1'->>'version' = '1'
        AND metadata->'r2RecoveryV1'->>'fencingToken' = ${input.fencingToken}::text
        AND metadata->'r2RecoveryV1'->>'attempt' = ${String(input.attempt)}::text
        AND storage_bucket = ${input.storageBucket}::text AND storage_key = ${input.storageKey}::text
        AND metadata->'r2RecoveryV1'->>'phase' = 'PUT_STARTED'
        AND metadata->'r2RecoveryV1'->>'storageBucket' = ${input.storageBucket}::text
        AND metadata->'r2RecoveryV1'->>'storageKey' = ${input.storageKey}::text
        AND documento_id IS NULL AND archivo_id IS NULL
        AND NOT requiere_reconciliacion
      RETURNING id
    `;
    return rows.length === 1;
  }


  async contarReferenciasVigentesStorage(input: {
    provider: string;
    bucket: string;
    key: string;
  }): Promise<number> {
    const rows = await sql`
      SELECT COUNT(*)::integer AS total
      FROM documentos.documentos_archivos
      WHERE storage_provider = ${input.provider}::text
        AND storage_bucket = ${input.bucket}::text
        AND storage_key = ${input.key}::text
        AND anulado_en IS NULL
    `;

    return Number(rows[0]?.total ?? 0);
  }

  async marcarFallida(input: {
    operacionId: number;
    errorCodigo: string;
    errorDetalle: string;
  }): Promise<boolean> {
    const rows = await sql`
      UPDATE documentos.carga_operaciones
      SET
        estado = 'fallida',
        requiere_reconciliacion = false,
        error_codigo = ${input.errorCodigo}::text,
        error_detalle = ${input.errorDetalle}::text,
        fallida_en = now(),
        actualizado_en = now()
      WHERE id = ${input.operacionId}::bigint
        AND estado IN ('iniciada', 'almacenada')
        AND NOT (COALESCE(metadata, '{}'::jsonb) ? 'r2RecoveryV1')
      RETURNING id
    `;

    return Boolean(rows[0]?.id);
  }

  async marcarRequiereReconciliacion(input: {
    operacionId: number;
    storageProvider: string;
    storageBucket: string;
    storageKey: string;
    errorCodigo: string;
    errorDetalle: string;
  }): Promise<boolean> {
    const rows = await sql`
      UPDATE documentos.carga_operaciones
      SET
        estado = 'requiere_reconciliacion',
        requiere_reconciliacion = true,
        storage_provider = ${input.storageProvider}::text,
        storage_bucket = ${input.storageBucket}::text,
        storage_key = ${input.storageKey}::text,
        almacenada_en = COALESCE(almacenada_en, now()),
        error_codigo = ${input.errorCodigo}::text,
        error_detalle = ${input.errorDetalle}::text,
        actualizado_en = now()
      WHERE id = ${input.operacionId}::bigint
        AND estado IN ('iniciada', 'almacenada')
        AND NOT (COALESCE(metadata, '{}'::jsonb) ? 'r2RecoveryV1')
      RETURNING id
    `;

    return Boolean(rows[0]?.id);
  }

  private selection() {
    return sql`
      id,
      workspace_id AS "workspaceId",
      empresa_codigo AS "empresaCodigo",
      cliente_destino_id AS "clienteDestinoId",
      expediente_id AS "expedienteId",
      actor_id AS "actorId",
      idempotency_key AS "idempotencyKey",
      payload_fingerprint AS "payloadFingerprint",
      fingerprint_version AS "fingerprintVersion",
      request_id AS "requestId",
      correlation_id AS "correlationId",
      canal_ingreso AS "canalIngreso",
      estado,
      requiere_reconciliacion AS "requiereReconciliacion",
      nombre_archivo_original AS "nombreArchivo",
      content_type AS "contentType",
      tamano_bytes AS "tamanoBytes",
      hash_sha256 AS "hashSha256",
      storage_provider AS "storageProvider",
      storage_bucket AS "storageBucket",
      storage_key AS "storageKey",
      documento_id AS "documentoId",
      archivo_id AS "archivoId",
      error_codigo AS "errorCodigo",
      error_detalle AS "errorDetalle",
      metadata,
      iniciada_en AS "iniciadaEn",
      almacenada_en AS "almacenadaEn",
      completada_en AS "completadaEn",
      fallida_en AS "fallidaEn",
      expira_en AS "expiraEn",
      actualizado_en AS "actualizadoEn"
    `;
  }

  private first(rows: unknown[]): CargaSeguraOperacionRow | null {
    const row = rows[0] as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      ...(row as unknown as CargaSeguraOperacionRow),
      id: this.requiredSafeInteger(row.id, 'id'),
      expedienteId: this.nullableSafeInteger(row.expedienteId, 'expedienteId'),
      tamanoBytes: this.requiredSafeInteger(row.tamanoBytes, 'tamanoBytes'),
      documentoId: this.nullableSafeInteger(row.documentoId, 'documentoId'),
      archivoId: this.nullableSafeInteger(row.archivoId, 'archivoId'),
    };
  }

  private requiredSafeInteger(value: unknown, field: string): number {
    const normalized = Number(value);

    if (!Number.isSafeInteger(normalized)) {
      throw new Error(`Valor numérico inválido para carga segura: ${field}`);
    }

    return normalized;
  }

  private nullableSafeInteger(value: unknown, field: string): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return this.requiredSafeInteger(value, field);
  }
}
