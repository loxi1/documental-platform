-- OP-01A. Ejecutar únicamente en LAB mediante el runner autorizado.
-- Transacción administrada por el runner. No altera las filas documentales existentes.
ALTER TABLE documentos.documentos_operativos_principales
  ADD COLUMN op_clave_creacion uuid,
  ADD COLUMN op_payload_hash varchar(64),
  ADD CONSTRAINT uq_op_clave_creacion UNIQUE (op_clave_creacion),
  ADD CONSTRAINT ck_op_identidad CHECK (
    (tipo_principal = 'ORDEN_PAGO' AND op_clave_creacion IS NOT NULL
      AND op_payload_hash IS NOT NULL AND op_payload_hash ~ '^[0-9a-f]{64}$')
    OR (tipo_principal <> 'ORDEN_PAGO' AND op_clave_creacion IS NULL AND op_payload_hash IS NULL)
  );

ALTER TABLE documentos.grupos_factura
  ADD COLUMN origen_obligacion varchar(20) NOT NULL DEFAULT 'FACTURA',
  ALTER COLUMN factura_documento_id DROP NOT NULL,
  ADD CONSTRAINT ck_grupo_origen_fundador CHECK (
    (origen_obligacion = 'FACTURA' AND factura_documento_id IS NOT NULL)
    OR (origen_obligacion = 'ORDEN_PAGO' AND factura_documento_id IS NULL)
  );

CREATE UNIQUE INDEX uq_grupo_op_principal
  ON documentos.grupos_factura (documento_operativo_principal_id)
  WHERE origen_obligacion = 'ORDEN_PAGO';

-- Un CHECK local no puede comprobar el tipo de la fila referenciada.
-- El bloqueo impide carreras entre inserción de grupo y cambio de tipo principal.
CREATE FUNCTION documentos.validar_grupo_origen_op() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE tipo text;
BEGIN
  SELECT tipo_principal INTO tipo
    FROM documentos.documentos_operativos_principales
    WHERE id = NEW.documento_operativo_principal_id FOR SHARE;
  IF (NEW.origen_obligacion = 'ORDEN_PAGO') IS DISTINCT FROM (tipo = 'ORDEN_PAGO') THEN
    RAISE EXCEPTION 'Origen de obligación incompatible con principal' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validar_grupo_origen_op
  BEFORE INSERT OR UPDATE OF origen_obligacion, documento_operativo_principal_id
  ON documentos.grupos_factura FOR EACH ROW
  EXECUTE FUNCTION documentos.validar_grupo_origen_op();

CREATE FUNCTION documentos.proteger_tipo_principal_op() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.tipo_principal = 'ORDEN_PAGO') IS DISTINCT FROM (NEW.tipo_principal = 'ORDEN_PAGO')
     AND EXISTS (SELECT 1 FROM documentos.grupos_factura
                 WHERE documento_operativo_principal_id = OLD.id) THEN
    RAISE EXCEPTION 'Principal con grupo no puede cambiar de contrato OP' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proteger_tipo_principal_op
  BEFORE UPDATE OF tipo_principal ON documentos.documentos_operativos_principales
  FOR EACH ROW EXECUTE FUNCTION documentos.proteger_tipo_principal_op();
