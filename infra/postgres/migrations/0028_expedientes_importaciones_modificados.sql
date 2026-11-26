-- MIGRACION 0028
-- Ampliacion focal: actualizacion de descripcion mediante CSV.
-- Conserva resultados historicos y evidencias de almacenamiento.

ALTER TABLE documentos.expedientes_importaciones
    ADD COLUMN registros_modificados INTEGER NOT NULL DEFAULT 0
    CHECK (registros_modificados >= 0);

ALTER TABLE documentos.expedientes_importaciones
    DROP CONSTRAINT ck_importacion_resultado,
    ADD CONSTRAINT ck_importacion_resultado CHECK (
        registros_insertados
            + registros_existentes
            + registros_modificados
            + registros_duplicados_csv
            <= total_registros
        AND (
            estado_importacion <> 'confirmada'
            OR (
                confirmado_en IS NOT NULL
                AND registros_insertados
                    + registros_existentes
                    + registros_modificados
                    + registros_duplicados_csv
                    = total_registros
            )
        )
    );

-- Preservar todas las protecciones de 0027.
-- Incorporar registros_modificados al resultado inmutable.

CREATE OR REPLACE FUNCTION documentos.proteger_expedientes_importaciones_csv()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF ROW(NEW.id,NEW.solicitud_id,NEW.workspace_id,NEW.empresa_codigo,NEW.cliente_destino_id,
        NEW.usuario_id,NEW.usuario_email,NEW.content_type,NEW.creado_en,NEW.nombre_original,NEW.periodo_fecha,NEW.storage_key,
        NEW.r2_cuenta,NEW.r2_bucket,NEW.tamano_bytes,NEW.sha256,NEW.total_registros,NEW.registros_duplicados_csv)
       IS DISTINCT FROM ROW(OLD.id,OLD.solicitud_id,OLD.workspace_id,OLD.empresa_codigo,OLD.cliente_destino_id,
        OLD.usuario_id,OLD.usuario_email,OLD.content_type,OLD.creado_en,OLD.nombre_original,OLD.periodo_fecha,OLD.storage_key,
        OLD.r2_cuenta,OLD.r2_bucket,OLD.tamano_bytes,OLD.sha256,OLD.total_registros,OLD.registros_duplicados_csv) THEN
        RAISE EXCEPTION 'IMPORTACION_IDENTIDAD_INMUTABLE';
    END IF;
    IF OLD.estado_importacion = 'confirmada' AND
       ROW(NEW.estado_importacion,NEW.confirmado_en,NEW.registros_insertados,NEW.registros_existentes,NEW.registros_modificados)
       IS DISTINCT FROM ROW(OLD.estado_importacion,OLD.confirmado_en,OLD.registros_insertados,OLD.registros_existentes,OLD.registros_modificados) THEN
        RAISE EXCEPTION 'IMPORTACION_CONFIRMACION_INMUTABLE';
    END IF;
    IF OLD.r2_verificado_en IS NOT NULL AND
       ROW(NEW.r2_verificado_en,NEW.r2_etag) IS DISTINCT FROM ROW(OLD.r2_verificado_en,OLD.r2_etag) THEN
        RAISE EXCEPTION 'IMPORTACION_R2_EVIDENCIA_INMUTABLE';
    END IF;
    IF OLD.nas_estado = 'verificado' AND
       ROW(NEW.nas_estado,NEW.nas_destino,NEW.nas_sha256,NEW.nas_tamano_bytes,NEW.nas_verificado_en)
       IS DISTINCT FROM ROW(OLD.nas_estado,OLD.nas_destino,OLD.nas_sha256,OLD.nas_tamano_bytes,OLD.nas_verificado_en) THEN
        RAISE EXCEPTION 'IMPORTACION_NAS_EVIDENCIA_INMUTABLE';
    END IF;
    IF OLD.r2_delete_intento_id IS NOT NULL AND
       ROW(NEW.r2_delete_intento_id,NEW.r2_delete_etag,NEW.r2_delete_iniciado_en)
       IS DISTINCT FROM ROW(OLD.r2_delete_intento_id,OLD.r2_delete_etag,OLD.r2_delete_iniciado_en) THEN
        RAISE EXCEPTION 'IMPORTACION_DELETE_INTENTO_INMUTABLE';
    END IF;
    IF OLD.r2_delete_respuesta_http IS NOT NULL AND
       ROW(NEW.r2_delete_respuesta_http,NEW.r2_delete_respuesta_en,NEW.r2_delete_request_id)
       IS DISTINCT FROM ROW(OLD.r2_delete_respuesta_http,OLD.r2_delete_respuesta_en,OLD.r2_delete_request_id) THEN
        RAISE EXCEPTION 'IMPORTACION_DELETE_RESPUESTA_INMUTABLE';
    END IF;
    IF OLD.r2_estado = 'eliminado' AND
       ROW(NEW.r2_estado,NEW.r2_ausencia_observada_en,NEW.r2_eliminado_en)
       IS DISTINCT FROM ROW(OLD.r2_estado,OLD.r2_ausencia_observada_en,OLD.r2_eliminado_en) THEN
        RAISE EXCEPTION 'IMPORTACION_DELETE_ACREDITADO_INMUTABLE';
    END IF;
    IF NEW.evidencia IS NULL OR jsonb_typeof(NEW.evidencia) <> 'array'
       OR jsonb_array_length(NEW.evidencia) <= jsonb_array_length(OLD.evidencia)
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(OLD.evidencia) WITH ORDINALITY AS e(valor,n)
                  WHERE NEW.evidencia->(e.n::int-1) IS DISTINCT FROM e.valor) THEN
        RAISE EXCEPTION 'IMPORTACION_AUDITORIA_ADITIVA_REQUERIDA';
    END IF;
    RETURN NEW;
END;
$$;
