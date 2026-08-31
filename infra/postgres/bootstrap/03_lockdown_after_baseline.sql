-- Ejecutar conectado a gestion_documental con usuario master de RDS
-- después de aplicar baseline final y seed mínimo.

SELECT current_database(), current_user;

REVOKE CREATE ON DATABASE gestion_documental FROM document_platform;
REVOKE CREATE ON DATABASE gestion_documental FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

ALTER ROLE document_platform
  IN DATABASE gestion_documental
  SET search_path = core, auth, documentos, auditoria, public;

SELECT
  datname,
  datacl
FROM pg_database
WHERE datname = 'gestion_documental';

