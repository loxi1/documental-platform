BEGIN;

-- ============================================================
-- CIERRE AUDITORÍA DE CARGAS
-- Solo valida consistencia del modelo actual.
-- NO modifica datos legacy.
-- ============================================================

-- 1. Operaciones modernas con actor
SELECT
    COUNT(*) AS total_operaciones_con_actor
FROM documentos.carga_operaciones
WHERE actor_id IS NOT NULL;

-- 2. Archivos modernos vinculados a operación
SELECT
    COUNT(*) AS total_archivos_modernos,
    COUNT(*) FILTER (
        WHERE da.creado_por IS NULL
    ) AS modernos_sin_actor,
    COUNT(*) FILTER (
        WHERE da.creado_en IS NULL
    ) AS modernos_sin_fecha
FROM documentos.documentos_archivos da
JOIN documentos.carga_operaciones co
  ON co.id = da.carga_operacion_id
WHERE co.actor_id IS NOT NULL;

-- 3. Consistencia actor operación vs archivo
SELECT
    da.id AS archivo_id,
    da.documento_id,
    da.carga_operacion_id,
    da.creado_por,
    co.actor_id
FROM documentos.documentos_archivos da
JOIN documentos.carga_operaciones co
  ON co.id = da.carga_operacion_id
WHERE co.actor_id IS NOT NULL
  AND da.creado_por IS DISTINCT FROM co.actor_id
ORDER BY da.id;

-- 4. Reporte informativo de legacy sin actor
SELECT
    COUNT(*) AS archivos_legacy_sin_actor
FROM documentos.documentos_archivos
WHERE creado_por IS NULL
  AND carga_operacion_id IS NULL;

SELECT
    COUNT(*) AS expedientes_legacy_sin_actor
FROM documentos.expedientes
WHERE creado_por IS NULL;

SELECT
    COUNT(*) AS relaciones_legacy_sin_actor
FROM documentos.grupo_factura_documentos
WHERE creado_por IS NULL;

ROLLBACK;
