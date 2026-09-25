-- 0020_op_r5b_modelo_persistencia_config.sql
-- R5B-2 I1: modelo, persistencia y configuracion de Orden de Pago.
-- Transaccion administrada por el runner.
--
-- NO implementa:
--   - Regularizar documento
--   - Editar OP
--   - flujo RH V2
--   - pagos
--   - cambios OC/OS
--
-- PRINCIPIOS:
--   core.proveedores = maestro unico de entidades/proveedores.
--   core.bancos NO es maestro de beneficiarios OP.
--   periodo funcional = dato comun opcional de toda OP nueva.
--   fecha_emision != periodo funcional.
--   historicos no se reinterpretan.

----------------------------------------------------------------------
-- 1. PROVEEDOR CANONICO EN DOP
--
-- 0015 creo proveedor_id como bigint.
-- core.proveedores.id es integer.
--
-- Antes de convertir se protege:
--   - rango integer
--   - ausencia de huerfanos
----------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM documentos.documentos_operativos_principales dop
    WHERE dop.proveedor_id IS NOT NULL
      AND (
        dop.proveedor_id < -2147483648::bigint
        OR dop.proveedor_id > 2147483647::bigint
      )
  ) THEN
    RAISE EXCEPTION
      '0020: proveedor_id historico fuera de rango integer';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.documentos_operativos_principales dop
    LEFT JOIN core.proveedores p
      ON p.id::bigint = dop.proveedor_id
    WHERE dop.proveedor_id IS NOT NULL
      AND p.id IS NULL
  ) THEN
    RAISE EXCEPTION
      '0020: proveedor_id historico sin core.proveedores canonico';
  END IF;
END
$$;

ALTER TABLE documentos.documentos_operativos_principales
  ALTER COLUMN proveedor_id TYPE integer
  USING proveedor_id::integer;

ALTER TABLE documentos.documentos_operativos_principales
  ADD CONSTRAINT fk_dop_proveedor
  FOREIGN KEY (proveedor_id)
  REFERENCES core.proveedores(id)
  ON DELETE RESTRICT;

COMMENT ON COLUMN documentos.documentos_operativos_principales.proveedor_id IS
  'Proveedor o entidad institucional canonica. FK core.proveedores.id.';

----------------------------------------------------------------------
-- 2. FUENTES ALTERNATIVAS DE BENEFICIARIO
--
-- proveedor_id:
--   proveedor / AFP / ONP / ESSALUD / SENATI / seguro / banco OP
--
-- beneficiario_cliente_destino_id:
--   empresa o consorcio
--
-- beneficiario_usuario_id:
--   persona configurada para RENDICION
--
-- beneficiario_nombre_libre:
--   persona sin maestro (RH / prestamo a persona)
----------------------------------------------------------------------

ALTER TABLE documentos.documentos_operativos_principales
  ADD COLUMN beneficiario_cliente_destino_id integer,
  ADD COLUMN beneficiario_usuario_id integer,
  ADD COLUMN beneficiario_nombre_libre varchar(250);

ALTER TABLE documentos.documentos_operativos_principales
  ADD CONSTRAINT fk_dop_beneficiario_cliente_destino
    FOREIGN KEY (beneficiario_cliente_destino_id)
    REFERENCES core.clientes_destino(id)
    ON DELETE RESTRICT,

  ADD CONSTRAINT fk_dop_beneficiario_usuario
    FOREIGN KEY (beneficiario_usuario_id)
    REFERENCES auth.usuarios(id)
    ON DELETE RESTRICT,

  ADD CONSTRAINT ck_dop_beneficiario_nombre_libre
    CHECK (
      beneficiario_nombre_libre IS NULL
      OR btrim(beneficiario_nombre_libre) <> ''
    ),

  ADD CONSTRAINT ck_dop_beneficiario_fuente_unica
    CHECK (
      num_nonnulls(
        proveedor_id,
        beneficiario_cliente_destino_id,
        beneficiario_usuario_id,
        beneficiario_nombre_libre
      ) <= 1
    );

----------------------------------------------------------------------
-- 3. REGLA DE BENEFICIARIO EN CATALOGO
--
-- La UI no decide por hardcode que fuente mostrar.
-- El catalogo declara la fuente y obligatoriedad.
----------------------------------------------------------------------

ALTER TABLE documentos.catalogo_conceptos_obligacion
  ADD COLUMN tipo_beneficiario varchar NOT NULL DEFAULT 'NO_APLICA',
  ADD COLUMN uso_beneficiario varchar NOT NULL DEFAULT 'NO_APLICA';

ALTER TABLE documentos.catalogo_conceptos_obligacion
  ADD CONSTRAINT ck_catalogo_tipo_beneficiario
    CHECK (
      tipo_beneficiario IN (
        'NO_APLICA',
        'PROVEEDOR',
        'CLIENTE_DESTINO',
        'USUARIO',
        'NOMBRE_LIBRE'
      )
    ),

  ADD CONSTRAINT ck_catalogo_uso_beneficiario
    CHECK (
      uso_beneficiario IN (
        'NO_APLICA',
        'OPCIONAL',
        'REQUERIDO'
      )
    ),

  ADD CONSTRAINT ck_catalogo_beneficiario_coherente
    CHECK (
      (
        tipo_beneficiario = 'NO_APLICA'
        AND uso_beneficiario = 'NO_APLICA'
      )
      OR
      (
        tipo_beneficiario <> 'NO_APLICA'
        AND uso_beneficiario IN ('OPCIONAL', 'REQUERIDO')
      )
    );

COMMENT ON COLUMN documentos.catalogo_conceptos_obligacion.tipo_beneficiario IS
  'Fuente canonica del beneficiario de la OP.';

COMMENT ON COLUMN documentos.catalogo_conceptos_obligacion.uso_beneficiario IS
  'Regla de obligatoriedad del beneficiario para nuevas OP.';

----------------------------------------------------------------------
-- 4. CONFIGURACION CONCEPTO -> PROVEEDOR
--
-- Esta tabla NO es otro maestro.
-- No guarda RUC ni razon social.
--
-- La identidad siempre vive en core.proveedores.
----------------------------------------------------------------------

CREATE TABLE documentos.config_proveedores_concepto_op (
  id bigserial PRIMARY KEY,

  concepto_id bigint NOT NULL,
  proveedor_id integer NOT NULL,

  contenedor_operativo_id bigint,

  activo boolean NOT NULL DEFAULT true,

  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_config_proveedor_concepto
    FOREIGN KEY (concepto_id)
    REFERENCES documentos.catalogo_conceptos_obligacion(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_config_proveedor_identidad
    FOREIGN KEY (proveedor_id)
    REFERENCES core.proveedores(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_config_proveedor_contenedor
    FOREIGN KEY (contenedor_operativo_id)
    REFERENCES documentos.contenedores_operativos(id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_config_proveedor_concepto_global
  ON documentos.config_proveedores_concepto_op (
    concepto_id,
    proveedor_id
  )
  WHERE contenedor_operativo_id IS NULL;

CREATE UNIQUE INDEX uq_config_proveedor_concepto_contexto
  ON documentos.config_proveedores_concepto_op (
    concepto_id,
    proveedor_id,
    contenedor_operativo_id
  )
  WHERE contenedor_operativo_id IS NOT NULL;

CREATE INDEX ix_config_proveedor_concepto_activo
  ON documentos.config_proveedores_concepto_op (
    concepto_id,
    contenedor_operativo_id,
    activo
  );

COMMENT ON TABLE documentos.config_proveedores_concepto_op IS
  'Elegibilidad de proveedores canonicos por concepto de Orden de Pago.';

----------------------------------------------------------------------
-- 5. CONFIGURACION DE RENDICION
--
-- Identidad:
--   auth.usuarios
--
-- Esta tabla solo determina quien esta habilitado para ser
-- beneficiario de una nueva OP de RENDICION.
----------------------------------------------------------------------

CREATE TABLE documentos.config_beneficiarios_rendicion_op (
  id bigserial PRIMARY KEY,

  usuario_id integer NOT NULL,
  contenedor_operativo_id bigint,

  activo boolean NOT NULL DEFAULT true,

  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_config_rendicion_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES auth.usuarios(id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_config_rendicion_contenedor
    FOREIGN KEY (contenedor_operativo_id)
    REFERENCES documentos.contenedores_operativos(id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_config_rendicion_global
  ON documentos.config_beneficiarios_rendicion_op (usuario_id)
  WHERE contenedor_operativo_id IS NULL;

CREATE UNIQUE INDEX uq_config_rendicion_contexto
  ON documentos.config_beneficiarios_rendicion_op (
    usuario_id,
    contenedor_operativo_id
  )
  WHERE contenedor_operativo_id IS NOT NULL;

CREATE INDEX ix_config_rendicion_activo
  ON documentos.config_beneficiarios_rendicion_op (
    contenedor_operativo_id,
    activo
  );

COMMENT ON TABLE documentos.config_beneficiarios_rendicion_op IS
  'Usuarios habilitados para ser beneficiarios de nuevas OP de RENDICION.';


----------------------------------------------------------------------
-- 5B. CATALOGO R5B-2
--
-- Periodo:
--   es comun y opcional para toda nueva OP.
--   requiere_periodo deja de gobernar la representabilidad de OP nuevas.
--
-- Referencia:
--   reutiliza uso_codigo_pago como regla fisica de referencia funcional.
--
-- Beneficiario:
--   gobernado por tipo_beneficiario + uso_beneficiario.
----------------------------------------------------------------------

-- Servicios: proveedor requerido, regularizables y referencia opcional.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = true,
  requiere_periodo = false,
  uso_codigo_pago = 'OPCIONAL',
  tipo_beneficiario = 'PROVEEDOR',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo IN (
  'ENERGIA_ELECTRICA',
  'AGUA',
  'INTERNET',
  'TELEFONIA'
);

-- RH: persona libre; no DNI ni maestro de personas.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = true,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'NOMBRE_LIBRE',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo = 'RECIBO_HONORARIOS';

-- PLAME: sin beneficiario. Referencia opcional.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = false,
  requiere_periodo = false,
  uso_codigo_pago = 'OPCIONAL',
  tipo_beneficiario = 'NO_APLICA',
  uso_beneficiario = 'NO_APLICA',
  updated_at = now()
WHERE codigo = 'PLAME';

-- ONP: proveedor institucional configurado.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = false,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'PROVEEDOR',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo = 'ONP';

-- AFP: una de las AFP configuradas.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = false,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'PROVEEDOR',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo = 'AFP';

-- Seguros: proveedor configurado + referencia obligatoria.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = true,
  requiere_periodo = false,
  uso_codigo_pago = 'REQUERIDO',
  tipo_beneficiario = 'PROVEEDOR',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo = 'SEGUROS';

-- Pasajes: mantiene referencia opcional.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = false,
  requiere_periodo = false,
  uso_codigo_pago = 'OPCIONAL',
  tipo_beneficiario = 'NO_APLICA',
  uso_beneficiario = 'NO_APLICA',
  updated_at = now()
WHERE codigo = 'PASAJES';

-- Capacitación: proveedor requerido y regularizable.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = true,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'PROVEEDOR',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo = 'CAPACITACION';

-- Examen médico: proveedor requerido y regularizable.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = true,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'PROVEEDOR',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo = 'EXAMEN_MEDICO';

-- TRANSFERENCIA_A_CONSORCIO:
-- beneficiario desde core.clientes_destino.
-- El backend deberá excluir el propio contexto/empresa operativa.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = false,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'CLIENTE_DESTINO',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo = 'TRANSFERENCIA_A_CONSORCIO';

-- INGRESO_A_EMPRESA:
-- no se reinterpreta como préstamo a consorcio por similitud de
-- clasificación. Se preserva sin beneficiario hasta decisión funcional.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = false,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'NO_APLICA',
  uso_beneficiario = 'NO_APLICA',
  updated_at = now()
WHERE codigo = 'INGRESO_A_EMPRESA';

-- Rendición: usuario habilitado por configuración.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = false,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'USUARIO',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo = 'RENDICION';

-- Gasto bancario: banco beneficiario desde core.proveedores.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = true,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'PROVEEDOR',
  uso_beneficiario = 'REQUERIDO',
  updated_at = now()
WHERE codigo = 'GASTO_BANCARIO';

-- Varios: proveedor opcional.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_regularizacion = false,
  requiere_periodo = false,
  uso_codigo_pago = 'NO_APLICA',
  tipo_beneficiario = 'PROVEEDOR',
  uso_beneficiario = 'OPCIONAL',
  updated_at = now()
WHERE codigo = 'VARIOS';

-- Tributos permanecen sin beneficiario específico.
UPDATE documentos.catalogo_conceptos_obligacion
SET
  requiere_periodo = false,
  tipo_beneficiario = 'NO_APLICA',
  uso_beneficiario = 'NO_APLICA',
  updated_at = now()
WHERE codigo IN (
  'IGV',
  'ITAN',
  'RENTA_3RA',
  'RENTA_4TA',
  'RENTA_5TA'
);

-- SENATI es un concepto canónico nuevo.
INSERT INTO documentos.catalogo_conceptos_obligacion (
  codigo,
  clasificacion,
  nombre,
  abreviatura,
  activo,
  orden,
  requiere_regularizacion,
  requiere_periodo,
  uso_codigo_pago,
  tipo_beneficiario,
  uso_beneficiario,
  created_at,
  updated_at
)
SELECT
  'SENATI',
  'APORTES',
  'SENATI',
  'SENATI',
  true,
  85,
  false,
  false,
  'NO_APLICA',
  'PROVEEDOR',
  'REQUERIDO',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM documentos.catalogo_conceptos_obligacion
  WHERE codigo = 'SENATI'
);

-- ESSALUD es un concepto canónico institucional.
INSERT INTO documentos.catalogo_conceptos_obligacion (
  codigo,
  clasificacion,
  nombre,
  abreviatura,
  activo,
  orden,
  requiere_regularizacion,
  requiere_periodo,
  uso_codigo_pago,
  tipo_beneficiario,
  uso_beneficiario,
  created_at,
  updated_at
)
SELECT
  'ESSALUD',
  'APORTES',
  'ESSALUD',
  'ESSALUD',
  true,
  75,
  false,
  false,
  'NO_APLICA',
  'PROVEEDOR',
  'REQUERIDO',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM documentos.catalogo_conceptos_obligacion
  WHERE codigo = 'ESSALUD'
);

----------------------------------------------------------------------
-- 5C. CONFIGURACION INSTITUCIONAL CANONICA
--
-- Se resuelve por RUC. Nunca por IDs propios de LAB.
--
-- ONP / AFP / SENATI / ESSALUD son proveedores institucionales
-- del mismo maestro core.proveedores.
----------------------------------------------------------------------

-- PRECONDICION DE DATOS MAESTROS:
--   0020 NO crea ni corrige filas de core.proveedores.
--   Los siete RUC institucionales deben existir previamente.
--   Si falta alguno, abortar para evitar configuracion parcial silenciosa.
DO $$
DECLARE
  faltantes text;
BEGIN
  SELECT string_agg(r.ruc, ', ' ORDER BY r.ruc)
  INTO faltantes
  FROM (
    VALUES
      ('20254165035'),
      ('20157036794'),
      ('20510398158'),
      ('20551464971'),
      ('20142829551'),
      ('20131376503'),
      ('20131257750')
  ) AS r(ruc)
  WHERE NOT EXISTS (
    SELECT 1
    FROM core.proveedores p
    WHERE p.ruc = r.ruc
  );

  IF faltantes IS NOT NULL THEN
    RAISE EXCEPTION
      '0020: faltan proveedores institucionales canonicos en core.proveedores. RUC faltantes: %',
      faltantes;
  END IF;
END
$$;

-- ONP
INSERT INTO documentos.config_proveedores_concepto_op (
  concepto_id,
  proveedor_id,
  contenedor_operativo_id,
  activo
)
SELECT c.id, p.id, NULL, true
FROM documentos.catalogo_conceptos_obligacion c
JOIN core.proveedores p
  ON p.ruc = '20254165035'
WHERE c.codigo = 'ONP'
  AND NOT EXISTS (
    SELECT 1
    FROM documentos.config_proveedores_concepto_op x
    WHERE x.concepto_id = c.id
      AND x.proveedor_id = p.id
      AND x.contenedor_operativo_id IS NULL
  );

-- AFP: cuatro entidades canónicas.
INSERT INTO documentos.config_proveedores_concepto_op (
  concepto_id,
  proveedor_id,
  contenedor_operativo_id,
  activo
)
SELECT c.id, p.id, NULL, true
FROM documentos.catalogo_conceptos_obligacion c
JOIN core.proveedores p
  ON p.ruc IN (
    '20157036794',
    '20510398158',
    '20551464971',
    '20142829551'
  )
WHERE c.codigo = 'AFP'
  AND NOT EXISTS (
    SELECT 1
    FROM documentos.config_proveedores_concepto_op x
    WHERE x.concepto_id = c.id
      AND x.proveedor_id = p.id
      AND x.contenedor_operativo_id IS NULL
  );

-- SENATI
INSERT INTO documentos.config_proveedores_concepto_op (
  concepto_id,
  proveedor_id,
  contenedor_operativo_id,
  activo
)
SELECT c.id, p.id, NULL, true
FROM documentos.catalogo_conceptos_obligacion c
JOIN core.proveedores p
  ON p.ruc = '20131376503'
WHERE c.codigo = 'SENATI'
  AND NOT EXISTS (
    SELECT 1
    FROM documentos.config_proveedores_concepto_op x
    WHERE x.concepto_id = c.id
      AND x.proveedor_id = p.id
      AND x.contenedor_operativo_id IS NULL
  );

-- ESSALUD
INSERT INTO documentos.config_proveedores_concepto_op (
  concepto_id,
  proveedor_id,
  contenedor_operativo_id,
  activo
)
SELECT c.id, p.id, NULL, true
FROM documentos.catalogo_conceptos_obligacion c
JOIN core.proveedores p
  ON p.ruc = '20131257750'
WHERE c.codigo = 'ESSALUD'
  AND NOT EXISTS (
    SELECT 1
    FROM documentos.config_proveedores_concepto_op x
    WHERE x.concepto_id = c.id
      AND x.proveedor_id = p.id
      AND x.contenedor_operativo_id IS NULL
  );


----------------------------------------------------------------------
-- 6. SNAPSHOT DE LA REGLA DE BENEFICIARIO
--
-- Las filas historicas permanecen NULL.
-- NO se reconstruyen usando el catalogo actual.
----------------------------------------------------------------------

ALTER TABLE documentos.obligaciones_snapshot
  ADD COLUMN tipo_beneficiario_aplicado varchar,
  ADD COLUMN uso_beneficiario_aplicado varchar;

ALTER TABLE documentos.obligaciones_snapshot
  ADD CONSTRAINT ck_snapshot_tipo_beneficiario
    CHECK (
      tipo_beneficiario_aplicado IS NULL
      OR tipo_beneficiario_aplicado IN (
        'NO_APLICA',
        'PROVEEDOR',
        'CLIENTE_DESTINO',
        'USUARIO',
        'NOMBRE_LIBRE'
      )
    ),

  ADD CONSTRAINT ck_snapshot_uso_beneficiario
    CHECK (
      uso_beneficiario_aplicado IS NULL
      OR uso_beneficiario_aplicado IN (
        'NO_APLICA',
        'OPCIONAL',
        'REQUERIDO'
      )
    ),

  ADD CONSTRAINT ck_snapshot_beneficiario_coherente
    CHECK (
      (
        tipo_beneficiario_aplicado IS NULL
        AND uso_beneficiario_aplicado IS NULL
      )
      OR
      (
        tipo_beneficiario_aplicado IS NOT NULL
        AND uso_beneficiario_aplicado IS NOT NULL
        AND (
          (
            tipo_beneficiario_aplicado = 'NO_APLICA'
            AND uso_beneficiario_aplicado = 'NO_APLICA'
          )
          OR
          (
            tipo_beneficiario_aplicado <> 'NO_APLICA'
            AND uso_beneficiario_aplicado IN ('OPCIONAL', 'REQUERIDO')
          )
        )
      )
    );

----------------------------------------------------------------------
-- 7. PERIODO FUNCIONAL
--
-- Decision R5B-2:
--   periodo es campo principal de TODA nueva OP.
--
-- Se reutilizan:
--   obligaciones_snapshot.periodo_anio
--   obligaciones_snapshot.periodo_mes
--
-- NO crear uso_periodo.
-- NO derivar periodo desde fecha_emision.
-- NO backfill historicos.
--
-- Si se informa periodo, backend exige anio y mes; ambos pueden omitirse.
----------------------------------------------------------------------

COMMENT ON COLUMN documentos.obligaciones_snapshot.periodo_anio IS
  'Anio del periodo funcional declarado. Opcional para nuevas OP R5B-2; si se informa, requiere tambien mes; historicos permanecen sin reinterpretar.';

COMMENT ON COLUMN documentos.obligaciones_snapshot.periodo_mes IS
  'Mes del periodo funcional declarado. Opcional para nuevas OP R5B-2; si se informa, requiere tambien anio; historicos permanecen sin reinterpretar.';

----------------------------------------------------------------------
-- 8. REFERENCIA FUNCIONAL
--
-- Se reutiliza codigo_pago como almacenamiento fisico de la
-- referencia funcional.
--
-- No crear una columna por numero de suministro, poliza, pasaje, etc.
----------------------------------------------------------------------

COMMENT ON COLUMN documentos.obligaciones_snapshot.codigo_pago IS
  'Referencia funcional de la obligacion segun concepto. No representa la operacion bancaria del sustento de pago.';

----------------------------------------------------------------------
-- 9. DATOS INSTITUCIONALES
--
-- NO se insertan proveedores aqui.
--
-- core.proveedores es autoridad y sus altas se administran como
-- datos maestros.
--
-- Configuraciones posteriores deben resolver proveedor por RUC,
-- nunca asumir IDs de una base particular.
----------------------------------------------------------------------

-- ONP        RUC 20254165035
-- AFP Integra RUC 20157036794
-- Prima AFP   RUC 20510398158
-- AFP Habitat RUC 20551464971
-- Profuturo   RUC 20142829551
-- SENATI      RUC 20131376503
-- ESSALUD     RUC 20131257750

----------------------------------------------------------------------
-- FIN 0020 I1 - ESTRUCTURA
----------------------------------------------------------------------
