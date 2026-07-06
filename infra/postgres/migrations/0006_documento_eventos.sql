CREATE TABLE IF NOT EXISTS documentos.documento_eventos (
  id BIGSERIAL PRIMARY KEY,

  documento_id BIGINT NULL REFERENCES documentos.documentos(id),
  archivo_id BIGINT NULL REFERENCES documentos.documentos_archivos(id),

  tipo_evento VARCHAR(80) NOT NULL,

  entidad_tipo VARCHAR(80) NULL,
  entidad_id BIGINT NULL,

  expediente_id BIGINT NULL REFERENCES documentos.expedientes(id),

  descripcion TEXT NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  usuario_id BIGINT NULL,

  origen VARCHAR(50) NOT NULL DEFAULT 'sistema',

  request_id UUID NULL,
  correlation_id UUID NULL,

  evento_version INT NOT NULL DEFAULT 1,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_documento_creado
ON documentos.documento_eventos(documento_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_archivo_creado
ON documentos.documento_eventos(archivo_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_expediente_creado
ON documentos.documento_eventos(expediente_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_tipo_creado
ON documentos.documento_eventos(tipo_evento, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_request_id
ON documentos.documento_eventos(request_id);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_correlation_id
ON documentos.documento_eventos(correlation_id);

GRANT SELECT, INSERT
ON documentos.documento_eventos
TO platform_app;

GRANT USAGE, SELECT
ON SEQUENCE documentos.documento_eventos_id_seq
TO platform_app;

INSERT INTO core.schema_migrations (version, descripcion, checksum)
VALUES
  ('0006', 'Tabla documentos.documento_eventos para historial documental append-only', NULL)
ON CONFLICT (version) DO NOTHING;