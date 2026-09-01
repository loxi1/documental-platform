SELECT current_database(), current_user;

REVOKE CREATE ON DATABASE gestion_documental FROM document_platform;
REVOKE CREATE ON DATABASE gestion_documental FROM PUBLIC;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA core FROM document_platform;
REVOKE CREATE ON SCHEMA auth FROM document_platform;
REVOKE CREATE ON SCHEMA documentos FROM document_platform;
REVOKE CREATE ON SCHEMA auditoria FROM document_platform;

ALTER ROLE document_platform
  IN DATABASE gestion_documental
  SET search_path = core, auth, documentos, auditoria, public;

SELECT
  datname,
  datacl
FROM pg_database
WHERE datname = 'gestion_documental';