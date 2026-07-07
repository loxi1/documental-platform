ALTER TABLE documentos.expedientes
  ADD COLUMN IF NOT EXISTS creado_por BIGINT NULL,
  ADD COLUMN IF NOT EXISTS actualizado_por BIGINT NULL,
  ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMP WITHOUT TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS anulado_por BIGINT NULL,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_expedientes_actualizado_por
ON documentos.expedientes(actualizado_por);

CREATE INDEX IF NOT EXISTS idx_expedientes_anulado_por
ON documentos.expedientes(anulado_por);

CREATE TABLE IF NOT EXISTS documentos.expediente_auditoria (
  id BIGSERIAL PRIMARY KEY,
  expediente_id BIGINT NOT NULL REFERENCES documentos.expedientes(id),
  accion VARCHAR(80) NOT NULL,
  estado_anterior VARCHAR(30) NULL,
  estado_nuevo VARCHAR(30) NULL,
  codigo_anterior VARCHAR(50) NULL,
  codigo_nuevo VARCHAR(50) NULL,
  descripcion_anterior TEXT NULL,
  descripcion_nueva TEXT NULL,
  metadata_anterior JSONB NULL,
  metadata_nueva JSONB NULL,
  usuario_id BIGINT NULL,
  usuario_email VARCHAR(250) NULL,
  perfil VARCHAR(80) NULL,
  empresa_codigo VARCHAR(20) NULL,
  cliente_destino_id INT NULL,
  request_id UUID NULL,
  session_context_id UUID NULL,
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expediente_auditoria_expediente_creado
ON documentos.expediente_auditoria(expediente_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_expediente_auditoria_accion_creado
ON documentos.expediente_auditoria(accion, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_expediente_auditoria_usuario_creado
ON documentos.expediente_auditoria(usuario_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_expediente_auditoria_request_id
ON documentos.expediente_auditoria(request_id);

GRANT SELECT, INSERT
ON documentos.expediente_auditoria
TO platform_app;

GRANT USAGE, SELECT
ON SEQUENCE documentos.expediente_auditoria_id_seq
TO platform_app;

GRANT SELECT, INSERT, UPDATE
ON documentos.expedientes
TO platform_app;

INSERT INTO core.schema_migrations (version, descripcion, checksum)
VALUES
  ('0007', 'Campos de auditoria y tabla de auditoria para mantenimiento de expedientes', NULL)
ON CONFLICT (version) DO NOTHING;
