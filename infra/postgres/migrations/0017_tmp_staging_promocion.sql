-- 0017_tmp_staging_promocion.sql
-- Extiende documentos.carga_operaciones con soporte TEMP reutilizable
-- para staging y promocion server-side, sin crear documento/archivo ficticio.
-- No modifica el flujo funcional de carga-segura existente.

-- Transacción administrada por el runner.

ALTER TABLE documentos.carga_operaciones
  ADD COLUMN operacion_tipo varchar(40) NOT NULL DEFAULT 'carga_segura',
  ADD COLUMN destino_storage_provider varchar(40),
  ADD COLUMN destino_storage_bucket text,
  ADD COLUMN destino_storage_key text,
  ADD COLUMN destino_hash_sha256 varchar(64),
  ADD COLUMN destino_tamano_bytes bigint,
  ADD COLUMN promovida_en timestamptz;

ALTER TABLE documentos.carga_operaciones
  ADD CONSTRAINT ck_carga_operaciones_operacion_tipo
  CHECK (operacion_tipo IN ('carga_segura', 'tmp'));

ALTER TABLE documentos.carga_operaciones
  ADD CONSTRAINT ck_carga_operaciones_destino_hash
  CHECK (
    destino_hash_sha256 IS NULL
    OR destino_hash_sha256 ~ '^[0-9a-f]{64}$'
  );

ALTER TABLE documentos.carga_operaciones
  ADD CONSTRAINT ck_carga_operaciones_destino_tamano
  CHECK (
    destino_tamano_bytes IS NULL
    OR destino_tamano_bytes > 0
  );

ALTER TABLE documentos.carga_operaciones
  ADD CONSTRAINT ck_carga_operaciones_destino_consistente
  CHECK (
    (
      destino_storage_provider IS NULL
      AND destino_storage_bucket IS NULL
      AND destino_storage_key IS NULL
      AND destino_hash_sha256 IS NULL
      AND destino_tamano_bytes IS NULL
      AND promovida_en IS NULL
    )
    OR
    (
      destino_storage_provider IS NOT NULL
      AND length(trim(destino_storage_provider)) > 0
      AND destino_storage_bucket IS NOT NULL
      AND length(trim(destino_storage_bucket)) > 0
      AND destino_storage_key IS NOT NULL
      AND length(trim(destino_storage_key)) > 0
      AND destino_hash_sha256 IS NOT NULL
      AND destino_tamano_bytes IS NOT NULL
      AND promovida_en IS NOT NULL
    )
  );

ALTER TABLE documentos.carga_operaciones
  ADD CONSTRAINT ck_carga_operaciones_promovida_en
  CHECK (
    promovida_en IS NULL
    OR (
      almacenada_en IS NOT NULL
      AND promovida_en >= almacenada_en
    )
  );

ALTER TABLE documentos.carga_operaciones
  ADD CONSTRAINT ck_carga_operaciones_tmp_completada
  CHECK (
    operacion_tipo <> 'tmp'
    OR estado <> 'completada'
    OR (
      destino_storage_provider IS NOT NULL
      AND destino_storage_bucket IS NOT NULL
      AND destino_storage_key IS NOT NULL
      AND destino_hash_sha256 IS NOT NULL
      AND destino_tamano_bytes IS NOT NULL
      AND promovida_en IS NOT NULL
    )
  );

-- Mantiene el bloqueo historico por hash exclusivamente para carga_segura.
-- TMP se gobierna por tempId/idempotencia + identidad/destino de promocion,
-- por lo que no debe heredar el bloqueo global por hash.
DROP INDEX documentos.uq_carga_operaciones_scope_hash_bloqueante;

CREATE UNIQUE INDEX uq_carga_operaciones_scope_hash_bloqueante
  ON documentos.carga_operaciones (
    workspace_id,
    empresa_codigo,
    hash_sha256
  )
  WHERE operacion_tipo = 'carga_segura'
    AND estado IN (
      'iniciada',
      'almacenada',
      'completada',
      'requiere_reconciliacion'
    );



-- Identidades independientes: TEMP no participa en la idempotencia de carga documental.
ALTER TABLE documentos.carga_operaciones
  DROP CONSTRAINT uq_carga_operaciones_scope_idempotency,
  ADD CONSTRAINT uq_carga_operaciones_scope_idempotency
    UNIQUE (workspace_id, empresa_codigo, operacion_tipo, idempotency_key);
CREATE UNIQUE INDEX uq_tmp_destino
  ON documentos.carga_operaciones ((metadata->>'destinoReservado'))
  WHERE operacion_tipo = 'tmp' AND metadata->>'destinoReservado' IS NOT NULL;
