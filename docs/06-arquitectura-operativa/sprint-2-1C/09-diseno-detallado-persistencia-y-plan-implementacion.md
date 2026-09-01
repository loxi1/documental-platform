# Diseño detallado de persistencia y plan de implementación — Sprint 2.1C

**Proyecto:** Documental Platform ERP
**Sprint:** 2.1C — Carga Documental Segura MVP
**Estado:** PROPUESTA DETALLADA PARA REVISIÓN
**Contrato base:** `117811b7`
**Diseño arquitectónico base:** `73924adb`
**Implementación:** NO AUTORIZADA
**Migraciones:** NO AUTORIZADAS
**Pruebas:** NO AUTORIZADAS
**Concurrencia:** NO AUTORIZADA
**Push / merge / PR:** NO AUTORIZADOS

---

## 1. Objetivo

Definir el diseño detallado de persistencia y el plan de implementación del Sprint 2.1C sin escribir código ni ejecutar migraciones.

Este documento resuelve:

- baseline exacta propuesta;
- DDL conceptual;
- checks, índices y constraints;
- fingerprint;
- retención;
- multipart;
- headers internos;
- respuestas;
- errores;
- outbox;
- migraciones A/B/C;
- feature flag;
- inventario definitivo;
- pruebas trazables;
- rollback;
- bloques implementables;
- criterios de GO.

---

## 2. Baseline exacta propuesta

### 2.1 Baseline funcional mínima

```text
feat/documental-v2-operacion-2-1B
@ 178cf9db
```

No se autoriza implementar desde:

```text
main @ ffc6ca62
```

mientras no contenga el delta validado del Sprint 2.1B.

### 2.2 Condición de arranque

La futura rama de implementación deberá derivar de:

```text
A. una baseline donde 2.1B ya esté integrado;

o

B. 178cf9db después de revisar divergencias contra main.
```

### 2.3 Rama futura provisional

```text
feat/documental-v2-carga-segura-2-1C
```

No se autoriza crearla todavía.

### 2.4 Documento de baseline previo al GO

Debe registrar:

- commit base exacto;
- commits incluidos de 2.1B;
- diff contra `main`;
- migraciones presentes;
- conflictos previsibles;
- dependencias con Gateway;
- dependencias con Web Admin;
- estrategia posterior de integración.

---

## 3. Identidades canónicas

### 3.1 Workspace

```text
workspaceId
```

Fuente:

```text
JWT / contexto autenticado
```

Reglas:

- no aceptar desde body;
- no aceptar desde multipart;
- propagar por header interno;
- validar en `ms-documentos`;
- persistir como `workspace_id`.

### 3.2 Empresa

```text
empresaCodigo
```

Fuente:

```text
JWT / contexto autenticado
```

Reglas:

- normalizar con el mismo criterio vigente;
- propagar por header interno;
- persistir como `empresa_codigo`;
- no confiar en valores enviados por el cliente.

### 3.3 Cliente destino

```text
clienteDestinoId
```

Uso:

- autorización;
- trazabilidad;
- asociaciones;
- filtros;
- auditoría.

No forma parte de:

```text
workspace_id + empresa_codigo + hash_sha256
```

### 3.4 Headers internos propuestos

```text
x-workspace-id
x-empresa-codigo
x-cliente-destino-id
x-request-id
idempotency-key
```

El Gateway debe construirlos desde el contexto autenticado.

---

## 4. Operación técnica

### 4.1 Tabla aprobada

```text
documentos.carga_operaciones
```

### 4.2 Responsabilidad

La tabla representa:

- reserva;
- idempotencia;
- resultado;
- recuperación;
- compensación;
- reconciliación.

No representa:

- documento funcional;
- nodo del Workspace;
- timeline de usuario;
- OCR.

### 4.3 DDL conceptual

```sql
CREATE TABLE documentos.carga_operaciones (
  id bigserial PRIMARY KEY,
  workspace_id bigint NOT NULL,
  empresa_codigo varchar(50) NOT NULL,
  cliente_destino_id bigint NULL,
  idempotency_key varchar(128) NOT NULL,
  payload_fingerprint varchar(64) NOT NULL,
  fingerprint_version varchar(20) NOT NULL DEFAULT 'canonical-json-v1',
  hash_sha256 varchar(64) NOT NULL,
  request_id uuid NULL,
  actor_id bigint NULL,
  estado varchar(40) NOT NULL,
  storage_provider varchar(30) NULL,
  storage_bucket text NULL,
  storage_key text NULL,
  documento_id bigint NULL,
  archivo_id bigint NULL,
  error_code varchar(100) NULL,
  error_detail_internal text NULL,
  requiere_reconciliacion boolean NOT NULL DEFAULT false,
  creado_en timestamp without time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp without time zone NOT NULL DEFAULT now(),
  almacenado_en timestamp without time zone NULL,
  completado_en timestamp without time zone NULL,
  expira_en timestamp without time zone NOT NULL
);
```

DDL conceptual, no autorizado para ejecución.

### 4.4 Estados aprobados

```text
iniciada
almacenada
completada
fallida
requiere_reconciliacion
```

### 4.5 Check conceptual

```sql
CHECK (
  estado IN (
    'iniciada',
    'almacenada',
    'completada',
    'fallida',
    'requiere_reconciliacion'
  )
)
```

### 4.6 Checks adicionales

```sql
CHECK (char_length(trim(empresa_codigo)) > 0)
CHECK (char_length(idempotency_key) BETWEEN 1 AND 128)
CHECK (idempotency_key !~ '[[:cntrl:]]')
CHECK (hash_sha256 ~ '^[0-9a-f]{64}$')
CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$')
```

La sintaxis final debe validarse contra PostgreSQL y el estándar del repositorio.

---

## 5. Idempotencia

### 5.1 Restricción única

```sql
UNIQUE (
  workspace_id,
  empresa_codigo,
  idempotency_key
)
```

### 5.2 Ventana

```text
mínimo:
24 horas
```

`expira_en` marca el fin de la reproducción idempotente.

No implica eliminación del registro.

### 5.3 Retención

```text
eliminación automática:
NO

retención técnica:
hasta nueva política de auditoría
```

### 5.4 Fingerprint

Algoritmo:

```text
SHA-256(
  canonical-json-v1(payload lógico normalizado)
)
```

Contenido mínimo:

```text
versionContrato
tipoOperacion
hashSha256
expedienteId
documentoId
tipoEsperado
tipoRelacion
canalIngreso
```

Excluir:

```text
requestId
timestamps
filename temporal
orden de campos
observaciones no determinantes
metadata del navegador
content type declarado
workspace
empresa
```

### 5.5 Canonical JSON v1

Reglas:

- claves ordenadas;
- strings normalizados;
- `null` explícito;
- números en representación estable;
- booleans reales;
- ausencia de propiedades irrelevantes;
- versión incluida;
- codificación UTF-8.

### 5.6 Error

```text
ARCHIVO_IDEMPOTENCY_KEY_REUTILIZADA_CON_PAYLOAD_DISTINTO
```

HTTP candidato:

```text
409 Conflict
```

---

## 6. Deduplicación y concurrencia

### 6.1 Dedupe del MVP

```text
workspace_id
+ empresa_codigo
+ hash_sha256
```

### 6.2 Reserva activa

Constraint conceptual:

```sql
CREATE UNIQUE INDEX ux_carga_operaciones_hash_activo
ON documentos.carga_operaciones (
  workspace_id,
  empresa_codigo,
  hash_sha256
)
WHERE estado IN ('iniciada', 'almacenada');
```

### 6.3 Consulta de archivos

Índice conceptual:

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

### 6.4 Restricción de archivo activo

Pendiente de decisión final por versionado.

Candidata:

```sql
CREATE UNIQUE INDEX ux_documentos_archivos_scope_hash_activo
ON documentos.documentos_archivos (
  workspace_id,
  empresa_codigo,
  hash_sha256
)
WHERE workspace_id IS NOT NULL
  AND empresa_codigo IS NOT NULL
  AND hash_sha256 IS NOT NULL
  AND es_version_actual = true
  AND estado NOT IN ('anulado', 'duplicado_absorbido');
```

Debe validarse contra:

- versiones;
- anulaciones;
- absorciones;
- archivos legacy;
- documentos existentes.

### 6.5 Concurrencia

Diseño conceptual aprobado.

Prueba concurrente sigue prohibida hasta tener:

- constraints;
- reserva;
- compensación;
- reconciliación;
- ambiente controlado;
- resultado esperado.

---

## 7. Cambios a documentos_archivos

### 7.1 Columnas candidatas

```sql
ALTER TABLE documentos.documentos_archivos
  ADD COLUMN workspace_id bigint NULL,
  ADD COLUMN empresa_codigo varchar(50) NULL,
  ADD COLUMN cliente_destino_id bigint NULL,
  ADD COLUMN content_type_validado varchar(100) NULL,
  ADD COLUMN tamano_bytes bigint NULL;
```

### 7.2 Legacy

```text
filas existentes:
scope nullable
```

No inventar workspace.

### 7.3 Backfill

Solo cuando el ámbito sea inequívoco.

Casos ambiguos:

```text
permanecen legacy
```

### 7.4 Checks candidatos

```sql
CHECK (tamano_bytes IS NULL OR tamano_bytes >= 0)
CHECK (
  empresa_codigo IS NULL
  OR char_length(trim(empresa_codigo)) > 0
)
```

---

## 8. Multipart

### 8.1 Archivo canónico

```text
file
```

Compatibilidad temporal:

```text
archivo
```

solo en recepción.

No reenviar ambos.

### 8.2 Cantidad

```text
máximo:
1 archivo
```

### 8.3 Memoria

```text
estrategia MVP:
file.buffer
```

### 8.4 Límite configurable

```text
DOCUMENT_UPLOAD_MAX_BYTES
```

Valor candidato:

```text
20 MiB
20971520 bytes
```

Debe ratificarse antes del GO.

### 8.5 Aplicación doble

Aplicar límite en:

- API Gateway;
- `ms-documentos`.

Eliminar o reemplazar:

```text
maxBodyLength: Infinity
maxContentLength: Infinity
```

### 8.6 Nombre

Máximo candidato:

```text
255 caracteres después de normalización
```

---

## 9. MIME y extensión

### 9.1 Formato inicial

```text
application/pdf
.pdf
```

### 9.2 Validación

Requerir:

- extensión `.pdf`;
- MIME permitido;
- firma `%PDF-`;
- validación estructural básica.

### 9.3 `application/octet-stream`

No aceptar automáticamente.

Solo permitir cuando la firma identifique un formato autorizado.

### 9.4 Parser

Debe seleccionarse una librería ya aprobada o un parser controlado.

La selección concreta queda pendiente del GO técnico.

---

## 10. Storage key

Formato:

```text
documentos/<scope-seguro>/<año>/<mes>/<uuid>.pdf
```

No incluir:

- nombre original;
- RUC;
- proveedor;
- expediente;
- usuario;
- hash completo.

`scope-seguro` debe derivar de identidad interna no manipulable.

---

## 11. Flujo detallado

```text
1. Gateway valida JWT
2. Gateway obtiene workspace, empresa y cliente destino
3. Gateway valida permiso documentos.subir
4. Gateway valida cantidad y tamaño
5. Gateway propaga headers internos
6. ms-documentos valida headers
7. ms-documentos valida archivo
8. calcular SHA-256
9. construir payload lógico
10. calcular fingerprint
11. buscar Idempotency-Key
12. reproducir, rechazar o continuar
13. verificar duplicado por ámbito
14. insertar reserva técnica
15. generar storage key
16. PutObject
17. marcar operación almacenada
18. iniciar transacción PostgreSQL
19. crear documento si corresponde
20. insertar archivo
21. insertar relación legacy mínima
22. insertar outbox
23. confirmar transacción
24. marcar operación completada
25. responder
```

---

## 12. Recuperación

### 12.1 Operación almacenada sin documento

Elegible para:

- compensación;
- reintento interno;
- reconciliación.

### 12.2 Caída después de commit y antes de completar operación

Debe existir recuperación basada en:

- `documento_id`;
- `archivo_id`;
- outbox;
- estado real de la transacción.

No volver a crear documento ni archivo.

### 12.3 Reintento cliente

Misma clave y fingerprint:

```text
reproducir resultado original
```

---

## 13. Compensación

### 13.1 Condiciones

Antes de `DeleteObject`:

- objeto creado por la operación;
- operación no completada;
- sin archivo activo;
- sin referencias;
- key coincide con reserva.

### 13.2 Idempotencia

```text
objeto existente:
eliminar

objeto ausente:
compensación satisfecha

error de red/acceso:
requiere_reconciliacion
```

### 13.3 Error público

```text
ARCHIVO_OPERACION_INCONSISTENTE
```

No exponer detalles internos.

---

## 14. Outbox

### 14.1 Estrategia

```text
outbox transaccional
```

### 14.2 Tabla candidata

```sql
CREATE TABLE documentos.documento_eventos_outbox (
  id bigserial PRIMARY KEY,
  tipo_evento varchar(100) NOT NULL,
  aggregate_type varchar(100) NOT NULL,
  aggregate_id bigint NULL,
  payload jsonb NOT NULL,
  request_id uuid NULL,
  estado varchar(30) NOT NULL DEFAULT 'pendiente',
  intentos integer NOT NULL DEFAULT 0,
  creado_en timestamp without time zone NOT NULL DEFAULT now(),
  publicado_en timestamp without time zone NULL,
  ultimo_error text NULL
);
```

Antes de crearla debe verificarse si ya existe infraestructura equivalente.

### 14.3 Check

```sql
CHECK (estado IN ('pendiente', 'publicado', 'fallido'))
CHECK (intentos >= 0)
```

### 14.4 Eventos derivados

```text
documento.creado
archivo.subido
```

No insertar directamente como garantía técnica fuera de transacción.

---

## 15. DTO multipart

Campos funcionales candidatos:

```text
file
documentoId
expedienteId
tipoEsperado
tipoRelacionSugerida
canalIngreso
areaOrigen
observacion
```

Campos prohibidos como autoridad:

```text
workspaceId
empresaCodigo
clienteDestinoId
usuarioId
storageKey
bucket
provider
```

---

## 16. DTO de respuesta

### 16.1 Éxito

```json
{
  "documentoId": 3,
  "archivoId": 33,
  "hashSha256": "...",
  "duplicado": false,
  "creado": true,
  "requestId": "..."
}
```

### 16.2 Duplicado autorizado

```json
{
  "code": "ARCHIVO_DUPLICADO_EN_CARGA_GUIADA",
  "message": "Ya existe un archivo equivalente en el ámbito autorizado.",
  "duplicado": true,
  "creado": false,
  "accionSugerida": "abrir_existente",
  "referenciaExistente": {
    "documentoId": 3,
    "archivoId": 33
  },
  "requestId": "..."
}
```

---

## 17. Catálogo de errores

```text
ARCHIVO_DUPLICADO_EN_CARGA_GUIADA
ARCHIVO_TIPO_NO_PERMITIDO
ARCHIVO_TAMANO_EXCEDIDO
ARCHIVO_HASH_CALCULO_FALLIDO
ARCHIVO_UPLOAD_R2_FALLIDO
ARCHIVO_PERSISTENCIA_FALLIDA
ARCHIVO_OPERACION_INCONSISTENTE
ARCHIVO_IDEMPOTENCY_KEY_REUTILIZADA_CON_PAYLOAD_DISTINTO
```

No exponer:

```text
ARCHIVO_REQUIERE_RECONCILIACION
```

---

## 18. Migraciones

### 18.1 Migración A

Crear:

```text
documentos.carga_operaciones
```

Incluye:

- PK;
- checks;
- unique idempotente;
- reserva activa;
- índices de estado;
- índice de expiración;
- FKs opcionales.

### 18.2 Migración B

Modificar:

```text
documentos.documentos_archivos
```

Incluye:

- scope nullable;
- content type validado;
- tamaño;
- índice de consulta;
- restricción activa si se aprueba.

### 18.3 Migración C

Crear o adaptar:

```text
outbox transaccional
```

No duplicar una infraestructura existente.

### 18.4 Rollback de migraciones

No borrar datos generados.

Preferir:

- desactivar flujo;
- conservar tablas;
- retirar constraints controladamente;
- mantener lectura;
- reconciliar objetos.

---

## 19. Feature flag

```text
DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED
```

Inicial:

```text
false
```

La flag controla el flujo nuevo.

No oculta migraciones incompatibles.

---

## 20. Inventario definitivo de cambios

### Gateway

```text
apps/api-gateway/src/documentos/documentos.controller.ts
packages/shared/src/constants/headers.ts
```

### ms-documentos

```text
apps/ms-documentos/src/documentos/documentos.controller.ts
apps/ms-documentos/src/documentos/documentos-upload.service.ts
apps/ms-documentos/src/documentos/documentos.module.ts
apps/ms-documentos/src/config/configuration.ts
nuevo repositorio de carga_operaciones
nuevo servicio de compensación
nuevo servicio/repository outbox o adaptación existente
```

### Base de datos

```text
nueva migración A
nueva migración B
nueva migración C
```

### Web Admin

```text
apps/web-admin/src/services/carga-guiada.ts
apps/web-admin/src/hooks/useCargaGuiada.ts
apps/web-admin/src/types/carga-guiada.ts
CompraExpedienteEditor.tsx
NuevoExpedienteWizard.tsx
AlmacenExpedienteEditor.tsx
FinanzasExpedienteEditor.tsx
```

Cambios UX coordinados con Maestro Sucesor II.

---

## 21. Matriz trazable de pruebas

| Caso | Requisito | Capa | Tipo | Evidencia |
|---|---|---|---|---|
| Upload PDF válido | Carga nominal | Gateway + ms | Integración | 201/resultado mínimo |
| Archivo > límite | Seguridad memoria | Gateway | Contrato | `ARCHIVO_TAMANO_EXCEDIDO` |
| Archivo > límite interno | Defensa doble | ms | Integración | rechazo estable |
| MIME inválido | Lista cerrada | ms | Unitaria | tipo no permitido |
| Firma inválida | Magic bytes | ms | Unitaria | tipo no permitido |
| Misma clave/mismo payload | Idempotencia | DB + service | Integración | mismo resultado |
| Misma clave/payload distinto | Idempotencia | DB + service | Integración | 409 |
| Mismo hash/mismo ámbito | Dedupe | DB + service | Integración | 409 autorizado |
| Mismo hash/otra empresa | Aislamiento | DB + service | Integración | nueva carga |
| Mismo hash/otro workspace | Aislamiento | DB + service | Integración | nueva carga |
| Fallo R2 | Persistencia segura | service | Fallo simulado | sin documento |
| Fallo DB tras R2 | Compensación | service | Fallo simulado | DeleteObject |
| DeleteObject ausente | Idempotencia compensación | service | Integración | éxito |
| DeleteObject falla | Reconciliación | service | Fallo simulado | inconsistente |
| Outbox falla en insert | Atomicidad | DB | Integración | rollback |
| Publicación outbox falla | Reintento | worker | Integración | pendiente |
| Legacy sin scope | Compatibilidad | DB | Integración | no dedupe nueva |
| Feature flag off | Rollback funcional | Gateway/ms | Contrato | flujo anterior |
| UI recibe 409 | UX | Web Admin | Componente | abrir existente |
| Timeout y reintento | Idempotencia | Web Admin + API | Integración | misma clave |

Concurrencia no autorizada todavía.

---

## 22. Rollback

### 22.1 Funcional

```text
DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED=false
```

### 22.2 Datos

No eliminar:

- operaciones;
- auditoría;
- outbox;
- referencias;
- objetos pendientes de reconciliación.

### 22.3 Flujo anterior

Solo mantenerlo si no expone riesgos críticos no aceptados.

### 22.4 Objetos

Reconciliar antes de retirar constraints o migraciones.

---

## 23. Bloques implementables

### Bloque 0 — Baseline

Entregables:

- documento de baseline;
- divergencias;
- commit base.

GO requerido:

```text
GO-0
```

### Bloque 1 — Persistencia

Entregables:

- migración A;
- migración B;
- migración C o adaptación outbox;
- pruebas de migración.

GO requerido:

```text
GO-1
```

### Bloque 2 — Gateway

Entregables:

- headers;
- límites;
- archivo único;
- feature flag.

GO requerido:

```text
GO-2
```

### Bloque 3 — ms-documentos

Entregables:

- reserva;
- idempotencia;
- dedupe;
- R2;
- transacción;
- compensación;
- outbox.

GO requerido:

```text
GO-3
```

### Bloque 4 — Web Admin

Entregables:

- clave idempotente;
- 409;
- reintento;
- coordinación UX.

GO requerido:

```text
GO-4
```

### Bloque 5 — Pruebas secuenciales

Entregables:

- unitarias;
- integración;
- fallos simulados;
- contratos.

GO requerido:

```text
GO-5
```

### Bloque 6 — Concurrencia

No autorizada.

Requiere dictamen separado.

---

## 24. Criterios de GO por bloque

### GO-0

- baseline exacta;
- delta 2.1B completo;
- conflictos identificados.

### GO-1

- DDL aprobado;
- rollback;
- legacy;
- constraints;
- outbox resuelta.

### GO-2

- headers;
- permisos;
- límites;
- feature flag;
- contrato Gateway.

### GO-3

- flujo transaccional;
- compensación;
- recuperación;
- errores;
- respuesta mínima.

### GO-4

- contrato firmado;
- UX validada por Sucesor II;
- idempotencia local;
- manejo 409.

### GO-5

- plan de pruebas;
- ambiente;
- mocks R2;
- datos controlados;
- sin concurrencia.

---

## 25. Decisiones pendientes antes de implementación

1. ratificar 20 MiB;
2. ratificar PDF-only;
3. seleccionar parser PDF;
4. validar constraint de archivo activo;
5. confirmar outbox existente o nueva;
6. definir FKs exactas;
7. definir política de retención técnica;
8. definir worker/reintentos de outbox;
9. definir reconciliación operativa;
10. emitir GO por bloque.

---

## 26. Estado

```text
Diseño detallado:
PREPARADO PARA REVISIÓN

Diseño arquitectónico:
APROBADO

Persistencia:
PROPUESTA

Migraciones:
NO AUTORIZADAS

Implementación:
NO AUTORIZADA

Pruebas:
NO AUTORIZADAS

Concurrencia:
NO AUTORIZADA

Push:
NO AUTORIZADO
```

---

## 27. Solicitud al Maestro Intermedio

Se solicita revisar:

- baseline;
- DDL conceptual;
- checks;
- índices;
- reserva activa;
- archivo activo;
- fingerprint;
- retención;
- multipart;
- PDF;
- storage key;
- outbox;
- migraciones;
- feature flag;
- pruebas;
- rollback;
- bloques y criterios de GO.

No se solicita autorización para implementar.
