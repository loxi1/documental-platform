-- Sprint 2.1C — Migración 0011
-- Crea documentos.carga_operaciones.
--
-- La transacción es controlada por el runner externo.
-- Este archivo no contiene BEGIN, COMMIT ni registro en core.schema_migrations.

-- ============================================================================
-- PREVALIDACIÓN
-- ============================================================================

DO $prevalidation$
DECLARE
  objeto TEXT;
BEGIN
  IF to_regnamespace('documentos') IS NULL THEN
    RAISE EXCEPTION '0011: no existe el schema documentos';
  END IF;

  IF to_regnamespace('core') IS NULL THEN
    RAISE EXCEPTION '0011: no existe el schema core';
  END IF;

  IF to_regnamespace('auth') IS NULL THEN
    RAISE EXCEPTION '0011: no existe el schema auth';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'core.clientes_destino',
    'auth.usuarios',
    'documentos.expedientes',
    'documentos.documentos',
    'documentos.documentos_archivos'
  ]
  LOOP
    IF to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION '0011: objeto requerido ausente: %', objeto;
    END IF;
  END LOOP;

  IF to_regclass('documentos.carga_operaciones') IS NOT NULL THEN
    RAISE EXCEPTION
      '0011: documentos.carga_operaciones ya existe; posible drift';
  END IF;

  IF to_regclass('documentos.carga_operaciones_id_seq') IS NOT NULL THEN
    RAISE EXCEPTION
      '0011: documentos.carga_operaciones_id_seq ya existe; posible drift';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'documentos.uq_carga_operaciones_scope_hash_bloqueante',
    'documentos.idx_carga_operaciones_scope_estado',
    'documentos.idx_carga_operaciones_request',
    'documentos.idx_carga_operaciones_correlation',
    'documentos.idx_carga_operaciones_expira'
  ]
  LOOP
    IF to_regclass(objeto) IS NOT NULL THEN
      RAISE EXCEPTION '0011: índice ya existente; posible drift: %', objeto;
    END IF;
  END LOOP;
END
$prevalidation$;

-- ============================================================================
-- DDL
-- ============================================================================

CREATE TABLE documentos.carga_operaciones (
  id BIGSERIAL PRIMARY KEY,

  workspace_id INTEGER NOT NULL,
  empresa_codigo VARCHAR(20) NOT NULL,
  cliente_destino_id INTEGER NULL
    REFERENCES core.clientes_destino(id)
    ON DELETE RESTRICT,
  expediente_id BIGINT NULL
    REFERENCES documentos.expedientes(id)
    ON DELETE RESTRICT,

  actor_id INTEGER NOT NULL
    REFERENCES auth.usuarios(id)
    ON DELETE RESTRICT,

  idempotency_key VARCHAR(128) NOT NULL,
  payload_fingerprint VARCHAR(64) NOT NULL,
  fingerprint_version VARCHAR(40) NOT NULL DEFAULT 'canonical-json-v1',
  request_id TEXT NULL,
  correlation_id TEXT NULL,

  canal_ingreso VARCHAR(80) NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'iniciada',
  requiere_reconciliacion BOOLEAN NOT NULL DEFAULT false,

  nombre_archivo_original TEXT NOT NULL,
  content_type VARCHAR(150) NOT NULL,
  tamano_bytes BIGINT NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,

  storage_provider VARCHAR(40) NULL,
  storage_bucket TEXT NULL,
  storage_key TEXT NULL,

  documento_id INTEGER NULL
    REFERENCES documentos.documentos(id)
    ON DELETE SET NULL,
  archivo_id INTEGER NULL
    REFERENCES documentos.documentos_archivos(id)
    ON DELETE SET NULL,

  error_codigo VARCHAR(100) NULL,
  error_detalle TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  almacenada_en TIMESTAMPTZ NULL,
  completada_en TIMESTAMPTZ NULL,
  fallida_en TIMESTAMPTZ NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_carga_operaciones_scope_idempotency
    UNIQUE (workspace_id, empresa_codigo, idempotency_key),

  CONSTRAINT ck_carga_operaciones_estado
    CHECK (
      estado IN (
        'iniciada',
        'almacenada',
        'completada',
        'fallida',
        'requiere_reconciliacion'
      )
    ),

  CONSTRAINT ck_carga_operaciones_workspace
    CHECK (workspace_id > 0),

  CONSTRAINT ck_carga_operaciones_empresa
    CHECK (length(trim(empresa_codigo)) > 0),

  CONSTRAINT ck_carga_operaciones_idempotency_key
    CHECK (
      char_length(idempotency_key) BETWEEN 1 AND 128
      AND idempotency_key !~ '[[:cntrl:]]'
    ),

  CONSTRAINT ck_carga_operaciones_canal_ingreso
    CHECK (length(trim(canal_ingreso)) > 0),

  CONSTRAINT ck_carga_operaciones_nombre_archivo
    CHECK (length(trim(nombre_archivo_original)) > 0),

  CONSTRAINT ck_carga_operaciones_content_type
    CHECK (length(trim(content_type)) > 0),

  CONSTRAINT ck_carga_operaciones_tamano
    CHECK (tamano_bytes > 0),

  CONSTRAINT ck_carga_operaciones_hash_sha256
    CHECK (hash_sha256 ~ '^[0-9a-f]{64}$'),

  CONSTRAINT ck_carga_operaciones_payload_fingerprint
    CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),

  CONSTRAINT ck_carga_operaciones_fingerprint_version
    CHECK (length(trim(fingerprint_version)) > 0),

  CONSTRAINT ck_carga_operaciones_reconciliacion
    CHECK (
      requiere_reconciliacion = (estado = 'requiere_reconciliacion')
    ),

  CONSTRAINT ck_carga_operaciones_expiracion
    CHECK (expira_en > iniciada_en),

  CONSTRAINT ck_carga_operaciones_fechas_estado
    CHECK (
      -- Orden temporal general.
      (almacenada_en IS NULL OR almacenada_en >= iniciada_en)
      AND (
        completada_en IS NULL
        OR (
          almacenada_en IS NOT NULL
          AND completada_en >= almacenada_en
        )
      )
      AND (fallida_en IS NULL OR fallida_en >= iniciada_en)
      AND actualizado_en >= iniciada_en

      -- Invariantes por estado.
      AND (estado <> 'almacenada' OR almacenada_en IS NOT NULL)
      AND (
        estado <> 'completada'
        OR (
          almacenada_en IS NOT NULL
          AND completada_en IS NOT NULL
        )
      )
      AND (estado <> 'fallida' OR fallida_en IS NOT NULL)
      AND (
        estado <> 'requiere_reconciliacion'
        OR almacenada_en IS NOT NULL
      )

      -- Una operación no puede terminar simultáneamente con éxito y fallo.
      AND NOT (
        completada_en IS NOT NULL
        AND fallida_en IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX uq_carga_operaciones_scope_hash_bloqueante
  ON documentos.carga_operaciones (
    workspace_id,
    empresa_codigo,
    hash_sha256
  )
  WHERE estado IN (
    'iniciada',
    'almacenada',
    'completada',
    'requiere_reconciliacion'
  );

CREATE INDEX idx_carga_operaciones_scope_estado
  ON documentos.carga_operaciones (
    workspace_id,
    empresa_codigo,
    estado,
    iniciada_en DESC
  );

CREATE INDEX idx_carga_operaciones_request
  ON documentos.carga_operaciones (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX idx_carga_operaciones_correlation
  ON documentos.carga_operaciones (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX idx_carga_operaciones_expira
  ON documentos.carga_operaciones (expira_en)
  WHERE estado IN ('iniciada', 'almacenada');

GRANT USAGE
  ON SCHEMA documentos
  TO platform_app;

GRANT SELECT, INSERT, UPDATE
  ON documentos.carga_operaciones
  TO platform_app;

GRANT USAGE, SELECT
  ON SEQUENCE documentos.carga_operaciones_id_seq
  TO platform_app;

-- ============================================================================
-- POSTVALIDACIÓN
-- ============================================================================

DO $postvalidation$
DECLARE
  objeto TEXT;
  restriccion TEXT;
BEGIN
  IF to_regclass('documentos.carga_operaciones') IS NULL THEN
    RAISE EXCEPTION
      '0011: postvalidación fallida; tabla carga_operaciones ausente';
  END IF;

  IF to_regclass('documentos.carga_operaciones_id_seq') IS NULL THEN
    RAISE EXCEPTION
      '0011: postvalidación fallida; secuencia carga_operaciones_id_seq ausente';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'documentos.uq_carga_operaciones_scope_hash_bloqueante',
    'documentos.idx_carga_operaciones_scope_estado',
    'documentos.idx_carga_operaciones_request',
    'documentos.idx_carga_operaciones_correlation',
    'documentos.idx_carga_operaciones_expira'
  ]
  LOOP
    IF to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION
        '0011: postvalidación fallida; índice ausente: %',
        objeto;
    END IF;
  END LOOP;

  FOREACH restriccion IN ARRAY ARRAY[
    'uq_carga_operaciones_scope_idempotency',
    'ck_carga_operaciones_estado',
    'ck_carga_operaciones_workspace',
    'ck_carga_operaciones_empresa',
    'ck_carga_operaciones_idempotency_key',
    'ck_carga_operaciones_canal_ingreso',
    'ck_carga_operaciones_nombre_archivo',
    'ck_carga_operaciones_content_type',
    'ck_carga_operaciones_tamano',
    'ck_carga_operaciones_hash_sha256',
    'ck_carga_operaciones_payload_fingerprint',
    'ck_carga_operaciones_fingerprint_version',
    'ck_carga_operaciones_reconciliacion',
    'ck_carga_operaciones_expiracion',
    'ck_carga_operaciones_fechas_estado'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'documentos.carga_operaciones'::regclass
        AND conname = restriccion
    ) THEN
      RAISE EXCEPTION
        '0011: postvalidación fallida; constraint ausente: %',
        restriccion;
    END IF;
  END LOOP;

  IF NOT has_table_privilege(
    'platform_app',
    'documentos.carga_operaciones',
    'SELECT'
  ) OR NOT has_table_privilege(
    'platform_app',
    'documentos.carga_operaciones',
    'INSERT'
  ) OR NOT has_table_privilege(
    'platform_app',
    'documentos.carga_operaciones',
    'UPDATE'
  ) THEN
    RAISE EXCEPTION
      '0011: postvalidación fallida; grants de tabla incompletos';
  END IF;

  IF NOT has_schema_privilege(
    'platform_app',
    'documentos',
    'USAGE'
  ) OR has_schema_privilege(
    'platform_app',
    'documentos',
    'CREATE'
  ) THEN
    RAISE EXCEPTION
      '0011: postvalidación fallida; privilegios de schema incompatibles';
  END IF;

  IF has_table_privilege(
    'platform_app',
    'documentos.carga_operaciones',
    'DELETE'
  ) OR has_table_privilege(
    'platform_app',
    'documentos.carga_operaciones',
    'TRUNCATE'
  ) THEN
    RAISE EXCEPTION
      '0011: postvalidación fallida; privilegios destructivos no permitidos';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'PUBLIC'
      AND table_schema = 'documentos'
      AND table_name = 'carga_operaciones'
  ) THEN
    RAISE EXCEPTION
      '0011: postvalidación fallida; grants a PUBLIC no permitidos';
  END IF;

  IF NOT has_sequence_privilege(
    'platform_app',
    'documentos.carga_operaciones_id_seq',
    'USAGE'
  ) OR NOT has_sequence_privilege(
    'platform_app',
    'documentos.carga_operaciones_id_seq',
    'SELECT'
  ) THEN
    RAISE EXCEPTION
      '0011: postvalidación fallida; grants de secuencia incompletos';
  END IF;
END
$postvalidation$;

-- ============================================================================
-- ROLLBACK TÉCNICO DOCUMENTAL — NO EJECUTAR AUTOMÁTICAMENTE
-- ============================================================================
--
-- Aplicable únicamente antes de que la tabla reciba datos funcionales y previa
-- autorización expresa:
--
-- REVOKE ALL
--   ON SEQUENCE documentos.carga_operaciones_id_seq
--   FROM platform_app;
--
-- REVOKE ALL
--   ON documentos.carga_operaciones
--   FROM platform_app;
--
-- DROP TABLE documentos.carga_operaciones;
--
-- No utilizar CASCADE. Si existen dependencias o datos, detener el rollback y
-- diseñar una migración compensatoria que preserve la información.
