-- OP-01B: restricciones focales, sin modificar históricos ni el contrato TMP genérico.
-- ux_documentos_archivos_un_actual ya protege una versión actual por documento.
CREATE UNIQUE INDEX uq_op_inicial_carga_operacion
  ON documentos.documentos_archivos (carga_operacion_id)
  WHERE origen_archivo = 'OP_INICIAL';

CREATE UNIQUE INDEX uq_op_inicial_reserva_documento
  ON documentos.carga_operaciones (documento_id)
  WHERE metadata #>> '{integration,consumer}' = 'OP_INITIAL_FILE';

ALTER TABLE documentos.documentos_archivos ADD CONSTRAINT ck_op_inicial_asociacion
  CHECK (origen_archivo IS DISTINCT FROM 'OP_INICIAL' OR
    (documento_id IS NOT NULL AND carga_operacion_id IS NOT NULL));

ALTER TABLE documentos.carga_operaciones ADD CONSTRAINT ck_op_inicial_reserva
  CHECK (metadata #>> '{integration,consumer}' IS DISTINCT FROM 'OP_INITIAL_FILE' OR
    (operacion_tipo = 'tmp' AND documento_id IS NOT NULL
     AND COALESCE(metadata #>> '{integration,identity}', '') <> ''
     AND COALESCE(metadata ->> 'destinoReservado', '') <> ''
     AND metadata ->> 'promocionIdentity' IS NOT DISTINCT FROM metadata #>> '{integration,identity}'
     AND jsonb_typeof(metadata #> '{integration,completed}') IS NOT DISTINCT FROM 'boolean'
     AND (promovida_en IS NULL OR (metadata #>> '{integration,completed}' = 'true' AND archivo_id IS NOT NULL))));

CREATE FUNCTION documentos.proteger_reserva_op_inicial() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.metadata #>> '{integration,consumer}' = 'OP_INITIAL_FILE' AND (
    NEW.documento_id IS DISTINCT FROM OLD.documento_id OR
    NEW.metadata #>> '{integration,consumer}' IS DISTINCT FROM OLD.metadata #>> '{integration,consumer}' OR
    NEW.metadata #>> '{integration,identity}' IS DISTINCT FROM OLD.metadata #>> '{integration,identity}' OR
    NEW.metadata ->> 'destinoReservado' IS DISTINCT FROM OLD.metadata ->> 'destinoReservado' OR
    NEW.metadata ->> 'promocionIdentity' IS DISTINCT FROM OLD.metadata ->> 'promocionIdentity' OR
    (OLD.archivo_id IS NOT NULL AND NEW.archivo_id IS DISTINCT FROM OLD.archivo_id) OR
    (OLD.metadata #>> '{integration,completed}' = 'true' AND NEW.metadata #>> '{integration,completed}' IS DISTINCT FROM 'true')
  ) THEN
    RAISE EXCEPTION 'OP_TEMP_CLAIM_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proteger_reserva_op_inicial BEFORE UPDATE ON documentos.carga_operaciones
  FOR EACH ROW EXECUTE FUNCTION documentos.proteger_reserva_op_inicial();
