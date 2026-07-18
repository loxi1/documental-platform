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

# 14. DDL final propuesto

## 14.1 Migración `0011` — `documentos.carga_operaciones`

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS documentos.carga_operaciones (
  id BIGSERIAL PRIMARY KEY,

  workspace_id INTEGER NOT NULL,
  empresa_codigo VARCHAR(20) NOT NULL,
  cliente_destino_id INTEGER NULL
    REFERENCES core.clientes_destino(id)
    ON DELETE RESTRICT,
  expediente_id BIGINT NULL
    REFERENCES documentos.expedientes(id)
    ON DELETE RESTRICT,

  actor_id INTEGER NULL
    REFERENCES auth.usuarios(id)
    ON DELETE SET NULL,

  idempotency_key TEXT NOT NULL,
  request_id TEXT NULL,
  correlation_id TEXT NULL,

  canal_ingreso VARCHAR(80) NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'iniciada',

  nombre_archivo_original TEXT NOT NULL,
  content_type VARCHAR(150) NULL,
  tamano_bytes BIGINT NULL,
  hash_sha256 VARCHAR(64) NULL,

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
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_carga_operaciones_scope_idempotency
    UNIQUE (workspace_id, empresa_codigo, idempotency_key),

  CONSTRAINT ck_carga_operaciones_estado
    CHECK (estado IN (
      'iniciada',
      'almacenada',
      'completada',
      'fallida',
      'compensacion_pendiente',
      'compensada'
    )),

  CONSTRAINT ck_carga_operaciones_hash_sha256
    CHECK (hash_sha256 IS NULL OR hash_sha256 ~ '^[0-9a-fA-F]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_carga_operaciones_scope_estado
  ON documentos.carga_operaciones (
    workspace_id,
    empresa_codigo,
    estado,
    iniciada_en DESC
  );

CREATE INDEX IF NOT EXISTS idx_carga_operaciones_request
  ON documentos.carga_operaciones (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_carga_operaciones_correlation
  ON documentos.carga_operaciones (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_carga_operaciones_documento
  ON documentos.carga_operaciones (documento_id)
  WHERE documento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_carga_operaciones_archivo
  ON documentos.carga_operaciones (archivo_id)
  WHERE archivo_id IS NOT NULL;

GRANT USAGE ON SCHEMA documentos TO platform_app;

GRANT SELECT, INSERT, UPDATE
  ON documentos.carga_operaciones
  TO platform_app;

GRANT USAGE, SELECT
  ON SEQUENCE documentos.carga_operaciones_id_seq
  TO platform_app;

INSERT INTO core.schema_migrations (
  version,
  descripcion,
  checksum
)
VALUES (
  '0011',
  'Operaciones persistentes e idempotentes de carga documental segura',
  NULL
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

## 14.2 Migración `0012` — scope y auditoría en `documentos_archivos`

Todas las columnas nuevas son nullable para conservar compatibilidad con los 19 registros históricos.

```sql
BEGIN;

ALTER TABLE documentos.documentos_archivos
  ADD COLUMN IF NOT EXISTS workspace_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS empresa_codigo VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS cliente_destino_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS expediente_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS carga_operacion_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS creado_por INTEGER NULL,
  ADD COLUMN IF NOT EXISTS actualizado_por INTEGER NULL,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS anulado_por INTEGER NULL,
  ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT NULL;

ALTER TABLE documentos.documentos_archivos
  ADD CONSTRAINT documentos_archivos_cliente_destino_id_fkey
  FOREIGN KEY (cliente_destino_id)
  REFERENCES core.clientes_destino(id)
  ON DELETE RESTRICT;

ALTER TABLE documentos.documentos_archivos
  ADD CONSTRAINT documentos_archivos_expediente_id_fkey
  FOREIGN KEY (expediente_id)
  REFERENCES documentos.expedientes(id)
  ON DELETE RESTRICT;

ALTER TABLE documentos.documentos_archivos
  ADD CONSTRAINT documentos_archivos_carga_operacion_id_fkey
  FOREIGN KEY (carga_operacion_id)
  REFERENCES documentos.carga_operaciones(id)
  ON DELETE SET NULL;

ALTER TABLE documentos.documentos_archivos
  ADD CONSTRAINT documentos_archivos_creado_por_fkey
  FOREIGN KEY (creado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL;

ALTER TABLE documentos.documentos_archivos
  ADD CONSTRAINT documentos_archivos_actualizado_por_fkey
  FOREIGN KEY (actualizado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL;

ALTER TABLE documentos.documentos_archivos
  ADD CONSTRAINT documentos_archivos_anulado_por_fkey
  FOREIGN KEY (anulado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_archivos_scope_hash
  ON documentos.documentos_archivos (
    workspace_id,
    empresa_codigo,
    hash_sha256
  )
  WHERE workspace_id IS NOT NULL
    AND empresa_codigo IS NOT NULL
    AND hash_sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_archivos_carga_operacion
  ON documentos.documentos_archivos (carga_operacion_id)
  WHERE carga_operacion_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_archivos_expediente
  ON documentos.documentos_archivos (expediente_id)
  WHERE expediente_id IS NOT NULL;

GRANT USAGE ON SCHEMA documentos TO platform_app;

GRANT SELECT, INSERT, UPDATE
  ON documentos.documentos_archivos
  TO platform_app;

GRANT USAGE, SELECT
  ON SEQUENCE documentos.documentos_archivos_id_seq
  TO platform_app;

INSERT INTO core.schema_migrations (
  version,
  descripcion,
  checksum
)
VALUES (
  '0012',
  'Scope y auditoria de creación, modificación y anulación de archivos documentales',
  NULL
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Nota de idempotencia del DDL

Los `ADD CONSTRAINT` anteriores requieren una implementación protegida si la migración debe ser reejecutable. En el archivo SQL real deberá usarse verificación previa en `pg_constraint` o un bloque `DO $$ ... $$` para evitar error por constraints ya existentes.

No se propone un índice UNIQUE inicial de scope + hash. El índice es no único para observabilidad y búsqueda, preservando compatibilidad legacy.

## 14.3 Migración `0013` — outbox transaccional

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS documentos.documento_eventos_outbox (
  id BIGSERIAL PRIMARY KEY,

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
  actor_id INTEGER NULL
    REFERENCES auth.usuarios(id)
    ON DELETE SET NULL,

  tipo_evento VARCHAR(120) NOT NULL,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id TEXT NOT NULL,

  request_id TEXT NULL,
  correlation_id TEXT NULL,
  idempotency_key TEXT NOT NULL,

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,

  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  intentos INTEGER NOT NULL DEFAULT 0,
  disponible_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  publicado_en TIMESTAMPTZ NULL,
  ultimo_error TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_documento_eventos_outbox_idempotency
    UNIQUE (workspace_id, empresa_codigo, idempotency_key),

  CONSTRAINT ck_documento_eventos_outbox_estado
    CHECK (estado IN ('pendiente', 'procesando', 'publicado', 'fallido')),

  CONSTRAINT ck_documento_eventos_outbox_intentos
    CHECK (intentos >= 0)
);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_outbox_pendientes
  ON documentos.documento_eventos_outbox (
    estado,
    disponible_en,
    id
  )
  WHERE estado IN ('pendiente', 'fallido');

CREATE INDEX IF NOT EXISTS idx_documento_eventos_outbox_carga
  ON documentos.documento_eventos_outbox (carga_operacion_id);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_outbox_correlation
  ON documentos.documento_eventos_outbox (correlation_id)
  WHERE correlation_id IS NOT NULL;

GRANT USAGE ON SCHEMA documentos TO platform_app;

GRANT SELECT, INSERT, UPDATE
  ON documentos.documento_eventos_outbox
  TO platform_app;

GRANT USAGE, SELECT
  ON SEQUENCE documentos.documento_eventos_outbox_id_seq
  TO platform_app;

INSERT INTO core.schema_migrations (
  version,
  descripcion,
  checksum
)
VALUES (
  '0013',
  'Outbox transaccional para eventos de carga documental segura',
  NULL
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
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

Ejemplo de `metadata`:

```json
{
  "camposModificados": ["nombre_archivo", "estado"],
  "valoresAnteriores": {
    "estado": "activo"
  },
  "valoresNuevos": {
    "estado": "anulado"
  },
  "motivo": "archivo incorrecto"
}
```

## 15.5 Eliminación lógica y física

La operación normal debe ser anulación lógica:

```text
estado = anulado
anulado_por
anulado_en
motivo_anulacion
```

La eliminación física debe quedar restringida a un proceso administrativo excepcional y deberá registrar previamente:

- solicitante;
- autorizador;
- archivo y documento;
- `hash_sha256`;
- `storage_key`;
- fecha;
- motivo;
- `request_id`;
- `correlation_id`.

# 16. Riesgos y asuntos pendientes

1. `platform_app` no tiene actualmente `USAGE` sobre el schema `documentos`.
2. `platform_app` no tiene permisos efectivos sobre `documentos` ni `documentos_archivos`.
3. El DDL real debe proteger los `ADD CONSTRAINT` para reejecución segura.
4. `0008` fue aparentemente ejecutada sin quedar registrada en `core.schema_migrations`.
5. No se debe hacer backfill inventado de `storage_key` ni de actores históricos.
6. No se debe crear todavía un UNIQUE scope + hash en `documentos_archivos`.
7. El código deberá propagar el ID de usuario del token y persistirlo explícitamente.
8. Tener el usuario en el JWT no equivale a tener auditoría persistida.
9. La outbox debe escribirse en la misma transacción PostgreSQL que la operación documental correspondiente.
10. La publicación de eventos debe ser idempotente y reintentable.

# 17. Dictamen GO-1B

```text
Prevalidaciones SQL:                COMPLETADAS
Tipos canónicos:                   CONFIRMADOS
Constraints y FK:                  CONFIRMADOS
Índices existentes:                CONFIRMADOS
Datos legacy:                      CONFIRMADOS
Volumen y riesgo local:            BAJO
Permisos efectivos:                CONFIRMADOS
Workspace FK canónica:             NO IDENTIFICADA
Migración 0008:                    INSPECCIONADA
Numeración 0011/0012/0013:         DISPONIBLE Y PROPUESTA
Auditoría crear/editar/anular:      OBLIGATORIA
Migraciones reales:                NO AUTORIZADAS
Cambios funcionales:               NO AUTORIZADOS
Push:                              NO AUTORIZADO
```

## 18. Próximo paso autorizado

- revisión documental del presente archivo;
- correcciones solicitadas por Maestro Intermedio y Maestro Sucesor I;
- commit local exclusivamente documental, cuando corresponda;
- ninguna migración ni cambio funcional hasta autorización expresa.
