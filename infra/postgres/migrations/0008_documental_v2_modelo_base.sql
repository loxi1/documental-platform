BEGIN;

-- ============================================================
-- Sprint 1.6A
-- Modelo Documental V2 - Capa física base
--
-- Migración aditiva.
-- No destruye V1.
-- No modifica documentos.documentos.
-- No modifica documentos.expediente_documentos.
-- No rompe carga guiada ni prevalidación actual.
-- ============================================================

CREATE TABLE IF NOT EXISTS documentos.contenedores_operativos (
  id BIGSERIAL PRIMARY KEY,

  empresa_codigo VARCHAR(20) NOT NULL,
  cliente_destino_id BIGINT NULL,

  tipo_contexto VARCHAR(50) NOT NULL,
  codigo VARCHAR(100) NOT NULL,
  nombre VARCHAR(255) NULL,
  descripcion TEXT NULL,

  centro_costo_codigo VARCHAR(100) NULL,
  orden_produccion_codigo VARCHAR(100) NULL,
  proyecto_codigo VARCHAR(100) NULL,

  estado VARCHAR(30) NOT NULL DEFAULT 'activo',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_por BIGINT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por BIGINT NULL,
  actualizado_en TIMESTAMPTZ NULL,
  anulado_por BIGINT NULL,
  anulado_en TIMESTAMPTZ NULL,
  motivo_anulacion TEXT NULL,

  CONSTRAINT uq_contenedor_operativo_empresa_tipo_codigo
    UNIQUE (empresa_codigo, tipo_contexto, codigo)
);

CREATE TABLE IF NOT EXISTS documentos.documentos_operativos_principales (
  id BIGSERIAL PRIMARY KEY,

  contenedor_operativo_id BIGINT NOT NULL
    REFERENCES documentos.contenedores_operativos(id)
    ON DELETE RESTRICT,

  documento_id BIGINT NOT NULL
    REFERENCES documentos.documentos(id)
    ON DELETE RESTRICT,

  tipo_principal VARCHAR(50) NOT NULL,

  es_principal_activo BOOLEAN NOT NULL DEFAULT false,

  estado VARCHAR(30) NOT NULL DEFAULT 'activo',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_por BIGINT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por BIGINT NULL,
  actualizado_en TIMESTAMPTZ NULL,
  anulado_por BIGINT NULL,
  anulado_en TIMESTAMPTZ NULL,
  motivo_anulacion TEXT NULL,

  CONSTRAINT uq_documento_operativo_principal_documento
    UNIQUE (documento_id),

  CONSTRAINT uq_documento_operativo_principal_contenedor_documento
    UNIQUE (contenedor_operativo_id, documento_id)
);

CREATE TABLE IF NOT EXISTS documentos.grupos_factura (
  id BIGSERIAL PRIMARY KEY,

  documento_operativo_principal_id BIGINT NOT NULL
    REFERENCES documentos.documentos_operativos_principales(id)
    ON DELETE RESTRICT,

  factura_documento_id BIGINT NOT NULL
    REFERENCES documentos.documentos(id)
    ON DELETE RESTRICT,

  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_revision',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_por BIGINT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por BIGINT NULL,
  actualizado_en TIMESTAMPTZ NULL,
  anulado_por BIGINT NULL,
  anulado_en TIMESTAMPTZ NULL,
  motivo_anulacion TEXT NULL,

  CONSTRAINT uq_grupo_factura_documento
    UNIQUE (factura_documento_id)
);

CREATE TABLE IF NOT EXISTS documentos.grupo_factura_documentos (
  id BIGSERIAL PRIMARY KEY,

  grupo_factura_id BIGINT NOT NULL
    REFERENCES documentos.grupos_factura(id)
    ON DELETE RESTRICT,

  documento_id BIGINT NOT NULL
    REFERENCES documentos.documentos(id)
    ON DELETE RESTRICT,

  tipo_relacion VARCHAR(80) NOT NULL,

  estado VARCHAR(30) NOT NULL DEFAULT 'activo',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_por BIGINT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por BIGINT NULL,
  actualizado_en TIMESTAMPTZ NULL,
  anulado_por BIGINT NULL,
  anulado_en TIMESTAMPTZ NULL,
  motivo_anulacion TEXT NULL,

  CONSTRAINT uq_grupo_factura_documento_relacion
    UNIQUE (grupo_factura_id, documento_id, tipo_relacion)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_grupo_factura_documento_activo
ON documentos.grupo_factura_documentos (documento_id)
WHERE estado = 'activo';

CREATE INDEX IF NOT EXISTS idx_contenedores_operativos_empresa
ON documentos.contenedores_operativos (empresa_codigo, cliente_destino_id);

CREATE INDEX IF NOT EXISTS idx_contenedores_operativos_codigo
ON documentos.contenedores_operativos (codigo);

CREATE INDEX IF NOT EXISTS idx_contenedores_operativos_contexto
ON documentos.contenedores_operativos (tipo_contexto, estado);

CREATE INDEX IF NOT EXISTS idx_dop_contenedor
ON documentos.documentos_operativos_principales (contenedor_operativo_id);

CREATE INDEX IF NOT EXISTS idx_dop_documento
ON documentos.documentos_operativos_principales (documento_id);

CREATE INDEX IF NOT EXISTS idx_dop_tipo_estado
ON documentos.documentos_operativos_principales (tipo_principal, estado);

CREATE INDEX IF NOT EXISTS idx_grupos_factura_principal
ON documentos.grupos_factura (documento_operativo_principal_id);

CREATE INDEX IF NOT EXISTS idx_grupos_factura_estado
ON documentos.grupos_factura (estado);

CREATE INDEX IF NOT EXISTS idx_grupo_factura_documentos_grupo
ON documentos.grupo_factura_documentos (grupo_factura_id);

CREATE INDEX IF NOT EXISTS idx_grupo_factura_documentos_documento
ON documentos.grupo_factura_documentos (documento_id);

CREATE INDEX IF NOT EXISTS idx_grupo_factura_documentos_tipo
ON documentos.grupo_factura_documentos (tipo_relacion, estado);

COMMIT;
