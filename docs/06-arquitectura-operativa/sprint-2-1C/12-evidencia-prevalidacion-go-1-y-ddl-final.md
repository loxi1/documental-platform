# Sprint 2.1C — Evidencia de prevalidación GO-1 y DDL final propuesto

## 1. Propósito

Este documento consolida la evidencia técnica obtenida durante la prevalidación GO-1B del Sprint 2.1C para la carga documental segura.

El contenido es **documental y de diseño**. No autoriza ni ejecuta:

- migraciones reales;
- cambios funcionales;
- cambios de código;
- builds o pruebas;
- despliegues;
- `push` al repositorio.

## 2. Alcance validado

Se inspeccionaron en modo de solo lectura:

- tipos y nulabilidad de columnas;
- claves primarias y foráneas;
- índices existentes;
- volumen y tamaño de tablas;
- datos legacy en `documentos.documentos_archivos`;
- privilegios efectivos de `platform_app`;
- permisos sobre el schema `documentos`;
- owner de tablas y secuencias;
- registro de migraciones en `core.schema_migrations`;
- archivos de migración existentes en el repositorio;
- dependencia con `0008_documental_v2_modelo_base.sql`.

## 3. Evidencia de ejecución segura

Las consultas críticas se ejecutaron con:

```sql
BEGIN TRANSACTION READ ONLY;
SHOW transaction_read_only;
```

Resultado confirmado:

```text
transaction_read_only = on
```

Las transacciones se cerraron con:

```sql
ROLLBACK;
```

Durante una consulta inválida sobre `core.schema_migrations`, PostgreSQL dejó la transacción en estado abortado. La sesión se recuperó correctamente mediante `ROLLBACK`, sin modificaciones de datos.

## 4. Tipos canónicos confirmados

| Entidad | Columna | Tipo real |
|---|---|---|
| `auth.usuarios` | `id` | `INTEGER` |
| `core.clientes_destino` | `id` | `INTEGER` |
| `documentos.documentos` | `id` | `INTEGER` |
| `documentos.documentos_archivos` | `id` | `INTEGER` |
| `documentos.documentos_archivos` | `documento_id` | `INTEGER NULL` |
| `documentos.documento_eventos` | `id` | `BIGINT` |
| `documentos.documento_eventos` | `documento_id` | `BIGINT NULL` |
| `documentos.documento_eventos` | `archivo_id` | `BIGINT NULL` |
| `documentos.documento_eventos` | `expediente_id` | `BIGINT NULL` |
| `documentos.documento_eventos` | `usuario_id` | `BIGINT NULL` |
| `documentos.documento_eventos` | `request_id` | `UUID NULL` |
| `documentos.documento_eventos` | `correlation_id` | `UUID NULL` |
| `documentos.expedientes` | `id` | `BIGINT` |
| `documentos.expedientes` | `empresa_codigo` | `VARCHAR(20)` |
| `documentos.expedientes` | `cliente_destino_id` | `INTEGER` |

### Decisiones derivadas

Para las nuevas estructuras del Sprint 2.1C:

- `cliente_destino_id`: `INTEGER`;
- `expediente_id`: `BIGINT`;
- `documento_id`: `INTEGER`;
- `archivo_id`: `INTEGER`;
- `actor_id`: `INTEGER`;
- `empresa_codigo`: `VARCHAR(20)`;
- `workspace_id`: `INTEGER`, sin FK canónica por ahora;
- IDs de nuevas tablas: `BIGSERIAL`;
- `request_id` y `correlation_id` del contrato de carga: `TEXT`, conforme al diseño aprobado del Sprint 2.1C;
- la tabla histórica `documento_eventos` mantiene sus columnas UUID existentes.

## 5. Constraints reales confirmados

### `auth.usuarios`

- PK: `usuarios_pkey (id)`
- UNIQUE: `usuarios_email_key (email)`

### `core.clientes_destino`

- PK: `clientes_destino_pkey (id)`

### `documentos.documentos`

- PK: `documentos_pkey (id)`

### `documentos.documentos_archivos`

- PK: `documentos_archivos_pkey (id)`
- FK: `documento_id -> documentos.documentos(id)`

### `documentos.documento_eventos`

- PK: `documento_eventos_pkey (id)`
- FK: `documento_id -> documentos.documentos(id)`
- FK: `archivo_id -> documentos.documentos_archivos(id)`
- FK: `expediente_id -> documentos.expedientes(id)`

### `documentos.expedientes`

- PK: `expedientes_pkey (id)`
- FK: `cliente_destino_id -> core.clientes_destino(id)`

### Observación

No se confirmó FK histórica para:

- `documentos.documentos.validado_por -> auth.usuarios(id)`;
- `documentos.documento_eventos.usuario_id -> auth.usuarios(id)`.

Para las nuevas tablas sí se propone FK explícita de `actor_id` hacia `auth.usuarios(id)`.

## 6. Defaults y patrón de secuencias

Las PK actuales usan secuencias tradicionales mediante `nextval(...)`; no usan columnas `IDENTITY`.

Ejemplos:

```text
auth.usuarios.id                       -> auth.usuarios_id_seq
core.clientes_destino.id              -> core.clientes_destino_id_seq
documentos.documentos.id              -> documentos.documentos_id_seq
documentos.documentos_archivos.id     -> documentos.documentos_archivos_id_seq
documentos.documento_eventos.id       -> documentos.documento_eventos_id_seq
documentos.expedientes.id             -> documentos.expedientes_id_seq
```

Patrón propuesto para Sprint 2.1C: `BIGSERIAL` para las tablas nuevas.

## 7. Volumen y riesgo operativo

Conteos exactos:

| Tabla | Filas |
|---|---:|
| `documentos.expedientes` | 117 |
| `documentos.documentos` | 20 |
| `documentos.documentos_archivos` | 19 |
| `documentos.documento_eventos` | 8 |

Tamaños aproximados:

| Tabla | Tamaño total |
|---|---:|
| `documentos.expedientes` | 176 kB |
| `documentos.documentos` | 144 kB |
| `documentos.documento_eventos` | 128 kB |
| `documentos.documentos_archivos` | 128 kB |

Conclusión local:

- riesgo bajo para agregar columnas nullable;
- riesgo bajo para crear tablas nuevas;
- riesgo bajo para crear índices con el volumen actual;
- el DDL debe conservar criterios seguros para producción futura.

## 8. Estado legacy de `documentos.documentos_archivos`

Resultados confirmados:

- total: 19 registros;
- todos poseen `documento_id`;
- todos poseen `hash_sha256`;
- hashes duplicados: 0;
- inconsistencias de versión actual: 0;
- todos poseen `storage_provider`;
- 15 registros legacy `local` carecen de `storage_key`;
- 4 registros modernos `r2` poseen `storage_key`.

### Decisiones obligatorias

- no inferir ni rellenar `storage_key` para registros legacy;
- no imponer `storage_key NOT NULL` globalmente;
- nuevas columnas de scope deben iniciar como nullable;
- no crear inicialmente un UNIQUE global de scope + hash;
- conservar el índice unique parcial existente de versión actual por documento.

## 9. Índices existentes relevantes

### `documentos.documentos_archivos`

- índice por `(documento_id, es_version_actual)`;
- índice por `(documento_id, version)`;
- índice por `tipo_version`;
- unique parcial de una sola versión actual por documento;
- no existe índice sobre `hash_sha256`;
- no existe índice por scope + hash.

### `documentos.documento_eventos`

Existen índices por:

- archivo y fecha;
- documento y fecha;
- expediente y fecha;
- `request_id`;
- `correlation_id`;
- tipo de evento y fecha.

## 10. Workspace

Solo se identificó:

```text
core.auditoria_eventos.workspace_id INTEGER NULL
```

Existe además:

```text
auth.usuario_workspaces
```

No se identificó una tabla canónica `workspaces` que permita una FK inequívoca.

Decisión:

```sql
workspace_id INTEGER NOT NULL
```

Sin FK por ahora. No se debe enlazar a `auth.usuario_workspaces`, porque representa asignaciones de usuario y no necesariamente la entidad workspace.

## 11. Privilegios efectivos

### Rol `platform_app`

```text
rolsuper   = false
rolinherit = true
rolcanlogin = true
```

Privilegios efectivos confirmados:

| Objeto | SELECT | INSERT | UPDATE |
|---|---:|---:|---:|
| `documentos.documentos` | no | no | no |
| `documentos.documentos_archivos` | no | no | no |
| `documentos.documento_eventos` | sí | sí | no |
| `documentos.expedientes` | sí | sí | sí |

Secuencias:

| Secuencia | USAGE | SELECT |
|---|---:|---:|
| `documento_eventos_id_seq` | sí | sí |
| `documentos_archivos_id_seq` | no | no |
| `documentos_id_seq` | no | no |
| `expedientes_id_seq` | no | no |

Schema `documentos`:

| Rol | USAGE | CREATE |
|---|---:|---:|
| `platform_app` | no | no |
| `postgres` | sí | sí |

No existen grants directos a `PUBLIC` sobre tablas del schema `documentos`.

### Decisión de permisos para nuevas tablas

El rol de migración/owner continuará siendo `postgres`.

Para `platform_app` se propone:

```sql
GRANT USAGE ON SCHEMA documentos TO platform_app;
```

No se propone `CREATE` sobre el schema.

No se propone `DELETE`, `TRUNCATE` ni grants a `PUBLIC`.

## 12. Registro de migraciones

Estructura real de `core.schema_migrations`:

```text
version        VARCHAR(50) NOT NULL PRIMARY KEY
descripcion    TEXT NULL
checksum       TEXT NULL
ejecutado_en   TIMESTAMP NOT NULL DEFAULT now()
ejecutado_por  VARCHAR(120) NOT NULL DEFAULT CURRENT_USER
```

Versiones registradas en la base:

- `0005` — Producción inicial limpia;
- `0006` — Tabla `documento_eventos`;
- `0007` — Auditoría de expedientes.

El repositorio contiene:

```text
infra/postgres/migrations/0008_documental_v2_modelo_base.sql
```

La migración `0008` crea:

- `documentos.contenedores_operativos`;
- `documentos.documentos_operativos_principales`;
- `documentos.grupos_factura`;
- `documentos.grupo_factura_documentos`;
- índices relacionados.

`0008` no contiene `INSERT INTO core.schema_migrations`, aunque las tablas creadas por ella ya aparecen en la base inspeccionada.

No se debe insertar manualmente el registro `0008` durante este Sprint.

Los números `0009` y `0010` están reservados documentalmente para puentes V1/V2 y backfill selectivo.

No se encontraron colisiones para `0011`, `0012` y `0013`.

## 13. Numeración propuesta

| Versión | Propósito |
|---|---|
| `0011` | Crear `documentos.carga_operaciones` |
| `0012` | Agregar scope y auditoría nullable a `documentos.documentos_archivos` |
| `0013` | Crear `documentos.documento_eventos_outbox` |

Esta numeración es una propuesta documental. La creación y ejecución real de archivos SQL sigue no autorizada.

# 14. DDL revisado propuesto

> **Estado:** diseño documental corregido. No autoriza crear archivos SQL reales ni ejecutar DDL/DML.

## 14.1 Migración `0011` — `documentos.carga_operaciones`

### Contrato corregido

La operación persistente se crea después de calcular SHA-256, fingerprint e idempotencia. Por ello, `hash_sha256`, `payload_fingerprint`, `fingerprint_version`, `idempotency_key` y `actor_id` son obligatorios para cargas autenticadas ordinarias.

```sql
BEGIN;

CREATE TABLE documentos.carga_operaciones (
  id BIGSERIAL PRIMARY KEY,

  workspace_id INTEGER NOT NULL,
  empresa_codigo VARCHAR(20) NOT NULL,
  cliente_destino_id INTEGER NULL
    REFERENCES core.clientes_destino(id)
    ON DELETE RESTRICT,
  expediente_id BIGINT NULL
    REFERENCES documentos.expedientes(id)
    ON DELETE RESTRICT,

  actor_id INTEGER NOT NULL
    REFERENCES auth.usuarios(id)
    ON DELETE RESTRICT,

  idempotency_key VARCHAR(128) NOT NULL,
  payload_fingerprint VARCHAR(64) NOT NULL,
  fingerprint_version VARCHAR(40) NOT NULL DEFAULT 'canonical-json-v1',
  request_id TEXT NULL,
  correlation_id TEXT NULL,

  canal_ingreso VARCHAR(80) NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'iniciada',
  requiere_reconciliacion BOOLEAN NOT NULL DEFAULT false,

  nombre_archivo_original TEXT NOT NULL,
  content_type VARCHAR(150) NOT NULL,
  tamano_bytes BIGINT NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,

  storage_provider VARCHAR(40) NULL,
  storage_bucket TEXT NULL,
  storage_key TEXT NULL,

  documento_id INTEGER NULL
    REFERENCES documentos.documentos(id)
    ON DELETE SET NULL,
  archivo_id INTEGER NULL
    REFERENCES documentos.documentos_archivos(id)
    ON DELETE SET NULL,

  error_codigo VARCHAR(100) NULL,
  error_detalle TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  almacenada_en TIMESTAMPTZ NULL,
  completada_en TIMESTAMPTZ NULL,
  fallida_en TIMESTAMPTZ NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_carga_operaciones_scope_idempotency
    UNIQUE (workspace_id, empresa_codigo, idempotency_key),

  CONSTRAINT ck_carga_operaciones_estado
    CHECK (estado IN (
      'iniciada',
      'almacenada',
      'completada',
      'fallida',
      'requiere_reconciliacion'
    )),

  CONSTRAINT ck_carga_operaciones_workspace
    CHECK (workspace_id > 0),

  CONSTRAINT ck_carga_operaciones_empresa
    CHECK (length(trim(empresa_codigo)) > 0),

  CONSTRAINT ck_carga_operaciones_idempotency_key
    CHECK (
      char_length(idempotency_key) BETWEEN 1 AND 128
      AND idempotency_key !~ '[[:cntrl:]]'
    ),

  CONSTRAINT ck_carga_operaciones_canal_ingreso
    CHECK (length(trim(canal_ingreso)) > 0),

  CONSTRAINT ck_carga_operaciones_nombre_archivo
    CHECK (length(trim(nombre_archivo_original)) > 0),

  CONSTRAINT ck_carga_operaciones_content_type
    CHECK (length(trim(content_type)) > 0),

  CONSTRAINT ck_carga_operaciones_tamano
    CHECK (tamano_bytes > 0),

  CONSTRAINT ck_carga_operaciones_hash_sha256
    CHECK (hash_sha256 ~ '^[0-9a-f]{64}$'),

  CONSTRAINT ck_carga_operaciones_payload_fingerprint
    CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),

  CONSTRAINT ck_carga_operaciones_fingerprint_version
    CHECK (length(trim(fingerprint_version)) > 0),

  CONSTRAINT ck_carga_operaciones_reconciliacion
    CHECK (
      requiere_reconciliacion = (estado = 'requiere_reconciliacion')
    ),

  CONSTRAINT ck_carga_operaciones_expiracion
    CHECK (expira_en > iniciada_en),

  CONSTRAINT ck_carga_operaciones_fechas_estado
    CHECK (
      (estado <> 'almacenada' OR almacenada_en IS NOT NULL)
      AND (estado <> 'completada' OR completada_en IS NOT NULL)
      AND (estado <> 'fallida' OR fallida_en IS NOT NULL)
      AND NOT (completada_en IS NOT NULL AND fallida_en IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_carga_operaciones_scope_hash_bloqueante
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

CREATE INDEX idx_carga_operaciones_scope_estado
  ON documentos.carga_operaciones (
    workspace_id,
    empresa_codigo,
    estado,
    iniciada_en DESC
  );

CREATE INDEX idx_carga_operaciones_request
  ON documentos.carga_operaciones (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX idx_carga_operaciones_correlation
  ON documentos.carga_operaciones (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX idx_carga_operaciones_expira
  ON documentos.carga_operaciones (expira_en)
  WHERE estado IN ('iniciada', 'almacenada');

GRANT USAGE ON SCHEMA documentos TO platform_app;
GRANT SELECT, INSERT, UPDATE
  ON documentos.carga_operaciones
  TO platform_app;
GRANT USAGE, SELECT
  ON SEQUENCE documentos.carga_operaciones_id_seq
  TO platform_app;

COMMIT;
```

### Decisiones de contrato

- `actor_id` es `NOT NULL` para cargas ordinarias autenticadas.
- Una futura operación puramente sistémica requerirá contrato explícito de actor de sistema; no se autoriza dejar `actor_id` nullable sin semántica.
- `requiere_reconciliacion` existe como bandera y como estado contractual.
- La autoridad de deduplicación es `carga_operaciones`, mediante la reserva parcial por scope + hash.
- Los hashes y fingerprints se almacenan normalizados en minúsculas.
- `content_type` representa el MIME validado por el backend después de inspeccionar el archivo; no es únicamente el valor declarado por el cliente.
- `expira_en` debe ser posterior a `iniciada_en`.
- `almacenada`, `completada` y `fallida` exigen sus timestamps correspondientes; una operación no puede estar simultáneamente completada y fallida.

### Transición de fallo, compensación y reconciliación

```text
fallo después de PutObject
→ intentar compensación

compensación exitosa
→ estado = fallida
→ requiere_reconciliacion = false
→ no queda objeto físico pendiente

compensación fallida
→ estado = requiere_reconciliacion
→ requiere_reconciliacion = true
→ queda objeto pendiente de tratamiento controlado
```

Una operación no puede persistirse como `fallida` mientras conserve un objeto no reconciliado.

## 14.2 Migración `0012` — scope y auditoría en `documentos_archivos`

Todas las columnas nuevas permanecen nullable para preservar los 19 registros históricos.

La migración versionada no utiliza `IF NOT EXISTS`: debe fallar de forma visible si el estado real difiere de la prevalidación aprobada. Antes de materializarla, el runner o una prevalidación explícita deberá comprobar ausencia de columnas, constraints e índices y detenerse ante cualquier drift.

```sql
BEGIN;

ALTER TABLE documentos.documentos_archivos
  ADD COLUMN workspace_id INTEGER NULL,
  ADD COLUMN empresa_codigo VARCHAR(20) NULL,
  ADD COLUMN cliente_destino_id INTEGER NULL,
  ADD COLUMN expediente_id BIGINT NULL,
  ADD COLUMN carga_operacion_id BIGINT NULL,
  ADD COLUMN creado_por INTEGER NULL,
  ADD COLUMN actualizado_por INTEGER NULL,
  ADD COLUMN actualizado_en TIMESTAMPTZ NULL,
  ADD COLUMN anulado_por INTEGER NULL,
  ADD COLUMN anulado_en TIMESTAMPTZ NULL,
  ADD COLUMN motivo_anulacion TEXT NULL;

ALTER TABLE documentos.documentos_archivos
  ADD CONSTRAINT documentos_archivos_cliente_destino_id_fkey
  FOREIGN KEY (cliente_destino_id)
  REFERENCES core.clientes_destino(id)
  ON DELETE RESTRICT,

  ADD CONSTRAINT documentos_archivos_expediente_id_fkey
  FOREIGN KEY (expediente_id)
  REFERENCES documentos.expedientes(id)
  ON DELETE RESTRICT,

  ADD CONSTRAINT documentos_archivos_carga_operacion_id_fkey
  FOREIGN KEY (carga_operacion_id)
  REFERENCES documentos.carga_operaciones(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_creado_por_fkey
  FOREIGN KEY (creado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_actualizado_por_fkey
  FOREIGN KEY (actualizado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_anulado_por_fkey
  FOREIGN KEY (anulado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_anulacion_coherente_ck
  CHECK (
    (anulado_en IS NULL AND anulado_por IS NULL AND motivo_anulacion IS NULL)
    OR
    (
      anulado_en IS NOT NULL
      AND anulado_por IS NOT NULL
      AND length(trim(motivo_anulacion)) > 0
    )
  );

CREATE INDEX idx_documentos_archivos_scope_hash
  ON documentos.documentos_archivos (
    workspace_id,
    empresa_codigo,
    hash_sha256
  )
  WHERE workspace_id IS NOT NULL
    AND empresa_codigo IS NOT NULL
    AND hash_sha256 IS NOT NULL;

CREATE INDEX idx_documentos_archivos_carga_operacion
  ON documentos.documentos_archivos (carga_operacion_id)
  WHERE carga_operacion_id IS NOT NULL;

CREATE INDEX idx_documentos_archivos_expediente
  ON documentos.documentos_archivos (expediente_id)
  WHERE expediente_id IS NOT NULL;

GRANT USAGE ON SCHEMA documentos TO platform_app;
GRANT SELECT, INSERT, UPDATE
  ON documentos.documentos_archivos
  TO platform_app;
GRANT USAGE, SELECT
  ON SEQUENCE documentos.documentos_archivos_id_seq
  TO platform_app;

COMMIT;
```

### Autoridad de la relación operación ↔ archivo

- `documentos_archivos.carga_operacion_id` es la relación autoritativa de **origen técnico** del archivo.
- `carga_operaciones.archivo_id` es un puntero de **resultado conveniente** para consulta del estado final.
- La escritura transaccional debe establecer primero el archivo con su `carga_operacion_id` y luego completar `carga_operaciones.archivo_id` en la misma transacción PostgreSQL.
- Una inconsistencia entre ambos campos debe marcar la operación como `requiere_reconciliacion`.

La decisión sobre exigir también `estado = 'anulado'` junto con los campos de anulación queda pendiente de confirmar contra el catálogo vigente de `documentos_archivos`. No se inventa un nuevo estado en esta fase documental.

## 14.3 Migración `0013` — outbox transaccional

```sql
BEGIN;

CREATE TABLE documentos.documento_eventos_outbox (
  id BIGSERIAL PRIMARY KEY,

  event_key VARCHAR(255) NOT NULL UNIQUE,
  evento_version INTEGER NOT NULL DEFAULT 1,

  carga_operacion_id BIGINT NOT NULL
    REFERENCES documentos.carga_operaciones(id)
    ON DELETE RESTRICT,

  workspace_id INTEGER NOT NULL,
  empresa_codigo VARCHAR(20) NOT NULL,
  cliente_destino_id INTEGER NULL
    REFERENCES core.clientes_destino(id)
    ON DELETE RESTRICT,
  expediente_id BIGINT NULL
    REFERENCES documentos.expedientes(id)
    ON DELETE RESTRICT,
  documento_id INTEGER NULL
    REFERENCES documentos.documentos(id)
    ON DELETE SET NULL,
  archivo_id INTEGER NULL
    REFERENCES documentos.documentos_archivos(id)
    ON DELETE SET NULL,
  actor_id INTEGER NOT NULL
    REFERENCES auth.usuarios(id)
    ON DELETE RESTRICT,

  tipo_evento VARCHAR(120) NOT NULL,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id TEXT NOT NULL,

  request_id TEXT NULL,
  correlation_id TEXT NULL,
  idempotency_key VARCHAR(128) NOT NULL,

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,

  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  intentos INTEGER NOT NULL DEFAULT 0,
  max_intentos INTEGER NOT NULL DEFAULT 10,
  proximo_intento_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by VARCHAR(120) NULL,
  locked_until TIMESTAMPTZ NULL,
  publicado_en TIMESTAMPTZ NULL,
  ultimo_error TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_documento_eventos_outbox_estado
    CHECK (estado IN (
      'pendiente',
      'procesando',
      'publicado',
      'fallido_permanente'
    )),

  CONSTRAINT ck_documento_eventos_outbox_intentos
    CHECK (intentos >= 0 AND max_intentos > 0 AND intentos <= max_intentos),

  CONSTRAINT ck_documento_eventos_outbox_version
    CHECK (evento_version > 0),

  CONSTRAINT ck_documento_eventos_outbox_workspace
    CHECK (workspace_id > 0),

  CONSTRAINT ck_documento_eventos_outbox_empresa
    CHECK (length(trim(empresa_codigo)) > 0),

  CONSTRAINT ck_documento_eventos_outbox_event_key
    CHECK (
      length(trim(event_key)) > 0
      AND event_key !~ '[[:cntrl:]]'
    ),

  CONSTRAINT ck_documento_eventos_outbox_lease_estado
    CHECK (
      (
        estado = 'procesando'
        AND locked_by IS NOT NULL
        AND locked_until IS NOT NULL
      )
      OR
      (
        estado <> 'procesando'
        AND locked_by IS NULL
        AND locked_until IS NULL
      )
    ),

  CONSTRAINT ck_documento_eventos_outbox_publicacion
    CHECK (
      (estado = 'publicado' AND publicado_en IS NOT NULL)
      OR
      (estado <> 'publicado' AND publicado_en IS NULL)
    ),

  CONSTRAINT ck_documento_eventos_outbox_fallo_permanente
    CHECK (
      estado <> 'fallido_permanente'
      OR intentos >= max_intentos
    ),

  CONSTRAINT ck_documento_eventos_outbox_pendiente
    CHECK (
      estado <> 'pendiente'
      OR proximo_intento_en IS NOT NULL
    )
);

CREATE INDEX idx_documento_eventos_outbox_disponibles
  ON documentos.documento_eventos_outbox (
    proximo_intento_en,
    id
  )
  WHERE estado = 'pendiente';

CREATE INDEX idx_documento_eventos_outbox_lease
  ON documentos.documento_eventos_outbox (locked_until)
  WHERE estado = 'procesando';

CREATE INDEX idx_documento_eventos_outbox_carga
  ON documentos.documento_eventos_outbox (carga_operacion_id);

CREATE INDEX idx_documento_eventos_outbox_correlation
  ON documentos.documento_eventos_outbox (correlation_id)
  WHERE correlation_id IS NOT NULL;

GRANT USAGE ON SCHEMA documentos TO platform_app;
GRANT SELECT, INSERT, UPDATE
  ON documentos.documento_eventos_outbox
  TO platform_app;
GRANT USAGE, SELECT
  ON SEQUENCE documentos.documento_eventos_outbox_id_seq
  TO platform_app;

COMMIT;
```

### Semántica de publicación y reintentos

- `event_key` es la idempotencia propia del evento y permite varios eventos por una misma carga.
- `idempotency_key` se conserva como correlación con la solicitud de carga, sin restricción unique en la outbox.
- Un worker reclama un evento cambiando `pendiente → procesando`, asignando `locked_by` y `locked_until` dentro de una transacción con bloqueo de fila.
- La reclamación concurrente debe usar `SELECT ... FOR UPDATE SKIP LOCKED`, o mecanismo equivalente, dentro de una transacción.
- Un fallo reintentable devuelve el evento a `pendiente`, incrementa `intentos`, registra `ultimo_error` y calcula `proximo_intento_en` con backoff.
- Cuando `intentos` alcanza `max_intentos`, pasa a `fallido_permanente` y deja de ser elegible automáticamente.
- Un lease vencido puede ser recuperado por otro worker mediante reconciliación controlada.
- `publicado` requiere `publicado_en` y liberación del lease.

Invariantes por estado:

```text
pendiente:
  lease libre
  proximo_intento_en obligatorio
  publicado_en nulo

procesando:
  locked_by y locked_until obligatorios
  publicado_en nulo

publicado:
  publicado_en obligatorio
  lease libre

fallido_permanente:
  intentos >= max_intentos
  lease libre
  no elegible automáticamente
```

Patrón conceptual de reclamación:

```sql
BEGIN;

SELECT id
FROM documentos.documento_eventos_outbox
WHERE estado = 'pendiente'
  AND proximo_intento_en <= now()
ORDER BY proximo_intento_en, id
FOR UPDATE SKIP LOCKED
LIMIT :lote;

-- Actualización de las filas reclamadas a estado procesando,
-- asignando locked_by y locked_until dentro de la misma transacción.

COMMIT;
```

Ejemplos de `event_key`:

```text
documento-creado:<cargaOperacionId>:v1
archivo-subido:<cargaOperacionId>:<archivoId>:v1
archivo-versionado:<cargaOperacionId>:<archivoId>:<version>:v1
```

# 15. Auditoría obligatoria de archivos

## 15.1 Requisito funcional

Toda acción relevante sobre un archivo debe registrar:

- quién la ejecutó;
- fecha y hora;
- archivo afectado;
- documento asociado;
- operación de carga;
- `request_id`;
- `correlation_id`;
- valores anteriores y nuevos cuando corresponda;
- motivo de la acción.

## 15.2 Acciones auditables

Como mínimo:

```text
archivo.creado
archivo.subido
archivo.actualizado
archivo.versionado
archivo.reemplazado
archivo.anulado
archivo.restaurado
```

## 15.3 Columnas de estado actual

En `documentos.documentos_archivos` deben existir:

```text
creado_por
actualizado_por
actualizado_en
anulado_por
anulado_en
motivo_anulacion
```

Estas columnas identifican el actor del estado actual, pero no reemplazan el historial append-only.

## 15.4 Historial append-only

Cada cambio deberá emitir un evento con:

```text
archivo_id
documento_id
usuario_id
request_id
correlation_id
creado_en
descripcion
metadata
```

El evento debe incluir valores anteriores y nuevos cuando corresponda. La outbox se escribe en la misma transacción PostgreSQL que la modificación documental.

## 15.5 Eliminación lógica y física

La operación normal debe ser anulación lógica:

```text
anulado_por
anulado_en
motivo_anulacion
```

La eliminación física queda restringida a un proceso administrativo excepcional. Antes de eliminar el objeto físico debe persistirse un evento con:

- solicitante;
- autorizador;
- archivo y documento;
- `hash_sha256`;
- `storage_key`;
- fecha;
- motivo;
- `request_id`;
- `correlation_id`.

# 16. Registro de migraciones y control de drift

## 16.1 Mecanismo oficial pendiente de inspección del runner

Quedan retiradas del DDL candidato las sentencias:

```sql
checksum = NULL
ON CONFLICT (version) DO NOTHING
```

La migración real deberá seguir exactamente uno de estos mecanismos, según el runner oficial del repositorio:

1. el runner calcula y registra el checksum real externamente; o
2. el archivo registra un checksum real mediante el procedimiento oficial.

No se autoriza un mecanismo híbrido ni ocultar conflictos de versión.

## 16.2 `IF NOT EXISTS`

En migraciones versionadas no debe utilizarse `IF NOT EXISTS` de forma indiscriminada. Cuando se use una defensa de reejecución deberá acompañarse de postvalidaciones de:

- columnas y tipos;
- constraints;
- índices;
- owner;
- grants;
- secuencias.

La existencia del objeto no prueba que su definición sea correcta.

# 17. Matriz de correcciones del dictamen

| # | Corrección obligatoria | Estado documental |
|---:|---|---|
| 1 | `payload_fingerprint` | incorporado |
| 2 | `fingerprint_version` | incorporado |
| 3 | `expira_en` | incorporado |
| 4 | `requiere_reconciliacion` | incorporado |
| 5 | catálogo oficial de estados | corregido |
| 6 | unique parcial scope + hash | incorporado |
| 7 | `hash_sha256 NOT NULL` | corregido |
| 8 | Idempotency-Key máximo 128 | corregido |
| 9 | checks de scope, empresa, hash, tamaño y fingerprint | incorporados |
| 10 | nulabilidad de `actor_id` | resuelta como `NOT NULL` |
| 11 | check coherente de anulación | incorporado |
| 12 | protección real de `ADD CONSTRAINT` | incorporada con `pg_constraint` |
| 13 | doble relación operación↔archivo | autoridad y secuencia definidas |
| 14 | `event_key UNIQUE` | incorporado |
| 15 | eliminar unique de outbox por Idempotency-Key | corregido |
| 16 | `evento_version` | incorporado |
| 17 | leasing de outbox | incorporado |
| 18 | semántica de reintentos | definida |
| 19 | mecanismo real de checksum | remitido al runner oficial |
| 20 | no ocultar conflictos con `ON CONFLICT DO NOTHING` | retirado |

# 18. Riesgos y asuntos pendientes

1. Falta inspeccionar el runner oficial de migraciones antes de materializar archivos SQL; cualquier drift debe producir error visible.
2. Debe confirmarse el catálogo vigente de `documentos_archivos.estado` antes de ligar obligatoriamente `estado = 'anulado'` al check de anulación.
3. Debe definirse si el worker de outbox usa `platform_app` o un rol técnico separado; `UPDATE` directo se acepta solo provisionalmente si ambos componentes comparten rol.
4. No se realizará backfill de actores, `storage_key` ni scope para registros históricos sin evidencia.
5. La outbox y la operación documental deben escribirse en una misma transacción PostgreSQL.
6. La publicación debe ser idempotente, con leasing y reintentos controlados.

# 19. Matriz de observaciones finales

| # | Invariante final | Estado documental |
|---:|---|---|
| 1 | equivalencia estado/bandera de reconciliación | corregida bidireccionalmente |
| 2 | archivo con tamaño mayor que cero | incorporada |
| 3 | expiración posterior al inicio | incorporada |
| 4 | timestamps obligatorios por estado | incorporados |
| 5 | canal de ingreso no vacío | incorporado |
| 6 | nombre de archivo no vacío | incorporado |
| 7 | `content_type` validado y obligatorio | definido |
| 8 | política de `IF NOT EXISTS` | retirada para `0012`; drift debe fallar |
| 9 | lease coherente con estado de outbox | incorporado |
| 10 | publicación coherente con `publicado_en` | incorporada |
| 11 | fallo permanente ligado a máximo de intentos | incorporado |
| 12 | compensación y reconciliación | transición documentada |
| 13 | reclamación concurrente | `FOR UPDATE SKIP LOCKED` documentado |

# 20. Dictamen GO-1B corregido

```text
Prevalidaciones SQL:                APROBADAS
Tipos canónicos:                   APROBADOS
Constraints y FK:                  APROBADOS COMO EVIDENCIA
Datos legacy:                      APROBADOS
Permisos:                          APROBADOS COMO POLÍTICA
Numeración 0011/0012/0013:         RESERVADA
Auditoría crear/editar/anular:      CORREGIDA CON CHECKS
DDL documental revisado:           PRESENTADO PARA NUEVO DICTAMEN
GO-1C:                             NO AUTORIZADO
Migraciones reales:                NO AUTORIZADAS
Código funcional:                  NO AUTORIZADO
Builds / pruebas / push:           NO AUTORIZADOS
```

## 21. Próximo paso autorizado

- revisión formal del Documento 12 corregido;
- validación del runner oficial únicamente si el Maestro lo autoriza expresamente;
- ninguna creación de `0011`, `0012` o `0013`;
- ninguna ejecución DDL/DML;
- ningún cambio en `apps/`, `packages/` o `infra/postgres/migrations/`;
- ningún `push`.
