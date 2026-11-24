-- G2 candidate: review required before application. No runtime enablement implied.
CREATE TABLE documentos.archivados_documentales (
 id bigserial PRIMARY KEY,
 reserva_id uuid NOT NULL UNIQUE,
 archivo_id integer UNIQUE REFERENCES documentos.documentos_archivos(id) ON DELETE RESTRICT,
 documento_id integer REFERENCES documentos.documentos(id) ON DELETE RESTRICT,
 version integer CHECK(version > 0),
 confirmado_en timestamptz,
 empresa_codigo text NOT NULL CHECK(empresa_codigo ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'),
 cliente_destino_id integer NOT NULL REFERENCES core.clientes_destino(id) ON DELETE RESTRICT,
 expediente_id bigint REFERENCES documentos.expedientes(id) ON DELETE RESTRICT,
 workspace_origen_id integer,
 contexto jsonb NOT NULL CHECK(jsonb_typeof(contexto) = 'object'),
 regla_nomenclatura text NOT NULL CHECK(btrim(regla_nomenclatura) <> ''),
 periodo_anio integer NOT NULL CHECK(periodo_anio BETWEEN 1900 AND 9999),
 periodo_mes integer NOT NULL CHECK(periodo_mes BETWEEN 1 AND 12),
 r2_cuenta text COLLATE "C" NOT NULL CHECK(btrim(r2_cuenta) <> ''),
 r2_bucket text COLLATE "C" NOT NULL CHECK(btrim(r2_bucket) <> ''),
 r2_key text COLLATE "C" NOT NULL CHECK(btrim(r2_key) <> '' AND r2_key NOT LIKE 'documentos/tmp/%'),
 sha256 varchar(64) NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 tamano_bytes bigint NOT NULL CHECK(tamano_bytes > 0),
 nas_destino text NOT NULL CHECK(btrim(nas_destino) <> ''),
 ruta_relativa text NOT NULL CHECK(
   ruta_relativa LIKE 'documentos/%' AND ruta_relativa !~ '(^|/)\.\.?(/|$)'
   AND ruta_relativa !~ '[[:cntrl:]]' AND position(chr(92) in ruta_relativa)=0),
 nas_estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(nas_estado IN('PENDIENTE','VERIFICADO','NO_DISPONIBLE')),
 nas_sha256 varchar(64) CHECK(nas_sha256 ~ '^[0-9a-f]{64}$'),
 nas_tamano_bytes bigint CHECK(nas_tamano_bytes > 0),
 nas_verificado_en timestamptz,
 staging_relativa text CHECK(staging_relativa LIKE 'documentos/%' AND staging_relativa !~ '(^|/)\.\.?(/|$)' AND staging_relativa !~ '[[:cntrl:]]' AND position(chr(92) in staging_relativa)=0),
 nas_lectura_verificada_en timestamptz,
 r2_estado text NOT NULL DEFAULT 'NO_COMPROBADO' CHECK(r2_estado IN(
   'NO_COMPROBADO','PRESENTE','INACCESIBLE','AUSENTE_OBSERVADO',
   'ELIMINACION_INICIADA','ELIMINACION_INCIERTA','ELIMINADO_ACREDITADO')),
 trabajo_estado text NOT NULL DEFAULT 'PENDIENTE' CHECK(eliminacion_iniciada_en IS NULL OR eliminacion_iniciada_en>=creado_en),
 CHECK(trabajo_estado IN(
   'PENDIENTE','PROCESANDO','REINTENTABLE','BLOQUEADO','COMPLETADO')),
 operacion text CHECK(operacion IN('COPIAR','VERIFICAR_NAS','ELIMINAR_R2','CONCILIAR_ELIMINACION')),
 lease_token uuid,
 lease_hasta timestamptz,
 generacion bigint NOT NULL DEFAULT 0 CHECK(generacion >= 0),
 intentos integer NOT NULL DEFAULT 0 CHECK(intentos >= 0),
 proximo_intento timestamptz,
 eliminacion_intento_id uuid,
 eliminacion_iniciada_en timestamptz,
 delete_respuesta_intento_id uuid,
 ausencia_intento_id uuid,
 delete_respuesta_http integer CHECK(delete_respuesta_http BETWEEN 200 AND 299),
 delete_respuesta_en timestamptz,
 delete_request_id text,
 r2_ausencia_observada_en timestamptz,
 r2_ausencia_comprobada_en timestamptz,
 r2_eliminado_en timestamptz,
 solicitado_por integer REFERENCES auth.usuarios(id) ON DELETE RESTRICT,
 ultimo_error_codigo text,
 evidencia jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(evidencia)='array'),
 creado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
 actualizado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(r2_cuenta,r2_bucket,r2_key),
 CHECK(confirmado_en IS NULL OR (archivo_id IS NOT NULL AND documento_id IS NOT NULL AND version IS NOT NULL)),
 CHECK((trabajo_estado='PROCESANDO' AND confirmado_en IS NOT NULL
     AND archivo_id IS NOT NULL AND documento_id IS NOT NULL AND version IS NOT NULL
     AND operacion IS NOT NULL AND lease_token IS NOT NULL AND lease_hasta IS NOT NULL)
   OR (trabajo_estado<>'PROCESANDO' AND operacion IS NULL AND lease_token IS NULL AND lease_hasta IS NULL)),
 CHECK(nas_estado<>'VERIFICADO' OR (confirmado_en IS NOT NULL AND nas_sha256 IS NOT NULL
   AND nas_tamano_bytes IS NOT NULL AND nas_sha256=sha256 AND nas_tamano_bytes=tamano_bytes
   AND nas_verificado_en IS NOT NULL)),
 CHECK(nas_lectura_verificada_en IS NULL OR nas_verificado_en IS NOT NULL),
 CHECK(r2_estado NOT IN('ELIMINACION_INICIADA','ELIMINACION_INCIERTA','ELIMINADO_ACREDITADO')
   OR (confirmado_en IS NOT NULL AND nas_verificado_en IS NOT NULL
     AND nas_lectura_verificada_en IS NOT NULL AND nas_sha256 IS NOT NULL AND nas_sha256=sha256
     AND nas_tamano_bytes IS NOT NULL AND nas_tamano_bytes=tamano_bytes
     AND eliminacion_intento_id IS NOT NULL AND eliminacion_iniciada_en IS NOT NULL)),
 CHECK((delete_respuesta_http IS NULL AND delete_respuesta_en IS NULL AND delete_respuesta_intento_id IS NULL)
   OR (delete_respuesta_http IS NOT NULL AND delete_respuesta_en IS NOT NULL
       AND delete_respuesta_intento_id IS NOT NULL AND eliminacion_intento_id IS NOT NULL
       AND eliminacion_iniciada_en IS NOT NULL
       AND delete_respuesta_intento_id=eliminacion_intento_id
       AND delete_respuesta_en>=eliminacion_iniciada_en)),
 CHECK((r2_ausencia_comprobada_en IS NULL AND ausencia_intento_id IS NULL)
   OR (r2_ausencia_comprobada_en IS NOT NULL AND ausencia_intento_id IS NOT NULL
       AND delete_respuesta_en IS NOT NULL AND delete_respuesta_intento_id IS NOT NULL
       AND eliminacion_intento_id IS NOT NULL AND eliminacion_iniciada_en IS NOT NULL
       AND ausencia_intento_id=eliminacion_intento_id
       AND ausencia_intento_id=delete_respuesta_intento_id
       AND r2_ausencia_comprobada_en>=delete_respuesta_en)),
 CHECK((r2_estado='ELIMINADO_ACREDITADO' AND delete_respuesta_http IS NOT NULL
     AND delete_respuesta_en IS NOT NULL AND r2_ausencia_comprobada_en IS NOT NULL AND r2_eliminado_en IS NOT NULL
     AND delete_respuesta_intento_id IS NOT NULL AND ausencia_intento_id IS NOT NULL
     AND delete_respuesta_intento_id=eliminacion_intento_id AND ausencia_intento_id=eliminacion_intento_id
     AND r2_eliminado_en>=r2_ausencia_comprobada_en)
   OR (r2_estado<>'ELIMINADO_ACREDITADO' AND r2_eliminado_en IS NULL)),
 CHECK((eliminacion_intento_id IS NULL AND eliminacion_iniciada_en IS NULL)
   OR (eliminacion_intento_id IS NOT NULL AND eliminacion_iniciada_en IS NOT NULL
     AND isfinite(eliminacion_iniciada_en) AND eliminacion_iniciada_en>=creado_en)),
 CHECK(r2_estado<>'AUSENTE_OBSERVADO' OR r2_ausencia_observada_en IS NOT NULL),
 CHECK((delete_respuesta_en IS NULL OR isfinite(delete_respuesta_en))
   AND (r2_ausencia_observada_en IS NULL OR isfinite(r2_ausencia_observada_en))
   AND (r2_ausencia_comprobada_en IS NULL OR isfinite(r2_ausencia_comprobada_en))
   AND (r2_eliminado_en IS NULL OR isfinite(r2_eliminado_en))),
 CHECK(trabajo_estado<>'COMPLETADO' OR
  (nas_estado IS NOT DISTINCT FROM 'VERIFICADO'
   AND r2_estado IS NOT DISTINCT FROM 'ELIMINADO_ACREDITADO'))
);
CREATE UNIQUE INDEX archivados_documentales_ruta_permanente_uq
 ON documentos.archivados_documentales(nas_destino,lower(ruta_relativa));
CREATE INDEX archivados_documentales_trabajo_idx ON documentos.archivados_documentales(proximo_intento,id)
 WHERE trabajo_estado IN('PENDIENTE','REINTENTABLE');
CREATE INDEX archivados_documentales_lease_idx ON documentos.archivados_documentales(lease_hasta)
 WHERE trabajo_estado='PROCESANDO';
CREATE INDEX archivados_documentales_eliminacion_idx ON documentos.archivados_documentales(r2_estado,id)
 WHERE r2_estado IN('ELIMINACION_INICIADA','ELIMINACION_INCIERTA');

CREATE FUNCTION documentos.proteger_reserva_archivado() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prefijo jsonb;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ARCHIVADO_RESERVA_PERMANENTE'; END IF;
 IF ROW(NEW.id,NEW.reserva_id,NEW.r2_cuenta,NEW.r2_bucket,NEW.r2_key,NEW.sha256,NEW.tamano_bytes,
    NEW.nas_destino,NEW.ruta_relativa,NEW.empresa_codigo,NEW.cliente_destino_id,
    NEW.workspace_origen_id,NEW.regla_nomenclatura,NEW.periodo_anio,NEW.periodo_mes,NEW.creado_en)
 IS DISTINCT FROM ROW(OLD.id,OLD.reserva_id,OLD.r2_cuenta,OLD.r2_bucket,OLD.r2_key,OLD.sha256,OLD.tamano_bytes,
    OLD.nas_destino,OLD.ruta_relativa,OLD.empresa_codigo,OLD.cliente_destino_id,
    OLD.workspace_origen_id,OLD.regla_nomenclatura,OLD.periodo_anio,OLD.periodo_mes,OLD.creado_en)
 THEN RAISE EXCEPTION 'ARCHIVADO_IDENTIDAD_INMUTABLE'; END IF;
 -- Context may only be completed before confirmation; previously known values never change.
 IF OLD.expediente_id IS DISTINCT FROM NEW.expediente_id THEN
   IF OLD.expediente_id IS NOT NULL OR OLD.confirmado_en IS NOT NULL OR NEW.expediente_id IS NULL
   THEN RAISE EXCEPTION 'ARCHIVADO_EXPEDIENTE_INMUTABLE'; END IF;
   IF NOT EXISTS(SELECT 1 FROM documentos.expedientes e WHERE e.id=NEW.expediente_id
      AND e.empresa_codigo=NEW.empresa_codigo AND e.cliente_destino_id=NEW.cliente_destino_id)
   THEN RAISE EXCEPTION 'ARCHIVADO_EXPEDIENTE_CONTEXTO_INVALIDO'; END IF;
 END IF;
 IF OLD.contexto IS DISTINCT FROM NEW.contexto THEN
   IF OLD.confirmado_en IS NOT NULL
      OR EXISTS(SELECT 1 FROM jsonb_each(OLD.contexto) e WHERE NEW.contexto->e.key IS DISTINCT FROM e.value
          AND NOT(e.value='null'::jsonb AND NEW.contexto ? e.key
            AND e.key IN('expedienteId','documentoId','archivoId','documentoBaseId','grupoFacturaId','tipoRelacion')))
      OR EXISTS(SELECT 1 FROM jsonb_object_keys(NEW.contexto) k WHERE NOT (OLD.contexto ? k)
          AND k NOT IN('expedienteId','documentoId','archivoId','documentoBaseId','grupoFacturaId','tipoRelacion'))
   THEN RAISE EXCEPTION 'ARCHIVADO_CONTEXTO_SOLO_COMPLETADO'; END IF;
 END IF;
 IF OLD.r2_estado='ELIMINADO_ACREDITADO' AND ROW(
      NEW.eliminacion_intento_id,NEW.eliminacion_iniciada_en,NEW.delete_respuesta_intento_id,
      NEW.delete_respuesta_http,NEW.delete_respuesta_en,NEW.delete_request_id,
      NEW.ausencia_intento_id,NEW.r2_ausencia_comprobada_en,NEW.r2_eliminado_en,
      NEW.nas_sha256,NEW.nas_tamano_bytes,NEW.nas_verificado_en,NEW.nas_lectura_verificada_en)
   IS DISTINCT FROM ROW(
      OLD.eliminacion_intento_id,OLD.eliminacion_iniciada_en,OLD.delete_respuesta_intento_id,
      OLD.delete_respuesta_http,OLD.delete_respuesta_en,OLD.delete_request_id,
      OLD.ausencia_intento_id,OLD.r2_ausencia_comprobada_en,OLD.r2_eliminado_en,
      OLD.nas_sha256,OLD.nas_tamano_bytes,OLD.nas_verificado_en,OLD.nas_lectura_verificada_en)
 THEN RAISE EXCEPTION 'ARCHIVADO_EVIDENCIA_ELIMINACION_INMUTABLE'; END IF;
 IF OLD.eliminacion_intento_id IS NOT NULL AND NEW.eliminacion_intento_id IS NOT DISTINCT FROM OLD.eliminacion_intento_id
    AND NEW.eliminacion_iniciada_en IS DISTINCT FROM OLD.eliminacion_iniciada_en
 THEN RAISE EXCEPTION 'ARCHIVADO_INTENCION_INMUTABLE'; END IF;
 IF OLD.delete_respuesta_en IS NOT NULL AND NEW.eliminacion_intento_id IS NOT DISTINCT FROM OLD.eliminacion_intento_id
    AND ROW(NEW.delete_respuesta_intento_id,NEW.delete_respuesta_http,NEW.delete_respuesta_en,NEW.delete_request_id)
      IS DISTINCT FROM ROW(OLD.delete_respuesta_intento_id,OLD.delete_respuesta_http,OLD.delete_respuesta_en,OLD.delete_request_id)
 THEN RAISE EXCEPTION 'ARCHIVADO_RESPUESTA_INTENTO_INMUTABLE'; END IF;
 IF NEW.eliminacion_intento_id IS DISTINCT FROM OLD.eliminacion_intento_id THEN
   IF NEW.eliminacion_intento_id IS NULL OR NEW.r2_estado<>'ELIMINACION_INICIADA'
      OR NEW.eliminacion_iniciada_en IS NULL
      OR (OLD.eliminacion_iniciada_en IS NOT NULL AND NEW.eliminacion_iniciada_en<=OLD.eliminacion_iniciada_en)
      OR NEW.delete_respuesta_http IS NOT NULL OR NEW.delete_respuesta_en IS NOT NULL
      OR NEW.delete_respuesta_intento_id IS NOT NULL OR NEW.delete_request_id IS NOT NULL
      OR NEW.ausencia_intento_id IS NOT NULL OR NEW.r2_ausencia_comprobada_en IS NOT NULL OR NEW.r2_eliminado_en IS NOT NULL
   THEN RAISE EXCEPTION 'ARCHIVADO_NUEVO_INTENTO_REQUIERE_EVIDENCIA_VACIA'; END IF;
 END IF;
 IF (OLD.archivo_id IS NOT NULL AND NEW.archivo_id IS DISTINCT FROM OLD.archivo_id)
 OR (OLD.documento_id IS NOT NULL AND NEW.documento_id IS DISTINCT FROM OLD.documento_id)
 OR (OLD.version IS NOT NULL AND NEW.version IS DISTINCT FROM OLD.version)
 OR (OLD.confirmado_en IS NOT NULL AND NEW.confirmado_en IS DISTINCT FROM OLD.confirmado_en)
 THEN RAISE EXCEPTION 'ARCHIVADO_ASOCIACION_INMUTABLE'; END IF;
 IF OLD.staging_relativa IS NOT NULL AND NEW.staging_relativa IS DISTINCT FROM OLD.staging_relativa
 THEN RAISE EXCEPTION 'ARCHIVADO_STAGING_INMUTABLE'; END IF;
 IF NEW.generacion < OLD.generacion THEN RAISE EXCEPTION 'ARCHIVADO_GENERACION_REGRESIVA'; END IF;
 IF OLD.r2_estado='ELIMINADO_ACREDITADO' AND NEW.r2_estado<>'ELIMINADO_ACREDITADO'
 THEN RAISE EXCEPTION 'ARCHIVADO_ELIMINACION_NO_REVERSIBLE'; END IF;
 IF jsonb_typeof(NEW.evidencia) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'ARCHIVADO_EVIDENCIA_INVALIDA'; END IF;
 SELECT coalesce(jsonb_agg(e.v ORDER BY e.n),'[]'::jsonb) INTO prefijo
 FROM jsonb_array_elements(NEW.evidencia) WITH ORDINALITY AS e(v,n)
 WHERE e.n<=jsonb_array_length(OLD.evidencia);
 IF prefijo IS DISTINCT FROM OLD.evidencia OR jsonb_array_length(NEW.evidencia)<=jsonb_array_length(OLD.evidencia)
 THEN RAISE EXCEPTION 'ARCHIVADO_AUDITORIA_ADITIVA_REQUERIDA'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER archivados_documentales_reserva_permanente BEFORE UPDATE OR DELETE
 ON documentos.archivados_documentales FOR EACH ROW EXECUTE FUNCTION documentos.proteger_reserva_archivado();
CREATE FUNCTION documentos.impedir_truncate_archivados() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'ARCHIVADO_RESERVA_PERMANENTE'; END; $$;
CREATE TRIGGER archivados_documentales_no_truncate BEFORE TRUNCATE
 ON documentos.archivados_documentales FOR EACH STATEMENT EXECUTE FUNCTION documentos.impedir_truncate_archivados();
