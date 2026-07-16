# Sprint 2.1B — Contrato Técnico
## Materialización del Contexto Operativo y Asociación de Documento Operativo Principal Existente

## 1. Estado del sprint

```text
Sprint:
2.1B

Nombre:
Materialización del Contexto Operativo y Asociación de Documento Operativo Principal Existente

Fase:
FASE II — MVP Documental Operativo

Baseline:
v2-rc4.3

Documento base:
Sprint 2.1A — Diagnóstico End-to-End de Carga Documental Operativa

Naturaleza:
Contrato técnico previo a implementación

Implementación:
NO AUTORIZADA

Backend:
PENDIENTE

API Gateway:
PENDIENTE

React:
PENDIENTE

PostgreSQL:
SIN MIGRACIONES AUTORIZADAS EN ESTE CONTRATO

Runtime:
SIN CAMBIOS
```

---

## 2. Objetivo funcional

El objetivo del Sprint 2.1B es habilitar el primer flujo operativo real del MVP:

```text
Expediente existente
  ↓
Materializar Contexto Operativo V2
  ↓
Asociar Documento Operativo Principal existente
  ↓
Refrescar Workspace por API canónica
```

El usuario de Compras debe poder iniciar una operación documental desde un expediente existente y asociar un documento ya registrado como Documento Operativo Principal.

Tipos previstos para Documento Operativo Principal:

```text
OC
OS
Requerimiento de Compra
```

La habilitación funcional de `Requerimiento de Compra` queda sujeta a confirmación de soporte normativo, valor físico exacto, catálogo y existencia de datos candidatos.

---

## 3. Alcance del Sprint 2.1B

Incluye:

```text
- Obtener o materializar un Contexto Operativo V2 persistido desde un expediente V1 existente.
- Asociar un documento existente como Documento Operativo Principal del Contexto Operativo.
- Conservar el contrato existente de asociación de Documento Principal.
- Garantizar idempotencia básica.
- Validar autorización por workspace.
- Registrar auditoría operativa solo cuando corresponde.
- Exponer el flujo exclusivamente mediante API Gateway.
- Indicar cuándo Workspace debe refrescarse por API canónica.
```

---

## 4. Exclusiones

No incluye:

```text
- Creación de documentos.documentos.
- Creación física/documental del Documento Principal.
- Creación de expedientes.
- Upload de archivos.
- R2.
- Hash.
- Duplicado físico.
- Duplicado documental de nuevos archivos.
- OCR.
- Adjuntos.
- Facturas.
- Guías.
- Notas de ingreso.
- Transferencias.
- Detracciones.
- Revisión contable.
- Alertas.
- Versionado documental.
- Reemplazo de Documento Principal.
- Movimiento o eliminación de asociaciones.
- Cambios avanzados de permisos.
- Caja Chica.
- Rendiciones.
```

La creación física y documental del principal formará parte del sprint de upload seguro. En 2.1B el documento candidato debe existir previamente.

---

## 5. Flujo técnico esperado

```text
Web Admin
  ↓
API Gateway
  ↓
ms-documentos
  ↓
PostgreSQL
  ↓
Workspace Documental V2 por GET canónico
```

Reglas obligatorias:

```text
React no llama directamente a ms-documentos.
React no crea contenedores directamente.
React no decide reglas de negocio.
React no reconstruye Workspace de forma optimista desde respuestas POST.
```

---

## 6. Flujo funcional esperado

```text
1. Usuario Compras ingresa al Web Admin.
2. Selecciona un expediente existente.
3. Solicita iniciar operación documental.
4. Backend obtiene o materializa el Contexto Operativo V2.
5. Usuario selecciona Documento Operativo Principal candidato existente.
6. Backend valida tipo, permisos, workspace e idempotencia.
7. Backend asocia el Documento Principal existente.
8. Backend registra auditoría cuando corresponde.
9. React refresca Workspace usando la API canónica cuando el contrato indique workspaceDebeRefrescar.
```

Importante:

```text
El Sprint 2.1B no crea documentos.documentos.
El Sprint 2.1B no crea expedientes.
El Sprint 2.1B solo materializa el contexto y crea la relación persistida en documentos.documentos_operativos_principales.
```

---

## 7. Endpoints involucrados

### 7.1 Materializar Contexto Operativo desde expediente

Nuevo endpoint propuesto:

```http
POST /api/v1/documental-v2/workspace/expedientes-v1/:expedienteId/materializar-contenedor
```

Responsabilidad:

```text
Obtener o crear de forma idempotente el contenedor_operativo V2 correspondiente a un expediente V1 existente.
```

Este endpoint no debe exponer CRUD genérico de `contenedores_operativos`.

---

### 7.2 Listar candidatos a Documento Principal

Endpoint existente:

```http
GET /api/v1/documental-v2/documentos-candidatos-principal
```

Contrato público desde React:

```http
GET /api/v1/documental-v2/documentos-candidatos-principal?tipoPrincipal=OC&q=007950&estado=confirmado&limit=20
```

Parámetros públicos permitidos:

```text
tipoPrincipal
q
estado
limit
```

Parámetros internos autenticados, resueltos y propagados por Gateway:

```text
empresaCodigo
clienteDestinoId
workspaceId
usuarioId
perfil
permisos
```

Regla contractual:

```text
React no envía empresaCodigo.
React no envía clienteDestinoId.
Gateway propaga contexto autenticado.
Backend decide.
```

Corrección requerida:

```text
Si falta tipoPrincipal, debe responder 400 BAD_REQUEST.
No debe responder 500 INTERNAL_SERVER_ERROR.
```

---

### 7.3 Asociar Documento Operativo Principal

Endpoint existente, consolidado desde Sprint 2.0A:

```http
POST /api/v1/documental-v2/documentos-operativos-principales/asociar
```

Responsabilidad:

```text
Asociar un documento existente como Documento Operativo Principal de un Contexto Operativo.
```

Este contrato no debe redefinir ni aplanar la respuesta existente. Debe conservar el patrón institucional:

```text
objeto de dominio
idempotente
workspaceDebeRefrescar
```

---

## 8. Payloads y respuestas

### 8.1 Materializar Contexto Operativo

Request:

```json
{}
```

El `expedienteId` viaja por path.

El backend debe obtener desde base de datos:

```text
empresa_codigo
cliente_destino_id
codigo_expediente
descripcion
estado
```

El Gateway debe validar el workspace del JWT y propagar contexto autenticado.

Response esperada cuando se crea el contenedor:

```json
{
  "success": true,
  "data": {
    "expedienteId": 16,
    "contenedorOperativo": {
      "id": 10,
      "empresaCodigo": "BBTI",
      "clienteDestinoId": 2,
      "tipoContexto": "expediente_v1",
      "codigo": "0501",
      "estado": "activo"
    },
    "idempotente": false,
    "workspaceDebeRefrescar": true
  }
}
```

Response esperada cuando el contenedor activo ya existía:

```json
{
  "success": true,
  "data": {
    "expedienteId": 16,
    "contenedorOperativo": {
      "id": 10,
      "empresaCodigo": "BBTI",
      "clienteDestinoId": 2,
      "tipoContexto": "expediente_v1",
      "codigo": "0501",
      "estado": "activo"
    },
    "idempotente": true,
    "workspaceDebeRefrescar": true
  }
}
```

No se usará `creado` como sustituto de `idempotente`.

`idempotente` y `workspaceDebeRefrescar` son conceptos distintos.

Una operación puede ser idempotente y aun así requerir refresco de Workspace cuando la vista necesita reconciliarse con la fuente canónica.

Para materialización de contexto, incluso cuando el contenedor ya exista, la respuesta debe indicar:

```text
idempotente = true
workspaceDebeRefrescar = true
```

Esto permite que React consulte nuevamente el Workspace oficial y deje de mostrar un estado `no_persistido` cuando el contenedor ya existe en la fuente canónica.

---

### 8.2 Asociar Documento Principal existente

Request:

```json
{
  "contenedorOperativoId": 10,
  "documentoId": 910015,
  "tipoPrincipal": "OC"
}
```

Response esperada cuando se crea la asociación, respetando el contrato consolidado de 2.0A:

```json
{
  "success": true,
  "data": {
    "documentoOperativoPrincipal": {
      "id": 5,
      "contenedorOperativoId": 10,
      "documentoId": 910015,
      "tipoPrincipal": "OC",
      "estado": "activo"
    },
    "idempotente": false,
    "workspaceDebeRefrescar": true
  }
}
```

Response esperada cuando ya existía la asociación:

```json
{
  "success": true,
  "data": {
    "documentoOperativoPrincipal": {
      "id": 5,
      "contenedorOperativoId": 10,
      "documentoId": 910015,
      "tipoPrincipal": "OC",
      "estado": "activo"
    },
    "idempotente": true,
    "workspaceDebeRefrescar": false
  }
}
```

No se introducirá una respuesta aplanada con `documentoOperativoPrincipalId` como sustituto del objeto de dominio.

---

## 9. Reglas de idempotencia

### 9.1 Contexto Operativo

Clave funcional pública del contrato:

```text
empresaCodigo
tipoContexto = expediente_v1
codigo = codigo_expediente
```

Evidencia física verificada:

```text
Constraint:
uq_contenedor_operativo_empresa_tipo_codigo
UNIQUE (empresa_codigo, tipo_contexto, codigo)

Índice único:
CREATE UNIQUE INDEX uq_contenedor_operativo_empresa_tipo_codigo
ON documentos.contenedores_operativos
USING btree (empresa_codigo, tipo_contexto, codigo)
```

Decisión contractual:

```text
Opción A:
Ya existe constraint/índice compatible.
La implementación deberá reutilizarlo y manejar conflicto concurrente.
```

La operación de materialización no debe implementarse como un simple flujo no protegido:

```text
buscar
  ↓
no existe
  ↓
insertar
```

sin manejo de conflicto concurrente.

La clave física protegida es:

```text
empresa_codigo + tipo_contexto + codigo
```

`cliente_destino_id` no forma parte del constraint físico actual. Por tanto, se usará como validación adicional obligatoria contra:

```text
expediente
workspace activo
contexto autenticado
```

Regla ante concurrencia:

```text
Si dos solicitudes simultáneas intentan materializar el mismo expediente/contexto,
la protección final será el constraint físico
uq_contenedor_operativo_empresa_tipo_codigo.
```

La implementación deberá manejar la colisión concurrente sobre ese constraint, recuperar el registro existente y devolver:

```text
idempotente = true
workspaceDebeRefrescar = true
```

Regla funcional:

```text
Si existe contenedor activo con la misma clave física, se retorna el existente.
Si no existe, se crea.
Si aparece conflicto concurrente por índice único, se recupera el existente.
```

No debe crear duplicados por reintento de usuario, refresh, doble click o solicitudes simultáneas.

### 9.2 Documento Operativo Principal

Clave funcional existente:

```text
contenedor_operativo_id
documento_id
```

Reglas:

```text
Si el documento ya está asociado como principal al mismo contenedor, se retorna la asociación existente.

Si el documento está asociado como principal en otro contenedor, debe rechazarse.

Si el tipo documental no coincide con tipoPrincipal, debe rechazarse.

La existencia de otro Documento Operativo Principal activo en el mismo contenedor no bloquea esta operación.
```

Cardinalidad aprobada:

```text
Un Contexto Operativo puede tener múltiples Documentos Operativos Principales activos.
```

No debe introducirse una validación equivalente a:

```text
CONTEXTO_YA_TIENE_PRINCIPAL_ACTIVO
```

---

## 10. Reglas de autorización

Gateway debe validar:

```text
- JWT válido.
- Workspace activo.
- empresa del expediente coincide con empresa del workspace.
- clienteDestinoId del expediente coincide con clienteDestinoId del workspace.
- usuario tiene permiso operativo para iniciar flujo documental.
```

Backend debe validar nuevamente:

```text
- existencia del expediente;
- expediente activo;
- pertenencia a empresa/cliente destino;
- existencia del documento;
- tipo documental compatible;
- documento no asociado indebidamente;
- contenedor activo;
- autorización sobre el contenedor.
```

React no debe confiar en visibilidad como autorización.

### 10.1 Permiso requerido para Sprint 2.1B

El permiso contractual requerido será:

```text
documentos.vincular_expediente
```

Fuente de autorización:

```text
workspace activo del JWT / auth.usuario_workspaces.permisos.actions
```

Evidencia observada:

```text
admin@documental.local:
workspace admin BBTI incluye documentos.vincular_expediente.

compras@documental.local:
workspace compras BBTI incluye documentos.vincular_expediente.
```

Observación técnica:

```text
auth.usuario_accesos no será la fuente principal de autorización para este sprint,
porque compras@documental.local no contiene documentos.vincular_expediente
en auth.usuario_accesos.
```

Regla:

```text
Admin:
autorizado si su workspace activo incluye documentos.vincular_expediente.

Compras:
autorizado si su workspace activo incluye documentos.vincular_expediente.

Otros perfiles:
403 salvo permiso explícito en workspace.
```

No se autoriza por nombre de perfil únicamente.
No se inventa un nuevo permiso.
No se confía en visibilidad del botón React como autorización.

### 10.2 Propagación interna Gateway → ms-documentos

React no envía:

```text
empresaCodigo
clienteDestinoId
workspaceId
usuarioId
```

Gateway resuelve el contexto desde el JWT/workspace activo y propaga a `ms-documentos` mediante headers confiables:

```text
x-user-id
x-user-email
x-workspace-id
x-empresa-codigo
x-cliente-destino-id
x-request-id
x-correlation-id
```

Regla contractual:

```text
Si el cliente envía empresaCodigo, clienteDestinoId, workspaceId o usuarioId
por query/body, Gateway debe ignorarlos o rechazarlos y usar únicamente
el contexto autenticado.
```

Para candidatos:

```text
React:
tipoPrincipal, q, estado, limit

Gateway:
inyecta empresa/cliente/workspace confiables

ms-documentos:
filtra con el contexto propagado
```

---

## 11. Contenedores inactivos, anulados o históricos

El contrato debe cubrir estos casos:

```text
Existe contenedor activo:
retornar existente.

Existe contenedor anulado/inactivo con la misma clave:
409 CONTEXTO_OPERATIVO_NO_ACTIVO.

Existen varios registros históricos con la misma clave:
409 CONTEXTO_OPERATIVO_DUPLICADO_HISTORICO.

Expediente inactivo:
409 EXPEDIENTE_NO_ACTIVO.

Expediente fuera del workspace:
403 EXPEDIENTE_NO_AUTORIZADO.
```

No se permite:

```text
- reactivar automáticamente;
- crear otro contenedor silenciosamente;
- escoger arbitrariamente entre duplicados históricos;
- corregir datos históricos dentro de este sprint.
```

La reactivación o saneamiento de datos queda fuera de 2.1B.

---

## 12. Auditoría requerida

Debe registrarse auditoría para operaciones reales:

```text
MATERIALIZAR_CONTEXTO_OPERATIVO
ASOCIAR_DOCUMENTO_PRINCIPAL
```

Regla contractual:

```text
Creación real de contenedor:
auditar MATERIALIZAR_CONTEXTO_OPERATIVO.

Repetición idempotente de materialización:
no crear nueva auditoría funcional.

Asociación real de Documento Principal:
auditar ASOCIAR_DOCUMENTO_PRINCIPAL.

Repetición idempotente de asociación:
no duplicar auditoría.
```

Datos mínimos a registrar:

```text
accion
entidad
entidadId
usuarioId
workspaceId
empresaCodigo
requestId
correlationId
expedienteId
contenedorOperativoId
resultadoOperacion
origen
```

Los datos internos pueden guardarse en la estructura existente, pero no deben exponerse como contrato público.

---

## 13. Impacto sobre Workspace Documental V2

Después de materializar el contexto, Workspace debe poder reflejar:

```text
contenedorOperativo.estadoPersistencia:
persistido
```

Después de asociar Documento Principal, Workspace debe poder reflejar:

```text
documentosOperativosPrincipales:
incluye el Documento Principal asociado.
```

Flujo correcto de React:

```text
POST materializar
  → si workspaceDebeRefrescar = true
  → GET Workspace oficial

POST asociar principal
  → si workspaceDebeRefrescar = true
  → GET Workspace oficial
```

No se permite reconstruir Workspace optimistamente desde la respuesta de un POST.

### 13.1 Operaciones separadas y estado recuperable

No habrá transacción distribuida entre:

```text
materializar contexto
```

y:

```text
asociar principal
```

Por tanto, es válido quedar temporalmente en el estado:

```text
Contexto persistido
  ↓
sin Documento Principal
```

si la segunda operación falla o el usuario cancela.

Ese estado no se considera corrupción. Es un flujo incompleto recuperable desde Workspace.

No se exige todavía:

```text
Factura
Adjuntos
Grupo Factura
OCR
Contabilidad
```

---

## 14. Casos de error esperados

| Situación | HTTP | Código funcional |
|---|---:|---|
| Expediente inexistente | 404 | `EXPEDIENTE_NO_ENCONTRADO` |
| Expediente fuera del contexto | 403 | `EXPEDIENTE_NO_AUTORIZADO` |
| Workspace sin empresa | 400/403 | reutilizar código existente si ya aplica |
| Workspace sin cliente destino | 400 | `WORKSPACE_SIN_CLIENTE_DESTINO` o equivalente existente |
| Expediente inactivo | 409 | `EXPEDIENTE_NO_ACTIVO` |
| Contenedor histórico inactivo | 409 | `CONTEXTO_OPERATIVO_NO_ACTIVO` |
| Contenedor histórico duplicado | 409 | `CONTEXTO_OPERATIVO_DUPLICADO_HISTORICO` |
| Falta `tipoPrincipal` | 400 | `TIPO_PRINCIPAL_REQUERIDO` |
| Tipo no permitido | 400 | `TIPO_PRINCIPAL_NO_SOPORTADO` |
| Documento inexistente | 404 | `DOCUMENTO_NO_ENCONTRADO` |
| Tipo incompatible | 409 | `TIPO_PRINCIPAL_NO_COINCIDE_CON_DOCUMENTO` |
| Documento en otro contexto | 409 | `DOCUMENTO_YA_ES_PRINCIPAL_EN_OTRO_CONTEXTO` |
| Contexto no autorizado | 403 | `CONTEXTO_OPERATIVO_NO_AUTORIZADO` |
| Contexto inactivo | 409 | `CONTEXTO_OPERATIVO_NO_ACTIVO` |
| Error interno inesperado | 500 | `INTERNAL_SERVER_ERROR` |

Se deben reutilizar los códigos ya existentes cuando coincidan; no duplicarlos con nombres nuevos.

No debe usarse 500 para errores de validación funcional.

---

## 15. Estrategia de pruebas

### 15.1 Pruebas mínimas runtime

```text
1. Materializar contenedor desde expediente existente BBTI.
2. Repetir materialización y validar idempotencia.
3. Listar candidatos OC sin enviar empresaCodigo desde React.
4. Validar error 400 si falta tipoPrincipal.
5. Asociar OC existente como Documento Principal.
6. Repetir asociación y validar idempotencia.
7. Validar que otro Documento Principal activo en el mismo contenedor no bloquea la operación.
8. Validar rechazo si el documento ya pertenece a otro contexto.
9. Consultar Workspace por API canónica y verificar estado persistido.
10. Verificar Documento Principal en Workspace.
11. Verificar auditoría en creación real.
12. Verificar no duplicación de auditoría en reintento idempotente.
```

### 15.2 Usuarios mínimos

```text
admin
compras
```

Contabilidad puede probar lectura del Workspace, pero no es imprescindible para la operación de asociación del Sprint 2.1B.

### 15.3 Empresas mínimas

```text
BBTI
BBTEC
```

Los nombres comerciales pueden mostrarse en UI, pero autorización y persistencia deben trabajar con códigos existentes.

---

## 16. Criterios de aceptación del Sprint 2.1B

El Sprint 2.1B se considerará aceptado cuando:

```text
✓ Existe endpoint Gateway para materializar Contexto Operativo desde expediente existente.

✓ La materialización usa el patrón contenedorOperativo + idempotente + workspaceDebeRefrescar.

✓ La materialización idempotente también devuelve workspaceDebeRefrescar=true.

✓ La idempotencia concurrente usa el constraint físico uq_contenedor_operativo_empresa_tipo_codigo.

✓ La implementación maneja conflicto concurrente y recupera el contenedor existente.

✓ React no crea contenedores directamente.

✓ React no envía empresaCodigo como parámetro público de candidatos.

✓ Gateway propaga contexto autenticado mediante headers confiables.

✓ La autorización usa documentos.vincular_expediente desde el workspace activo.

✓ Existe validación de workspace.

✓ Existe validación de empresa y cliente destino.

✓ Se puede asociar Documento Operativo Principal OC existente.

✓ La asociación conserva el contrato existente de 2.0A:
  documentoOperativoPrincipal + idempotente + workspaceDebeRefrescar.

✓ El contrato deja definido el comportamiento para OS.

✓ Requerimiento de Compra queda condicionado a decisión funcional y datos disponibles.

✓ Falta tipoPrincipal responde 400 y no 500.

✓ Otro Documento Principal activo en el mismo contenedor no bloquea la operación.

✓ Documento Principal asociado aparece en Workspace después de GET canónico.

✓ La operación registra auditoría cuando corresponde.

✓ La operación idempotente no duplica auditoría funcional.

✓ No se implementa upload.

✓ No se implementa R2.

✓ No se implementan adjuntos.

✓ No se crea documentos.documentos.

✓ No se crea expediente nuevo.

✓ No se modifica el Modelo Documental V2 fuera del alcance aprobado.
```

---

## 17. Riesgos técnicos

```text
- Crear CRUD público de contenedores en lugar de una operación controlada.
- Permitir que React materialice contenedores directamente.
- Duplicar contenedores por falta de idempotencia.
- Declarar clienteDestinoId como parte de la clave física de idempotencia, cuando el constraint real no lo incluye.
- Mezclar mantenimiento contable con flujo operativo de Compras.
- Usar data sandbox como evidencia normativa.
- Tratar Requerimiento de Compra como soportado oficialmente sin decisión funcional.
- Dejar errores de validación como 500.
- Cambiar el contrato existente de asociación de principal.
- Usar creado como sustituto de idempotente.
- Reconstruir Workspace optimistamente desde POST.
```

---

## 18. Compatibilidad con baseline v2-rc4.3

El Sprint 2.1B debe respetar:

```text
- Modelo Documental V2 vigente.
- Principio React representa / Backend decide.
- Gateway como única entrada pública.
- Workspace Documental V2 como vista contextual.
- Auditoría operativa ya consolidada en Fase I.
- Trazabilidad canónica por API oficial.
- Contratos consolidados en 2.0A, 2.0B y 2.0C.
```

No se permite:

```text
- cambiar contratos ya aprobados sin documentarlo;
- romper Workspace existente;
- introducir reglas contables;
- introducir upload;
- modificar permisos globales sin contrato;
- crear nuevas entidades de dominio sin Decisión Arquitectónica;
- sustituir contratos existentes por respuestas aplanadas.
```

---

## 19. Estado del contrato técnico

Este documento no autoriza todavía implementación.

El contrato técnico deberá ser revisado y aprobado antes de escribir código.

Estado:

```text
Sprint 2.1B:
ABIERTO

Contrato Técnico:
BORRADOR REVISADO FINAL PARA VALIDACIÓN

Arquitectura general:
APROBADA

Endpoint de materialización:
APROBADO CON AJUSTES

Contrato de candidatos:
CORREGIDO, SIN empresaCodigo PÚBLICO

Contrato de asociación:
CONSERVA CONTRATO EXISTENTE

Idempotencia concurrente:
RESUELTA EN CONTRATO CON CONSTRAINT FÍSICO VERIFICADO
uq_contenedor_operativo_empresa_tipo_codigo

Autorización:
PRECISADA CON PERMISO documentos.vincular_expediente DESDE WORKSPACE ACTIVO

Auditoría:
APROBADA CON REGLA DE NO DUPLICACIÓN

Workspace:
APROBADO CON workspaceDebeRefrescar=true EN MATERIALIZACIÓN IDEMPOTENTE

Propagación interna Gateway:
PRECISADA MEDIANTE HEADERS CONFIABLES

Implementación:
NO AUTORIZADA

Baseline:
v2-rc4.3
```
