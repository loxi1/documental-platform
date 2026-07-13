# Sprint 2.0A — UX para asociar Documento Operativo Principal V2

## Estado

**Roadmap:** 2.0 — Operación Documental V2
**Sprint:** 2.0A
**Nombre:** Alta operativa de Documento Operativo Principal V2
**Responsable:** Maestro Sucesor II — UX / Web Admin / Frontend
**Estado:** UX actualizado con contrato final y runtime aprobado en `ms-documentos`. React sigue bloqueado hasta validación Gateway.

---

## Resumen ejecutivo

Maestro Sucesor I validó en runtime `ms-documentos` los dos endpoints necesarios para Sprint 2.0A:

```text
GET  /api/v1/documental-v2/documentos-candidatos-principal
POST /api/v1/documental-v2/documentos-operativos-principales/asociar
```

Validado:

```text
- candidatos para Documento Principal
- asociación exitosa
- idempotencia
- workspaceDebeRefrescar true/false
- DOCUMENTO_NO_ENCONTRADO
- TIPO_PRINCIPAL_NO_COINCIDE_CON_DOCUMENTO
- CONTEXTO_OPERATIVO_NO_AUTORIZADO
```

Pendiente antes de React:

```text
- validar los mismos endpoints vía Gateway
- confirmar build/tests finales
- cierre técnico backend 2.0A
```

---

## Contrato backend aprobado

### Endpoint Gateway esperado

```http
POST /api/v1/documental-v2/documentos-operativos-principales/asociar
```

### Payload definitivo

```json
{
  "contenedorOperativoId": 1,
  "documentoId": 910003,
  "tipoPrincipal": "OC"
}
```

No existe `usuarioId` en el payload.

El usuario, empresa, workspace y auditoría salen de:

```text
JWT
workspace seleccionado
contexto autenticado
backend
```

---

## Endpoint candidatos

### Endpoint esperado

```http
GET /api/v1/documental-v2/documentos-candidatos-principal
```

### Filtros validados en ms-documentos

```text
empresaCodigo=BBTI
tipoPrincipal=OC
q=900002
limit=20
```

### Resultado runtime validado

```text
STATUS 200
```

Candidato devuelto:

```text
documentoId: 910003
tipoDocumental: OC
tipoDocumentalLabel: Orden de compra
numeroDocumento: OC-900002
titulo: OC OC-900002
proveedorNombre: PROVEEDOR SANDBOX OC B S.A.C.
proveedorRuc: 20100033333
fechaEmision: 2026-07-03
montoTotal: 2200
moneda: PEN
estado: confirmado
nombreArchivo: OC_OC-900002.pdf
yaEsPrincipalV2: false
```

### Impacto UX

El selector de documentos candidatos puede usar directamente:

```text
titulo
tipoDocumentalLabel
numeroDocumento
proveedorNombre
proveedorRuc
fechaEmision
montoTotal
moneda
estado
nombreArchivo
yaEsPrincipalV2
```

No debe usar IDs técnicos como label principal.

---

## Tipo permitido inicial

Para Sprint 2.0A solo está aprobado:

```text
OC
```

La UI no debe mostrar todavía como opciones activas:

```text
OS
REQUERIMIENTO
CONTRATO
CAJA_CHICA
RENDICION
```

---

## Flujo UX principal

```text
Workspace Documental V2
        ↓
Usuario selecciona “Asociar documento principal”
        ↓
Se abre panel lateral
        ↓
Usuario busca OC candidata
        ↓
Usuario selecciona documento
        ↓
Sistema muestra resumen
        ↓
Usuario confirma asociación
        ↓
Frontend llama Gateway
        ↓
Backend valida contexto, documento, tipo y permisos
        ↓
Respuesta success
        ↓
Frontend muestra resultado
        ↓
Frontend refresca Workspace si workspaceDebeRefrescar=true
```

---

## Panel lateral recomendado

Título:

```text
Asociar documento principal
```

Descripción:

```text
Selecciona una OC existente para asociarla como Documento Operativo Principal de este contexto.
```

---

## Selector de documento candidato

Campos visibles recomendados:

| Campo | Fuente |
|---|---|
| Título | `titulo` |
| Tipo | `tipoDocumentalLabel` |
| Número | `numeroDocumento` |
| Proveedor | `proveedorNombre` |
| RUC | `proveedorRuc` |
| Fecha | `fechaEmision` |
| Monto | `montoTotal` + `moneda` |
| Estado | `estado` |
| Archivo | `nombreArchivo` |
| Ya es principal | `yaEsPrincipalV2` |

Si `yaEsPrincipalV2=true`, la fila debe mostrarse como no seleccionable o con advertencia, según contrato final Gateway.

Texto sugerido:

```text
Este documento ya está asociado como principal V2.
```

---

## Resumen antes de confirmar

Ejemplo usando el runtime validado:

```text
Documento seleccionado

Tipo principal: OC
Documento: OC OC-900002
Tipo documental: Orden de compra
Proveedor: PROVEEDOR SANDBOX OC B S.A.C.
RUC: 20100033333
Fecha: 03/07/2026
Monto: PEN 2,200.00
Estado: confirmado
Archivo: OC_OC-900002.pdf
```

---

## Confirmación explícita

Título:

```text
Confirmar asociación
```

Mensaje:

```text
El documento seleccionado será asociado como Documento Operativo Principal de este contexto.
```

Nota:

```text
Esta acción no sube archivos, no ejecuta OCR y no modifica el documento original. Solo crea la relación operativa V2.
```

Botones:

```text
Cancelar
Confirmar asociación
```

---

## Respuesta de creación validada en ms-documentos

```text
STATUS 201
```

Respuesta validada:

```json
{
  "success": true,
  "data": {
    "documentoOperativoPrincipal": {
      "id": "2",
      "contenedorOperativoId": "1",
      "documentoId": "910003",
      "tipoPrincipal": "OC",
      "esPrincipalActivo": true,
      "estado": "activo",
      "vista": {
        "titulo": "OC OC-900002",
        "tipoDocumentalLabel": "Orden de compra",
        "numeroDocumento": "OC-900002",
        "proveedorNombre": "PROVEEDOR SANDBOX OC B S.A.C.",
        "proveedorRuc": "20100033333",
        "fechaEmision": "2026-07-03",
        "montoTotal": 2200,
        "moneda": "PEN",
        "nombreArchivo": "OC_OC-900002.pdf"
      }
    },
    "idempotente": false,
    "workspaceDebeRefrescar": true
  }
}
```

UX esperada:

```text
Documento principal asociado correctamente.
```

Comportamiento:

```text
cerrar panel;
refrescar Workspace porque workspaceDebeRefrescar=true;
mostrar Documento Operativo Principal visible.
```

---

## Respuesta idempotente validada en ms-documentos

```text
STATUS 201
```

Observación:

Aunque semánticamente podría ser `200`, funcionalmente cumple porque devuelve `idempotente=true` y `workspaceDebeRefrescar=false`.

Respuesta validada:

```json
{
  "success": true,
  "data": {
    "documentoOperativoPrincipal": {
      "id": "2",
      "contenedorOperativoId": "1",
      "documentoId": "910003",
      "tipoPrincipal": "OC",
      "esPrincipalActivo": true,
      "estado": "activo"
    },
    "idempotente": true,
    "workspaceDebeRefrescar": false
  }
}
```

UX esperada:

```text
El documento principal ya estaba asociado a este contexto.
```

No mostrar error. No forzar recarga si `workspaceDebeRefrescar=false`.

---

## Manejo de `workspaceDebeRefrescar`

| Valor | Comportamiento UX |
|---|---|
| `true` | Refrescar Workspace luego de cerrar panel. |
| `false` | No forzar recarga; mantener estado actual. |
| ausente | Por seguridad, refrescar Workspace después de éxito. |

---

## Errores runtime validados en ms-documentos

| Caso | Status | Código funcional | Mensaje UX |
|---|---:|---|---|
| Documento inexistente | 404 | `DOCUMENTO_NO_ENCONTRADO` | El documento seleccionado no existe o ya no está disponible. |
| Tipo incompatible | 409 | `TIPO_PRINCIPAL_NO_COINCIDE_CON_DOCUMENTO` | El tipo principal seleccionado no coincide con el tipo documental del documento. |
| Contexto no autorizado | 403 | `CONTEXTO_OPERATIVO_NO_AUTORIZADO` | No tienes permisos para operar sobre este contexto. |

---

## Errores oficiales pendientes de runtime/Gateway

| Código | Mensaje UX |
|---|---|
| `CONTEXTO_OPERATIVO_NO_ENCONTRADO` | El contexto operativo no existe o ya no está disponible. |
| `CONTEXTO_OPERATIVO_INACTIVO` | El contexto operativo no está activo y no permite asociar documentos. |
| `TIPO_DOCUMENTAL_NO_PERMITIDO` | Este tipo documental no puede usarse como Documento Operativo Principal. |
| `DOCUMENTO_YA_ES_PRINCIPAL_EN_OTRO_CONTEXTO` | Este documento ya está asociado como Documento Operativo Principal en otro contexto. |
| `DOCUMENTO_PRINCIPAL_YA_ASOCIADO_CON_OTRO_TIPO` | Este documento ya está asociado como principal con otro tipo documental. |
| `SIN_PERMISO_ASOCIAR_DOCUMENTO_PRINCIPAL` | No tienes permisos para asociar documentos principales en este workspace. |
| `ERROR_ASOCIAR_DOCUMENTO_PRINCIPAL` | No se pudo asociar el documento principal. Intenta nuevamente. |

---

## Reglas de presentación

Usar:

```text
vista.titulo
```

No usar:

```text
IDs técnicos
metadata legacy
documentoId como título
```

Si `vista.titulo` no existe, usar label normalizado entregado por backend/Gateway.

---

## Dependencias antes de React

React sigue bloqueado hasta completar:

```text
Gateway operativo para candidatos
Gateway operativo para asociación
build/tests finales
runtime Gateway de creación
runtime Gateway de idempotencia
runtime Gateway de errores funcionales
cierre técnico backend 2.0A
```

---

## Criterios de aceptación UX actualizados

```text
[ ] No se solicita usuarioId.
[ ] Payload usa contenedorOperativoId, documentoId y tipoPrincipal.
[ ] Solo OC aparece como opción activa en 2.0A.
[ ] El selector usa documentos existentes.
[ ] El candidato muestra titulo y datos normalizados.
[ ] Hay confirmación explícita.
[ ] La operación exitosa refresca Workspace si workspaceDebeRefrescar=true.
[ ] La operación idempotente no muestra error.
[ ] workspaceDebeRefrescar=false no fuerza recarga.
[ ] Los errores funcionales muestran mensajes humanos.
[ ] No se muestran IDs técnicos como título.
[ ] No se lee metadata legacy.
[ ] No se crea documento físico.
[ ] No se sube archivo.
[ ] No se ejecuta OCR.
[ ] No se crea Grupo de Factura.
[ ] No se modifica V1.
[ ] React espera validación Gateway.
```

---

## Dictamen Maestro Sucesor II

```text
Contrato 2.0A validado parcialmente en runtime ms-documentos.

Desde UX, el diseño queda actualizado con resultados reales de candidatos, creación, idempotencia y errores funcionales principales.

React sigue bloqueado hasta validación Gateway operativa.
```
