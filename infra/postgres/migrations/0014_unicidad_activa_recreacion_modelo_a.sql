BEGIN;

-- ============================================================
-- PATCH-UNICIDAD-ACTIVA-Y-RECREACION-MODELO-A-01
--
-- IMPORTANTE:
-- - Esta migración está autorizada para creación y revisión local.
-- - NO está autorizada para aplicación todavía.
-- - No modifica estados ni reactiva históricos.
-- - Solo normaliza expediente_v1_id para contenedores expediente_v1.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Prevalidación de estados conocidos
-- ------------------------------------------------------------

DO $$
DECLARE
  estados_desconocidos text;
BEGIN
  SELECT string_agg(DISTINCT estado, ', ' ORDER BY estado)
  INTO estados_desconocidos
  FROM documentos.contenedores_operativos
  WHERE estado NOT IN ('activo', 'anulado');

  IF estados_desconocidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Contenedores Operativos contienen estados desconocidos: %',
      estados_desconocidos;
  END IF;

  SELECT string_agg(DISTINCT estado, ', ' ORDER BY estado)
  INTO estados_desconocidos
  FROM documentos.documentos_operativos_principales
  WHERE estado NOT IN ('activo', 'anulado');

  IF estados_desconocidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Documentos Operativos Principales contienen estados desconocidos: %',
      estados_desconocidos;
  END IF;

  SELECT string_agg(DISTINCT estado, ', ' ORDER BY estado)
  INTO estados_desconocidos
  FROM documentos.grupos_factura
  WHERE estado NOT IN ('pendiente_revision', 'anulado');

  IF estados_desconocidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Grupos de Factura contienen estados desconocidos no confirmados: %',
      estados_desconocidos;
  END IF;

  SELECT string_agg(DISTINCT estado, ', ' ORDER BY estado)
  INTO estados_desconocidos
  FROM documentos.grupo_factura_documentos
  WHERE estado NOT IN ('activo', 'anulado');

  IF estados_desconocidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Documentos asociados a Grupo contienen estados desconocidos: %',
      estados_desconocidos;
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 2. Columna normalizada para expediente_v1
-- ------------------------------------------------------------

ALTER TABLE documentos.contenedores_operativos
  ADD COLUMN IF NOT EXISTS expediente_v1_id BIGINT NULL;

-- Rechazar metadata ausente, no numérica, cero o negativa.
DO $$
DECLARE
  ids_invalidos text;
BEGIN
  SELECT string_agg(id::text, ', ' ORDER BY id)
  INTO ids_invalidos
  FROM documentos.contenedores_operativos
  WHERE tipo_contexto = 'expediente_v1'
    AND (
      metadata ->> 'expedienteId' IS NULL
      OR btrim(metadata ->> 'expedienteId') !~ '^[1-9][0-9]*$'
    );

  IF ids_invalidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Contenedores expediente_v1 con metadata.expedienteId ausente o inválido. IDs: %',
      ids_invalidos;
  END IF;
END
$$;

UPDATE documentos.contenedores_operativos
SET expediente_v1_id = (metadata ->> 'expedienteId')::BIGINT
WHERE tipo_contexto = 'expediente_v1'
  AND expediente_v1_id IS NULL;

-- Rechazar referencias inexistentes o incompatibles.
DO $$
DECLARE
  ids_huerfanos text;
BEGIN
  SELECT string_agg(co.id::text, ', ' ORDER BY co.id)
  INTO ids_huerfanos
  FROM documentos.contenedores_operativos co
  LEFT JOIN documentos.expedientes e
    ON e.id = co.expediente_v1_id
  WHERE co.tipo_contexto = 'expediente_v1'
    AND (
      co.expediente_v1_id IS NULL
      OR e.id IS NULL
      OR upper(btrim(e.empresa_codigo)) <> upper(btrim(co.empresa_codigo))
      OR e.cliente_destino_id IS DISTINCT FROM co.cliente_destino_id
    );

  IF ids_huerfanos IS NOT NULL THEN
    RAISE EXCEPTION
      'Contenedores expediente_v1 con referencia ausente, inexistente o incompatible. IDs: %',
      ids_huerfanos;
  END IF;
END
$$;

ALTER TABLE documentos.contenedores_operativos
  DROP CONSTRAINT IF EXISTS fk_contenedor_operativo_expediente_v1;

ALTER TABLE documentos.contenedores_operativos
  ADD CONSTRAINT fk_contenedor_operativo_expediente_v1
  FOREIGN KEY (expediente_v1_id)
  REFERENCES documentos.expedientes(id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE documentos.contenedores_operativos
  VALIDATE CONSTRAINT fk_contenedor_operativo_expediente_v1;

ALTER TABLE documentos.contenedores_operativos
  DROP CONSTRAINT IF EXISTS ck_contenedor_expediente_v1_normalizado;

ALTER TABLE documentos.contenedores_operativos
  ADD CONSTRAINT ck_contenedor_expediente_v1_normalizado
  CHECK (
    tipo_contexto <> 'expediente_v1'
    OR (
      expediente_v1_id IS NOT NULL
      AND cliente_destino_id IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE documentos.contenedores_operativos
  VALIDATE CONSTRAINT ck_contenedor_expediente_v1_normalizado;

-- ------------------------------------------------------------
-- 3. Prevalidación de unicidad vigente
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM documentos.contenedores_operativos
    WHERE estado = 'activo'
      AND tipo_contexto = 'expediente_v1'
    GROUP BY
      empresa_codigo,
      cliente_destino_id,
      tipo_contexto,
      expediente_v1_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un Contenedor vigente para la misma identidad expediente_v1';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.contenedores_operativos
    WHERE estado = 'activo'
      AND tipo_contexto <> 'expediente_v1'
    GROUP BY empresa_codigo, tipo_contexto, codigo
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un Contenedor vigente no-expediente para la misma identidad actual';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.documentos_operativos_principales
    WHERE estado = 'activo'
    GROUP BY documento_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un Principal activo para el mismo documento';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.grupos_factura
    WHERE estado <> 'anulado'
    GROUP BY factura_documento_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un Grupo vigente para la misma Factura';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.grupo_factura_documentos
    WHERE estado = 'activo'
    GROUP BY documento_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un vínculo activo para el mismo documento';
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 4. Retirar constraints históricas bloqueantes
-- ------------------------------------------------------------

ALTER TABLE documentos.contenedores_operativos
  DROP CONSTRAINT IF EXISTS uq_contenedor_operativo_empresa_tipo_codigo;

ALTER TABLE documentos.documentos_operativos_principales
  DROP CONSTRAINT IF EXISTS uq_documento_operativo_principal_documento;

ALTER TABLE documentos.documentos_operativos_principales
  DROP CONSTRAINT IF EXISTS uq_documento_operativo_principal_contenedor_documento;

ALTER TABLE documentos.grupos_factura
  DROP CONSTRAINT IF EXISTS uq_grupo_factura_documento;

ALTER TABLE documentos.grupo_factura_documentos
  DROP CONSTRAINT IF EXISTS uq_grupo_factura_documento_relacion;

-- ------------------------------------------------------------
-- 5. Unicidad parcial de registros vigentes
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_contenedor_expediente_v1_activo
ON documentos.contenedores_operativos (
  empresa_codigo,
  cliente_destino_id,
  tipo_contexto,
  expediente_v1_id
)
WHERE estado = 'activo'
  AND tipo_contexto = 'expediente_v1';

-- Preserva temporalmente la identidad actual de otros tipos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contenedor_otro_contexto_activo
ON documentos.contenedores_operativos (
  empresa_codigo,
  tipo_contexto,
  codigo
)
WHERE estado = 'activo'
  AND tipo_contexto <> 'expediente_v1';

CREATE UNIQUE INDEX IF NOT EXISTS uq_documento_operativo_principal_documento_activo
ON documentos.documentos_operativos_principales (documento_id)
WHERE estado = 'activo';

CREATE UNIQUE INDEX IF NOT EXISTS uq_grupo_factura_documento_vigente
ON documentos.grupos_factura (factura_documento_id)
WHERE estado <> 'anulado';

-- Ya existe en 0008; se declara nuevamente de forma idempotente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_grupo_factura_documento_activo
ON documentos.grupo_factura_documentos (documento_id)
WHERE estado = 'activo';

CREATE INDEX IF NOT EXISTS idx_contenedor_operativo_expediente_v1
ON documentos.contenedores_operativos (expediente_v1_id)
WHERE tipo_contexto = 'expediente_v1';

COMMIT;
