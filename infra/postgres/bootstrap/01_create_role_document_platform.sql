-- Ejecutar conectado a la base administrativa "postgres" con usuario master de RDS.
-- Este archivo no contiene contraseñas reales.
-- Reemplazar CAMBIAR_PASSWORD_FUERTE solo en una copia local no versionada o ejecutar ALTER ROLE manualmente.

SELECT current_database(), current_user;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'document_platform') THEN
    CREATE ROLE document_platform WITH LOGIN PASSWORD 'CAMBIAR_PASSWORD_FUERTE' NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
  ELSE
    ALTER ROLE document_platform WITH LOGIN PASSWORD 'CAMBIAR_PASSWORD_FUERTE';
  END IF;
END
$$;

-- Permite que el usuario master de RDS pueda ejecutar SET ROLE document_platform durante el baseline.
GRANT document_platform TO postgres;

GRANT CONNECT, TEMPORARY ON DATABASE gestion_documental TO document_platform;

REVOKE CONNECT ON DATABASE documental_platform FROM document_platform;
REVOKE CONNECT ON DATABASE gis_db FROM document_platform;

COMMENT ON ROLE document_platform IS
  'Usuario aplicativo exclusivo para la base gestion_documental.';

