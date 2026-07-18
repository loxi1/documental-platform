# Paquete GO-1 — Persistencia Sprint 2.1C

**Proyecto:** Documental Platform ERP
**Sprint:** 2.1C — Carga Documental Segura MVP
**Rama funcional:** `feat/documental-v2-carga-segura-2-1C`
**HEAD preparado:** `c00dbf20fb1a6f2d97c71e5af650accfaf054b3b`
**Estado:** preparación documental autorizada; ejecución operativa no autorizada.

---

## 1. Propósito

Este documento define el diseño ejecutable de persistencia para la carga documental segura del Sprint 2.1C.

Incluye tipos canónicos, DDL definitivo propuesto, idempotencia, deduplicación, atomicidad, ampliación de `documentos.documentos_archivos`, outbox transaccional, plan de migraciones, seguridad, permisos y consultas SQL de prevalidación.

No crea archivos reales de migración, no ejecuta SQL y no modifica backend, Gateway ni Web Admin.

---

## 2. Baseline validada

```text
Rama:
feat/documental-v2-carga-segura-2-1C

HEAD:
c00dbf20fb1a6f2d97c71e5af650accfaf054b3b

Baseline funcional Sprint 2.1B:
178cf9db6bb1c337c8cc6551c648b1d5cd107e50

Historia documental Sprint 2.1C:
c7c4eb80a521515c7cb45f32c060c9062ba27027

Working tree al iniciar GO-1 documental:
LIMPIO
```

Respaldos obligatorios:

```text
backup/pre-2-1C-178cf9db
→ 178cf9db6bb1c337c8cc6551c648b1d5cd107e50

backup/regularizacion-2-1C-0f5117fc
→ 0f5117fc
```

Relación con `main`:

```text
main:
ffc6ca62b66e391f0e175e0d72a146ff6a30e2f2

merge-base main / Sprint 2.1B:
ffc6ca62b66e391f0e175e0d72a146ff6a30e2f2
```

---

## 3. Tipos canónicos confirmados

| Campo | Tipo canónico | Evidencia |
|---|---:|---|
| `workspace_id` | `integer` | contrato y baseline funcional |
| `cliente_destino_id` | `integer` | contrato y baseline funcional |
| `actor_id` | `integer` | `auth.usuarios.id` |
| `documento_id` | `integer` | `documentos.documentos.id` |
| `archivo_id` | `integer` | `documentos.documentos_archivos.id` |
| `request_id` | `text` | contrato HTTP real |
| `correlation_id` | `text` | contrato HTTP real |
| `hash_sha256` | `varchar(64)` | esquema vigente |

Las propuestas históricas con `BIGINT` para estas FK no deben copiarse al nuevo diseño.

La columna `documentos.documentos.validado_por` es `integer`, pero no se confirmó una FK vigente hacia `auth.usuarios(id)`.

---

## 4. Tabla `documentos.carga_operaciones`

### 4.1 Función

Será la autoridad única para reserva técnica, idempotencia, deduplicación por ámbito y hash, estado técnico, compensación, reconciliación, asociación final y trazabilidad.

No reemplaza estados funcionales de documentos ni estados de OCR.

### 4.2 Estados

```text
iniciada
almacenada
completada
fallida
requiere_reconciliacion
```

- `iniciada`: reserva creada antes del almacenamiento.
- `almacenada`: objeto confirmado en storage.
- `completada`: documento, archivo, relación y outbox confirmados en una misma transacción.
- `fallida`: flujo no completado y compensación concluida o no necesaria.
- `requiere_reconciliacion`: posible inconsistencia entre storage y base de datos.

### 4.3 DDL definitivo propuesto

```sql
CREATE TABLE documentos.carga_operaciones (
  id BIGSERIAL PRIMARY KEY,

  workspace_id INTEGER NOT NULL,
  empresa_codigo VARCHAR(50) NOT NULL,
  cliente_destino_id INTEGER NULL,
  expediente_id INTEGER NULL,

  idempotency_key VARCHAR(128) NOT NULL,
  payload_fingerprint VARCHAR(64) NOT NULL,
  fingerprint_version VARCHAR(20) NOT NULL
    DEFAULT 'canonical-json-v1',

  hash_sha256 VARCHAR(64) NOT NULL,

  estado VARCHAR(30) NOT NULL DEFAULT 'iniciada',

  storage_provider VARCHAR(30) NULL,
  storage_bucket TEXT NULL,
  storage_key TEXT NULL,
  storage_etag TEXT NULL,

  documento_id INTEGER NULL,
  archivo_id INTEGER NULL,

  actor_id INTEGER NULL,
  request_id TEXT NULL,
  correlation_id TEXT NULL,

  expira_en TIMESTAMPTZ NOT NULL,
  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  almacenada_en TIMESTAMPTZ NULL,
  completada_en TIMESTAMPTZ NULL,
  fallida_en TIMESTAMPTZ NULL,
  reconciliacion_en TIMESTAMPTZ NULL,

  compensacion_estado VARCHAR(30) NULL,
  compensacion_intentos INTEGER NOT NULL DEFAULT 0,
  compensacion_ultimo_error TEXT NULL,

  error_codigo VARCHAR(120) NULL,
  error_detalle TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT carga_operaciones_estado_chk
    CHECK (estado IN (
      'iniciada',
      'almacenada',
      'completada',
      'fallida',
      'requiere_reconciliacion'
    )),

  CONSTRAINT carga_operaciones_idempotency_key_len_chk
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 128),

  CONSTRAINT carga_operaciones_idempotency_key_ctrl_chk
    CHECK (idempotency_key !~ '[[:cntrl:]]'),

  CONSTRAINT carga_operaciones_payload_fingerprint_chk
    CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),

  CONSTRAINT carga_operaciones_hash_sha256_chk
    CHECK (hash_sha256 ~ '^[0-9a-f]{64}$'),

  CONSTRAINT carga_operaciones_fingerprint_version_chk
    CHECK (fingerprint_version = 'canonical-json-v1'),

  CONSTRAINT carga_operaciones_compensacion_intentos_chk
    CHECK (compensacion_intentos >= 0),

  CONSTRAINT carga_operaciones_expiracion_chk
    CHECK (expira_en >= iniciada_en + INTERVAL '24 hours'),

  CONSTRAINT carga_operaciones_documento_fk
    FOREIGN KEY (documento_id)
    REFERENCES documentos.documentos(id),

  CONSTRAINT carga_operaciones_archivo_fk
    FOREIGN KEY (archivo_id)
    REFERENCES documentos.documentos_archivos(id),

  CONSTRAINT carga_operaciones_actor_fk
    FOREIGN KEY (actor_id)
    REFERENCES auth.usuarios(id)
);
```

`expediente_id` y `cliente_destino_id` no deben recibir FK hasta confirmar documentalmente sus tablas y tipos canónicos reales.

### 4.4 Índices

```sql
CREATE UNIQUE INDEX ux_carga_operaciones_scope_idempotency
ON documentos.carga_operaciones (
  workspace_id,
  empresa_codigo,
  idempotency_key
);

CREATE UNIQUE INDEX ux_carga_operaciones_scope_hash_bloqueante
ON documentos.carga_operaciones (
  workspace_id,
  empresa_codigo,
  hash_sha256
)
WHERE estado IN (
  'iniciada',
  'almacenada',
  'completada',
  'requiere_reconciliacion'
);

CREATE INDEX ix_carga_operaciones_scope_hash
ON documentos.carga_operaciones (
  workspace_id,
  empresa_codigo,
  hash_sha256
);

CREATE INDEX ix_carga_operaciones_estado_actualizado
ON documentos.carga_operaciones (estado, actualizado_en);

CREATE INDEX ix_carga_operaciones_request_id
ON documentos.carga_operaciones (request_id)
WHERE request_id IS NOT NULL;

CREATE INDEX ix_carga_operaciones_correlation_id
ON documentos.carga_operaciones (correlation_id)
WHERE correlation_id IS NOT NULL;

CREATE INDEX ix_carga_operaciones_reconciliacion
ON documentos.carga_operaciones (actualizado_en)
WHERE estado = 'requiere_reconciliacion';
```

### 4.5 Comentarios

```sql
COMMENT ON TABLE documentos.carga_operaciones IS
'Autoridad técnica de idempotencia, deduplicación, compensación y reconciliación para cargas documentales seguras.';

COMMENT ON COLUMN documentos.carga_operaciones.idempotency_key IS
'Clave lógica enviada por el cliente; independiente de request_id.';

COMMENT ON COLUMN documentos.carga_operaciones.payload_fingerprint IS
'SHA-256 del payload lógico normalizado mediante canonical-json-v1.';

COMMENT ON COLUMN documentos.carga_operaciones.expira_en IS
'Fin de la ventana de reproducción idempotente; no implica eliminación física.';
```

---

## 5. Idempotencia

```text
Header:
Idempotency-Key

Persistencia:
varchar(128)

Longitud:
1 a 128 caracteres

Caracteres de control:
prohibidos
```

Unicidad permanente:

```text
workspace_id
+
empresa_codigo
+
idempotency_key
```

Ventana mínima:

```text
24 horas
```

Después de `expira_en`:

- no existe obligación de reproducir la respuesta histórica;
- no se elimina el registro automáticamente;
- la clave permanece protegida por la restricción única;
- una nueva operación debe usar otra clave.

Fingerprint:

```text
versión:
canonical-json-v1

algoritmo:
SHA-256

salida:
64 caracteres hexadecimales minúsculos
```

Normalización mínima:

1. incluir solo campos lógicos contractuales;
2. excluir valores técnicos variables;
3. ordenar claves de objetos lexicográficamente;
4. conservar orden de arrays cuando tenga significado;
5. normalizar Unicode a NFC;
6. serializar booleanos como `true` o `false`;
7. conservar `null` cuando forme parte del contrato;
8. representar enteros sin ceros a la izquierda;
9. usar formatos ISO contractuales para fechas;
10. serializar sin espacios;
11. calcular SHA-256 sobre UTF-8.

Campos técnicos excluidos:

```text
request_id
correlation_id
timestamps del servidor
storage_key generado
etag
documento_id
archivo_id
```

Misma clave, mismo ámbito y fingerprint distinto:

```text
HTTP 409
ARCHIVO_IDEMPOTENCY_KEY_REUTILIZADA_CON_PAYLOAD_DISTINTO
```

---

## 6. Deduplicación

Autoridad única:

```text
documentos.carga_operaciones
```

Ámbito:

```text
workspace_id
+
empresa_codigo
+
hash_sha256
```

`cliente_destino_id` se conserva como contexto, pero no participa en la unicidad física.

Estados bloqueantes:

```text
iniciada
almacenada
completada
requiere_reconciliacion
```

`fallida` no bloquea una nueva operación cuando la compensación concluyó correctamente o no fue necesaria.

Si la compensación no concluyó, el estado debe ser `requiere_reconciliacion`.

---

## 7. Atomicidad

Secuencia definitiva:

```text
1. validar autenticación, permisos y ámbito
2. validar Idempotency-Key
3. calcular fingerprint
4. calcular SHA-256
5. reservar operación como iniciada
6. ejecutar PutObject
7. actualizar operación a almacenada
8. BEGIN
9. insertar documento
10. insertar archivo
11. insertar relación legacy mínima
12. insertar outbox
13. actualizar operación a completada
14. COMMIT
15. responder
```

La transición a `completada` debe ocurrir dentro de la misma transacción PostgreSQL.

Fallo después de `PutObject` y antes del `COMMIT`:

1. intentar `DeleteObject`;
2. si concluye, marcar `fallida`;
3. si falla o queda incierto, marcar `requiere_reconciliacion`.

Después del `COMMIT`, la operación ya debe estar en `completada`.

---

## 8. `documentos.documentos_archivos`

Columnas propuestas:

```sql
ALTER TABLE documentos.documentos_archivos
  ADD COLUMN workspace_id INTEGER NULL,
  ADD COLUMN empresa_codigo VARCHAR(50) NULL,
  ADD COLUMN cliente_destino_id INTEGER NULL;
```

Reglas legacy:

- no inventar workspace;
- no inferir empresa por aproximación;
- no asignar cliente destino sin evidencia inequívoca;
- conservar filas históricas sin scope.

Índice de consulta:

```sql
CREATE INDEX ix_documentos_archivos_scope_hash
ON documentos.documentos_archivos (
  workspace_id,
  empresa_codigo,
  hash_sha256
)
WHERE workspace_id IS NOT NULL
  AND empresa_codigo IS NOT NULL
  AND hash_sha256 IS NOT NULL;
```

Decisión inicial:

```text
NO crear unique por scope + hash en documentos_archivos.
```

La autoridad permanece en `documentos.carga_operaciones`.

Se conserva el unique vigente de un archivo actual por documento.

---

## 9. Outbox transaccional

Infraestructura existente:

```text
NO IDENTIFICADA
```

`documentos.documento_eventos` es historial append-only y no debe reutilizarse como outbox.

DDL propuesto:

```sql
CREATE TABLE documentos.documento_eventos_outbox (
  id BIGSERIAL PRIMARY KEY,

  event_key VARCHAR(160) NOT NULL,
  evento_tipo VARCHAR(120) NOT NULL,
  evento_version INTEGER NOT NULL DEFAULT 1,

  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id TEXT NOT NULL,

  workspace_id INTEGER NOT NULL,
  empresa_codigo VARCHAR(50) NOT NULL,

  documento_id INTEGER NULL,
  archivo_id INTEGER NULL,
  carga_operacion_id BIGINT NULL,

  request_id TEXT NULL,
  correlation_id TEXT NULL,

  payload JSONB NOT NULL,

  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  intentos INTEGER NOT NULL DEFAULT 0,

  leased_at TIMESTAMPTZ NULL,
  leased_by VARCHAR(120) NULL,
  lease_expira_en TIMESTAMPTZ NULL,

  proximo_intento_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  publicado_en TIMESTAMPTZ NULL,
  ultimo_error TEXT NULL,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT documento_eventos_outbox_event_key_uk
    UNIQUE (event_key),

  CONSTRAINT documento_eventos_outbox_estado_chk
    CHECK (estado IN ('pendiente', 'procesando', 'publicado', 'fallido')),

  CONSTRAINT documento_eventos_outbox_intentos_chk
    CHECK (intentos >= 0),

  CONSTRAINT documento_eventos_outbox_documento_fk
    FOREIGN KEY (documento_id)
    REFERENCES documentos.documentos(id),

  CONSTRAINT documento_eventos_outbox_archivo_fk
    FOREIGN KEY (archivo_id)
    REFERENCES documentos.documentos_archivos(id),

  CONSTRAINT documento_eventos_outbox_carga_operacion_fk
    FOREIGN KEY (carga_operacion_id)
    REFERENCES documentos.carga_operaciones(id)
);
```

Índices:

```sql
CREATE INDEX ix_documento_eventos_outbox_pendientes
ON documentos.documento_eventos_outbox (
  proximo_intento_en,
  creado_en
)
WHERE estado IN ('pendiente', 'fallido');

CREATE INDEX ix_documento_eventos_outbox_lease
ON documentos.documento_eventos_outbox (lease_expira_en)
WHERE estado = 'procesando';

CREATE INDEX ix_documento_eventos_outbox_correlation
ON documentos.documento_eventos_outbox (correlation_id)
WHERE correlation_id IS NOT NULL;
```

Leasing conceptual:

```sql
SELECT id
FROM documentos.documento_eventos_outbox
WHERE estado IN ('pendiente', 'fallido')
  AND proximo_intento_en <= now()
  AND (lease_expira_en IS NULL OR lease_expira_en < now())
ORDER BY creado_en
FOR UPDATE SKIP LOCKED
LIMIT :batch_size;
```

Retención inicial propuesta:

```text
publicados:
90 días como mínimo

pendientes o fallidos:
sin purga automática
```

---

## 10. Migraciones propuestas

No se crean archivos reales en esta fase.

### Migración A

```text
documentos.carga_operaciones
```

Incluye tabla, PK, FK confirmadas, checks, índices, comentarios, grants y registro en `core.schema_migrations`.

### Migración B

```text
scope nullable e índice de consulta en documentos.documentos_archivos
```

No incluye unique nuevo por hash.

### Migración C

```text
documentos.documento_eventos_outbox
```

Incluye tabla, índices, checks, FK, grants y retención documental.

Orden:

```text
1. Migración A
2. Migración B
3. Migración C
4. backend con feature flag apagada
5. validaciones
6. activación controlada
```

Feature flag:

```text
DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED=false
```

Con la bandera apagada, el flujo legacy continúa y las nuevas tablas no reciben operaciones funcionales.

---

## 11. Seguridad y permisos

El propietario real será el rol autorizado de migración. No se afirma un owner no confirmado.

Grants propuestos:

```sql
GRANT SELECT, INSERT, UPDATE
ON documentos.carga_operaciones
TO platform_app;

GRANT USAGE, SELECT
ON SEQUENCE documentos.carga_operaciones_id_seq
TO platform_app;

GRANT SELECT, INSERT, UPDATE
ON documentos.documento_eventos_outbox
TO platform_app;

GRANT USAGE, SELECT
ON SEQUENCE documentos.documento_eventos_outbox_id_seq
TO platform_app;
```

No autorizar:

- grants a `PUBLIC`;
- acceso directo desde Web Admin;
- endpoints genéricos de tabla;
- errores SQL internos en respuestas;
- exposición de bucket, storage key o metadata sensible.

Códigos públicos previstos:

```text
ARCHIVO_IDEMPOTENCY_KEY_REUTILIZADA_CON_PAYLOAD_DISTINTO
ARCHIVO_DUPLICADO_EN_AMBITO
ARCHIVO_PERSISTENCIA_FALLIDA
ARCHIVO_REQUIERE_RECONCILIACION
```

---

## 12. Prevalidación SQL de solo lectura

Estas consultas se documentan, pero no están autorizadas para ejecución.

### 12.1 Tipos reales

```sql
SELECT
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  character_maximum_length
FROM information_schema.columns
WHERE (table_schema, table_name) IN (
  ('auth', 'usuarios'),
  ('documentos', 'documentos'),
  ('documentos', 'documentos_archivos'),
  ('documentos', 'expedientes')
)
AND column_name IN (
  'id',
  'documento_id',
  'archivo_id',
  'workspace_id',
  'cliente_destino_id',
  'hash_sha256',
  'request_id',
  'correlation_id'
)
ORDER BY table_schema, table_name, ordinal_position;
```

### 12.2 PK y FK

```sql
SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
 AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema IN ('auth', 'documentos')
  AND tc.table_name IN (
    'usuarios',
    'documentos',
    'documentos_archivos',
    'expedientes'
  )
ORDER BY tc.table_schema, tc.table_name, tc.constraint_name;
```

### 12.3 Filas legacy e integridad de hash

```sql
SELECT
  count(*) AS total_archivos,
  count(*) FILTER (WHERE documento_id IS NULL) AS sin_documento,
  count(*) FILTER (WHERE hash_sha256 IS NULL) AS sin_hash,
  count(*) FILTER (WHERE hash_sha256 IS NOT NULL) AS con_hash
FROM documentos.documentos_archivos;
```

```sql
SELECT
  hash_sha256,
  count(*) AS cantidad
FROM documentos.documentos_archivos
WHERE hash_sha256 IS NOT NULL
GROUP BY hash_sha256
HAVING count(*) > 1
ORDER BY cantidad DESC, hash_sha256;
```

### 12.4 Versiones actuales inconsistentes

```sql
SELECT
  documento_id,
  count(*) FILTER (WHERE es_version_actual IS TRUE) AS actuales,
  count(*) AS total
FROM documentos.documentos_archivos
WHERE documento_id IS NOT NULL
GROUP BY documento_id
HAVING count(*) FILTER (WHERE es_version_actual IS TRUE) <> 1
ORDER BY documento_id;
```

### 12.5 Estados existentes

```sql
SELECT estado, count(*)
FROM documentos.documentos
GROUP BY estado
ORDER BY estado;
```

```sql
SELECT estado, count(*)
FROM documentos.documentos_archivos
GROUP BY estado
ORDER BY estado;
```

### 12.6 Índices presentes

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'documentos'
  AND tablename IN (
    'documentos',
    'documentos_archivos',
    'documento_eventos'
  )
ORDER BY tablename, indexname;
```

### 12.7 Tamaño y filas

```sql
SELECT
  c.oid::regclass AS tabla,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
  pg_size_pretty(pg_relation_size(c.oid)) AS tabla_datos,
  pg_size_pretty(
    pg_total_relation_size(c.oid) - pg_relation_size(c.oid)
  ) AS indices_y_toast
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'documentos'
  AND c.relname IN (
    'documentos',
    'documentos_archivos',
    'documento_eventos',
    'expedientes'
  )
ORDER BY pg_total_relation_size(c.oid) DESC;
```

No debe redactarse un `UPDATE` de backfill hasta confirmar una ruta inequívoca de ámbito.

---

## 13. Riesgos y controles

| Riesgo | Control |
|---|---|
| Dedupe global accidental | scope obligatorio en `carga_operaciones` |
| Reuso incorrecto de clave | fingerprint canónico |
| Carrera concurrente | unique parcial por ámbito y hash |
| Objeto huérfano | compensación y reconciliación |
| Documento sin objeto | storage antes de transacción |
| Commit sin estado completado | `completada` dentro de la transacción |
| Pérdida de evento | outbox en la misma transacción |
| Legacy sin ámbito | columnas nullable y sin backfill ambiguo |
| Exposición de errores | códigos públicos controlados |
| Migración bloqueante | inspección previa y estrategia de índices |
| Divergencia de tipos | tipos canónicos `integer` |
| Borrado de auditoría | rollback funcional por flag, no purga |

---

## 14. Condiciones para solicitar GO-1 operativo

Antes de crear migraciones reales se debe aprobar:

1. DDL de `carga_operaciones`;
2. tipos y FK definitivas;
3. tipo real de `expedientes.id`;
4. tabla canónica de cliente destino;
5. DDL de outbox;
6. leasing y reintentos;
7. estrategia de índices en producción;
8. consultas de prevalidación;
9. rollback;
10. feature flag;
11. ausencia de cambios funcionales no autorizados.

---

## 15. Acciones bloqueadas

```text
crear archivos reales de migración:
NO AUTORIZADO

ejecutar SQL:
NO AUTORIZADO

modificar backend, Gateway o Web Admin:
NO AUTORIZADO

builds y tests:
NO AUTORIZADOS

runtime y concurrencia:
NO AUTORIZADOS

push, PR o merge a main:
NO AUTORIZADOS
```

---

## 16. Solicitud de dictamen

Se solicita:

```text
1. aprobar el paquete documental GO-1;
2. confirmar el DDL de carga_operaciones;
3. confirmar outbox nueva;
4. confirmar que documentos_archivos no tendrá unique de hash inicial;
5. autorizar prevalidación SQL de solo lectura;
6. autorizar posteriormente la creación de migraciones A/B/C.
```

---

## 17. Estado final

```text
GO-0:
CERRADO

GO-0B:
CERRADO

HEAD funcional:
c00dbf20

GO-1 documental:
PREPARADO

GO-1 operativo:
NO AUTORIZADO

Migraciones reales:
NO CREADAS

Código:
NO MODIFICADO

SQL:
NO EJECUTADO

Push:
NO EJECUTADO

Sprint:
ABIERTO
```
