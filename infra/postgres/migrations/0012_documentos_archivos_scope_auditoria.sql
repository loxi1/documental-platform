-- Sprint 2.1C — Migración 0012
-- Agrega scope y auditoría nullable a documentos.documentos_archivos.
--
-- La transacción es controlada por el runner externo.
-- Este archivo no contiene BEGIN, COMMIT ni registro en core.schema_migrations.

-- ============================================================================
-- PREVALIDACIÓN
-- ============================================================================

DO $prevalidation$
DECLARE
  columna TEXT;
  restriccion TEXT;
  indice TEXT;
BEGIN
  IF to_regnamespace('documentos') IS NULL THEN
    RAISE EXCEPTION '0012: no existe el schema documentos';
  END IF;

  IF to_regnamespace('core') IS NULL THEN
    RAISE EXCEPTION '0012: no existe el schema core';
  END IF;

  IF to_regnamespace('auth') IS NULL THEN
    RAISE EXCEPTION '0012: no existe el schema auth';
  END IF;

  IF to_regclass('documentos.documentos_archivos') IS NULL THEN
    RAISE EXCEPTION
      '0012: no existe documentos.documentos_archivos';
  END IF;

  IF to_regclass('documentos.carga_operaciones') IS NULL THEN
    RAISE EXCEPTION
      '0012: no existe documentos.carga_operaciones; ejecutar 0011 primero';
  END IF;

  IF to_regclass('core.clientes_destino') IS NULL THEN
    RAISE EXCEPTION
      '0012: no existe core.clientes_destino';
  END IF;

  IF to_regclass('documentos.expedientes') IS NULL THEN
    RAISE EXCEPTION
      '0012: no existe documentos.expedientes';
  END IF;

  IF to_regclass('auth.usuarios') IS NULL THEN
    RAISE EXCEPTION
      '0012: no existe auth.usuarios';
  END IF;

  FOREACH columna IN ARRAY ARRAY[
    'workspace_id',
    'empresa_codigo',
    'cliente_destino_id',
    'expediente_id',
    'carga_operacion_id',
    'creado_por',
    'actualizado_por',
    'actualizado_en',
    'anulado_por',
    'anulado_en',
    'motivo_anulacion'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'documentos'
        AND table_name = 'documentos_archivos'
        AND column_name = columna
    ) THEN
      RAISE EXCEPTION
        '0012: columna ya existente; posible drift: %',
        columna;
    END IF;
  END LOOP;

  FOREACH restriccion IN ARRAY ARRAY[
    'documentos_archivos_cliente_destino_id_fkey',
    'documentos_archivos_expediente_id_fkey',
    'documentos_archivos_carga_operacion_id_fkey',
    'documentos_archivos_creado_por_fkey',
    'documentos_archivos_actualizado_por_fkey',
    'documentos_archivos_anulado_por_fkey',
    'documentos_archivos_anulacion_coherente_ck'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'documentos.documentos_archivos'::regclass
        AND conname = restriccion
    ) THEN
      RAISE EXCEPTION
        '0012: constraint ya existente; posible drift: %',
        restriccion;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'documentos.documentos_archivos'::regclass
      AND conname = 'documentos_archivos_cliente_destino_id_fkey'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g'))
          LIKE '%foreign key (cliente_destino_id) references core.clientes_destino(id) on delete restrict%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'documentos.documentos_archivos'::regclass
      AND conname = 'documentos_archivos_expediente_id_fkey'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g'))
          LIKE '%foreign key (expediente_id) references documentos.expedientes(id) on delete restrict%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'documentos.documentos_archivos'::regclass
      AND conname = 'documentos_archivos_carga_operacion_id_fkey'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g'))
          LIKE '%foreign key (carga_operacion_id) references documentos.carga_operaciones(id) on delete set null%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'documentos.documentos_archivos'::regclass
      AND conname = 'documentos_archivos_creado_por_fkey'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g'))
          LIKE '%foreign key (creado_por) references auth.usuarios(id) on delete set null%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'documentos.documentos_archivos'::regclass
      AND conname = 'documentos_archivos_actualizado_por_fkey'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g'))
          LIKE '%foreign key (actualizado_por) references auth.usuarios(id) on delete set null%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'documentos.documentos_archivos'::regclass
      AND conname = 'documentos_archivos_anulado_por_fkey'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g'))
          LIKE '%foreign key (anulado_por) references auth.usuarios(id) on delete set null%'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; definición de FK o acción ON DELETE incompatible';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'documentos.documentos_archivos'::regclass
      AND conname = 'documentos_archivos_anulacion_coherente_ck'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g')) LIKE '%anulado_en is null%'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g')) LIKE '%anulado_por is null%'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g')) LIKE '%motivo_anulacion is null%'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g')) LIKE '%anulado_en is not null%'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g')) LIKE '%anulado_por is not null%'
      AND lower(regexp_replace(pg_get_constraintdef(oid), '\s+', ' ', 'g')) LIKE '%length(trim(both from motivo_anulacion)) > 0%'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; check de anulación incompatible';
  END IF;

  FOREACH indice IN ARRAY ARRAY[
    'documentos.idx_documentos_archivos_scope_hash',
    'documentos.idx_documentos_archivos_carga_operacion',
    'documentos.idx_documentos_archivos_expediente'
  ]
  LOOP
    IF to_regclass(indice) IS NOT NULL THEN
      RAISE EXCEPTION
        '0012: índice ya existente; posible drift: %',
        indice;
    END IF;
  END LOOP;
END
$prevalidation$;

-- ============================================================================
-- DDL
-- ============================================================================

ALTER TABLE documentos.documentos_archivos
  ADD COLUMN workspace_id INTEGER NULL,
  ADD COLUMN empresa_codigo VARCHAR(20) NULL,
  ADD COLUMN cliente_destino_id INTEGER NULL,
  ADD COLUMN expediente_id BIGINT NULL,
  ADD COLUMN carga_operacion_id BIGINT NULL,
  ADD COLUMN creado_por INTEGER NULL,
  ADD COLUMN actualizado_por INTEGER NULL,
  ADD COLUMN actualizado_en TIMESTAMPTZ NULL,
  ADD COLUMN anulado_por INTEGER NULL,
  ADD COLUMN anulado_en TIMESTAMPTZ NULL,
  ADD COLUMN motivo_anulacion TEXT NULL;

ALTER TABLE documentos.documentos_archivos
  ADD CONSTRAINT documentos_archivos_cliente_destino_id_fkey
  FOREIGN KEY (cliente_destino_id)
  REFERENCES core.clientes_destino(id)
  ON DELETE RESTRICT,

  ADD CONSTRAINT documentos_archivos_expediente_id_fkey
  FOREIGN KEY (expediente_id)
  REFERENCES documentos.expedientes(id)
  ON DELETE RESTRICT,

  ADD CONSTRAINT documentos_archivos_carga_operacion_id_fkey
  FOREIGN KEY (carga_operacion_id)
  REFERENCES documentos.carga_operaciones(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_creado_por_fkey
  FOREIGN KEY (creado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_actualizado_por_fkey
  FOREIGN KEY (actualizado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_anulado_por_fkey
  FOREIGN KEY (anulado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_anulacion_coherente_ck
  CHECK (
    (
      anulado_en IS NULL
      AND anulado_por IS NULL
      AND motivo_anulacion IS NULL
    )
    OR
    (
      anulado_en IS NOT NULL
      AND anulado_por IS NOT NULL
      AND length(trim(motivo_anulacion)) > 0
    )
  );

CREATE INDEX idx_documentos_archivos_scope_hash
  ON documentos.documentos_archivos (
    workspace_id,
    empresa_codigo,
    hash_sha256
  )
  WHERE workspace_id IS NOT NULL
    AND empresa_codigo IS NOT NULL
    AND hash_sha256 IS NOT NULL;

CREATE INDEX idx_documentos_archivos_carga_operacion
  ON documentos.documentos_archivos (carga_operacion_id)
  WHERE carga_operacion_id IS NOT NULL;

CREATE INDEX idx_documentos_archivos_expediente
  ON documentos.documentos_archivos (expediente_id)
  WHERE expediente_id IS NOT NULL;

GRANT USAGE
  ON SCHEMA documentos
  TO platform_app;

GRANT SELECT, INSERT, UPDATE
  ON documentos.documentos_archivos
  TO platform_app;

GRANT USAGE, SELECT
  ON SEQUENCE documentos.documentos_archivos_id_seq
  TO platform_app;

-- ============================================================================
-- POSTVALIDACIÓN
-- ============================================================================

DO $postvalidation$
DECLARE
  columna TEXT;
  restriccion TEXT;
  indice TEXT;
BEGIN
  FOREACH columna IN ARRAY ARRAY[
    'workspace_id',
    'empresa_codigo',
    'cliente_destino_id',
    'expediente_id',
    'carga_operacion_id',
    'creado_por',
    'actualizado_por',
    'actualizado_en',
    'anulado_por',
    'anulado_en',
    'motivo_anulacion'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'documentos'
        AND table_name = 'documentos_archivos'
        AND column_name = columna
        AND is_nullable = 'YES'
    ) THEN
      RAISE EXCEPTION
        '0012: postvalidación fallida; columna nullable ausente o incompatible: %',
        columna;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'documentos'
      AND table_name = 'documentos_archivos'
      AND column_name = 'workspace_id'
      AND data_type = 'integer'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; workspace_id no es INTEGER';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'documentos'
      AND table_name = 'documentos_archivos'
      AND column_name = 'empresa_codigo'
      AND data_type = 'character varying'
      AND character_maximum_length = 20
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; empresa_codigo no es VARCHAR(20)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'documentos'
      AND table_name = 'documentos_archivos'
      AND column_name = 'cliente_destino_id'
      AND data_type = 'integer'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; cliente_destino_id no es INTEGER';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'documentos'
      AND table_name = 'documentos_archivos'
      AND column_name = 'expediente_id'
      AND data_type = 'bigint'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; expediente_id no es BIGINT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'documentos'
      AND table_name = 'documentos_archivos'
      AND column_name = 'carga_operacion_id'
      AND data_type = 'bigint'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; carga_operacion_id no es BIGINT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('creado_por', 'integer', 'int4'),
      ('actualizado_por', 'integer', 'int4'),
      ('actualizado_en', 'timestamp with time zone', 'timestamptz'),
      ('anulado_por', 'integer', 'int4'),
      ('anulado_en', 'timestamp with time zone', 'timestamptz'),
      ('motivo_anulacion', 'text', 'text')
    ) AS esperado(column_name, data_type, udt_name)
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'documentos'
     AND c.table_name = 'documentos_archivos'
     AND c.column_name = esperado.column_name
    WHERE c.column_name IS NULL
       OR c.data_type <> esperado.data_type
       OR c.udt_name <> esperado.udt_name
       OR c.is_nullable <> 'YES'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; tipos o nulabilidad de auditoría incompatibles';
  END IF;

  FOREACH restriccion IN ARRAY ARRAY[
    'documentos_archivos_cliente_destino_id_fkey',
    'documentos_archivos_expediente_id_fkey',
    'documentos_archivos_carga_operacion_id_fkey',
    'documentos_archivos_creado_por_fkey',
    'documentos_archivos_actualizado_por_fkey',
    'documentos_archivos_anulado_por_fkey',
    'documentos_archivos_anulacion_coherente_ck'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'documentos.documentos_archivos'::regclass
        AND conname = restriccion
    ) THEN
      RAISE EXCEPTION
        '0012: postvalidación fallida; constraint ausente: %',
        restriccion;
    END IF;
  END LOOP;

  FOREACH indice IN ARRAY ARRAY[
    'documentos.idx_documentos_archivos_scope_hash',
    'documentos.idx_documentos_archivos_carga_operacion',
    'documentos.idx_documentos_archivos_expediente'
  ]
  LOOP
    IF to_regclass(indice) IS NULL THEN
      RAISE EXCEPTION
        '0012: postvalidación fallida; índice ausente: %',
        indice;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'documentos'
      AND tablename = 'documentos_archivos'
      AND indexname = 'idx_documentos_archivos_scope_hash'
      AND lower(regexp_replace(indexdef, '\s+', ' ', 'g')) LIKE '%create index%on documentos.documentos_archivos using btree (workspace_id, empresa_codigo, hash_sha256)%'
      AND lower(regexp_replace(indexdef, '\s+', ' ', 'g')) LIKE '%where ((workspace_id is not null) and (empresa_codigo is not null) and (hash_sha256 is not null))%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'documentos'
      AND tablename = 'documentos_archivos'
      AND indexname = 'idx_documentos_archivos_carga_operacion'
      AND lower(regexp_replace(indexdef, '\s+', ' ', 'g')) LIKE '%(carga_operacion_id)%'
      AND lower(regexp_replace(indexdef, '\s+', ' ', 'g')) LIKE '%where (carga_operacion_id is not null)%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'documentos'
      AND tablename = 'documentos_archivos'
      AND indexname = 'idx_documentos_archivos_expediente'
      AND lower(regexp_replace(indexdef, '\s+', ' ', 'g')) LIKE '%(expediente_id)%'
      AND lower(regexp_replace(indexdef, '\s+', ' ', 'g')) LIKE '%where (expediente_id is not null)%'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; definición o predicado de índice incompatible';
  END IF;

  IF NOT has_table_privilege(
    'platform_app',
    'documentos.documentos_archivos',
    'SELECT'
  ) OR NOT has_table_privilege(
    'platform_app',
    'documentos.documentos_archivos',
    'INSERT'
  ) OR NOT has_table_privilege(
    'platform_app',
    'documentos.documentos_archivos',
    'UPDATE'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; grants de tabla incompletos';
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
      '0012: postvalidación fallida; privilegios de schema incompatibles';
  END IF;

  IF has_table_privilege(
    'platform_app',
    'documentos.documentos_archivos',
    'DELETE'
  ) OR has_table_privilege(
    'platform_app',
    'documentos.documentos_archivos',
    'TRUNCATE'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; privilegios destructivos no permitidos';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'PUBLIC'
      AND table_schema = 'documentos'
      AND table_name = 'documentos_archivos'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; grants a PUBLIC no permitidos';
  END IF;

  IF NOT has_sequence_privilege(
    'platform_app',
    'documentos.documentos_archivos_id_seq',
    'USAGE'
  ) OR NOT has_sequence_privilege(
    'platform_app',
    'documentos.documentos_archivos_id_seq',
    'SELECT'
  ) THEN
    RAISE EXCEPTION
      '0012: postvalidación fallida; grants de secuencia incompletos';
  END IF;
END
$postvalidation$;

-- ============================================================================
-- ROLLBACK TÉCNICO DOCUMENTAL — NO EJECUTAR AUTOMÁTICAMENTE
-- ============================================================================
--
-- Aplicable únicamente si las columnas nuevas no contienen datos funcionales,
-- no existen dependencias posteriores y existe autorización expresa:
--
-- DROP INDEX documentos.idx_documentos_archivos_expediente;
-- DROP INDEX documentos.idx_documentos_archivos_carga_operacion;
-- DROP INDEX documentos.idx_documentos_archivos_scope_hash;
--
-- ALTER TABLE documentos.documentos_archivos
--   DROP CONSTRAINT documentos_archivos_anulacion_coherente_ck,
--   DROP CONSTRAINT documentos_archivos_anulado_por_fkey,
--   DROP CONSTRAINT documentos_archivos_actualizado_por_fkey,
--   DROP CONSTRAINT documentos_archivos_creado_por_fkey,
--   DROP CONSTRAINT documentos_archivos_carga_operacion_id_fkey,
--   DROP CONSTRAINT documentos_archivos_expediente_id_fkey,
--   DROP CONSTRAINT documentos_archivos_cliente_destino_id_fkey;
--
-- ALTER TABLE documentos.documentos_archivos
--   DROP COLUMN motivo_anulacion,
--   DROP COLUMN anulado_en,
--   DROP COLUMN anulado_por,
--   DROP COLUMN actualizado_en,
--   DROP COLUMN actualizado_por,
--   DROP COLUMN creado_por,
--   DROP COLUMN carga_operacion_id,
--   DROP COLUMN expediente_id,
--   DROP COLUMN cliente_destino_id,
--   DROP COLUMN empresa_codigo,
--   DROP COLUMN workspace_id;
--
-- No utilizar CASCADE. Si existe información o dependencias, detener el
-- rollback y diseñar una migración compensatoria.
