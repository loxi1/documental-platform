
-- MIGRACION 0027
-- BLOQUE 1: INTEGRIDAD DE NEGOCIO
-- Integridad obligatoria para importacion incremental CSV.

DO $$
BEGIN

    -- Precondición 1: códigos obligatorios.
    IF EXISTS (
        SELECT 1
        FROM documentos.expedientes
        WHERE codigo_expediente IS NULL
           OR btrim(codigo_expediente) = ''
    ) THEN
        RAISE EXCEPTION
            '0027: existen expedientes con codigo nulo o vacio';
    END IF;

    -- Precondición 2: ausencia de duplicados.
    IF EXISTS (
        SELECT 1
        FROM documentos.expedientes
        GROUP BY
            empresa_codigo,
            cliente_destino_id,
            codigo_expediente
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            '0027: existen expedientes duplicados';
    END IF;

    -- Precondición 3: consistencia empresarial.
    IF EXISTS (
        SELECT 1
        FROM documentos.expedientes AS e
        LEFT JOIN core.clientes_destino AS cd
            ON cd.id = e.cliente_destino_id
        WHERE cd.id IS NULL
           OR e.empresa_codigo IS DISTINCT FROM cd.abreviatura
    ) THEN
        RAISE EXCEPTION
            '0027: existen inconsistencias empresariales';
    END IF;

END
$$;

-- Código obligatorio.

ALTER TABLE documentos.expedientes
ALTER COLUMN codigo_expediente SET NOT NULL;

-- Impedir códigos vacíos.

ALTER TABLE documentos.expedientes
ADD CONSTRAINT ck_expedientes_codigo_no_vacio
CHECK (btrim(codigo_expediente) <> '');

-- Unicidad completa de negocio.

CREATE UNIQUE INDEX uq_expedientes_empresa_cliente_codigo
ON documentos.expedientes (
    empresa_codigo,
    cliente_destino_id,
    codigo_expediente
);

-- BLOQUE 2: REGISTRO DURABLE DE IMPORTACIONES CSV

CREATE TABLE documentos.expedientes_importaciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    solicitud_id UUID NOT NULL UNIQUE,

    workspace_id INTEGER NOT NULL,

    empresa_codigo VARCHAR(20) NOT NULL,

    cliente_destino_id INTEGER NOT NULL
        REFERENCES core.clientes_destino(id),

    usuario_id INTEGER NOT NULL
        REFERENCES auth.usuarios(id),

    usuario_email TEXT,

    nombre_original TEXT NOT NULL
        CHECK (btrim(nombre_original) <> ''),

    periodo_fecha DATE NOT NULL,

    storage_key TEXT NOT NULL
        CHECK (btrim(storage_key) <> ''),

    r2_cuenta TEXT NOT NULL
        CHECK (btrim(r2_cuenta) <> ''),

    r2_bucket TEXT NOT NULL
        CHECK (btrim(r2_bucket) <> ''),

    r2_etag TEXT,

    nas_destino TEXT,

    content_type VARCHAR(100) NOT NULL
        DEFAULT 'text/csv',

    tamano_bytes BIGINT NOT NULL
        CHECK (tamano_bytes > 0),

    sha256 VARCHAR(64) NOT NULL
        CHECK (sha256 ~ '^[0-9a-f]{64}$'),

    total_registros INTEGER NOT NULL
        CHECK (total_registros > 0),

    registros_insertados INTEGER NOT NULL DEFAULT 0
        CHECK (registros_insertados >= 0),

    registros_existentes INTEGER NOT NULL DEFAULT 0
        CHECK (registros_existentes >= 0),

    registros_duplicados_csv INTEGER NOT NULL DEFAULT 0
        CHECK (registros_duplicados_csv >= 0),

    estado_importacion VARCHAR(30) NOT NULL
        DEFAULT 'pendiente'
        CHECK (
            estado_importacion IN (
                'pendiente',
                'confirmada',
                'fallida'
            )
        ),

    r2_estado VARCHAR(30) NOT NULL
        DEFAULT 'pendiente'
        CHECK (
            r2_estado IN (
                'pendiente',
                'verificado',
                'eliminacion_pendiente',
                'eliminacion_incierta',
                'eliminado'
            )
        ),

    nas_estado VARCHAR(30) NOT NULL
        DEFAULT 'pendiente'
        CHECK (
            nas_estado IN (
                'pendiente',
                'verificado'
            )
        ),

    storage_provider VARCHAR(10)
        CHECK (storage_provider IN ('R2', 'NAS')),

    r2_verificado_en TIMESTAMPTZ,

    nas_verificado_en TIMESTAMPTZ,
    nas_sha256 VARCHAR(64),
    nas_tamano_bytes BIGINT,

    r2_delete_intento_id UUID,
    r2_delete_etag TEXT,
    r2_delete_iniciado_en TIMESTAMPTZ,
    r2_delete_respuesta_http INTEGER,
    r2_delete_respuesta_en TIMESTAMPTZ,
    r2_delete_request_id TEXT,
    r2_eliminado_en TIMESTAMPTZ,
    evidencia JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(evidencia) = 'array'),

    r2_ausencia_observada_en TIMESTAMPTZ,

    confirmado_en TIMESTAMPTZ,

    ultimo_error_codigo VARCHAR(100),

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_expedientes_importaciones_r2
        UNIQUE (r2_cuenta, r2_bucket, storage_key),

    CONSTRAINT ck_importacion_resultado
        CHECK (
            registros_insertados
                + registros_existentes
                + registros_duplicados_csv
                <= total_registros
            AND (
                estado_importacion <> 'confirmada'
                OR (
                    confirmado_en IS NOT NULL
                    AND registros_insertados
                        + registros_existentes
                        + registros_duplicados_csv
                        = total_registros
                )
            )
        ),

    CONSTRAINT ck_importacion_confirmacion
        CHECK (
            (estado_importacion = 'confirmada')
                = (confirmado_en IS NOT NULL)
            AND (
                estado_importacion <> 'confirmada'
                OR r2_verificado_en IS NOT NULL
            )
        ),

    CONSTRAINT ck_importacion_r2_verificacion
        CHECK (
            (r2_estado <> 'pendiente')
                = (r2_verificado_en IS NOT NULL)
        ),

    CONSTRAINT ck_importacion_nas_verificacion
        CHECK (
            (nas_estado = 'verificado')
                = (nas_verificado_en IS NOT NULL)
            AND (
                nas_estado <> 'verificado'
                OR (
                    nas_destino IS NOT NULL
                    AND btrim(nas_destino) <> ''
                    AND estado_importacion = 'confirmada'
                    AND nas_sha256 IS NOT NULL AND nas_sha256 = sha256
                    AND nas_tamano_bytes IS NOT NULL AND nas_tamano_bytes = tamano_bytes
                    AND nas_verificado_en >= confirmado_en
                )
            )
        ),

    CONSTRAINT ck_importacion_storage_provider
        CHECK (
            (
                storage_provider IS NULL
                AND r2_estado = 'pendiente'
                AND nas_estado = 'pendiente'
            )
            OR (
                storage_provider IS NOT DISTINCT FROM 'R2'
                AND r2_estado = 'verificado'
                AND nas_estado = 'pendiente'
            )
            OR (
                storage_provider IS NOT DISTINCT FROM 'NAS'
                AND r2_estado IN ('verificado','eliminacion_pendiente','eliminacion_incierta','eliminado')
                AND nas_estado = 'verificado'
            )
        ),

    CONSTRAINT ck_importacion_delete_intencion CHECK (
        (r2_delete_intento_id IS NULL AND r2_delete_etag IS NULL AND r2_delete_iniciado_en IS NULL)
        OR (r2_delete_intento_id IS NOT NULL AND r2_delete_etag IS NOT NULL
            AND btrim(r2_delete_etag) <> '' AND r2_delete_iniciado_en IS NOT NULL
            AND nas_estado = 'verificado' AND nas_verificado_en IS NOT NULL
            AND r2_delete_iniciado_en >= nas_verificado_en)
    ),
    CONSTRAINT ck_importacion_delete_estado CHECK (
        r2_estado NOT IN ('eliminacion_pendiente','eliminacion_incierta','eliminado')
        OR (r2_delete_intento_id IS NOT NULL AND nas_estado = 'verificado' AND storage_provider = 'NAS')
    ),
    CONSTRAINT ck_importacion_delete_respuesta CHECK (
        (r2_delete_respuesta_http IS NULL AND r2_delete_respuesta_en IS NULL AND r2_delete_request_id IS NULL)
        OR (r2_delete_respuesta_http IS NOT NULL AND r2_delete_respuesta_http BETWEEN 200 AND 299
            AND r2_delete_respuesta_en IS NOT NULL AND r2_delete_intento_id IS NOT NULL
            AND r2_delete_iniciado_en IS NOT NULL AND r2_delete_respuesta_en >= r2_delete_iniciado_en)
    ),
    -- An observed absence alone is allowed, but never proves our own deletion.
    CONSTRAINT ck_importacion_eliminacion_acreditada CHECK (
        (r2_estado = 'eliminado') = (r2_eliminado_en IS NOT NULL)
        AND (r2_estado <> 'eliminado' OR (
            nas_estado = 'verificado' AND nas_sha256 IS NOT NULL AND nas_sha256 = sha256
            AND nas_tamano_bytes IS NOT NULL AND nas_tamano_bytes = tamano_bytes
            AND r2_delete_intento_id IS NOT NULL AND r2_delete_etag IS NOT NULL
            AND r2_delete_iniciado_en IS NOT NULL AND r2_delete_respuesta_http IS NOT NULL
            AND r2_delete_respuesta_http BETWEEN 200 AND 299 AND r2_delete_respuesta_en IS NOT NULL
            AND r2_ausencia_observada_en IS NOT NULL
            AND r2_ausencia_observada_en >= r2_delete_respuesta_en
            AND r2_eliminado_en >= r2_ausencia_observada_en
        ))
    )
);

CREATE INDEX idx_expedientes_importaciones_contexto
ON documentos.expedientes_importaciones (
    workspace_id,
    empresa_codigo,
    cliente_destino_id,
    creado_en DESC
);


-- Minimal immutable identity and append-only physical evidence; no leases or scheduler.
CREATE FUNCTION documentos.proteger_expedientes_importaciones_csv()
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
       ROW(NEW.estado_importacion,NEW.confirmado_en,NEW.registros_insertados,NEW.registros_existentes)
       IS DISTINCT FROM ROW(OLD.estado_importacion,OLD.confirmado_en,OLD.registros_insertados,OLD.registros_existentes) THEN
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
CREATE TRIGGER trg_expedientes_importaciones_csv_integridad
BEFORE UPDATE ON documentos.expedientes_importaciones
FOR EACH ROW EXECUTE FUNCTION documentos.proteger_expedientes_importaciones_csv();
