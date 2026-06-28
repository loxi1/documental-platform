CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS core;

CREATE TABLE IF NOT EXISTS core.sistemas (
  id serial PRIMARY KEY,
  codigo varchar(50) NOT NULL UNIQUE,
  nombre varchar(120) NOT NULL,
  descripcion text,
  estado varchar(20) NOT NULL DEFAULT 'activo',
  orden integer NOT NULL DEFAULT 0,
  creado_en timestamp NOT NULL DEFAULT now(),
  actualizado_en timestamp NOT NULL DEFAULT now()
);

INSERT INTO core.sistemas (codigo, nombre, orden)
VALUES
  ('DOCUMENTAL', 'Gestión Documental', 1),
  ('CAJA_CHICA', 'Caja Chica', 2),
  ('PROYECTOS', 'Gestión de Proyectos', 3),
  ('GIS', 'GIS', 4)
ON CONFLICT (codigo) DO NOTHING;

DO $$
BEGIN
  IF to_regclass('auth.sistemas') IS NOT NULL THEN
    INSERT INTO core.sistemas (codigo, nombre, estado, orden)
    SELECT
      CASE WHEN lower(coalesce(codigo, 'documental')) IN ('documentos', 'documental') THEN 'DOCUMENTAL' ELSE upper(codigo) END,
      coalesce(nombre, codigo, 'Gestión Documental'),
      coalesce(estado, 'activo'),
      row_number() OVER (ORDER BY id)
    FROM auth.sistemas
    ON CONFLICT (codigo) DO NOTHING;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS auth.perfiles (
  id serial PRIMARY KEY,
  sistema_id integer NOT NULL REFERENCES core.sistemas(id),
  codigo varchar(50) NOT NULL,
  nombre varchar(120) NOT NULL,
  descripcion text,
  estado varchar(20) NOT NULL DEFAULT 'activo',
  creado_en timestamp NOT NULL DEFAULT now(),
  actualizado_en timestamp NOT NULL DEFAULT now(),
  UNIQUE (sistema_id, codigo)
);

INSERT INTO auth.perfiles (sistema_id, codigo, nombre)
SELECT s.id, p.codigo, p.nombre
FROM core.sistemas s
CROSS JOIN (VALUES
  ('admin', 'Administrador'),
  ('compras', 'Compras'),
  ('almacen', 'Almacén'),
  ('finanzas', 'Finanzas'),
  ('contabilidad', 'Contabilidad'),
  ('rrhh', 'RRHH'),
  ('consulta', 'Consulta')
) AS p(codigo, nombre)
WHERE s.codigo = 'DOCUMENTAL'
ON CONFLICT (sistema_id, codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS auth.usuario_workspaces (
  id serial PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES auth.usuarios(id),
  empresa_codigo varchar(50) NOT NULL,
  cliente_destino_id integer,
  sistema_id integer NOT NULL REFERENCES core.sistemas(id),
  perfil_id integer NOT NULL REFERENCES auth.perfiles(id),
  estado varchar(20) NOT NULL DEFAULT 'activo',
  es_favorito boolean NOT NULL DEFAULT false,
  ultimo_uso_en timestamp,
  vigencia_desde date,
  vigencia_hasta date,
  permission_version integer NOT NULL DEFAULT 1,
  permisos jsonb NOT NULL DEFAULT '{"menus": [], "actions": []}'::jsonb,
  creado_en timestamp NOT NULL DEFAULT now(),
  actualizado_en timestamp NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, empresa_codigo, sistema_id, perfil_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_workspaces_usuario
  ON auth.usuario_workspaces (usuario_id, estado);

CREATE INDEX IF NOT EXISTS idx_usuario_workspaces_empresa
  ON auth.usuario_workspaces (empresa_codigo, estado);

CREATE TABLE IF NOT EXISTS core.auditoria_eventos (
  id bigserial PRIMARY KEY,
  workspace_id integer,
  session_context_id uuid,
  request_id uuid,
  usuario_id integer,
  empresa_codigo varchar(50),
  sistema_codigo varchar(50),
  perfil_codigo varchar(50),
  modulo varchar(80),
  entidad varchar(120),
  entidad_id varchar(120),
  accion varchar(80) NOT NULL,
  descripcion text,
  antes jsonb,
  despues jsonb,
  ip varchar(80),
  user_agent text,
  creado_en timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_workspace
  ON core.auditoria_eventos (workspace_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_request
  ON core.auditoria_eventos (request_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_eventos_entidad
  ON core.auditoria_eventos (entidad, entidad_id);

DO $$
BEGIN
  IF to_regclass('auth.usuario_accesos') IS NOT NULL THEN
    INSERT INTO auth.perfiles (sistema_id, codigo, nombre)
    SELECT DISTINCT
      cs.id,
      lower(coalesce(ua.perfil, 'consulta')),
      initcap(lower(coalesce(ua.perfil, 'consulta')))
    FROM auth.usuario_accesos ua
    JOIN auth.sistemas old_s ON old_s.id = ua.sistema_id
    JOIN core.sistemas cs ON cs.codigo = CASE WHEN lower(old_s.codigo) IN ('documentos', 'documental') THEN 'DOCUMENTAL' ELSE upper(old_s.codigo) END
    WHERE ua.perfil IS NOT NULL
    ON CONFLICT (sistema_id, codigo) DO NOTHING;

    INSERT INTO auth.usuario_workspaces (
      usuario_id,
      empresa_codigo,
      cliente_destino_id,
      sistema_id,
      perfil_id,
      estado,
      es_favorito,
      permisos
    )
    SELECT
      ua.usuario_id,
      ua.empresa_codigo,
      cd.id AS cliente_destino_id,
      cs.id AS sistema_id,
      p.id AS perfil_id,
      coalesce(ua.estado, 'activo'),
      false,
      CASE
        WHEN jsonb_typeof(to_jsonb(ua.permisos)) = 'array' THEN
          jsonb_build_object(
            'menus', (
              SELECT coalesce(jsonb_agg(replace(value #>> '{}', '.ver', '')), '[]'::jsonb)
              FROM jsonb_array_elements(to_jsonb(ua.permisos)) AS value
              WHERE value #>> '{}' LIKE '%.ver'
            ),
            'actions', (
              SELECT coalesce(jsonb_agg(value #>> '{}'), '[]'::jsonb)
              FROM jsonb_array_elements(to_jsonb(ua.permisos)) AS value
              WHERE value #>> '{}' NOT LIKE '%.ver'
            )
          )
        ELSE '{"menus": [], "actions": []}'::jsonb
      END
    FROM auth.usuario_accesos ua
    JOIN auth.sistemas old_s ON old_s.id = ua.sistema_id
    JOIN core.sistemas cs ON cs.codigo = CASE WHEN lower(old_s.codigo) IN ('documentos', 'documental') THEN 'DOCUMENTAL' ELSE upper(old_s.codigo) END
    JOIN auth.perfiles p ON p.sistema_id = cs.id AND p.codigo = lower(coalesce(ua.perfil, 'consulta'))
    LEFT JOIN core.clientes_destino cd
      ON cd.abreviatura = ua.empresa_codigo
    ON CONFLICT (usuario_id, empresa_codigo, sistema_id, perfil_id) DO NOTHING;
  END IF;
END $$;
