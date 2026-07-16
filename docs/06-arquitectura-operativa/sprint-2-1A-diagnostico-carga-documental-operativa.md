# Sprint 2.1A — Diagnóstico End-to-End de Carga Documental Operativa

## 1. Estado del sprint

```text
Fase:
FASE II — Evolución funcional controlada

Baseline:
v2-rc4.3

Naturaleza:
Diagnóstico arquitectónico y funcional

Implementación:
NO AUTORIZADA

Backend:
SIN CAMBIOS

Gateway:
SIN CAMBIOS

React:
SIN CAMBIOS

PostgreSQL:
SIN MIGRACIONES

Runtime:
SOLO VALIDACIÓN / OBSERVACIÓN
```

Este sprint no implementa nuevas capacidades. Su finalidad es diagnosticar el estado real del flujo documental operativo desde la existencia del expediente hasta la carga, validación, asociación y visualización documental en Workspace.

---

## 2. Objetivo

Diagnosticar el flujo documental operativo end-to-end:

```text
Expediente / Contexto Operativo
  ↓
Documento Operativo Principal
  ↓
Carga segura del archivo
  ↓
Validaciones
  ↓
Almacenamiento
  ↓
OCR
  ↓
Confirmación documental
  ↓
Agrupación documental
  ↓
Workspace
```

El objetivo es identificar:

- qué existe;
- qué funciona correctamente;
- qué funciona parcialmente;
- qué está desacoplado;
- qué debe diseñarse antes de implementar.

---

## 3. Principios permanentes aplicables

Se mantienen los principios institucionalizados en la Fase I:

```text
React representa.
React no autoriza.
Gateway propaga.
Backend decide.
Workspace contextualiza.
Visibilidad no equivale a autorización.

Nunca exponer tablas internas.
Nunca exponer JSONB crudo.
Nunca acoplar React a persistencia.
Nunca construir lógica de negocio en frontend.
Toda API pública representa dominio, no implementación física.
```

---

## 4. Principios adicionales de Fase II

Para el flujo de carga documental operativa se incorporan como criterios de diagnóstico:

```text
Ningún archivo será almacenado en R2 sin validación previa del backend.
```

Y:

```text
Toda carga documental deberá verificar:

1. duplicado físico por hash;
2. duplicado documental por identidad documental;

antes de crear un nuevo archivo o documento operativo.
```

Estos principios se documentan como criterios de Fase II. Su implementación queda fuera del Sprint 2.1A.

---

## 5. Evidencia 1 — Seed de expedientes BBTI / BBTEC

Se cargó data inicial limpia de expedientes para BBTI y BBTEC.

Resultado validado:

```text
empresa_codigo | cliente_destino_id | total_expedientes
---------------+--------------------+-------------------
BBTEC          | 1                  | 7
BBTI           | 2                  | 109
```

Validación de códigos vacíos:

```text
codigo_expediente vacío o NULL: 0
```

Conclusión:

```text
Seed de expedientes validado.
No hay códigos vacíos.
No se reportaron duplicados funcionales.
```

---

## 6. Evidencia 2 — Expedientes por SQL

Se validaron registros iniciales después del seed:

```text
BBTEC 010101 ADMINISTRACION
BBTEC 020101 VENTAS
BBTEC 030101 UNACEM LIMA
BBTEC 040102 UNACEM TARMA
BBTEC 050101 CEMENTOS PACASMAYO - PACASMAYO
BBTEC 050102 CEMENTOS PACASMAYO - PIURA
BBTEC 060102 PROYECTOS MENORES

BBTI 010101 ADMINISTRACION
BBTI 020103 VENTA DE MERCADERIAS
BBTI 030101 UNACEM TARMA (SERVICIOS)
BBTI 030103 UNACEM LIMA (SERVICIOS)
BBTI 040101 PROTISA
BBTI 040102 TEXTILES PACIFICO
BBTI 040103 UNIVERSIDAD DE PIURA
BBTI 040107 PROYECTO MENOR
BBTI 0501   COSTOS DE PRODUCCION
```

Conclusión:

```text
La data maestra inicial de expedientes quedó disponible para diagnóstico operativo.
```

---

## 7. Evidencia 3 — Listado por API Gateway

Endpoint validado:

```http
GET /api/v1/expedientes
```

Resultado con workspace BBTI:

```text
success: true
total: 109
empresa: BBTI
cliente_destino_id: 2
cliente: BBTI S.A.C.
```

Resultado con usuario Compras:

```text
success: true
total: 109
```

Conclusión:

```text
El listado de expedientes vía Gateway funciona para Contabilidad y Compras dentro del workspace BBTI.
```

---

## 8. Evidencia 4 — Búsqueda de expedientes

Endpoint validado:

```http
GET /api/v1/expedientes/buscar?q=010101
```

Resultado:

```text
total: 1
codigoExpediente: 010101
descripcion: ADMINISTRACION
empresaCodigo: BBTI
clienteDestinoId: 2
documentoPrincipal: null
documentosLista: []
documentosAdjuntos: []
```

Observación:

```text
El parámetro funcional validado es q.
No funcionan como búsqueda equivalente:
- codigo
- termino
```

Gap detectado:

```text
GAP 2.1A-BUSQUEDA-001:
Debe documentarse el contrato real de búsqueda para evitar uso incorrecto desde frontend.
```

---

## 9. Evidencia 5 — Mantenimiento contable de expedientes

Endpoint validado:

```http
GET /api/v1/expedientes/mantenimiento/:id
```

Con usuario Contabilidad:

```text
success: true
tieneDocumentoPrincipal: false
totalDocumentos: 0
```

Con usuario Compras:

```text
403 FORBIDDEN
Solo administración o contabilidad puede acceder al mantenimiento de expedientes
```

Conclusión:

```text
El mantenimiento contable de expedientes está restringido a administración o contabilidad.
Compras no debe usar la ruta de revisión contable para operar expedientes.
```

Gap detectado:

```text
GAP 2.1A-UX-001:
Compras requiere un flujo operativo propio para seleccionar contexto/centro de costo y registrar Documento Operativo Principal, sin entrar al mantenimiento contable.
```

---

## 10. Evidencia 6 — Documento Principal V2

Se revisó la existencia de soporte backend/Gateway para Documento Principal dentro del Modelo Documental V2.

Endpoints encontrados en API Gateway:

```http
GET  /api/v1/documental-v2/documentos-candidatos-principal
POST /api/v1/documental-v2/documentos-operativos-principales/asociar
```

Soporte en `ms-documentos`:

```text
apps/ms-documentos/src/documental-v2/use-cases/asociar-documento-principal-v2.usecase.ts
```

El flujo existente contempla:

- normalización de `tipoPrincipal`;
- validación de tipos permitidos;
- validación de coincidencia entre `tipoPrincipal` y `tipoDocumental`;
- validación de documento ya asociado;
- validación de documento principal en otro contexto;
- creación de `documentos.documentos_operativos_principales`;
- auditoría operativa.

Estado:

```text
Documento Principal V2:
SOPORTE BACKEND EXISTENTE

Gateway:
SOPORTE EXISTENTE

Flujo React/Compras:
PENDIENTE

Relación expediente actual → contenedor_operativo:
PENDIENTE / GAP CONFIRMADO
```

---

## 11. Evidencia 7 — Contenedor Operativo para expedientes migrados

Se validó la tabla:

```sql
SELECT id, empresa_codigo, cliente_destino_id, tipo_contexto, codigo, estado
FROM documentos.contenedores_operativos
ORDER BY id
LIMIT 50;
```

Resultado:

```text
id 1 | BBTI | 2 | centro_costo_op | TEST-V2-001 | activo
id 2 | BBTI | 2 | expediente_v1   | 900003      | activo
```

Conteo total:

```text
documentos.contenedores_operativos: 2
```

Luego se validó el Workspace V2 para expediente migrado `id = 16`:

```http
GET /api/v1/documental-v2/workspace/expedientes-v1/16
```

Resultado relevante:

```text
contenedorOperativo.estadoPersistencia: no_persistido
contenedorOperativo.persistido: null
documentosOperativosPrincipales: []
gruposFactura: []
adjuntosNoClasificados: []
```

Advertencias:

```text
EXPEDIENTE_V1_SIN_DOCUMENTO_PRINCIPAL
EXPEDIENTE_V1_SIN_FACTURA
```

Conclusión:

```text
El Workspace V2 puede representar expedientes V1 mediante V1V2CompatibilityAdapter, pero los expedientes migrados no cuentan automáticamente con un contenedor_operativo persistido.
```

### GAP 2.1A-001

```text
Expediente V1 visible en Workspace V2 no equivale a contenedor operativo V2 persistido.
```

Impacto:

```text
Para asociar Documento Principal V2 se requiere contenedorOperativoId.
En expedientes migrados como el id 16, el Workspace no entrega un contenedorOperativoId persistido.
```

Recomendación preliminar:

```text
Expediente nuevo:
crear contenedor_operativo persistido desde backend.

Expediente migrado:
materializar contenedor_operativo al iniciar operación documental controlada.

React:
no crea contenedores directamente.
```

---

## 12. Evidencia 8 — Creación de expedientes

Se buscó soporte para creación de expedientes en API Gateway y ms-documentos.

Resultado relevante:

```text
apps/api-gateway/src/expedientes/expedientes.controller.ts:
No tienes permiso para crear expedientes en la empresa ...
No tienes permiso para crear expedientes en otro cliente destino
```

Conclusión parcial:

```text
Existe lógica en API Gateway relacionada con creación de expedientes y validación de permisos por empresa / cliente destino.
```

Pendiente diagnosticado:

- ruta exacta del endpoint;
- método HTTP;
- payload requerido;
- validaciones aplicadas;
- servicio destino en ms-documentos;
- si crea únicamente `documentos.expedientes`;
- si también crea/materializa `documentos.contenedores_operativos`;
- si registra auditoría;
- si respeta workspace y permisos del JWT.

---

## 13. Evidencia 8.1 — Scope de creación de expedientes en Gateway

Se encontró la función:

```ts
buildWorkspaceScopedExpedienteBody(body, payload)
```

Comportamiento detectado:

- obtiene `empresaCodigo` desde el token/workspace;
- obtiene `clienteDestinoId` desde el token/workspace;
- rechaza la operación si el token no tiene empresa válida;
- rechaza la operación si el token no tiene cliente destino válido;
- impide crear expedientes en una empresa distinta a la del workspace;
- impide crear expedientes en otro cliente destino;
- fuerza en el body final:
  - `empresaCodigo`;
  - `clienteDestinoId`.

Conclusión:

```text
La creación de expedientes no depende únicamente del body enviado por React. El Gateway aplica scope de workspace y evita que el frontend fuerce otra empresa o cliente destino.
```

---

## 14. Evidencia 8.2 — Persistencia al crear expedientes

Se revisaron métodos de persistencia relacionados con creación de expedientes.

### Método `createMantenimiento`

Archivo:

```text
apps/ms-documentos/src/expedientes/expedientes.repository.ts
```

Comportamiento detectado:

- inserta en `documentos.expedientes`;
- registra `creado_por`;
- registra `actualizado_por`;
- retorna el expediente creado mediante `findMantenimientoById`;
- registra auditoría de mantenimiento con acción `expediente.creado`.

No se encontró creación de `documentos.contenedores_operativos`.

### Método `create`

Archivo:

```text
apps/ms-documentos/src/expedientes/expedientes.repository.ts
```

Comportamiento detectado:

- valida existencia previa por `empresa_codigo + codigo_expediente`;
- si existe, retorna `yaExistia: true`;
- si no existe, inserta en `documentos.expedientes`.

No se encontró creación de `documentos.contenedores_operativos`.

### Creación desde OCR

Archivo:

```text
apps/ms-documentos/src/documentos/documentos.repository.ts
```

Comportamiento detectado:

- busca expediente existente por `codigo_expediente + empresa_codigo`;
- si no existe, inserta en `documentos.expedientes`;
- si el OCR tiene `documento_id`, vincula el documento al expediente en `documentos.expediente_documentos`;
- puede marcar el vínculo como `esPrincipal: true`.

No se encontró creación de `documentos.contenedores_operativos`.
No se encontró creación de `documentos.documentos_operativos_principales`.

### GAP 2.1A-002

```text
Crear expediente hoy no deja el Workspace V2 listo para operación persistida.
```

Conclusión:

```text
La creación actual de expedientes pertenece al modelo V1 operativo. El Workspace puede representarlo mediante adaptador, pero no queda creado un contenedor V2 persistido para operación.
```

---

## 15. Evidencia 8.3 — Servicio de Contenedor Operativo V2

Se revisó la infraestructura backend existente para `contenedor_operativo`.

Archivos revisados:

```text
apps/ms-documentos/src/documental-v2/contenedor-operativo.repository.ts
apps/ms-documentos/src/documental-v2/contenedor-operativo.service.ts
```

El repository contiene soporte para:

- crear contenedor operativo;
- buscar por id;
- buscar por clave;
- listar contenedores;
- actualizar;
- anular.

El método `crear()` inserta en:

```text
documentos.contenedores_operativos
```

La búsqueda por clave utiliza:

```text
empresa_codigo
tipo_contexto
codigo
```

El service valida existencia activa con la misma clave antes de crear.

### GAP 2.1A-003

```text
El servicio de contenedor_operativo existe, pero no está conectado al flujo actual de creación de expedientes.
```

---

## 16. Evidencia 8.4 — Exposición de Contenedores Operativos por Gateway

Se revisaron los controllers de Documental V2 en `ms-documentos` y `api-gateway`.

### ms-documentos

Existen endpoints internos para:

```http
POST  /documental-v2/contenedores
GET   /documental-v2/contenedores
GET   /documental-v2/contenedores/buscar
GET   /documental-v2/contenedores/:id
PATCH /documental-v2/contenedores/:id
POST  /documental-v2/contenedores/:id/anular
```

### API Gateway

En Gateway se confirmó exposición para:

```http
GET  /api/v1/documental-v2/documentos-candidatos-principal
POST /api/v1/documental-v2/documentos-operativos-principales/asociar
GET  /api/v1/documental-v2/facturas-candidatas
GET  /api/v1/documental-v2/trazabilidad/contenedores/:contenedorOperativoId
```

No se confirmó exposición pública Gateway para:

```http
POST /api/v1/documental-v2/contenedores
GET  /api/v1/documental-v2/contenedores
GET  /api/v1/documental-v2/contenedores/buscar
```

### GAP 2.1A-004

```text
Existe soporte interno para contenedores_operativos en ms-documentos, pero no existe exposición pública equivalente por API Gateway.
```

Impacto:

```text
React no tiene una vía pública válida para materializar un contenedor operativo V2 desde un expediente V1.
Por principio arquitectónico, React no debe llamar directo a ms-documentos.
```

Recomendación preliminar:

```http
POST /api/v1/documental-v2/workspace/expedientes-v1/:expedienteId/materializar-contenedor
```

o una operación equivalente definida formalmente por backend/Gateway.

---

## 17. Evidencia 8.5 — Gateway y contenedores operativos

Se ejecutó búsqueda de rutas relacionadas con `contenedores` y `materializar`.

Resultado:

```text
api-gateway:
solo se confirmó trazabilidad por contenedor.

ms-documentos:
sí contiene CRUD interno de contenedores.
```

Conclusión:

```text
El gap no es falta de repository/service. El gap es exposición controlada por Gateway y conexión con el flujo operativo de expedientes.
```

---

## 18. Evidencia 8.6 — Error inicial en candidatos para Documento Principal

Se probó el endpoint público Gateway:

```http
GET /api/v1/documental-v2/documentos-candidatos-principal?empresaCodigo=BBTI
```

con token de usuario Compras.

Resultado inicial:

```text
success: false
code: INTERNAL_SERVER_ERROR
message: Error interno del servidor
```

Logs de `ms-documentos`:

```text
UNDEFINED_VALUE: Undefined values are not allowed
```

Conclusión:

```text
El error no correspondía a permisos ni a token inválido. El endpoint llegaba hasta ms-documentos, pero internamente se estaba enviando un valor undefined a SQL.
```

---

## 19. Evidencia 8.7 — Parámetro obligatorio `tipoPrincipal`

Se revisó el endpoint interno:

```http
GET /documental-v2/documentos-candidatos-principal
```

El método `listarCandidatosPrincipal` espera:

```ts
empresaCodigo: string;
tipoPrincipal: string;
q?: string;
estado?: string;
limit?: number;
```

Dentro del SQL se usa:

```ts
d.cliente_abreviatura = ${input.empresaCodigo}
AND d.tipo_documental = ${input.tipoPrincipal}
```

Hallazgo:

```text
Cuando se llama solo con ?empresaCodigo=BBTI, tipoPrincipal llega como undefined.
Esto provoca UNDEFINED_VALUE en SQL.
```

### GAP 2.1A-006

```text
El endpoint de candidatos para Documento Principal requiere tipoPrincipal, pero actualmente no valida su ausencia como 400 BAD_REQUEST.
```

Comportamiento actual:

```text
Falta tipoPrincipal
→ error interno 500
```

Comportamiento esperado:

```text
Falta tipoPrincipal
→ 400 BAD_REQUEST
→ mensaje: tipoPrincipal es obligatorio
```

---

## 20. Evidencia 8.8 — Validación runtime de candidatos para Documento Principal

Se validó nuevamente el endpoint público Gateway enviando `tipoPrincipal`.

### Caso OC

Request:

```http
GET /api/v1/documental-v2/documentos-candidatos-principal?empresaCodigo=BBTI&tipoPrincipal=OC
```

Resultado:

```text
success: true
data: 6 documentos candidatos
```

Candidatos observados:

```text
910015 → OC-900010 → yaEsPrincipalV2: false
910011 → OC-900005 → yaEsPrincipalV2: false
910005 → OC-900004 → yaEsPrincipalV2: true
910003 → OC-900002 → yaEsPrincipalV2: true
910001 → OC-900001 → yaEsPrincipalV2: true
1      → 007950    → yaEsPrincipalV2: true
```

### Caso OS

Request:

```http
GET /api/v1/documental-v2/documentos-candidatos-principal?empresaCodigo=BBTI&tipoPrincipal=OS
```

Resultado:

```text
success: true
data: []
```

Conclusión:

```text
El endpoint soporta el filtro OS, pero no existe data candidata OS en el dataset actual.
```

### Caso REQUERIMIENTO_COMPRA

Request:

```http
GET /api/v1/documental-v2/documentos-candidatos-principal?empresaCodigo=BBTI&tipoPrincipal=REQUERIMIENTO_COMPRA
```

Resultado:

```text
success: true
data: []
```

Conclusión:

```text
El endpoint no falla con REQUERIMIENTO_COMPRA, pero no existe data candidata en el dataset actual.
Debe confirmarse si este tipo será soportado oficialmente como Documento Operativo Principal en Fase II.
```

Estado:

```text
Candidatos OC:
VALIDADO

Candidatos OS:
ENDPOINT OK / SIN DATA

Candidatos REQUERIMIENTO_COMPRA:
ENDPOINT OK / SIN DATA

Bug de validación cuando falta tipoPrincipal:
PENDIENTE PARA IMPLEMENTACIÓN FUTURA
```

---

## 21. Evidencia 8.9 — Documentos Operativos Principales persistidos

Se validó la tabla:

```sql
SELECT id, contenedor_operativo_id, documento_id, tipo_principal, estado
FROM documentos.documentos_operativos_principales
ORDER BY id;
```

Resultado:

```text
id 1 | contenedor 1 | documento 1      | OC | activo
id 2 | contenedor 1 | documento 910003 | OC | activo
id 3 | contenedor 2 | documento 910001 | OC | activo
id 4 | contenedor 2 | documento 910005 | OC | activo
```

Conclusión:

```text
Existen Documentos Operativos Principales V2 persistidos.
Los contenedores 1 y 2 ya tienen documentos principales activos.
```

Observación funcional:

```text
El sistema actual permite más de un Documento Operativo Principal activo por contenedor.
```

Esta observación no se toma como regla normativa por sí sola, porque los contenedores revisados pertenecen a data histórica/sandbox.

---

## 22. Evidencia 8.10 — Workspace expediente 41 sin principales persistidos

Se validó:

```http
GET /api/v1/documental-v2/workspace/expedientes-v1/41
```

Resultado:

```text
documentosOperativosPrincipales: 0
documentosOperativosPrincipalesPersistidos: 0
gruposFactura: 0
gruposFacturaPersistidos: 0
documentosGrupoFactura: 0
documentosGrupoFacturaPersistidos: 0
adjuntosNoClasificados: 0
advertencias: 2
```

Conclusión:

```text
El expediente 41 actual no resuelve hacia el contenedor_operativo 2 ni hacia sus Documentos Operativos Principales.
```

---

## 23. Evidencia 8.11 — Contenedor V2 histórico desacoplado de expediente actual

Se validó si existía un expediente V1 actual con código `900003` o `TEST-V2-001`.

Consulta:

```sql
SELECT id, empresa_codigo, cliente_destino_id, codigo_expediente, descripcion, estado
FROM documentos.expedientes
WHERE codigo_expediente IN ('900003','TEST-V2-001')
ORDER BY id;
```

Resultado:

```text
0 filas
```

Sin embargo, el contenedor operativo V2 `id = 2` sí existe:

```text
contenedor_operativo_id: 2
tipo_contexto: expediente_v1
codigo: 900003
```

y tiene Documentos Operativos Principales activos:

```text
documento_id 910001 | OC | activo
documento_id 910005 | OC | activo
```

También posee trazabilidad canónica:

```text
ASOCIAR_DOCUMENTO_PRINCIPAL
GRUPO_FACTURA_CREADO
DOCUMENTO_GRUPO_FACTURA_ASOCIADO
```

### GAP 2.1A-008

```text
Los contenedores V2 históricos pueden quedar desacoplados de los expedientes actuales después de un reseed o migración.
```

Conclusión:

```text
El contenedor V2 id = 2 corresponde a data histórica/sandbox de Fase I y ya no tiene expediente V1 equivalente en la data actual de documentos.expedientes.
No debe utilizarse como evidencia normativa del modelo de negocio.
```

---

## 24. Decisión funcional — Cardinalidad de Documento Operativo Principal

Durante el diagnóstico se aclaró la cardinalidad entre Contexto Operativo y Documento Operativo Principal.

### Regla de negocio adoptada

Un Contexto Operativo puede dar soporte a múltiples flujos documentales independientes, cada uno iniciado por su propio Documento Operativo Principal.

El Modelo Documental V2 vigente permite actualmente que un Contexto Operativo tenga múltiples Documentos Operativos Principales activos. No obstante, el Sprint 2.1A verificará si la representación física actual refleja correctamente esa realidad funcional o si requiere una formalización futura mediante una Decisión Arquitectónica.

### Interpretación para análisis funcional

Una nueva OC/OS/Requerimiento dentro del mismo Contexto Operativo se interpretará, para efectos del análisis funcional, como el inicio de una nueva unidad lógica de trabajo.

No se afirmará durante este sprint que exista una entidad física, tabla, agregado o contrato llamado “operación documental”.

La jerarquía funcional se usará únicamente como hipótesis de análisis:

```text
Contexto Operativo
  → N unidades lógicas de trabajo
      → Documento Operativo Principal
          → N Grupos de Factura
              → N Documentos asociados
```

### Documento Principal obligatorio

La regla “Documento Principal obligatorio” significa que no se deben adjuntar documentos a un flujo documental que aún no tenga un Documento Operativo Principal asociado.

Por tanto:

```text
Factura / Guía / Nota de Ingreso / Transferencia / Detracción
sin OC / OS / Requerimiento de Compra asociado
=
NO PERMITIDO
```

### Reemplazo controlado

El reemplazo de principal queda reservado para un sprint futuro de corrección controlada.

Ejemplo:

```text
Se vinculó por error la OC 007950
y debía ser la OC 007951.
```

Ese caso no equivale a registrar una nueva OC legítima dentro del mismo Contexto Operativo.

### GAP 2.1A-009

Debe diagnosticarse si la estructura actual:

```text
documentos.documentos_operativos_principales
```

representa suficientemente la unidad lógica de trabajo o si, en una fase posterior, será conveniente formalizar una entidad explícita mediante Decisión Arquitectónica.

---

## 25. Criterio metodológico

El diagnóstico del Sprint 2.1A deberá distinguir expresamente entre:

- reglas de negocio ya consolidadas;
- comportamiento observado en la implementación actual;
- hipótesis de evolución del modelo.

Ninguna hipótesis identificada durante el diagnóstico modificará el Modelo Documental V2 sin una Decisión Arquitectónica aprobada posteriormente.

Durante el Sprint 2.1A se documentarán observaciones y recomendaciones. Ninguna recomendación tendrá carácter normativo hasta ser evaluada y aprobada mediante el proceso formal de Decisiones Arquitectónicas del proyecto.

---

## 26. Matriz de capacidades observadas

| Capacidad | Estado observado | Diagnóstico |
|---|---:|---|
| Seed de expedientes BBTI/BBTEC | Validado | Data limpia para diagnóstico |
| Listado de expedientes por Gateway | Validado | Funciona en BBTI |
| Búsqueda de expedientes | Parcial | `q` funciona; `codigo`/`termino` no equivalentes |
| Mantenimiento contable | Validado | Contabilidad/admin sí; Compras 403 esperado |
| Workspace V2 lectura desde expediente V1 | Validado | Usa adaptador V1/V2 |
| Contenedor persistido para expedientes migrados | Pendiente | Expedientes actuales aparecen `no_persistido` |
| Crear expediente | Parcial | Crea V1; no crea contenedor V2 |
| Servicio interno de contenedor operativo | Existente | Disponible en ms-documentos |
| Gateway para contenedores | No expuesto | Solo trazabilidad por contenedor |
| Candidatos Documento Principal OC | Validado | Devuelve data |
| Candidatos Documento Principal OS | Validado sin data | Endpoint OK, dataset sin OS |
| Candidatos Requerimiento Compra | Validado sin data | Endpoint OK, soporte normativo pendiente |
| Validación faltante de `tipoPrincipal` | Bug detectado | Falta 400 cuando no se envía |
| Documentos Operativos Principales persistidos | Existente | Data histórica/sandbox |
| Trazabilidad por contenedor | Validada | Contenedor 2 tiene eventos canónicos |
| Unidad lógica de trabajo | Hipótesis | Requiere diagnóstico y posible DA futura |

---

## 27. Riesgos identificados

### Riesgos técnicos

- Expedientes V1 nuevos o migrados pueden quedar visibles en Workspace V2 sin contenedor V2 persistido.
- Contenedores V2 históricos pueden quedar desacoplados de expedientes actuales después de reseed/migración.
- Gateway no expone operación pública para materializar contenedor operativo.
- El endpoint de candidatos falla con 500 si falta `tipoPrincipal`.
- El contrato de búsqueda de expedientes no está suficientemente explícito.

### Riesgos funcionales

- Compras puede listar expedientes, pero no tiene flujo operativo propio para registrar Documento Operativo Principal.
- El mantenimiento contable no debe reutilizarse como flujo de Compras.
- Puede confundirse Contexto Operativo con una operación documental individual.
- Puede interpretarse incorrectamente que existe una entidad física “operación documental”.
- Requerimiento de Compra aún no tiene evidencia de data candidata ni soporte funcional confirmado.

---

## 28. Recomendación preliminar de división en sprints futuros

Sin autorizar implementación durante 2.1A, el diagnóstico sugiere dividir la Fase II en capacidades acotadas:

```text
2.1B — Materialización controlada de contenedor operativo desde expediente V1
2.1C — Flujo de Compras para seleccionar contexto y asociar Documento Operativo Principal
2.1D — Validaciones explícitas de candidatos y contrato de búsqueda
2.1E — Upload seguro vía Gateway/backend con validación previa y hash
2.1F — Validación de duplicado físico y duplicado documental
2.1G — Adjuntos documentales por tipo y por perfil
2.1H — OCR / confirmación documental / agrupación operativa
```

El orden definitivo debe aprobarse después de cerrar el diagnóstico 2.1A.

---

## 29. Estado parcial del diagnóstico

```text
Expedientes:
VALIDADO

Gateway:
VALIDADO PARA LISTADO / BÚSQUEDA PARCIAL / CANDIDATOS PRINCIPAL

Web Admin listado:
VALIDADO

Contabilidad mantenimiento:
VALIDADO

Compras listado:
VALIDADO

Compras mantenimiento:
403 ESPERADO

Workspace V2 lectura:
VALIDADO

Contenedor V2 para expedientes actuales:
NO PERSISTIDO

Documento Principal:
SOPORTE EXISTENTE

Candidatos OC:
VALIDADO

Adjuntos:
PENDIENTE DE DIAGNÓSTICO

Upload:
PENDIENTE DE DIAGNÓSTICO

R2:
PENDIENTE DE DIAGNÓSTICO

Duplicado físico:
PENDIENTE DE DIAGNÓSTICO

Duplicado documental:
PENDIENTE DE DIAGNÓSTICO
```

---

## 30. Hallazgo provisional — Transición expediente → contenedor → principal

El diagnóstico confirma que la plataforma base de la Fase I está operativa para lectura, consulta y representación inicial del Workspace Documental V2.

Sin embargo, este hallazgo no constituye cierre del Sprint 2.1A.

### Hallazgo provisional

La transición entre:

```text
documentos.expedientes
```

y:

```text
documentos.contenedores_operativos
```

sigue siendo el primer bloqueo técnico-funcional detectado para operar documentos sobre expedientes actuales.

### Estado observado

```text
Expediente V1:
visible por Gateway y Workspace

Workspace V2:
puede representarlo mediante adapter

Contenedor V2 persistido:
no se materializa automáticamente

Documento Operativo Principal:
requiere contenedorOperativoId persistido
```

### Conclusión provisional

Antes de asociar Documento Operativo Principal y permitir adjuntos documentales, el backend/Gateway deberá contar con una operación controlada para obtener o materializar el contenedor operativo del expediente actual.

Esta conclusión es provisional porque el Sprint 2.1A aún debe completar el diagnóstico de:

- adjuntos;
- upload;
- R2;
- hash;
- duplicado físico;
- duplicado documental;
- permisos por tipo documental/perfil;
- OCR;
- confirmación;
- versionado;
- fechas;
- estados;
- flujo contable.

---

---

## 31. Reenfoque Product Owner — MVP funcional

Durante la revisión del Sprint 2.1A, el Product Owner redujo el objetivo del diagnóstico al mínimo necesario para implementar y desplegar un MVP funcional.

El Sprint 2.1A ya no debe intentar cerrar reglas futuras de todo el ciclo documental avanzado. Debe dejar listo el mapa técnico-funcional necesario para programar el MVP.

### MVP requerido

```text
Compras:
  - selecciona o crea expediente/contexto;
  - registra Documento Operativo Principal: OC, OS o Requerimiento de Compra;
  - no puede adjuntar documentos sin principal;
  - adjunta Factura y documentos propios de Compras.

Almacén:
  - adjunta Guía de Remisión;
  - adjunta Nota de Ingreso.

Finanzas:
  - adjunta Transferencia;
  - adjunta Detracción.

Contabilidad:
  - revisa el Workspace completo;
  - filtra por empresa, año y mes contable;
  - para el MVP, año y mes se derivan inicialmente de la fecha de emisión de la Factura.
```

### Restricciones técnicas del MVP

```text
Todo debe pasar por API Gateway.
React no sube directamente a R2.

Antes de almacenar en R2, backend debe:
  - validar permisos;
  - calcular hash;
  - comprobar duplicado físico;
  - comprobar duplicado documental.
```

### Migración mínima para deploy

```text
usuarios;
perfiles/workspaces necesarios;
documentos.expedientes;
catálogos mínimos relacionados.
```

### Fuera del MVP

```text
alertas;
versionado documental completo;
reemplazo de principal;
movimiento o eliminación de asociaciones;
Timeline avanzado;
Auditoría Visual adicional;
OCR avanzado;
cierres/reaperturas contables;
Caja Chica y Rendiciones;
mantenimiento de usuarios/perfiles.
```

---

## 32. Niveles de autoridad del diagnóstico MVP

Para evitar que una observación sea confundida con regla aprobada, cada GAP del bloque MVP usará estos niveles:

```text
Nivel A:
Evidencia técnica observada en runtime, SQL, código o Gateway.

Nivel B:
Criterio funcional definido por Product Owner para el MVP.

Nivel C:
Decisión de diseño o implementación pendiente para un sprint posterior.

Nivel D:
Backlog futuro no bloqueante para el MVP.
```

---

## GAP 2.1A-010 — Expediente / Contexto Operativo V2 para MVP

### Estado actual

Los expedientes existen en `documentos.expedientes` y son visibles por Gateway y Workspace V2 mediante adapter V1/V2.

Sin embargo, los expedientes actuales no materializan automáticamente un `contenedor_operativo` persistido.

### Evidencia encontrada

Se validó que el expediente `id = 16` responde por Workspace V2, pero con:

```text
contenedorOperativo.estadoPersistencia: no_persistido
contenedorOperativo.persistido: null
```

También se validó que la creación actual de expedientes inserta en `documentos.expedientes`, pero no crea `documentos.contenedores_operativos`.

### Riesgo

Compras puede seleccionar un expediente visible, pero no podrá asociar Documento Operativo Principal V2 si no existe `contenedorOperativoId` persistido.

### Decisión pendiente

Definir una operación backend/Gateway para obtener o materializar el contenedor operativo desde el expediente actual.

### Recomendación futura

Implementar en el primer sprint del MVP una operación controlada:

```text
obtener_o_materializar_contenedor_operativo(expedienteId)
```

Reglas mínimas:

```text
React no crea contenedores.
Gateway valida workspace.
Backend lee documentos.expedientes.
Backend busca contenedor por clave.
Si existe, retorna contenedorOperativoId.
Si no existe, lo crea y retorna contenedorOperativoId.
```

### Nivel de autoridad

```text
Nivel A:
Evidencia observada.

Nivel B:
Necesario para MVP.
```

---

## GAP 2.1A-011 — Documento Operativo Principal obligatorio

### Estado actual

Existen endpoints Gateway para candidatos y asociación de Documento Operativo Principal:

```http
GET  /api/v1/documental-v2/documentos-candidatos-principal
POST /api/v1/documental-v2/documentos-operativos-principales/asociar
```

El endpoint de candidatos funciona cuando se envía `tipoPrincipal`.

### Evidencia encontrada

Para `tipoPrincipal=OC`, el endpoint devuelve candidatos. Para `OS` y `REQUERIMIENTO_COMPRA`, el endpoint responde correctamente, pero sin data en el dataset actual.

También se observó que si falta `tipoPrincipal`, el backend devuelve error interno 500 en lugar de 400.

### Riesgo

Sin principal obligatorio, Compras, Almacén o Finanzas podrían adjuntar documentos sin una operación base clara.

### Decisión pendiente

Separar explícitamente:

```text
soporte técnico del filtro REQUERIMIENTO_COMPRA
```

de:

```text
aprobación funcional de Requerimiento de Compra como Documento Operativo Principal del MVP
```

### Recomendación futura

Para el MVP:

```text
No permitir adjuntos si no existe Documento Operativo Principal asociado.
Validar tipoPrincipal obligatorio con 400 BAD_REQUEST.
Confirmar catálogo mínimo de tipos principales: OC, OS, Requerimiento de Compra.
```

### Nivel de autoridad

```text
Nivel A:
Endpoints y comportamiento observados.

Nivel B:
Principal obligatorio definido por Product Owner para MVP.

Nivel C:
Validación 400 y soporte funcional de Requerimiento requieren implementación posterior.
```

---

## GAP 2.1A-012 — Documentos por área para el MVP

### Estado actual

El Modelo V2 ya trabaja con relaciones para documentos asociados a Grupo de Factura, incluyendo:

```text
Factura
Guía de Remisión
Nota de Ingreso
Transferencia
Detracción
```

Pero el diagnóstico aún debe confirmar el flujo operativo por perfil y tipo documental en Gateway/backend.

### Evidencia encontrada

Se validó que Compras puede listar expedientes pero no puede ingresar a mantenimiento contable, lo cual es correcto.

Los permisos actuales de workspace muestran acciones documentales genéricas, pero no se ha confirmado una autorización granular por tipo documental y perfil.

### Riesgo

Si se usa un permiso genérico como `documentos.subir`, cualquier área podría cargar cualquier tipo documental.

### Decisión pendiente

Definir reglas mínimas del MVP:

```text
Compras:
  Documento Principal, Factura y documentos propios de Compras.

Almacén:
  Guía de Remisión y Nota de Ingreso.

Finanzas:
  Transferencia y Detracción.

Contabilidad:
  revisión, no carga operativa principal del MVP salvo decisión posterior.
```

### Recomendación futura

Implementar validación backend por:

```text
workspace/perfil;
tipo documental;
operación solicitada;
empresa;
cliente destino.
```

No confiar solo en ocultamiento visual desde React.

### Nivel de autoridad

```text
Nivel A:
Permisos actuales y 403 de Compras sobre mantenimiento contable observados.

Nivel B:
Distribución por áreas definida por Product Owner para MVP.

Nivel C:
Validación granular por tipo documental requiere implementación posterior.
```

---

## GAP 2.1A-013 — Upload seguro vía Gateway/backend

### Estado actual

El diagnóstico aún no confirma un flujo completo y seguro de upload documental para el MVP.

La regla objetivo del Product Owner es que React no suba directamente a R2.

### Evidencia encontrada

Durante la Fase I se consolidó el principio:

```text
React representa.
React no autoriza.
Gateway propaga.
Backend decide.
```

La directriz del MVP agrega:

```text
React no sube directamente a R2.
Todo documento debe pasar por API Gateway.
```

### Riesgo

Si React sube directo a R2, el sistema puede almacenar archivos sin validar permisos, hash, duplicados, identidad documental o trazabilidad.

### Decisión pendiente

Diagnosticar el endpoint actual de upload y confirmar:

```text
quién recibe el archivo;
si pasa por Gateway;
si ms-documentos valida antes de R2;
qué ocurre si R2 sube y BD falla;
qué respuesta recibe React;
qué auditoría se registra.
```

### Recomendación futura

Flujo mínimo para MVP:

```text
React
  ↓
API Gateway
  ↓
ms-documentos
  ↓
validación de permisos
  ↓
cálculo hash
  ↓
validación duplicado físico/documental
  ↓
R2
  ↓
BD
  ↓
auditoría
  ↓
Workspace
```

### Nivel de autoridad

```text
Nivel B:
Regla del Product Owner para MVP.

Nivel C:
Requiere diagnóstico de endpoints y posterior implementación.
```

---

## GAP 2.1A-014 — R2 y consistencia de almacenamiento

### Estado actual

R2 está dentro de la arquitectura objetivo, pero el diagnóstico debe confirmar el flujo real de almacenamiento actual.

### Evidencia encontrada

El principio requerido para MVP es:

```text
Ningún archivo será almacenado en R2 sin validación previa del backend.
```

Aún no se ha documentado evidencia suficiente de:

```text
endpoint de upload real;
orden exacto BD/R2;
rollback;
manejo de errores;
referencia archivo-documento.
```

### Riesgo

Puede quedar un archivo en R2 sin registro válido en BD o un registro en BD apuntando a un objeto inexistente.

### Decisión pendiente

Definir estrategia mínima de consistencia:

```text
validar antes de subir;
subir a R2;
registrar BD;
si BD falla, marcar error o limpiar objeto;
si R2 falla, no crear documento confirmado;
registrar auditoría.
```

### Recomendación futura

No habilitar upload productivo hasta que exista contrato claro de error y compensación R2/BD.

### Nivel de autoridad

```text
Nivel B:
R2 solo vía backend para MVP.

Nivel C:
Consistencia R2/BD requiere implementación posterior.
```

---

## GAP 2.1A-015 — Hash y duplicado físico

### Estado actual

El MVP requiere calcular hash antes de almacenar en R2.

No se ha cerrado todavía si el sistema actual calcula y persiste SHA-256 antes del upload.

### Evidencia encontrada

La regla del Product Owner indica:

```text
Antes de almacenar en R2, backend debe calcular hash y comprobar duplicado físico.
```

### Riesgo

Sin hash previo:

```text
mismo PDF puede almacenarse varias veces;
se incrementa costo R2;
se reprocesa OCR;
se duplica trazabilidad;
se confunde al usuario.
```

### Decisión pendiente

Confirmar si existe campo persistido para hash en `documentos.documentos_archivos` u otra tabla, y si existe índice/consulta para buscar por hash.

### Recomendación futura

Para el MVP:

```text
calcular SHA-256 en backend antes de R2;
buscar hash existente;
si existe, no subir nuevamente;
devolver referencia o conflicto controlado según regla funcional;
registrar auditoría.
```

### Nivel de autoridad

```text
Nivel B:
Hash obligatorio antes de R2 para MVP.

Nivel C:
Persistencia e índice de hash requieren verificación/implementación.
```

---

## GAP 2.1A-016 — Identidad documental y duplicado documental

### Estado actual

El MVP requiere distinguir duplicado físico de duplicado documental.

### Evidencia encontrada

La identidad documental objetivo mínima es:

```text
empresa + tipo documental + RUC + serie + número
```

El hash no resuelve por sí solo el caso de un documento lógico con archivo corregido.

### Riesgo

Sin duplicado documental:

```text
misma factura puede ingresar dos veces con archivos distintos;
una versión corregida puede confundirse con documento nuevo;
un documento distinto puede rechazarse incorrectamente;
Contabilidad puede validar una factura duplicada.
```

### Decisión pendiente

Definir campos obligatorios por tipo documental para el MVP:

```text
Factura: RUC, serie, número, fecha emisión.
OC/OS/Requerimiento: tipo, número/código, empresa.
Guía/NI/Transferencia/Detracción: identidad mínima por tipo.
```

### Recomendación futura

Para el MVP, validar duplicado documental antes de registrar documento nuevo y antes de confirmar asociación al Workspace.

### Nivel de autoridad

```text
Nivel B:
Duplicado documental obligatorio para MVP.

Nivel C:
Reglas por tipo documental requieren diseño de implementación.
```

---

## GAP 2.1A-017 — Permisos actuales por perfil y tipo documental

### Estado actual

Usuarios, perfiles y workspaces ya existen. No habrá mantenimiento de usuarios por ahora.

### Evidencia encontrada

Usuarios observados:

```text
admin
compras
almacen
finanzas
contabilidad
```

Workspaces BBTI existen y se validó comportamiento de Compras:

```text
Compras lista expedientes.
Compras no accede a mantenimiento contable.
```

### Riesgo

El MVP puede fallar si los permisos actuales no cubren la distribución real por área o si son demasiado genéricos.

### Decisión pendiente

Definir si el MVP usará permisos existentes o si requiere nuevos actions mínimos, por ejemplo:

```text
documentos.cargar_factura
documentos.cargar_guia
documentos.cargar_nota_ingreso
documentos.cargar_transferencia
documentos.cargar_detraccion
documentos.asociar_principal
```

### Recomendación futura

No crear mantenimiento de usuarios. Solo migrar usuarios/workspaces necesarios y, si hace falta, ajustar permisos mínimos por seed controlado.

### Nivel de autoridad

```text
Nivel A:
Usuarios y workspaces observados.

Nivel B:
No habrá mantenimiento de usuarios en MVP.

Nivel C:
Actions granulares deben evaluarse para implementación.
```

---

## GAP 2.1A-018 — Revisión contable por fecha de emisión de Factura

### Estado actual

Contabilidad requiere revisar por empresa, año y mes contable.

Para el MVP, año y mes se derivan inicialmente de la fecha de emisión de la Factura.

### Evidencia encontrada

Durante Fase I ya existe entrada de revisión contable y Workspace. El Product Owner define para MVP:

```text
Contabilidad:
  - revisa Workspace completo;
  - filtra por empresa, año y mes contable;
  - año y mes se derivan inicialmente de fecha de emisión de Factura.
```

### Riesgo

Si se mezcla revisión contable con flujo operativo de Compras, la UI puede forzar navegación incorrecta para ambas áreas.

### Decisión pendiente

Definir contrato mínimo para consulta contable MVP:

```text
empresa;
año;
mes;
fecha_emision_factura;
estado de completitud documental;
link al Workspace.
```

### Recomendación futura

Mantener dos entradas funcionales:

```text
Compras:
Contexto → Principal → Documentos asociados

Contabilidad:
Empresa → Año/Mes → Factura → Workspace
```

No tratar cierres, reaperturas ni reglas contables avanzadas en el MVP.

### Nivel de autoridad

```text
Nivel B:
Filtro por fecha de emisión de Factura definido para MVP.

Nivel D:
Reglas contables avanzadas quedan fuera del MVP.
```

---

## GAP 2.1A-019 — Migración mínima para deploy MVP

### Estado actual

La data de expedientes BBTI/BBTEC fue cargada y validada. Usuarios/workspaces existen en entorno actual.

### Evidencia encontrada

Seed de expedientes validado:

```text
BBTEC: 7 expedientes
BBTI: 109 expedientes
códigos vacíos: 0
```

Usuarios/perfiles/workspaces observados:

```text
admin
compras
almacen
finanzas
contabilidad
```

### Riesgo

Si el deploy no migra la data mínima correcta, el MVP puede fallar aunque el código esté listo.

### Decisión pendiente

Definir script de producción para:

```text
usuarios;
perfiles;
workspaces;
expedientes;
catálogos mínimos;
permisos mínimos;
clientes destino;
proveedores si aplica;
tipos documentales si aplica.
```

### Recomendación futura

Separar seeds por dominio:

```text
infra/postgres/seeds/*expedientes*.sql
infra/postgres/seeds/*auth_workspaces*.sql
infra/postgres/seeds/*catalogos_minimos*.sql
```

### Nivel de autoridad

```text
Nivel A:
Seed local de expedientes validado.

Nivel B:
Migración mínima requerida por Product Owner.

Nivel C:
Script final de producción pendiente.
```

---

## GAP 2.1A-020 — OCR y confirmación básica para MVP

### Estado actual

OCR avanzado queda fuera del MVP, pero el flujo debe considerar cómo se confirmará documentalmente lo cargado.

### Evidencia encontrada

Existen endpoints y estados de OCR/confirmación en la plataforma, pero el Sprint 2.1A aún no ha diagnosticado si el MVP usará OCR automático, manual o validación mínima por usuario.

### Riesgo

Si se exige OCR avanzado antes del MVP, se retrasa el deploy. Si se omite toda confirmación, Contabilidad puede revisar documentos no confiables.

### Decisión pendiente

Definir para MVP:

```text
qué campos se capturan manualmente;
qué campos puede sugerir OCR si existe;
quién confirma cada tipo documental;
qué estado habilita visibilidad en Workspace y revisión contable.
```

### Recomendación futura

Para MVP, permitir validación/confirmación básica sin depender de OCR avanzado, dejando OCR avanzado como mejora posterior.

### Nivel de autoridad

```text
Nivel B:
OCR avanzado fuera del MVP.

Nivel C:
Confirmación básica requiere definición de implementación.
```

---

## 33. Matriz MVP de ciclo documental operativo

| Etapa | Existe hoy | Responsable MVP | Estado diagnóstico | GAP |
|---|---:|---|---|---|
| Expediente / contexto | Parcial | Compras / Gateway / Backend | Visible, no siempre persistido V2 | 2.1A-010 |
| Documento principal | Parcial | Compras | Endpoints existen; falta flujo Compras | 2.1A-011 |
| Adjuntos por área | Parcial | Compras / Almacén / Finanzas | Reglas por perfil pendientes | 2.1A-012 |
| Upload seguro | Pendiente | Gateway / Backend | Flujo no cerrado | 2.1A-013 |
| R2 | Pendiente | Backend | Consistencia no diagnosticada | 2.1A-014 |
| Hash | Pendiente | Backend | Obligatorio para MVP | 2.1A-015 |
| Duplicado físico | Pendiente | Backend | Depende de hash | 2.1A-015 |
| Duplicado documental | Pendiente | Backend | Identidad por tipo pendiente | 2.1A-016 |
| Permisos por tipo | Parcial | Backend / Gateway | Workspaces existen; granularidad pendiente | 2.1A-017 |
| Revisión contable | Parcial | Contabilidad | Fecha emisión como criterio inicial MVP | 2.1A-018 |
| Migración mínima | Parcial | Infra / Backend | Expedientes validados; auth/catalogos pendientes | 2.1A-019 |
| OCR / confirmación básica | Parcial | Usuario / Backend | OCR avanzado fuera de MVP | 2.1A-020 |

---

## 34. Backlog explícito fuera del MVP

Los siguientes temas quedan registrados como backlog y no deben bloquear el cierre del diagnóstico mínimo del MVP:

```text
Versionado documental completo.
Alertas.
Estados avanzados del ciclo documental.
Reglas contables futuras.
Cierres y reaperturas contables.
Reemplazo controlado de Documento Principal.
Movimiento o eliminación de asociaciones.
Timeline avanzado.
Auditoría Visual adicional.
OCR avanzado.
Caja Chica.
Rendiciones.
Mantenimiento de usuarios y perfiles.
```

Estos temas podrán requerir Decisiones Arquitectónicas o sprints específicos posteriores.

---

## 35. Roadmap corto recomendado para MVP

```text
2.1B
Materialización de Contexto Operativo desde expediente actual

↓

2.1C
Flujo de Compras: contexto + Documento Operativo Principal obligatorio

↓

2.1D
Upload Seguro vía Gateway/backend

↓

2.1E
Hash, R2 y prevención de duplicado físico

↓

2.1F
Identidad documental y duplicado documental

↓

2.1G
Adjuntos por área: Compras / Almacén / Finanzas

↓

2.1H
Confirmación básica y visibilidad en Workspace

↓

2.1I
Revisión Contable MVP por empresa, año, mes y fecha de emisión de Factura

↓

2.1J
Migración mínima y preparación de deploy
```

Este roadmap es una recomendación de diagnóstico. La apertura de cada sprint requiere autorización formal.

---

## 36. Dictamen actual del Sprint 2.1A

```text
Sprint:
2.1A — Diagnóstico End-to-End de Carga Documental Operativa

Estado:
CONTINÚA

Bloque Arquitectura:
APROBADO

Bloque MVP funcional:
REENFOCADO

Implementación:
NO AUTORIZADA

Runtime:
SOLO OBSERVACIÓN

Cierre formal:
PENDIENTE DE VALIDACIÓN FINAL
```

### Criterio de éxito MVP adoptado

```text
Compras crea el flujo documental.
Almacén y Finanzas completan sus documentos.
Contabilidad revisa por mes.
El sistema puede pasar a testing y luego deploy.
```

### Conclusión actual

El diagnóstico debe cerrarse alrededor del MVP funcional, no alrededor de todos los escenarios futuros del ciclo documental.

La prioridad queda acotada a:

```text
expediente/contexto V2;
principal obligatorio;
documentos por área;
upload seguro;
R2;
duplicados;
permisos actuales;
revisión contable por fecha de emisión;
migración mínima;
roadmap corto de implementación.
```

Los temas avanzados quedan en backlog y no deben bloquear el inicio del MVP una vez cubiertos los GAPs mínimos anteriores.---

## 37. Criterio de Aceptación del MVP

El MVP se considerará funcionalmente completo cuando, como mínimo, se cumplan los siguientes criterios:

```text
✓ Compras puede crear un Contexto Operativo.

✓ Compras puede registrar un Documento Operativo Principal
  (OC, OS o Requerimiento de Compra según decisión funcional).

✓ El sistema impide registrar documentos asociados
  cuando no existe Documento Principal.

✓ Compras puede adjuntar la Factura y los documentos propios de su flujo.

✓ Almacén puede adjuntar Guía y Nota de Ingreso
  a la operación correspondiente.

✓ Finanzas puede adjuntar Transferencia y Detracción
  cuando correspondan.

✓ Todo ingreso documental pasa obligatoriamente por API Gateway.

✓ React nunca realiza upload directo a R2.

✓ Backend valida autorización antes de cualquier operación.

✓ Backend valida permisos antes de almacenar.

✓ Backend calcula hash del archivo.

✓ Backend valida duplicado documental antes del almacenamiento físico.

✓ Backend detecta duplicado físico.

✓ El upload hacia R2 solo ocurre después de las validaciones del backend.

✓ Workspace refleja correctamente la estructura documental.

✓ Contabilidad puede consultar la información filtrando por:
  - Empresa
  - Año
  - Período contable derivado inicialmente de la fecha de emisión de la factura.

✓ La auditoría registra las operaciones implementadas.

✓ La trazabilidad refleja correctamente el historial operativo.

✓ El Historial de Actividad muestra la información utilizando exclusivamente la API canónica.

✓ Todo el flujo puede ejecutarse de extremo a extremo sobre BBTI SAC y BB Tecnología utilizando usuarios reales del sistema.
```

---

## 38. Alcance explícitamente fuera del MVP

Los siguientes elementos no bloquean el despliegue inicial del MVP:

```text
✗ OCR automático.

✗ Alertas operativas.

✗ Reemplazo de Documento Principal.

✗ Movimiento de documentos entre operaciones.

✗ Versionado documental completo.

✗ Timeline avanzado.

✗ Auditoría Visual avanzada.

✗ Permisos operativos granulares.

✗ Flujo completo de Caja Chica.

✗ Flujo completo de Rendiciones.

✗ Automatizaciones contables.
```

Estos elementos pasan al roadmap de la Fase II y fases posteriores.

---

## 39. Conclusión definitiva del Sprint 2.1A

El Sprint 2.1A concluye el diagnóstico integral necesario para implementar el primer MVP operativo del Modelo Documental V2.

El análisis permitió identificar:

- el estado actual de la arquitectura;
- los componentes reutilizables;
- los vacíos funcionales;
- las prioridades de implementación;
- las restricciones técnicas del MVP;
- las capacidades que quedan fuera del despliegue inicial.

Todo esto se realizó sin introducir cambios en runtime ni modificar el Modelo Documental V2.

Con este diagnóstico, el proyecto dispone de una hoja de ruta clara para ejecutar la implementación incremental del MVP sobre una base arquitectónica consolidada.

Estado final:

```text
Sprint 2.1A:
CERRADO

Arquitectura:
APROBADA

Diagnóstico:
COMPLETO PARA MVP

Roadmap:
APROBADO

Implementación:
AUTORIZADA CON CONTRATO TÉCNICO PREVIO

Repositorio:
CONSISTENTE

Documentación:
ACTUALIZADA

Baseline:
v2-rc4.3

Runtime:
SIN CAMBIOS

Backend:
SIN CAMBIOS

API Gateway:
SIN CAMBIOS

React:
SIN CAMBIOS

PostgreSQL:
SIN MIGRACIONES

Contratos públicos:
SIN CAMBIOS
```

---

## 40. Apertura condicionada del Sprint 2.1B

Con la publicación de este ajuste documental, el Sprint 2.1A queda formalmente cerrado.

Queda autorizada la preparación del Contrato Técnico del Sprint 2.1B.

El Sprint 2.1B se enfocará en:

```text
Materialización del Contexto Operativo
y alta/asociación del Documento Operativo Principal.
```

Antes de escribir una sola línea de código, el contrato técnico deberá definir:

- endpoint o endpoints;
- payloads;
- respuestas;
- reglas de idempotencia;
- validaciones funcionales;
- autorización;
- auditoría;
- impacto sobre Workspace;
- estrategia de pruebas;
- criterios de aceptación.

Solo después de la aprobación formal de ese contrato técnico podrá iniciarse la implementación del Sprint 2.1B.

Con este acto queda formalmente concluido el Sprint 2.1A y el proyecto entra en la primera fase de implementación del MVP sobre la línea base `v2-rc4.3`.
