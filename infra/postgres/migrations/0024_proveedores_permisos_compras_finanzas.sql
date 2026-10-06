-- 0024_proveedores_permisos_compras_finanzas.sql
--
-- Habilita el módulo compartido Proveedores para los perfiles
-- Compras y Finanzas del sistema DOCUMENTAL.
--
-- Autoridad:
--   auth.usuario_workspaces.permisos
--
-- Agrega:
--   menu:
--     proveedores
--
--   actions:
--     proveedores.ver
--     proveedores.crear
--     proveedores.editar
--
-- No modifica:
--   Contabilidad
--   Almacén
--   otros perfiles
--   empresa_codigo
--   cliente_destino_id
--
-- Idempotente: permission_version solo aumenta cuando el conjunto
-- de permisos realmente necesita ser ampliado.

WITH target AS (
  SELECT
    uw.id,
    uw.permisos,
    coalesce(uw.permisos -> 'menus', '[]'::jsonb) AS menus_actuales,
    coalesce(uw.permisos -> 'actions', '[]'::jsonb) AS actions_actuales
  FROM auth.usuario_workspaces uw
  JOIN auth.perfiles p
    ON p.id = uw.perfil_id
  JOIN core.sistemas s
    ON s.id = uw.sistema_id
  WHERE s.codigo = 'DOCUMENTAL'
    AND p.codigo IN ('compras', 'finanzas')
),
changed AS (
  SELECT
    id,
    jsonb_set(
      jsonb_set(
        permisos,
        '{menus}',
        CASE
          WHEN menus_actuales ? 'proveedores'
            THEN menus_actuales
          ELSE menus_actuales || '["proveedores"]'::jsonb
        END,
        true
      ),
      '{actions}',
      (
        SELECT coalesce(jsonb_agg(action_value), '[]'::jsonb)
        FROM (
          SELECT action_value
          FROM jsonb_array_elements(actions_actuales) AS current_action(action_value)

          UNION

          SELECT to_jsonb(required_action)
          FROM (
            VALUES
              ('proveedores.ver'::text),
              ('proveedores.crear'::text),
              ('proveedores.editar'::text)
          ) AS required(required_action)
        ) merged_actions
      ),
      true
    ) AS permisos_nuevos
  FROM target
)
UPDATE auth.usuario_workspaces uw
SET
  permisos = changed.permisos_nuevos,
  permission_version = uw.permission_version + 1,
  actualizado_en = now()
FROM changed
WHERE uw.id = changed.id
  AND uw.permisos IS DISTINCT FROM changed.permisos_nuevos;
