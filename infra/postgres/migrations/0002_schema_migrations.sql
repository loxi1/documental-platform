CREATE TABLE IF NOT EXISTS core.schema_migrations (
  version varchar(50) PRIMARY KEY,
  descripcion text,
  checksum text,
  ejecutado_en timestamp without time zone NOT NULL DEFAULT now(),
  ejecutado_por varchar(120) NOT NULL DEFAULT current_user
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON core.schema_migrations
TO platform_app;

INSERT INTO core.schema_migrations (version, descripcion, checksum)
VALUES
  ('0001', 'Schemas base creados: core, auth, documentos, auditoria, proyectos, caja_chica, requerimientos', NULL),
  ('0002', 'Tabla core.schema_migrations creada', NULL)
ON CONFLICT (version) DO NOTHING;