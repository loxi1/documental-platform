-- ============================================================
-- 0023_op_r5b_post0020_final.sql
--
-- R5B-2 Orden de Pago.
-- Delta consolidado POST_0020 -> FINAL.
--
-- BASELINE PRODUCTIVO:
--   0020_op_r5b_modelo_persistencia_config.sql
--
-- Consolida:
--   - modo de seleccion de beneficiario
--   - configuracion SEGUROS
--   - Prestamo a personal
--   - regularizadores permitidos por concepto
--   - regularizadores congelados por obligacion
--
-- La transaccion es administrada por el migration runner.
-- NO incluir BEGIN / COMMIT.
--
-- No modifica snapshots historicos.
-- No reinterpreta obligaciones existentes.
-- No crea proveedores.
-- ============================================================


-- ============================================================
-- 1. MODO DE SELECCION DEL BENEFICIARIO
-- ============================================================

ALTER TABLE documentos.catalogo_conceptos_obligacion
  ADD COLUMN modo_seleccion_beneficiario varchar NOT NULL DEFAULT 'NO_APLICA';

COMMENT ON COLUMN documentos.catalogo_conceptos_obligacion.modo_seleccion_beneficiario IS
  'Modo operativo de selección del beneficiario: NO_APLICA, CONFIGURADO o AUTOCOMPLETE. No reemplaza tipo_beneficiario ni uso_beneficiario.';

ALTER TABLE documentos.catalogo_conceptos_obligacion
  ADD CONSTRAINT ck_catalogo_modo_seleccion_beneficiario
  CHECK (
    modo_seleccion_beneficiario IN (
      'NO_APLICA',
      'CONFIGURADO',
      'AUTOCOMPLETE'
    )
  );

UPDATE documentos.catalogo_conceptos_obligacion
SET modo_seleccion_beneficiario = 'CONFIGURADO'
WHERE tipo_beneficiario = 'PROVEEDOR'
  AND codigo IN (
    'ESSALUD',
    'SENATI',
    'AFP',
    'ONP',
    'SEGUROS'
  );

UPDATE documentos.catalogo_conceptos_obligacion
SET modo_seleccion_beneficiario = 'AUTOCOMPLETE'
WHERE tipo_beneficiario = 'PROVEEDOR'
  AND codigo IN (
    'CAPACITACION',
    'EXAMEN_MEDICO',
    'GASTO_BANCARIO',
    'ENERGIA_ELECTRICA',
    'AGUA',
    'INTERNET',
    'TELEFONIA',
    'VARIOS'
  );

UPDATE documentos.catalogo_conceptos_obligacion
SET modo_seleccion_beneficiario = 'CONFIGURADO'
WHERE codigo = 'RENDICION'
  AND tipo_beneficiario = 'USUARIO';

UPDATE documentos.catalogo_conceptos_obligacion
SET modo_seleccion_beneficiario = 'CONFIGURADO'
WHERE codigo = 'TRANSFERENCIA_A_CONSORCIO'
  AND tipo_beneficiario = 'CLIENTE_DESTINO';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM documentos.catalogo_conceptos_obligacion
    WHERE tipo_beneficiario = 'PROVEEDOR'
      AND modo_seleccion_beneficiario = 'NO_APLICA'
  ) THEN
    RAISE EXCEPTION
      '0023: existe concepto PROVEEDOR sin modo de seleccion';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.catalogo_conceptos_obligacion
    WHERE modo_seleccion_beneficiario = 'AUTOCOMPLETE'
      AND tipo_beneficiario <> 'PROVEEDOR'
  ) THEN
    RAISE EXCEPTION
      '0023: AUTOCOMPLETE solo permitido para PROVEEDOR';
  END IF;
END
$$;


-- ============================================================
-- 2. PRESTAMO A PERSONAL
-- ============================================================

UPDATE documentos.catalogo_conceptos_obligacion
SET
  nombre = 'Préstamo a personal',
  tipo_beneficiario = 'NOMBRE_LIBRE',
  uso_beneficiario = 'REQUERIDO',
  modo_seleccion_beneficiario = 'NO_APLICA'
WHERE codigo = 'INGRESO_A_EMPRESA';


-- ============================================================
-- 3. SEGUROS: SEIS PROVEEDORES CONFIGURADOS
-- ============================================================

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)
    INTO v_count
  FROM core.proveedores
  WHERE ruc IN (
    '20382748566',
    '20100041953',
    '20109068498',
    '20332970411',
    '20418896915',
    '20600098633'
  );

  IF v_count <> 6 THEN
    RAISE EXCEPTION
      '0023: no existen exactamente las seis aseguradoras requeridas; encontradas %',
      v_count;
  END IF;
END
$$;

INSERT INTO documentos.config_proveedores_concepto_op (
  concepto_id,
  proveedor_id,
  contenedor_operativo_id,
  activo
)
SELECT
  c.id,
  p.id,
  NULL,
  true
FROM documentos.catalogo_conceptos_obligacion c
CROSS JOIN core.proveedores p
WHERE c.codigo = 'SEGUROS'
  AND p.ruc IN (
    '20382748566',
    '20100041953',
    '20109068498',
    '20332970411',
    '20418896915',
    '20600098633'
  )
ON CONFLICT (concepto_id, proveedor_id)
WHERE contenedor_operativo_id IS NULL
DO UPDATE SET activo = EXCLUDED.activo;


-- ============================================================
-- 4. REGULARIZADORES PERMITIDOS POR CONCEPTO
-- ============================================================

CREATE TABLE documentos.config_regularizadores_concepto_obligacion (
  concepto_id bigint NOT NULL,
  tipo_documental varchar NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pk_config_regularizadores_concepto_obligacion
    PRIMARY KEY (concepto_id, tipo_documental),

  CONSTRAINT fk_config_regularizadores_concepto_obligacion_concepto
    FOREIGN KEY (concepto_id)
    REFERENCES documentos.catalogo_conceptos_obligacion(id)
    ON DELETE RESTRICT
);


-- ============================================================
-- 5. REGULARIZADORES CONGELADOS POR OBLIGACION
-- ============================================================

CREATE TABLE documentos.obligacion_regularizadores_snapshot (
  grupo_factura_id bigint NOT NULL,
  tipo_documental varchar NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pk_obligacion_regularizadores_snapshot
    PRIMARY KEY (grupo_factura_id, tipo_documental),

  CONSTRAINT fk_obligacion_regularizadores_snapshot_obligacion
    FOREIGN KEY (grupo_factura_id)
    REFERENCES documentos.obligaciones_snapshot(grupo_factura_id)
    ON DELETE RESTRICT
);


-- ============================================================
-- 6. CONFIGURACION INICIAL EXPLICITA
--
-- No existe default universal.
-- Cada fila representa una decision funcional explicita.
--
-- RECIBO_HONORARIOS = codigo del concepto.
-- RECIBO_HONORARIO  = identidad documental canonica.
-- ============================================================

INSERT INTO documentos.config_regularizadores_concepto_obligacion (
  concepto_id,
  tipo_documental,
  activo
)
SELECT
  c.id,
  seed.tipo_documental,
  true
FROM (
  VALUES
    ('ENERGIA_ELECTRICA', 'FACTURA'),
    ('AGUA',              'FACTURA'),
    ('INTERNET',          'FACTURA'),
    ('TELEFONIA',         'FACTURA'),
    ('RECIBO_HONORARIOS', 'RECIBO_HONORARIO'),
    ('SEGUROS',           'FACTURA'),
    ('CAPACITACION',      'FACTURA'),
    ('EXAMEN_MEDICO',     'FACTURA'),
    ('GASTO_BANCARIO',    'FACTURA')
) AS seed(codigo_concepto, tipo_documental)
JOIN documentos.catalogo_conceptos_obligacion c
  ON c.codigo = seed.codigo_concepto
ON CONFLICT (concepto_id, tipo_documental)
DO UPDATE SET
  activo = EXCLUDED.activo,
  updated_at = now();


-- ============================================================
-- 7. GUARDAS DEL CONTRATO FINAL
-- ============================================================

DO $$
DECLARE
  v_regularizables integer;
  v_configurados integer;
  v_seguros integer;
  v_prestamo integer;
BEGIN
  SELECT count(*)
    INTO v_regularizables
  FROM documentos.catalogo_conceptos_obligacion
  WHERE activo = true
    AND requiere_regularizacion = true;

  SELECT count(DISTINCT c.id)
    INTO v_configurados
  FROM documentos.catalogo_conceptos_obligacion c
  JOIN documentos.config_regularizadores_concepto_obligacion cfg
    ON cfg.concepto_id = c.id
   AND cfg.activo = true
  WHERE c.activo = true
    AND c.requiere_regularizacion = true;

  IF v_regularizables <> v_configurados THEN
    RAISE EXCEPTION
      '0023: conceptos activos que requieren regularizacion sin configuracion completa; esperados %, configurados %',
      v_regularizables,
      v_configurados;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.config_regularizadores_concepto_obligacion cfg
    JOIN documentos.catalogo_conceptos_obligacion c
      ON c.id = cfg.concepto_id
    WHERE cfg.activo = true
      AND c.requiere_regularizacion = false
  ) THEN
    RAISE EXCEPTION
      '0023: existe regularizador activo para concepto que NO requiere regularizacion';
  END IF;

  SELECT count(*)
    INTO v_seguros
  FROM documentos.config_proveedores_concepto_op cfg
  JOIN documentos.catalogo_conceptos_obligacion c
    ON c.id = cfg.concepto_id
  JOIN core.proveedores p
    ON p.id = cfg.proveedor_id
  WHERE c.codigo = 'SEGUROS'
    AND cfg.contenedor_operativo_id IS NULL
    AND cfg.activo = true
    AND p.ruc IN (
      '20382748566',
      '20100041953',
      '20109068498',
      '20332970411',
      '20418896915',
      '20600098633'
    );

  IF v_seguros <> 6 THEN
    RAISE EXCEPTION
      '0023: esperado 6 aseguradoras configuradas; encontrado %',
      v_seguros;
  END IF;

  SELECT count(*)
    INTO v_prestamo
  FROM documentos.catalogo_conceptos_obligacion
  WHERE codigo = 'INGRESO_A_EMPRESA'
    AND nombre = 'Préstamo a personal'
    AND tipo_beneficiario = 'NOMBRE_LIBRE'
    AND uso_beneficiario = 'REQUERIDO'
    AND modo_seleccion_beneficiario = 'NO_APLICA';

  IF v_prestamo <> 1 THEN
    RAISE EXCEPTION
      '0023: regla final de préstamo a personal no quedó canónica';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM documentos.catalogo_conceptos_obligacion c
    JOIN documentos.config_regularizadores_concepto_obligacion cfg
      ON cfg.concepto_id = c.id
     AND cfg.activo = true
    WHERE c.codigo = 'RECIBO_HONORARIOS'
      AND cfg.tipo_documental = 'RECIBO_HONORARIO'
  ) THEN
    RAISE EXCEPTION
      '0023: RECIBO_HONORARIOS no quedó configurado con RECIBO_HONORARIO';
  END IF;
END
$$;


-- ============================================================
-- FIN 0023 - POST_0020 -> FINAL
-- ============================================================
