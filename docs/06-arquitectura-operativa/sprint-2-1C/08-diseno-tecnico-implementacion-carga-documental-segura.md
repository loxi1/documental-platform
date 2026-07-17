# Diseño técnico de implementación — Carga Documental Segura Sprint 2.1C

**Proyecto:** Documental Platform ERP
**Sprint:** 2.1C — Carga Documental Segura MVP
**Estado:** DISEÑO TÉCNICO ACTUALIZADO — LISTO PARA REVISIÓN
**Contrato base:** APROBADO
**Implementación:** NO AUTORIZADA
**Prueba concurrente:** NO AUTORIZADA
**Push / merge / PR / rebase / cherry-pick:** NO AUTORIZADOS
**Rama documental:** `docs/sprint-2-1C-contrato-carga-documental-segura`
**Commit contractual aprobado:** `117811b7`
**Referencia funcional V2:** `feat/documental-v2-operacion-2-1B @ 178cf9db`

---

## 1. Objetivo

Definir el diseño técnico previo a la implementación de la Carga Documental Segura del Sprint 2.1C, tomando como contrato aprobado:

```text
workspaceId
+
empresaCodigo
+
SHA-256
```

como ámbito de deduplicación del MVP.

Este documento describe:

- baseline propuesta;
- comparación entre contrato aprobado y comportamiento actual;
- componentes afectados;
- reserva de operación técnica;
- idempotencia;
- aislamiento;
- contrato multipart;
- persistencia;
- flujo transaccional;
- compensación;
- auditoría;
- errores;
- DTO;
- compatibilidad;
- migraciones;
- pruebas;
- rollback;
- fases de implementación.

No contiene código ejecutable ni autoriza implementación.

---

## 2. Estado contractual de referencia

```text
Contrato Sprint 2.1C:
APROBADO

Implementación:
NO AUTORIZADA

Diseño técnico:
AUTORIZADO

Concurrencia:
NO AUTORIZADA

Push:
NO AUTORIZADO

Sprint:
ABIERTO
```

Principios obligatorios:

```text
objeto físico
≠
archivo registrado
≠
documento lógico
≠
asociación documental
```

```text
Carga completada
≠
OCR completado
≠
documento validado
```

---

## 3. Baseline propuesta

### 3.1 Condición de partida

La implementación de 2.1C solo podrá comenzar cuando se cumpla una de estas condiciones:

```text
A. Sprint 2.1B integrado de forma controlada a la baseline objetivo

o

B. rama base aprobada expresamente
con el delta completo y validado de 2.1B
```

### 3.2 Baseline funcional de referencia

```text
feat/documental-v2-operacion-2-1B @ 178cf9db
```

### 3.3 Baseline documental contractual

```text
117811b7
docs(documental-v2): align Sprint 2.1C upload contract
```

### 3.4 Validaciones requeridas antes de implementar

- confirmar rama base exacta;
- verificar que incluya el delta completo de 2.1B;
- confirmar ausencia de divergencias no resueltas;
- inventariar archivos modificados desde `178cf9db`;
- verificar migraciones ya aplicadas;
- confirmar estado real del esquema `documentos`;
- confirmar contrato vigente del Gateway;
- confirmar comportamiento real de `file.buffer`;
- registrar hash del commit base aprobado.

---

## 4. Comparación contrato aprobado versus comportamiento actual

| Tema | Comportamiento observado | Contrato aprobado | Brecha |
|---|---|---|---|
| Deduplicación | Puede operar globalmente por SHA-256 cuando ciertos IDs son nulos | `workspaceId + empresaCodigo + SHA-256` | ALTA |
| Duplicado | HTTP 409 secuencial ya observado | HTTP 409 para nueva operación | BAJA |
| Idempotencia | No existe persistencia formal ni propagación de `Idempotency-Key` | `Idempotency-Key` por ámbito | ALTA |
| requestId | Implementado como trazabilidad técnica | No sustituye `Idempotency-Key` | MEDIA |
| Reserva técnica | No confirmada | Obligatoria antes de R2 | ALTA |
| Orden R2/DB | Debe verificarse contra código actual | Reserva → R2 → transacción PostgreSQL | ALTA |
| Compensación | `DeleteObject` no encontrado | `DeleteObject` cuando corresponda | ALTA |
| Auditoría | Parcial o vinculada a eventos | Técnica, obligatoria y separada | ALTA |
| Estados | Mezcla posible con `pendiente_ocr` | Upload separado de OCR | ALTA |
| Storage key | Debe verificarse | `<ámbito>/<año>/<mes>/<uuid>.<ext>` | MEDIA |
| Nombre original | Puede estar en metadata | Campo canónico + metadata opcional | MEDIA |
| Temporales | Uso de `file.buffer` confirmado; no se encontró disk storage | Mantener memoria con límites o aprobar cambio explícito | ALTA |
| Preview | Puede existir en flujo separado | Debe permanecer separado | BAJA |
| Concurrencia | No probada | Fuera de alcance por ahora | SIN CAMBIO |

---

## 5. Componentes potencialmente afectados

La lista fue confirmada y ampliada mediante inspección de solo lectura del repositorio. El inventario exacto se encuentra en la sección 34.

### 5.1 `ms-documentos`

Áreas probables:

```text
apps/ms-documentos/src/documentos/
```

Componentes a revisar:

- controller de carga guiada;
- service de carga documental;
- repository;
- DTO multipart;
- servicio de almacenamiento R2;
- cálculo de SHA-256;
- detección de duplicados;
- auditoría;
- manejo de errores;
- configuración;
- pruebas unitarias e integración.

### 5.2 `api-gateway`

Áreas probables:

- propagación de `Idempotency-Key`;
- contexto autenticado;
- identidad canónica de workspace;
- identidad canónica de empresa;
- normalización de errores;
- request ID;
- límites multipart;
- compatibilidad con Web Admin.

### 5.3 Base de datos

Esquemas potenciales:

```text
documentos
auditoria
core
auth
```

No se aprueba modificar ninguno hasta completar el diseño de migración.

### 5.4 Web Admin

Debe evaluarse:

- envío de `Idempotency-Key`;
- manejo de HTTP 409;
- apertura de referencia existente;
- reintentos por timeout;
- mensajes de error;
- compatibilidad con el payload actual;
- ausencia de dependencia de `estadoCarga`.

---

## 6. Identidades canónicas y aislamiento

### 6.1 Fuente de identidad

Las identidades deben derivarse del contexto autenticado del Gateway.

No se aceptarán desde el body:

```text
usuarioId
workspaceId
empresaCodigo
clienteDestinoId manipulable
ámbito de deduplicación
```

### 6.2 Identidad canónica de workspace

Debe resolverse contra el modelo real de Auth.

Opciones a confirmar:

- `workspaceId` numérico;
- identificador compuesto;
- clave interna inmutable;
- relación con sistema, empresa y perfil.

### 6.3 Identidad canónica de empresa

Debe resolverse contra el dominio vigente.

Opciones a confirmar:

- código de empresa;
- `clienteDestinoId`;
- identificador interno de empresa;
- combinación canónica equivalente.

### 6.4 Regla técnica de aislamiento

```text
scope_key = canonicalWorkspace + ":" + canonicalEmpresa
```

La representación exacta queda pendiente de aprobación, pero debe ser:

- estable;
- inmutable;
- no manipulable;
- indexable;
- auditable;
- derivada del contexto autenticado.

---

## 7. Modelo de operación técnica

### 7.1 Propósito

Registrar el ciclo técnico de la carga sin crear prematuramente el documento lógico definitivo.

### 7.2 Responsabilidades

La operación técnica debe permitir:

- iniciar una carga;
- asociar el actor;
- registrar ámbito;
- registrar `Idempotency-Key`;
- registrar hash;
- registrar storage key prevista;
- registrar estado técnico;
- registrar resultado;
- registrar error;
- registrar compensación;
- registrar necesidad de reconciliación;
- recuperar el resultado original.

### 7.3 Estados conceptuales mínimos

```text
iniciada
almacenada
completada
fallida
requiere_reconciliacion
```

No constituyen todavía enum definitivo.

### 7.4 Campos conceptuales

| Campo | Propósito |
|---|---|
| `id` | Identificador técnico |
| `workspace_id` o equivalente | Aislamiento |
| `empresa_codigo` o equivalente | Aislamiento |
| `idempotency_key` | Identidad lógica de la operación |
| `request_id` | Trazabilidad de solicitud |
| `actor_id` | Usuario autenticado |
| `hash_sha256` | Igualdad binaria |
| `payload_fingerprint` | Validar reutilización de clave |
| `storage_key_prevista` | Trazabilidad R2 |
| `estado` | Ciclo técnico |
| `documento_id` | Resultado, si existe |
| `archivo_id` | Resultado, si existe |
| `error_code` | Error estable |
| `error_detail_internal` | Diagnóstico no público |
| `requiere_reconciliacion` | Marca interna |
| `creado_en` | Auditoría |
| `actualizado_en` | Auditoría |
| `completado_en` | Resultado |
| `expira_en` | Retención idempotente, si aplica |

### 7.5 Decisiones pendientes

- nombre de tabla;
- esquema;
- tipos;
- índice único;
- retención;
- limpieza;
- relación con auditoría;
- atomicidad con outbox;
- política de reintentos internos.

---

## 8. Idempotencia

### 8.1 Header

```text
Idempotency-Key
```

### 8.2 Ámbito único

```text
workspace
+
empresa
+
Idempotency-Key
```

### 8.3 Fingerprint del payload

Debe calcularse con campos lógicos estables.

Debe incluir, como mínimo:

- hash SHA-256;
- operación;
- contexto funcional vigente;
- parámetros que cambien el resultado.

No debe incluir:

- request ID;
- timestamps;
- metadatos volátiles;
- nombre temporal;
- orden irrelevante de campos.

### 8.4 Reglas

```text
Misma clave + mismo ámbito + mismo fingerprint:
reproducir resultado original

Misma clave + mismo ámbito + fingerprint distinto:
rechazar

Nueva clave + mismo hash:
aplicar deduplicación

Clave de otro ámbito:
no tiene efecto
```

### 8.5 Código de error candidato

```text
ARCHIVO_REQUEST_ID_REUTILIZADO_CON_PAYLOAD_DISTINTO
```

Observación:

El nombre contractual candidato menciona `REQUEST_ID`, pero el diseño usa `Idempotency-Key`.

Debe evaluarse renombrarlo antes de implementación a una forma coherente, por ejemplo:

```text
ARCHIVO_IDEMPOTENCY_KEY_REUTILIZADA_CON_PAYLOAD_DISTINTO
```

Esta modificación requiere validación contra el estándar común del Gateway.

---

## 9. Deduplicación

### 9.1 Clave del MVP

```text
workspace
+
empresa
+
SHA-256
```

### 9.2 Consulta esperada

La detección debe restringirse al ámbito autorizado.

No debe existir una consulta pública de duplicado global.

### 9.3 Resultado dentro del mismo ámbito

```text
HTTP 409
ARCHIVO_DUPLICADO_EN_CARGA_GUIADA
```

### 9.4 Resultado fuera del ámbito

La coincidencia no debe afectar la respuesta.

La carga podrá:

- crear otro objeto físico;
- crear otro archivo registrado;
- continuar sin revelar la coincidencia.

### 9.5 Restricción

No se autoriza reutilización física global en 2.1C.

---

## 10. Contrato multipart propuesto

### 10.1 Endpoint

Debe preservarse el endpoint vigente salvo dictamen posterior.

La ruta exacta debe confirmarse mediante inspección del Gateway y `ms-documentos`.

### 10.2 Headers

```text
Authorization: Bearer <token>
Idempotency-Key: <valor>
X-Request-Id: <valor opcional o generado>
Content-Type: multipart/form-data
```

### 10.3 Partes

| Parte | Tipo | Obligatoria | Fuente |
|---|---|---:|---|
| `file` | binario | Sí | cliente |
| contexto permitido vigente | texto/JSON | Según flujo actual | cliente validado |
| workspace | — | No | Gateway |
| empresa | — | No | Gateway |
| usuario | — | No | Gateway |

### 10.4 Validaciones

- archivo presente;
- tamaño permitido;
- MIME permitido;
- extensión coherente;
- nombre original sanitizable;
- contexto funcional autorizado;
- `Idempotency-Key` válida;
- ámbito autenticado;
- hash calculable.

### 10.5 Límites

Pendientes de confirmación:

- tamaño máximo;
- MIME permitidos;
- extensiones permitidas;
- timeout;
- límite de memoria;
- comportamiento de Multer;
- cantidad de partes;
- nombre máximo.

---

## 11. Flujo transaccional

### 11.1 Flujo nominal

```text
1. recibir multipart
2. obtener contexto autenticado
3. validar permisos
4. validar archivo
5. calcular SHA-256
6. calcular fingerprint lógico
7. verificar Idempotency-Key
8. verificar duplicado por ámbito
9. reservar operación técnica
10. generar storage key
11. ejecutar PutObject
12. verificar almacenamiento
13. iniciar transacción PostgreSQL
14. crear o completar documento lógico vigente
15. registrar archivo
16. registrar relación legacy estrictamente necesaria
17. registrar auditoría/outbox
18. confirmar transacción
19. marcar operación completada
20. limpiar temporal, si existe
21. responder
```

### 11.2 Punto de no retorno

Debe definirse técnicamente.

Propuesta:

```text
PutObject confirmado
+
transacción PostgreSQL aún no confirmada
=
zona de compensación
```

### 11.3 Restricción

No crear documento definitivo antes de confirmar R2.

---

## 12. Storage key

### 12.1 Formato

```text
<ambito>/<año>/<mes>/<uuid>.<extension-validada>
```

Ejemplo conceptual:

```text
documentos/BBTI/2026/07/1c529071-6de1-4e60-9586-b06a7d06beab.pdf
```

### 12.2 Reglas

- ámbito derivado del contexto autenticado;
- UUID generado por backend;
- extensión derivada de validación;
- no usar nombre original completo;
- no aceptar path del cliente;
- no exponer storage key al frontend;
- no usar hash como storage key global del MVP.

### 12.3 Metadata R2 candidata

- content type;
- hash SHA-256;
- nombre original sanitizado;
- request ID;
- operación técnica;
- ámbito interno, si no expone información sensible.

La metadata definitiva debe validarse.

---

## 13. Nombre original

Debe persistirse en:

```text
nombre_archivo
```

o campo canónico equivalente.

Metadata puede complementar con:

- filename recibido;
- filename sanitizado;
- content type declarado;
- content type validado;
- extensión declarada;
- extensión validada.

No debe depender exclusivamente de JSONB para presentación.

---

## 14. Compensación

### 14.1 R2 falla

```text
marcar operación fallida
no crear documento definitivo
no registrar archivo como subido
limpiar recurso temporal, si existe
auditar
```

### 14.2 PostgreSQL falla después de R2

```text
intentar DeleteObject
```

Condiciones:

- objeto creado por la operación;
- no reutilizado;
- sin referencias;
- storage key inequívoca.

### 14.3 DeleteObject exitoso

```text
operación:
fallida

requiere_reconciliacion:
false
```

### 14.4 DeleteObject falla

```text
operación:
requiere_reconciliacion

respuesta pública:
ARCHIVO_OPERACION_INCONSISTENTE
```

### 14.5 Información no pública

- storage key;
- error R2 crudo;
- stack trace;
- estado interno;
- intentos de compensación;
- credenciales;
- bucket.

---

## 15. Reconciliación

### 15.1 Alcance mínimo

Debe detectar:

- objetos R2 sin registro;
- registros sin objeto;
- operaciones iniciadas vencidas;
- operaciones almacenadas no completadas;
- compensaciones fallidas;
- eventos de auditoría pendientes;
- temporales vencidos, si existen.

### 15.2 Implementación

No necesariamente forma parte del primer bloque de código si:

- existe compensación segura;
- existe auditoría recuperable;
- existe capacidad administrativa definida;
- el riesgo residual queda aceptado.

### 15.3 Entregable posterior

Debe existir un diseño de reconciliación antes del GO productivo.

---

## 16. Auditoría transaccional

### 16.1 Separación

```text
auditoría técnica
≠
evento derivado
≠
timeline funcional
```

### 16.2 Datos mínimos

- actor;
- workspace;
- empresa;
- request ID;
- `Idempotency-Key`;
- SHA-256;
- operación;
- resultado;
- duplicado;
- documento/archivo autorizados;
- error;
- compensación;
- reconciliación;
- timestamps.

### 16.3 Garantía

La auditoría obligatoria no debe perderse silenciosamente.

Opciones a evaluar:

- misma transacción;
- outbox transaccional;
- tabla técnica;
- evento persistido;
- reintento controlado.

### 16.4 Timeline

No agregar automáticamente duplicados rechazados al timeline funcional.

---

## 17. Estados

### 17.1 Operación técnica

Candidatos conceptuales:

```text
iniciada
almacenada
completada
fallida
requiere_reconciliacion
```

### 17.2 Archivo

Candidatos conceptuales:

```text
subido
fallido
anulado
```

### 17.3 Documento

No modificar todavía el catálogo existente.

### 17.4 OCR

`pendiente_ocr` se considera comportamiento legacy observado.

El upload debe completar su contrato sin depender de OCR.

---

## 18. Respuesta pública

### 18.1 Éxito

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

### 18.2 Duplicado autorizado

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

### 18.3 Campos excluidos

- storage key;
- bucket;
- provider;
- ruta temporal;
- URL firmada;
- metadata cruda;
- JSONB;
- estado OCR;
- estado de reconciliación;
- detalle de compensación.

---

## 19. Errores contractuales candidatos

```text
ARCHIVO_DUPLICADO_EN_CARGA_GUIADA
ARCHIVO_TIPO_NO_PERMITIDO
ARCHIVO_TAMANO_EXCEDIDO
ARCHIVO_HASH_CALCULO_FALLIDO
ARCHIVO_UPLOAD_R2_FALLIDO
ARCHIVO_PERSISTENCIA_FALLIDA
ARCHIVO_OPERACION_INCONSISTENTE
ARCHIVO_REQUEST_ID_REUTILIZADO_CON_PAYLOAD_DISTINTO
```

Revisión requerida:

- coherencia de nombres;
- estándar Gateway;
- HTTP status;
- mensaje público;
- código interno;
- trazabilidad;
- compatibilidad frontend.

No exponer:

```text
ARCHIVO_REQUIERE_RECONCILIACION
```

---

## 20. Temporales y memoria

### 20.1 Resultado de inspección

Se confirmó:

- uso de `FileFieldsInterceptor`;
- procesamiento mediante `file.buffer`;
- ausencia de `diskStorage`;
- ausencia de temporales en disco;
- ausencia de límites explícitos de Multer;
- `maxBodyLength: Infinity` y `maxContentLength: Infinity` en el Gateway;
- ausencia de limpieza automática porque no existen temporales en el flujo vigente.

### 20.2 Si la implementación usa memoria

```text
file.buffer
```

Entonces:

- no crear limpieza de disco inexistente;
- definir límite estricto;
- evaluar presión de memoria;
- mantener streaming fuera del MVP;
- registrar error por tamaño antes de procesos costosos.

### 20.3 Si usa disco

Configurar:

```text
UPLOAD_TMP_DIR
```

Requisitos:

- directorio exclusivo;
- usuario de servicio;
- permisos restrictivos;
- límite de tamaño;
- limpieza inmediata;
- limpieza residual cada 24 horas;
- antigüedad máxima 48 horas;
- protección contra symlinks;
- exclusión de archivos activos;
- logging;
- dry run inicial.

### 20.4 Decisión pendiente

La implementación vigente opera en memoria. Antes del GO debe aprobarse el tamaño máximo y los límites de Multer/Axios. Solo se diseñará `UPLOAD_TMP_DIR` si se autoriza explícitamente migrar a almacenamiento temporal en disco.

---

## 21. Cambios de base de datos potenciales

No autorizados todavía.

### 21.1 Posible tabla de operaciones

Conceptualmente:

```text
documentos.carga_operaciones
```

Nombre no aprobado.

### 21.2 Posibles restricciones

- índice único por ámbito + `Idempotency-Key`;
- índice por ámbito + SHA-256;
- índice por estado;
- índice por expiración;
- relación opcional a documento;
- relación opcional a archivo.

### 21.3 Posibles ajustes a `documentos_archivos`

Evaluar:

- nombre original canónico;
- identidad de ámbito;
- estado técnico;
- tamaño;
- content type validado;
- restricción de hash por ámbito;
- metadata complementaria.

### 21.4 Migración

Debe incluir:

- up;
- down o estrategia de reversión;
- compatibilidad con filas existentes;
- backfill;
- índices concurrentes o equivalentes;
- impacto de bloqueo;
- datos legacy;
- validación previa y posterior.

---

## 22. Compatibilidad con Web Admin

### 22.1 Requisitos

Web Admin debe:

- generar o conservar `Idempotency-Key`;
- no enviar workspace o empresa manipulables;
- interpretar HTTP 409;
- ofrecer `abrir_existente` solo si existe referencia autorizada;
- distinguir timeout de rechazo;
- no depender de `estadoCarga`;
- continuar usando preview por operación separada;
- no recibir storage key.

### 22.2 Reintentos

Ante timeout:

- reutilizar la misma `Idempotency-Key`;
- permitir request ID distinto;
- no generar nueva clave automáticamente antes de conocer el resultado.

### 22.3 Compatibilidad

Debe compararse el payload actual con el aprobado y documentar:

- campos conservados;
- campos nuevos;
- campos retirados;
- cambios de status HTTP;
- mensajes;
- impacto en componentes React;
- manejo de errores de TanStack Query.

---

## 23. Inventario exacto por archivo

La inspección fue completada. El inventario consolidado y confirmado se encuentra en la sección 34.

No se autoriza editar los archivos inventariados hasta que exista un GO independiente de implementación.

---

## 24. Plan de pruebas

### 24.1 Unitarias

- cálculo SHA-256;
- scope de deduplicación;
- fingerprint;
- validación `Idempotency-Key`;
- generación de storage key;
- sanitización;
- mapping de errores;
- compensación;
- autorización de referencia.

### 24.2 Integración

1. Upload nominal.
2. Duplicado secuencial mismo ámbito.
3. Mismo hash otra empresa.
4. Mismo hash otro workspace.
5. Misma clave y mismo payload.
6. Misma clave y payload distinto.
7. Fallo R2.
8. Fallo PostgreSQL posterior a R2.
9. DeleteObject exitoso.
10. DeleteObject fallido.
11. Auditoría persistida.
12. Auditoría fallida.
13. Carga sin OCR.
14. Nombre peligroso.
15. MIME no permitido.
16. Tamaño excedido.
17. Manipulación de empresa.
18. Acceso no autorizado.
19. Timeout y recuperación.
20. Preview separado.

### 24.3 Concurrencia

```text
NO AUTORIZADA
```

Debe diseñarse después de definir:

- índice único;
- reserva técnica;
- locking;
- comportamiento de R2;
- reintentos;
- resultados esperados.

### 24.4 Productivo

No autorizado.

---

## 25. Plan de rollback

Debe contemplar:

- desactivación por feature flag, si se aprueba;
- restauración del flujo anterior;
- reversión de migración;
- conservación de auditoría;
- tratamiento de operaciones incompletas;
- objetos R2 creados;
- registros sin objeto;
- compatibilidad de payload;
- rollback de Gateway;
- rollback de Web Admin;
- verificación posterior.

No se ejecutará rollback real sin autorización.

---

## 26. Fases propuestas de implementación

### Fase 0 — Inspección

- baseline;
- código;
- esquema;
- DTO;
- Gateway;
- Web Admin;
- memoria/disco;
- errores;
- pruebas existentes.

### Fase 1 — Diseño detallado

- tabla de operación;
- idempotencia;
- índices;
- scope;
- DTO;
- errores;
- auditoría;
- compensación.

### Fase 2 — Migraciones

No autorizada hasta dictamen.

### Fase 3 — Backend

No autorizada hasta dictamen.

### Fase 4 — Gateway

No autorizada hasta dictamen.

### Fase 5 — Web Admin

No autorizada hasta dictamen.

### Fase 6 — Pruebas secuenciales

No autorizada hasta dictamen.

### Fase 7 — Concurrencia

No autorizada.

### Fase 8 — Integración y publicación

No autorizada.

---

## 27. Riesgos

| Riesgo | Impacto | Mitigación propuesta |
|---|---:|---|
| Dedupe global accidental | Alto | Scope obligatorio e índices |
| Fuga de referencia cruzada | Alto | Autorización previa a respuesta |
| Reuso incorrecto de clave | Alto | Fingerprint estable |
| Objeto R2 huérfano | Alto | Compensación + reconciliación |
| Documento sin objeto | Alto | R2 antes de transacción |
| Pérdida de auditoría | Alto | Outbox o garantía transaccional |
| Mezcla upload/OCR | Medio | Estados separados |
| Presión de memoria | Alto | Límite estricto e inspección Multer |
| Temporales abandonados | Medio | Limpieza solo si existen |
| Incompatibilidad frontend | Medio | Contrato y pruebas |
| Carrera concurrente | Alto | No probar antes del diseño |
| Migración bloqueante | Alto | Plan y validación previa |

---

## 28. Criterios de aceptación del diseño

El diseño podrá considerarse completo cuando exista:

- baseline aprobada;
- inventario exacto por archivo;
- modelo de operación;
- definición de `Idempotency-Key`;
- fingerprint;
- identidad canónica;
- índices;
- contrato multipart;
- DTO;
- catálogo de errores;
- flujo transaccional;
- compensación;
- auditoría;
- temporales/memoria;
- migración;
- compatibilidad Web Admin;
- pruebas;
- rollback;
- estimación;
- dictamen de implementación.

---

## 29. Decisiones pendientes del Maestro Intermedio

1. Rama base exacta.
2. Identidad canónica de workspace.
3. Identidad canónica de empresa.
4. Nombre y esquema de la operación técnica.
5. Retención de idempotencia.
6. Fingerprint exacto.
7. Índices y restricciones.
8. Compatibilidad del código de error de idempotencia.
9. Límite multipart.
10. MIME permitidos.
11. Estrategia memoria o disco.
12. Auditoría transaccional.
13. Alcance de reconciliación.
14. Migraciones.
15. Feature flag.
16. Compatibilidad Web Admin.
17. Plan secuencial de pruebas.
18. Criterios para autorizar concurrencia.
19. Plan de rollback.
20. GO de implementación.

---

## 30. Estado del entregable

```text
Diseño técnico:
ACTUALIZADO Y PREPARADO PARA REVISIÓN

Contrato:
APROBADO

Implementación:
NO AUTORIZADA

Migraciones:
NO AUTORIZADAS

Pruebas:
NO AUTORIZADAS

Concurrencia:
NO AUTORIZADA

Push:
NO AUTORIZADO

Sprint:
ABIERTO
```

---

## 31. Solicitud de dictamen

Se solicita al Maestro Intermedio:

1. revisar la baseline propuesta;
2. autorizar la inspección técnica del código y esquema;
3. validar el modelo conceptual de operación;
4. resolver identidades canónicas;
5. validar el diseño de idempotencia;
6. validar el orden transaccional;
7. validar compensación y auditoría;
8. validar la estrategia de temporales;
9. autorizar la elaboración del inventario exacto por archivo;
10. mantener bloqueada la implementación hasta nuevo GO.

No se solicita autorización para escribir código, ejecutar migraciones, realizar pruebas concurrentes ni publicar cambios.

---

# 32. Inspección técnica confirmada sobre la implementación vigente

## 32.1 Baseline inspeccionada

```text
Rama documental:
docs/sprint-2-1C-contrato-carga-documental-segura

HEAD documental:
117811b7

Baseline funcional de referencia:
feat/documental-v2-operacion-2-1B @ 178cf9db
```

La inspección se realizó exclusivamente en modo lectura.

No se ejecutaron:

- cambios de código;
- migraciones;
- pruebas;
- solicitudes concurrentes;
- `git add`;
- commit;
- push;
- merge;
- PR;
- rebase;
- cherry-pick.

---

## 32.2 Endpoint y flujo multipart vigentes

Rutas confirmadas:

```text
POST /documentos/carga-guiada/prevalidar
POST /documentos/carga-guiada
```

Gateway:

```text
apps/api-gateway/src/documentos/documentos.controller.ts
```

Microservicio:

```text
apps/ms-documentos/src/documentos/documentos.controller.ts
apps/ms-documentos/src/documentos/documentos-upload.service.ts
```

El flujo vigente es:

```text
Web Admin
→ FormData con file
→ API Gateway
→ FileFieldsInterceptor
→ file.buffer
→ nuevo FormData interno
→ ms-documentos
→ FileFieldsInterceptor
→ file.buffer
→ hash SHA-256
→ PutObject R2
```

### Hallazgo adicional

En `cargaGuiada`, el Gateway agrega el mismo binario dos veces:

```text
file
archivo
```

El microservicio utiliza:

```text
files?.file?.[0] ?? files?.archivo?.[0]
```

Por tanto, el envío doble es redundante y aumenta innecesariamente:

- tamaño del multipart interno;
- consumo de memoria;
- tráfico Gateway → `ms-documentos`;
- tiempo de serialización.

---

## 32.3 Estrategia de memoria y temporales

Se confirmó el uso de:

```text
file.buffer
```

No se encontraron configuraciones explícitas de:

```text
MulterModule
memoryStorage
diskStorage
limits
fileSize
```

Tampoco se encontró almacenamiento temporal en disco.

Conclusión:

```text
Estrategia vigente:
MEMORIA

UPLOAD_TMP_DIR:
NO APLICA AL FLUJO ACTUAL

Limpieza de temporales:
NO DEBE IMPLEMENTARSE
mientras no exista un cambio aprobado a almacenamiento en disco
```

El Gateway usa además:

```text
maxBodyLength: Infinity
maxContentLength: Infinity
```

Riesgo confirmado:

```text
Presión de memoria:
ALTA

Límite explícito de archivo:
NO ENCONTRADO

Límite explícito de memoria:
NO ENCONTRADO
```

---

## 32.4 Orden real de persistencia

El flujo real de `cargaGuiada()` es:

```text
1. validar presencia del buffer
2. normalizar empresa y datos funcionales
3. calcular SHA-256
4. buscar duplicados
5. validar documento principal activo
6. generar storage key
7. crear documento contenedor, si no existe documentoId
8. registrar evento documento.creado
9. ejecutar PutObject en R2
10. insertar documentos.documentos_archivos
11. registrar evento archivo.subido
12. responder
```

El documento contenedor se crea con:

```text
estado:
pendiente_ocr
```

y metadata que ya declara:

```text
storageProvider:
r2
```

antes de confirmar el `PutObject`.

### Brecha crítica

```text
Código vigente:
documento definitivo → evento → R2 → archivo → evento

Contrato aprobado:
reserva técnica → R2 → transacción documental → auditoría
```

Consecuencia posible ante fallo R2:

```text
documento creado
+
evento documento.creado
+
sin objeto R2
+
sin fila documentos_archivos
+
estado pendiente_ocr
+
metadata que afirma storageProvider=r2
```

---

## 32.5 Atomicidad

No existe `sql.begin()` alrededor del flujo completo de carga.

Las operaciones son independientes:

```text
INSERT documentos.documentos
INSERT documentos.documento_eventos
PutObject R2
INSERT documentos.documentos_archivos
INSERT documentos.documento_eventos
```

Conclusión:

```text
Atomicidad integral:
NO EXISTE

Atomicidad documento + archivo:
NO EXISTE

Atomicidad documento + archivo + auditoría:
NO EXISTE
```

---

## 32.6 Compensación y reconciliación

El servicio importa:

```text
PutObjectCommand
S3Client
```

No se encontró:

```text
DeleteObjectCommand
```

Conclusión:

```text
Compensación por DeleteObject:
NO IMPLEMENTADA

Estado requiere_reconciliacion:
NO IMPLEMENTADO

Reconciliación:
NO IMPLEMENTADA
```

Consecuencia posible:

```text
PutObject exitoso
+
fallo PostgreSQL posterior
→ objeto R2 huérfano
```

---

## 32.7 Deduplicación vigente

Consulta real:

```sql
WHERE da.hash_sha256 = :sha256
  AND da.estado <> 'duplicado_absorbido'
  AND (
    :documentoId IS NULL
    OR da.documento_id = :documentoId
    OR :expedienteId IS NULL
    OR ed.expediente_id = :expedienteId
  )
```

Cuando `documentoId` o `expedienteId` son nulos, la expresión agrupada puede quedar verdadera para cualquier coincidencia del hash.

En una carga nueva habitual:

```text
documentoId:
NULL

expedienteId:
puede ser NULL
```

Resultado:

```text
Deduplicación actual:
GLOBAL POR SHA-256 EN CASOS HABITUALES
```

No existen filtros por:

```text
workspaceId
empresaCodigo
clienteDestinoId
```

Brecha:

```text
Código vigente:
SHA-256 potencialmente global

Contrato:
workspace + empresa + SHA-256
```

Criticidad:

```text
CRÍTICA
```

---

## 32.8 Ámbito autenticado disponible

El Gateway obtiene del contexto autenticado:

```text
workspaceId
empresaCodigo
clienteDestinoId
```

Para la carga guiada, sobrescribe en el multipart:

```text
cliente
clienteAbreviatura
empresa
empresaCodigo
```

Sin embargo, `buildForwardHeaders()` solo reenvía:

```text
authorization
x-request-id
```

No reenvía en esta ruta:

```text
x-workspace-id
x-empresa-codigo
x-cliente-destino-id
Idempotency-Key
```

El controller interno de `ms-documentos` recibe únicamente:

```text
@UploadedFiles()
@Body()
```

Conclusión:

```text
empresa:
inyectada por Gateway en multipart

workspace:
NO DISPONIBLE EN DocumentosUploadService

clienteDestinoId:
NO GARANTIZADO COMO VALOR SOBRESCRITO POR EL GATEWAY

ámbito contractual completo:
NO DISPONIBLE ACTUALMENTE
```

---

## 32.9 Idempotencia

Se confirmó infraestructura para:

```text
x-request-id
requestId
```

No se encontró:

```text
Idempotency-Key
payload_fingerprint
tabla de operación
índice idempotente
reproducción de resultado
rechazo por payload distinto
```

Conclusión:

```text
Trazabilidad por requestId:
IMPLEMENTADA

Idempotencia funcional:
NO IMPLEMENTADA
```

---

## 32.10 Respuesta pública vigente

### Respuesta nominal actual

Incluye:

```text
archivoId
documentoId
filename
contentType
storageProvider
storageBucket
storageKey
estado
hashSha256
duplicadoAdvertencia
duplicados
```

### Respuesta de duplicado actual

Incluye:

```text
archivoId
documentoId
nombreArchivo
storageKey
expedienteId
tipoRelacion
esPrincipal
accionSugerida
```

### Brecha contractual

El contrato aprobado excluye:

```text
storageKey
storageBucket
storageProvider
metadata interna
detalles no autorizados
estado OCR
reconciliación
compensación interna
```

Además, el servicio no dispone del workspace para validar completamente el ámbito antes de devolver la referencia.

Riesgo:

```text
Exposición de información interna:
ALTO

Exposición cruzada entre ámbitos:
POSIBLE
```

---

## 32.11 Storage key vigente

Formato real:

```text
documentos/<año>/<mes>/<clienteAbreviatura>/<uuid>__<nombre-sanitizado>
```

Formato contractual:

```text
<ambito>/<año>/<mes>/<uuid>.<extension-validada>
```

Brechas:

- incorpora el nombre original sanitizado;
- no incorpora workspace;
- usa cliente como ámbito parcial;
- no utiliza extensión derivada de validación fuerte;
- no coincide con el formato contractual.

---

## 32.12 MIME y extensión

La función `inferContentType()`:

1. confía primero en `file.mimetype`;
2. solo usa extensión si `mimetype` está vacío;
3. acepta `application/octet-stream` como fallback.

No se encontró:

- inspección de firma o magic bytes;
- lista cerrada de MIME;
- validación de coherencia MIME/extensión;
- límite por tipo documental.

Conclusión:

```text
MIME declarado por cliente:
CONFIADO

MIME real:
NO VERIFICADO

Extensión validada:
NO CONFIRMADA
```

---

## 32.13 Esquema actual de documentos_archivos

Columnas confirmadas:

```text
id
documento_id
nombre_archivo
ruta_archivo
hash_sha256
tipo_version
area_origen
estado
creado_en
origen_archivo
observacion
metadata
storage_provider
storage_bucket
storage_key
public_url
version
es_version_actual
```

No existen:

```text
workspace_id
empresa_codigo
cliente_destino_id
idempotency_key
payload_fingerprint
estado_operacion
requiere_reconciliacion
```

Índice único confirmado:

```text
ux_documentos_archivos_un_actual
(documento_id)
WHERE es_version_actual = true
  AND documento_id IS NOT NULL
```

No se encontró:

```text
UNIQUE por hash_sha256
INDEX por hash_sha256
UNIQUE por workspace + empresa + hash
```

---

## 32.14 Auditoría vigente

`DocumentoEventosRepository` inserta en:

```text
documentos.documento_eventos
```

Campos relevantes:

```text
documento_id
archivo_id
tipo_evento
entidad_tipo
entidad_id
expediente_id
descripcion
metadata
usuario_id
origen
request_id
correlation_id
evento_version
```

Índices confirmados:

```text
idx_documento_eventos_documento_creado
idx_documento_eventos_archivo_creado
idx_documento_eventos_expediente_creado
idx_documento_eventos_tipo_creado
idx_documento_eventos_request_id
idx_documento_eventos_correlation_id
```

No se encontró índice único de idempotencia.

### Comportamiento del servicio

`DocumentoEventosService.registrarEvento()` captura los errores y solo registra una advertencia.

Por tanto:

```text
Fallo de evento:
NO ABORTA LA CARGA

Garantía transaccional:
NO EXISTE

Auditoría técnica obligatoria:
NO EXISTE

Mecanismo actual:
BEST-EFFORT
```

Además, la carga usa el mismo mecanismo funcional para:

```text
documento.creado
archivo.subido
```

Debe separarse:

```text
auditoría técnica de operación
≠
documento_eventos funcional
```

---

## 32.15 Web Admin vigente

Servicio central:

```text
apps/web-admin/src/services/carga-guiada.ts
```

El Web Admin:

- construye un `FormData`;
- adjunta `file`;
- envía datos funcionales;
- no genera `Idempotency-Key`;
- no conserva una clave entre reintentos;
- no implementa fingerprint;
- no distingue recuperación idempotente;
- no tiene tratamiento central específico de 409.

Hook:

```text
apps/web-admin/src/hooks/useCargaGuiada.ts
```

Actualmente delega directamente:

```text
subirDocumentoGuiado(payload, file)
```

Consumidores confirmados:

```text
apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx
apps/web-admin/src/components/compras/NuevoExpedienteWizard.tsx
apps/web-admin/src/components/almacen/AlmacenExpedienteEditor.tsx
apps/web-admin/src/components/finanzas/FinanzasExpedienteEditor.tsx
apps/web-admin/src/hooks/useCargaGuiada.ts
apps/web-admin/src/services/carga-guiada.ts
```

---

# 33. Matriz final de brechas confirmadas

| ID | Brecha | Evidencia | Criticidad |
|---|---|---|---:|
| B-01 | Dedupe global en casos habituales | SQL real de `buscarDuplicadosPorHash()` | Crítica |
| B-02 | Workspace no llega a `DocumentosUploadService` | Headers reales del Gateway | Crítica |
| B-03 | `Idempotency-Key` inexistente | Búsqueda de código | Alta |
| B-04 | Documento creado antes de R2 | Orden real de `cargaGuiada()` | Crítica |
| B-05 | `pendiente_ocr` antes de confirmar upload | `crearDocumentoContenedor()` | Alta |
| B-06 | Sin transacción integral | Flujo con operaciones independientes | Crítica |
| B-07 | Sin `DeleteObject` | Imports y servicio R2 | Alta |
| B-08 | Sin reconciliación | Modelo y código actual | Alta |
| B-09 | Auditoría best-effort | `registrarEvento()` captura errores | Alta |
| B-10 | Timeline funcional mezclado con trazabilidad técnica | `documento.creado` y `archivo.subido` | Media |
| B-11 | Respuesta expone `storageKey` | Payload nominal y duplicado | Alta |
| B-12 | Respuesta expone bucket/provider | Payload nominal | Media |
| B-13 | Sin límites explícitos de archivo | Interceptores y Axios | Alta |
| B-14 | Gateway duplica el binario | `file` + `archivo` | Media |
| B-15 | MIME confiado desde cliente | `inferContentType()` | Alta |
| B-16 | Storage key no coincide con contrato | Generación real | Media |
| B-17 | `documentos_archivos` sin ámbito | Baseline SQL | Crítica |
| B-18 | Sin índice por hash | Baseline SQL | Alta |
| B-19 | Web Admin sin idempotencia | Servicio y hook | Alta |
| B-20 | No existe operación técnica persistida | Esquema y código | Crítica |

---

# 34. Inventario exacto de archivos afectados

## 34.1 Backend y Gateway

| Archivo | Cambio mínimo propuesto | Motivo |
|---|---|---|
| `apps/api-gateway/src/documentos/documentos.controller.ts` | Propagar `Idempotency-Key`, workspace, empresa y cliente destino; eliminar duplicación del binario; aplicar límites | Aislamiento, idempotencia y memoria |
| `apps/ms-documentos/src/documentos/documentos.controller.ts` | Recibir headers técnicos y construir contexto de carga | Evitar confiar en body |
| `apps/ms-documentos/src/documentos/documentos-upload.service.ts` | Reordenar flujo, dedupe por ámbito, reserva, compensación, respuesta mínima | Núcleo contractual |
| `apps/ms-documentos/src/documentos/documentos.module.ts` | Registrar repositorio/servicios nuevos | Composición |
| `apps/ms-documentos/src/config/configuration.ts` | Límites y retención idempotente | Configuración |
| `apps/ms-documentos/src/documento-eventos/documento-eventos.service.ts` | No usar como única auditoría obligatoria | Separación técnica/funcional |
| `apps/ms-documentos/src/documento-eventos/documento-eventos.repository.ts` | Evaluar integración transaccional u outbox | Garantía |
| `packages/shared/src/constants/headers.ts` | Definir constante de `Idempotency-Key` | Consistencia |
| nuevo repositorio de operaciones | Persistir reserva e idempotencia | Contrato |
| nueva migración | Tabla, índices y restricciones | Persistencia |

## 34.2 Web Admin

| Archivo | Cambio mínimo propuesto | Motivo |
|---|---|---|
| `apps/web-admin/src/services/carga-guiada.ts` | Aceptar/enviar clave idempotente; mapear 409 | Contrato cliente |
| `apps/web-admin/src/hooks/useCargaGuiada.ts` | Mantener clave durante reintentos | Recuperación segura |
| `apps/web-admin/src/types/carga-guiada.ts` | DTO de éxito/duplicado/error | Tipado |
| `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx` | Manejo visual de duplicado | UX |
| `apps/web-admin/src/components/compras/NuevoExpedienteWizard.tsx` | Reintento seguro y 409 | UX |
| `apps/web-admin/src/components/almacen/AlmacenExpedienteEditor.tsx` | Manejo 409 | UX |
| `apps/web-admin/src/components/finanzas/FinanzasExpedienteEditor.tsx` | Manejo 409 | UX |

## 34.3 Pruebas

Se requerirán, como mínimo:

```text
documentos-upload.service.spec.ts
documentos.controller.spec.ts
documentos gateway controller spec
servicio Web Admin
hook de carga
integración PostgreSQL/R2 simulada
```

Los nombres definitivos dependerán de la estructura existente.

---

# 35. Diseño técnico recomendado a partir de la inspección

## 35.1 Operación técnica separada

Se recomienda una tabla nueva, nombre candidato:

```text
documentos.carga_operaciones
```

La tabla deberá contener:

```text
id
workspace_id
empresa_codigo
cliente_destino_id
idempotency_key
payload_fingerprint
hash_sha256
request_id
actor_id
estado
storage_bucket
storage_key
documento_id
archivo_id
error_code
error_detail_internal
requiere_reconciliacion
creado_en
actualizado_en
completado_en
expira_en
```

Nombre y tipos pendientes de aprobación.

## 35.2 Restricciones candidatas

```text
UNIQUE (
  workspace_id,
  empresa_codigo,
  idempotency_key
)
```

Para la deduplicación:

```text
INDEX (
  workspace_id,
  empresa_codigo,
  hash_sha256
)
```

Debe definirse si la deduplicación se garantiza mediante:

- restricción única en operación completada;
- restricción parcial;
- índice + locking;
- tabla de archivos con columnas de ámbito;
- combinación de operación y archivo.

No se autoriza concurrencia hasta resolverlo.

## 35.3 Flujo revisado

```text
1. recibir archivo y headers autenticados
2. validar permiso y ámbito
3. validar tamaño, MIME y extensión
4. calcular SHA-256
5. calcular fingerprint
6. verificar Idempotency-Key
7. verificar duplicado por workspace + empresa + hash
8. crear reserva técnica
9. generar storage key
10. PutObject
11. verificar R2
12. abrir transacción PostgreSQL
13. crear documento, si corresponde
14. registrar archivo
15. registrar auditoría/outbox
16. confirmar transacción
17. completar operación
18. responder
```

Ante fallo posterior a R2:

```text
DeleteObject
```

Si falla:

```text
requiere_reconciliacion
```

---

# 36. Decisiones que todavía requieren dictamen

Aunque la inspección ya está completa para esta fase, aún deben aprobarse:

1. nombre definitivo de la tabla de operación;
2. esquema;
3. tipos de columnas;
4. retención de idempotencia;
5. fingerprint exacto;
6. estrategia de dedupe bajo concurrencia;
7. relación entre operación y archivo;
8. identidad canónica exacta de empresa;
9. uso de `clienteDestinoId` dentro del ámbito;
10. límite máximo de archivo;
11. MIME permitidos;
12. estrategia de magic bytes;
13. formato final de storage key;
14. mecanismo de auditoría transaccional;
15. alcance de outbox;
16. política de reconciliación;
17. feature flag;
18. compatibilidad exacta con Web Admin;
19. estrategia de migración;
20. GO de implementación.

---

# 37. Estado actualizado del entregable

```text
Inspección técnica:
COMPLETADA PARA DISEÑO PRELIMINAR

Baseline:
CONFIRMADA

Código actual:
INSPECCIONADO

Esquema actual:
INSPECCIONADO

Gateway:
INSPECCIONADO

Web Admin:
INSPECCIONADO

Inventario por archivo:
PREPARADO

Brechas:
CONFIRMADAS

Diseño técnico:
LISTO PARA REVISIÓN DEL MAESTRO INTERMEDIO

Implementación:
NO AUTORIZADA

Migraciones:
NO AUTORIZADAS

Pruebas:
NO AUTORIZADAS

Concurrencia:
NO AUTORIZADA

Push:
NO AUTORIZADO
```

---

# 38. Solicitud de revisión

Se solicita al Maestro Intermedio revisar:

- baseline;
- matriz de veinte brechas;
- operación técnica propuesta;
- persistencia de idempotencia;
- aislamiento;
- reordenamiento R2/PostgreSQL;
- compensación;
- auditoría;
- límites de memoria;
- inventario exacto por archivo;
- impacto en Web Admin;
- decisiones aún pendientes.

No se solicita autorización de implementación.
