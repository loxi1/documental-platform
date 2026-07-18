-- Sprint 2.1C — Migración 0013
-- Crea documentos.documento_eventos_outbox.
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
    RAISE EXCEPTION '0013: no existe el schema documentos';
  END IF;

  IF to_regnamespace('core') IS NULL THEN
    RAISE EXCEPTION '0013: no existe el schema core';
  END IF;

  IF to_regnamespace('auth') IS NULL THEN
    RAISE EXCEPTION '0013: no existe el schema auth';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'documentos.carga_operaciones',
    'core.clientes_destino',
    'documentos.expedientes',
    'documentos.documentos',
    'documentos.documentos_archivos',
    'auth.usuarios'
  ]
  LOOP
    IF to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION '0013: objeto requerido ausente: %', objeto;
    END IF;
  END LOOP;

  IF to_regclass('documentos.documento_eventos_outbox') IS NOT NULL THEN
    RAISE EXCEPTION
      '0013: documentos.documento_eventos_outbox ya existe; posible drift';
  END IF;

  IF to_regclass('documentos.documento_eventos_outbox_id_seq') IS NOT NULL THEN
    RAISE EXCEPTION
      '0013: secuencia documento_eventos_outbox_id_seq ya existe; posible drift';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'documentos.idx_documento_eventos_outbox_disponibles',
    'documentos.idx_documento_eventos_outbox_lease',
    'documentos.idx_documento_eventos_outbox_carga',
    'documentos.idx_documento_eventos_outbox_correlation'
  ]
  LOOP
    IF to_regclass(objeto) IS NOT NULL THEN
      RAISE EXCEPTION
        '0013: índice ya existente; posible drift: %',
        objeto;
    END IF;
  END LOOP;
END
$prevalidation$;

-- ============================================================================
-- DDL
-- ============================================================================

CREATE TABLE documentos.documento_eventos_outbox (
  id BIGSERIAL PRIMARY KEY,

  event_key VARCHAR(255) NOT NULL UNIQUE,
  evento_version INTEGER NOT NULL DEFAULT 1,

  carga_operacion_id BIGINT NOT NULL
    REFERENCES documentos.carga_operaciones(id)
    ON DELETE RESTRICT,

  workspace_id INTEGER NOT NULL,
  empresa_codigo VARCHAR(20) NOT NULL,
  cliente_destino_id INTEGER NULL
    REFERENCES core.clientes_destino(id)
    ON DELETE RESTRICT,
  expediente_id BIGINT NULL
    REFERENCES documentos.expedientes(id)
    ON DELETE RESTRICT,
  documento_id INTEGER NULL
    REFERENCES documentos.documentos(id)
    ON DELETE SET NULL,
  archivo_id INTEGER NULL
    REFERENCES documentos.documentos_archivos(id)
    ON DELETE SET NULL,
  actor_id INTEGER NOT NULL
    REFERENCES auth.usuarios(id)
    ON DELETE RESTRICT,

  tipo_evento VARCHAR(120) NOT NULL,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id TEXT NOT NULL,

  request_id TEXT NULL,
  correlation_id TEXT NULL,
  idempotency_key VARCHAR(128) NOT NULL,

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,

  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  intentos INTEGER NOT NULL DEFAULT 0,
  max_intentos INTEGER NOT NULL DEFAULT 10,
  proximo_intento_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by VARCHAR(120) NULL,
  locked_until TIMESTAMPTZ NULL,
  publicado_en TIMESTAMPTZ NULL,
  ultimo_error TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_documento_eventos_outbox_estado
    CHECK (
      estado IN (
        'pendiente',
        'procesando',
        'publicado',
        'fallido_permanente'
      )
    ),

  CONSTRAINT ck_documento_eventos_outbox_intentos
    CHECK (
      intentos >= 0
      AND max_intentos > 0
      AND intentos <= max_intentos
    ),

  CONSTRAINT ck_documento_eventos_outbox_version
    CHECK (evento_version > 0),

  CONSTRAINT ck_documento_eventos_outbox_workspace
    CHECK (workspace_id > 0),

  CONSTRAINT ck_documento_eventos_outbox_empresa
    CHECK (length(trim(empresa_codigo)) > 0),

  CONSTRAINT ck_documento_eventos_outbox_event_key
    CHECK (
      length(trim(event_key)) > 0
      AND event_key !~ '[[:cntrl:]]'
    ),

  CONSTRAINT ck_documento_eventos_outbox_lease_estado
    CHECK (
      (
        estado = 'procesando'
        AND locked_by IS NOT NULL
        AND locked_until IS NOT NULL
      )
      OR
      (
        estado <> 'procesando'
        AND locked_by IS NULL
        AND locked_until IS NULL
      )
    ),

  CONSTRAINT ck_documento_eventos_outbox_publicacion
    CHECK (
      (estado = 'publicado' AND publicado_en IS NOT NULL)
      OR
      (estado <> 'publicado' AND publicado_en IS NULL)
    ),

  CONSTRAINT ck_documento_eventos_outbox_fallo_permanente
    CHECK (
      estado <> 'fallido_permanente'
      OR intentos >= max_intentos
    ),

  CONSTRAINT ck_documento_eventos_outbox_pendiente
    CHECK (
      estado <> 'pendiente'
      OR proximo_intento_en IS NOT NULL
    )
);

CREATE INDEX idx_documento_eventos_outbox_disponibles
  ON documentos.documento_eventos_outbox (
    proximo_intento_en,
    id
  )
  WHERE estado = 'pendiente';

CREATE INDEX idx_documento_eventos_outbox_lease
  ON documentos.documento_eventos_outbox (locked_until)
  WHERE estado = 'procesando';

CREATE INDEX idx_documento_eventos_outbox_carga
  ON documentos.documento_eventos_outbox (carga_operacion_id);

CREATE INDEX idx_documento_eventos_outbox_correlation
  ON documentos.documento_eventos_outbox (correlation_id)
  WHERE correlation_id IS NOT NULL;

GRANT USAGE
  ON SCHEMA documentos
  TO platform_app;

GRANT SELECT, INSERT, UPDATE
  ON documentos.documento_eventos_outbox
  TO platform_app;

GRANT USAGE, SELECT
  ON SEQUENCE documentos.documento_eventos_outbox_id_seq
  TO platform_app;

-- ============================================================================
-- POSTVALIDACIÓN
-- ============================================================================

DO $postvalidation$
DECLARE
  objeto TEXT;
  restriccion TEXT;
BEGIN
  IF to_regclass('documentos.documento_eventos_outbox') IS NULL THEN
    RAISE EXCEPTION
      '0013: postvalidación fallida; tabla documento_eventos_outbox ausente';
  END IF;

  IF to_regclass('documentos.documento_eventos_outbox_id_seq') IS NULL THEN
    RAISE EXCEPTION
      '0013: postvalidación fallida; secuencia outbox ausente';
  END IF;

  FOREACH objeto IN ARRAY ARRAY[
    'documentos.idx_documento_eventos_outbox_disponibles',
    'documentos.idx_documento_eventos_outbox_lease',
    'documentos.idx_documento_eventos_outbox_carga',
    'documentos.idx_documento_eventos_outbox_correlation'
  ]
  LOOP
    IF to_regclass(objeto) IS NULL THEN
      RAISE EXCEPTION
        '0013: postvalidación fallida; índice ausente: %',
        objeto;
    END IF;
  END LOOP;

  FOREACH restriccion IN ARRAY ARRAY[
    'documento_eventos_outbox_pkey',
    'documento_eventos_outbox_event_key_key',
    'ck_documento_eventos_outbox_estado',
    'ck_documento_eventos_outbox_intentos',
    'ck_documento_eventos_outbox_version',
    'ck_documento_eventos_outbox_workspace',
    'ck_documento_eventos_outbox_empresa',
    'ck_documento_eventos_outbox_event_key',
    'ck_documento_eventos_outbox_lease_estado',
    'ck_documento_eventos_outbox_publicacion',
    'ck_documento_eventos_outbox_fallo_permanente',
    'ck_documento_eventos_outbox_pendiente'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'documentos.documento_eventos_outbox'::regclass
        AND conname = restriccion
    ) THEN
      RAISE EXCEPTION
        '0013: postvalidación fallida; constraint ausente: %',
        restriccion;
    END IF;
  END LOOP;

  IF NOT has_table_privilege(
    'platform_app',
    'documentos.documento_eventos_outbox',
    'SELECT'
  ) OR NOT has_table_privilege(
    'platform_app',
    'documentos.documento_eventos_outbox',
    'INSERT'
  ) OR NOT has_table_privilege(
    'platform_app',
    'documentos.documento_eventos_outbox',
    'UPDATE'
  ) THEN
    RAISE EXCEPTION
      '0013: postvalidación fallida; grants de tabla incompletos';
  END IF;

  IF NOT has_sequence_privilege(
    'platform_app',
    'documentos.documento_eventos_outbox_id_seq',
    'USAGE'
  ) OR NOT has_sequence_privilege(
    'platform_app',
    'documentos.documento_eventos_outbox_id_seq',
    'SELECT'
  ) THEN
    RAISE EXCEPTION
      '0013: postvalidación fallida; grants de secuencia incompletos';
  END IF;
END
$postvalidation$;

-- ============================================================================
-- ROLLBACK TÉCNICO DOCUMENTAL — NO EJECUTAR AUTOMÁTICAMENTE
-- ============================================================================
--
-- Aplicable únicamente antes de procesar eventos reales, sin dependencias
-- posteriores y con autorización expresa:
--
-- REVOKE ALL
--   ON SEQUENCE documentos.documento_eventos_outbox_id_seq
--   FROM platform_app;
--
-- REVOKE ALL
--   ON documentos.documento_eventos_outbox
--   FROM platform_app;
--
-- DROP TABLE documentos.documento_eventos_outbox;
--
-- No utilizar CASCADE. Si existen eventos, leases, dependencias o referencias,
-- detener el rollback y diseñar una migración compensatoria.
