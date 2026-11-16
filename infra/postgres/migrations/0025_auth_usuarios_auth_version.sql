-- 0025_auth_usuarios_auth_version.sql
--
-- Introduce el contrato de versionado de sesión requerido por el
-- cambio de contraseña G4-A (ms-auth: auth.repository.ts).
--
-- Contrato:
--   auth.usuarios.auth_version INTEGER NOT NULL DEFAULT 1
--
-- Uso en código:
--   Concurrencia optimista en cambio de contraseña:
--     UPDATE auth.usuarios
--     SET auth_version = auth_version + 1
--     WHERE id = $1 AND auth_version = $expectedAuthVersion
--     RETURNING auth_version
--
-- Compatibilidad con usuarios existentes:
--   El DEFAULT 1 aplicado en ADD COLUMN se materializa para todas las
--   filas preexistentes en el mismo DDL (comportamiento estándar de
--   PostgreSQL >= 11 para columnas con DEFAULT no volátil), sin
--   requerir un UPDATE posterior ni reescritura adicional de tabla.
--
-- Precondición segura ante definición preexistente:
--   No se asume que la columna falta. Si ya existe, se exige
--   explícitamente INTEGER NOT NULL DEFAULT 1 (incluido el DEFAULT,
--   comparado contra su representación normalizada por PostgreSQL en
--   information_schema.columns.column_default). Cualquier otra
--   definición -- incluida NOT NULL sin DEFAULT 1 -- falla
--   explícitamente en lugar de alterarse automáticamente.
DO $$
DECLARE
  existing_data_type text;
  existing_is_nullable text;
  existing_column_default text;
  normalized_default text;
BEGIN
  SELECT data_type, is_nullable, column_default
  INTO existing_data_type, existing_is_nullable, existing_column_default
  FROM information_schema.columns
  WHERE table_schema = 'auth'
    AND table_name = 'usuarios'
    AND column_name = 'auth_version';

  normalized_default := btrim(existing_column_default);

  IF NOT FOUND THEN
    ALTER TABLE auth.usuarios
      ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 1;
  ELSIF existing_data_type = 'integer'
    AND existing_is_nullable = 'NO'
    AND normalized_default IN ('1', '1::integer', '(1)::integer') THEN
    RAISE NOTICE
      'auth.usuarios.auth_version ya existe como integer NOT NULL DEFAULT 1; no se modifica (default actual: %).',
      existing_column_default;
  ELSE
    RAISE EXCEPTION
      'auth.usuarios.auth_version existe con una definicion incompatible (data_type=%, is_nullable=%, default=%). Se requiere integer NOT NULL DEFAULT 1 exacto; no se ejecuta ALTER COLUMN automatico. Requiere revision manual antes de aplicar esta migracion.',
      existing_data_type, existing_is_nullable, existing_column_default;
  END IF;
END
$$;
