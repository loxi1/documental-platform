SELECT current_database(), current_user;

REVOKE CREATE ON DATABASE gestion_documental FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS documentos;
CREATE SCHEMA IF NOT EXISTS auditoria;

ALTER SCHEMA core OWNER TO document_platform;
ALTER SCHEMA auth OWNER TO document_platform;
ALTER SCHEMA documentos OWNER TO document_platform;
ALTER SCHEMA auditoria OWNER TO document_platform;

GRANT USAGE, CREATE ON SCHEMA core TO document_platform;
GRANT USAGE, CREATE ON SCHEMA auth TO document_platform;
GRANT USAGE, CREATE ON SCHEMA documentos TO document_platform;
GRANT USAGE, CREATE ON SCHEMA auditoria TO document_platform;

GRANT CREATE ON DATABASE gestion_documental TO document_platform;

ALTER ROLE document_platform
  IN DATABASE gestion_documental
  SET search_path = core, auth, documentos, auditoria, public;
