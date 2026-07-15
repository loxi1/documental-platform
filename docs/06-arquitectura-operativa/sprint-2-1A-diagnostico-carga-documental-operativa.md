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

## 30. Cierre parcial

El diagnóstico confirma que la plataforma base de la Fase I está operativa, pero el flujo de negocio de Fase II requiere cerrar primero la transición entre:

```text
documentos.expedientes
```

y:

```text
documentos.contenedores_operativos
```

La prioridad técnica-funcional no es todavía upload ni OCR. El bloqueo inmediato es asegurar que un expediente/contexto actual pueda obtener o materializar un contenedor operativo V2 persistido, siempre mediante Gateway/backend, antes de asociar Documento Operativo Principal y permitir adjuntos documentales.
