-- 0019_obligaciones_catalogo_snapshot.sql
-- Núcleo de clasificación y snapshot histórico de obligaciones financieras.
-- Transacción administrada por el runner.
--
-- grupo_factura_id identifica la obligación financiera.
-- origen_obligacion permanece como autoridad del origen FACTURA / ORDEN_PAGO.
-- Esta migración no realiza cutover de readers/writers.
--
-- fecha_emision NO es periodo funcional:
--   fecha_emision = fecha real del documento / filtro contable.
--   periodo_anio + periodo_mes = periodo funcional declarado cuando aplica.
-- El periodo funcional nunca se deriva de fecha_emision.

CREATE TABLE documentos.catalogo_conceptos_obligacion (
  id BIGSERIAL PRIMARY KEY,
  codigo varchar NOT NULL UNIQUE,
  clasificacion varchar NOT NULL,
  nombre varchar NOT NULL,
  abreviatura varchar,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL,
  requiere_regularizacion boolean NOT NULL,
  requiere_periodo boolean NOT NULL,
  uso_codigo_pago varchar NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_catalogo_conceptos_obligacion_codigo
    CHECK (btrim(codigo) <> ''),

  CONSTRAINT ck_catalogo_conceptos_obligacion_clasificacion
    CHECK (btrim(clasificacion) <> ''),

  CONSTRAINT ck_catalogo_conceptos_obligacion_nombre
    CHECK (btrim(nombre) <> ''),

  CONSTRAINT ck_catalogo_conceptos_obligacion_uso_codigo_pago
    CHECK (uso_codigo_pago IN ('NO_APLICA', 'OPCIONAL', 'REQUERIDO'))
);

COMMENT ON TABLE documentos.catalogo_conceptos_obligacion IS
  'Catálogo canónico de conceptos de obligación. codigo y clasificacion son identidad semántica estable una vez referenciada; una reclasificación semántica futura requiere un nuevo concepto.';

CREATE TABLE documentos.obligaciones_snapshot (
  grupo_factura_id bigint PRIMARY KEY,
  concepto_id bigint,
  requiere_regularizacion_aplicada boolean NOT NULL,
  estado_regularizacion varchar NOT NULL,
  periodo_anio integer,
  periodo_mes integer,
  codigo_pago varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_obligaciones_snapshot_grupo
    FOREIGN KEY (grupo_factura_id)
    REFERENCES documentos.grupos_factura(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_obligaciones_snapshot_concepto
    FOREIGN KEY (concepto_id)
    REFERENCES documentos.catalogo_conceptos_obligacion(id)
    ON DELETE RESTRICT,

  CONSTRAINT ck_obligaciones_snapshot_estado
    CHECK (estado_regularizacion IN (
      'NO_REQUIERE',
      'PENDIENTE',
      'REGULARIZADO'
    )),

  CONSTRAINT ck_obligaciones_snapshot_regularizacion
    CHECK (
      (requiere_regularizacion_aplicada = false
        AND estado_regularizacion = 'NO_REQUIERE')
      OR
      (requiere_regularizacion_aplicada = true
        AND estado_regularizacion IN ('PENDIENTE', 'REGULARIZADO'))
    ),

  CONSTRAINT ck_obligaciones_snapshot_periodo_completo
    CHECK (
      (periodo_anio IS NULL AND periodo_mes IS NULL)
      OR
      (periodo_anio IS NOT NULL AND periodo_mes IS NOT NULL)
    ),

  CONSTRAINT ck_obligaciones_snapshot_periodo_anio
    CHECK (periodo_anio IS NULL OR periodo_anio > 0),

  CONSTRAINT ck_obligaciones_snapshot_periodo_mes
    CHECK (periodo_mes IS NULL OR periodo_mes BETWEEN 1 AND 12),

  CONSTRAINT ck_obligaciones_snapshot_codigo_pago
    CHECK (codigo_pago IS NULL OR btrim(codigo_pago) <> '')
);

CREATE INDEX idx_obligaciones_snapshot_concepto
  ON documentos.obligaciones_snapshot (concepto_id);

-- Los 23 conceptos forman la clasificación inicial cerrada.
-- Las reglas del catálogo aplican a obligaciones nuevas/ediciones explícitas.
-- El snapshot conserva la regla aplicada históricamente.

INSERT INTO documentos.catalogo_conceptos_obligacion
  (
    codigo,
    clasificacion,
    nombre,
    abreviatura,
    activo,
    orden,
    requiere_regularizacion,
    requiere_periodo,
    uso_codigo_pago
  )
VALUES
  ('ENERGIA_ELECTRICA', 'SERVICIOS', 'Energía eléctrica', 'LUZ', true, 10, false, false, 'NO_APLICA'),
  ('AGUA', 'SERVICIOS', 'Agua', 'AGUA', true, 20, false, false, 'NO_APLICA'),
  ('INTERNET', 'SERVICIOS', 'Internet', 'INTERNET', true, 30, false, false, 'NO_APLICA'),
  ('TELEFONIA', 'SERVICIOS', 'Telefonía', 'TELEFONIA', true, 40, false, false, 'NO_APLICA'),

  ('RECIBO_HONORARIOS', 'HONORARIOS', 'Recibo por honorarios', 'RH', true, 50, true, false, 'NO_APLICA'),

  ('PLAME', 'PLANILLA', 'PLAME', 'PL', true, 60, false, true, 'OPCIONAL'),

  ('ONP', 'SISTEMA_PENSIONARIO', 'ONP', 'ONP', true, 70, false, true, 'NO_APLICA'),
  ('AFP', 'SISTEMA_PENSIONARIO', 'AFP', 'AFP', true, 80, false, true, 'NO_APLICA'),

  ('IGV', 'TRIBUTOS', 'IGV', 'IGV', true, 90, false, false, 'NO_APLICA'),
  ('ITAN', 'TRIBUTOS', 'ITAN', 'ITAN', true, 100, false, false, 'NO_APLICA'),
  ('RENTA_3RA', 'TRIBUTOS', 'Renta de tercera categoría', 'R3', true, 110, false, false, 'NO_APLICA'),
  ('RENTA_4TA', 'TRIBUTOS', 'Renta de cuarta categoría', 'R4', true, 120, false, false, 'NO_APLICA'),
  ('RENTA_5TA', 'TRIBUTOS', 'Renta de quinta categoría', 'R5', true, 130, false, false, 'NO_APLICA'),

  ('SEGUROS', 'SEGUROS', 'Seguros', 'SEGUROS', true, 140, true, false, 'REQUERIDO'),
  ('PASAJES', 'PASAJES', 'Pasajes', 'PASAJES', true, 150, false, false, 'OPCIONAL'),
  ('CAPACITACION', 'CAPACITACION', 'Capacitación', 'CAP', true, 160, false, false, 'NO_APLICA'),
  ('EXAMEN_MEDICO', 'EXAMEN_MEDICO', 'Examen médico', 'EM', true, 170, false, false, 'NO_APLICA'),

  ('INGRESO_A_EMPRESA', 'PRESTAMO', 'Préstamo - ingreso a empresa', 'PR', true, 180, false, false, 'NO_APLICA'),
  ('TRANSFERENCIA_A_CONSORCIO', 'PRESTAMO', 'Préstamo - transferencia a consorcio', 'PR', true, 190, false, false, 'NO_APLICA'),

  ('RENDICION', 'RENDICION', 'Rendición', 'RD', true, 200, false, false, 'NO_APLICA'),
  ('GASTO_BANCARIO', 'GASTO_BANCARIO', 'Gasto bancario', 'GB', true, 210, true, false, 'NO_APLICA'),
  ('VARIOS', 'VARIOS', 'Varios', 'VR', true, 220, false, false, 'NO_APLICA'),

  ('OTROS_HISTORICO', 'SERVICIOS', 'Otros (histórico)', 'OTROS', false, 230, false, false, 'NO_APLICA');

-- Guards de integridad del universo histórico.
DO $$
DECLARE
  v_count bigint;
BEGIN
  SELECT count(*)
    INTO v_count
  FROM documentos.grupos_factura g
  JOIN documentos.documentos_operativos_principales p
    ON p.id = g.documento_operativo_principal_id
  WHERE
    (g.origen_obligacion = 'FACTURA'
      AND (
        g.factura_documento_id IS NULL
        OR p.tipo_principal = 'ORDEN_PAGO'
      ))
    OR
    (g.origen_obligacion = 'ORDEN_PAGO'
      AND (
        g.factura_documento_id IS NOT NULL
        OR p.tipo_principal <> 'ORDEN_PAGO'
      ));

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '0019: grupos con origen/fundador incompatible: %',
      v_count;
  END IF;

  SELECT count(*)
    INTO v_count
  FROM documentos.grupos_factura g
  JOIN documentos.documentos_operativos_principales p
    ON p.id = g.documento_operativo_principal_id
  JOIN documentos.documentos d
    ON d.id = p.documento_id
  WHERE g.origen_obligacion = 'ORDEN_PAGO'
    AND (
      p.tipo_principal <> 'ORDEN_PAGO'
      OR d.tipo_documental <> 'ORDEN_PAGO'
    );

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '0019: fundador lógico ORDEN_PAGO incompatible: %',
      v_count;
  END IF;

  SELECT count(*)
    INTO v_count
  FROM documentos.grupos_factura g
  JOIN documentos.documentos_operativos_principales p
    ON p.id = g.documento_operativo_principal_id
  JOIN documentos.documentos d
    ON d.id = p.documento_id
  WHERE g.origen_obligacion = 'ORDEN_PAGO'
    AND (
      (d.periodo_anio IS NULL) <> (d.periodo_mes IS NULL)
    );

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '0019: ORDEN_PAGO con periodo parcial: %',
      v_count;
  END IF;

  SELECT count(*)
    INTO v_count
  FROM documentos.grupos_factura g
  JOIN documentos.documentos_operativos_principales p
    ON p.id = g.documento_operativo_principal_id
  JOIN documentos.documentos d
    ON d.id = p.documento_id
  WHERE g.origen_obligacion = 'ORDEN_PAGO'
    AND d.metadata #>> '{ordenPago,tipo}' = 'SERVICIOS_GENERALES'
    AND d.metadata #>> '{ordenPago,subtipo}' = 'ARBITRIOS';

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '0019: ARBITRIOS histórico requiere mapeo funcional explícito: %',
      v_count;
  END IF;

  SELECT count(*)
    INTO v_count
  FROM documentos.grupos_factura g
  JOIN documentos.documentos_operativos_principales p
    ON p.id = g.documento_operativo_principal_id
  JOIN documentos.documentos d
    ON d.id = p.documento_id
  WHERE g.origen_obligacion = 'ORDEN_PAGO'
    AND NOT (
      (d.metadata #>> '{ordenPago,tipo}' = 'SEGUROS'
        AND d.metadata #>> '{ordenPago,subtipo}' IS NULL)
      OR
      (d.metadata #>> '{ordenPago,tipo}' = 'SERVICIOS_GENERALES'
        AND d.metadata #>> '{ordenPago,subtipo}' = 'AGUA')
      OR
      (d.metadata #>> '{ordenPago,tipo}' = 'SERVICIOS_GENERALES'
        AND d.metadata #>> '{ordenPago,subtipo}' = 'OTROS')
    ) IS TRUE;

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '0019: combinación histórica ORDEN_PAGO sin mapeo explícito: %',
      v_count;
  END IF;
END
$$;

-- FACTURA:
-- la obligación nace con la Factura válida y ya está regularizada.
-- periodo_anio/periodo_mes del snapshot NO representan mes contable
-- ni se derivan de fecha_emision; para FACTURA quedan NULL.
INSERT INTO documentos.obligaciones_snapshot (
  grupo_factura_id,
  concepto_id,
  requiere_regularizacion_aplicada,
  estado_regularizacion,
  periodo_anio,
  periodo_mes,
  codigo_pago
)
SELECT
  g.id,
  NULL,
  true,
  'REGULARIZADO',
  NULL,
  NULL,
  NULL
FROM documentos.grupos_factura g
WHERE g.origen_obligacion = 'FACTURA';

-- ORDEN_PAGO:
-- el concepto histórico se resuelve únicamente desde metadata->ordenPago.
-- codigo_pago permanece NULL porque no existe fuente histórica canónica
-- acreditada. Las reglas actuales del catálogo no se aplican
-- retroactivamente para invalidar esas filas.
INSERT INTO documentos.obligaciones_snapshot (
  grupo_factura_id,
  concepto_id,
  requiere_regularizacion_aplicada,
  estado_regularizacion,
  periodo_anio,
  periodo_mes,
  codigo_pago
)
SELECT
  g.id,
  c.id,
  c.requiere_regularizacion,
  CASE
    WHEN c.requiere_regularizacion THEN 'PENDIENTE'
    ELSE 'NO_REQUIERE'
  END,
  d.periodo_anio,
  d.periodo_mes,
  NULL
FROM documentos.grupos_factura g
JOIN documentos.documentos_operativos_principales p
  ON p.id = g.documento_operativo_principal_id
JOIN documentos.documentos d
  ON d.id = p.documento_id
JOIN documentos.catalogo_conceptos_obligacion c
  ON c.codigo = CASE
    WHEN d.metadata #>> '{ordenPago,tipo}' = 'SEGUROS'
      AND d.metadata #>> '{ordenPago,subtipo}' IS NULL
      THEN 'SEGUROS'

    WHEN d.metadata #>> '{ordenPago,tipo}' = 'SERVICIOS_GENERALES'
      AND d.metadata #>> '{ordenPago,subtipo}' = 'AGUA'
      THEN 'AGUA'

    WHEN d.metadata #>> '{ordenPago,tipo}' = 'SERVICIOS_GENERALES'
      AND d.metadata #>> '{ordenPago,subtipo}' = 'OTROS'
      THEN 'OTROS_HISTORICO'
  END
WHERE g.origen_obligacion = 'ORDEN_PAGO';

-- Validación dinámica post-backfill.
DO $$
DECLARE
  v_grupos bigint;
  v_snapshots bigint;
  v_count bigint;
BEGIN
  SELECT count(*)
    INTO v_grupos
  FROM documentos.grupos_factura
  WHERE origen_obligacion IN ('FACTURA', 'ORDEN_PAGO');

  SELECT count(*)
    INTO v_snapshots
  FROM documentos.obligaciones_snapshot s
  JOIN documentos.grupos_factura g
    ON g.id = s.grupo_factura_id
  WHERE g.origen_obligacion IN ('FACTURA', 'ORDEN_PAGO');

  IF v_snapshots <> v_grupos THEN
    RAISE EXCEPTION
      '0019: snapshots incompletos: grupos %, snapshots %',
      v_grupos,
      v_snapshots;
  END IF;

  SELECT count(*)
    INTO v_count
  FROM documentos.obligaciones_snapshot s
  JOIN documentos.grupos_factura g
    ON g.id = s.grupo_factura_id
  WHERE
    (g.origen_obligacion = 'FACTURA' AND s.concepto_id IS NOT NULL)
    OR
    (g.origen_obligacion = 'ORDEN_PAGO' AND s.concepto_id IS NULL);

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '0019: concepto incompatible con origen de obligación: %',
      v_count;
  END IF;

  SELECT count(*)
    INTO v_count
  FROM documentos.obligaciones_snapshot
  WHERE
    (requiere_regularizacion_aplicada = false
      AND estado_regularizacion <> 'NO_REQUIERE')
    OR
    (requiere_regularizacion_aplicada = true
      AND estado_regularizacion NOT IN ('PENDIENTE', 'REGULARIZADO'));

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '0019: snapshot con estado de regularización inconsistente: %',
      v_count;
  END IF;

  SELECT count(*)
    INTO v_count
  FROM documentos.obligaciones_snapshot
  WHERE (periodo_anio IS NULL) <> (periodo_mes IS NULL);

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '0019: snapshot con periodo parcial: %',
      v_count;
  END IF;

  SELECT count(*)
    INTO v_count
  FROM documentos.obligaciones_snapshot s
  LEFT JOIN documentos.grupos_factura g
    ON g.id = s.grupo_factura_id
  WHERE g.id IS NULL;

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      '0019: snapshot huérfano: %',
      v_count;
  END IF;
END
$$;
