# Sprint 2.0B — Contrato operativo Grupo de Factura V2

## Objetivo

Permitir crear un Grupo de Factura V2 a partir de una Factura existente y un Documento Operativo Principal V2 activo.

La Factura es el documento fundador del Grupo de Factura. No es el único documento futuro del grupo. En Sprint 2.0C se asociarán Guías, Notas de Ingreso, Transferencias, Detracciones, Notas de Crédito, Notas de Débito u otros documentos secundarios.

## Endpoint Gateway

```http
GET /api/v1/documental-v2/facturas-candidatas
POST /api/v1/documental-v2/grupos-factura/asociar
```

## Endpoint ms-documentos

```http
GET /api/v1/documental-v2/facturas-candidatas
POST /api/v1/documental-v2/grupos-factura/asociar
```

## Candidatos

```http
GET /api/v1/documental-v2/facturas-candidatas?documentoOperativoPrincipalId=3&texto=F001&pagina=1&limite=20
```

Filtros mínimos:

- `documentoOperativoPrincipalId` obligatorio.
- `texto` opcional.
- `pagina` obligatorio desde UI, default backend `1`.
- `limite` obligatorio desde UI, default backend `20`, máximo `50`.

No se agregan filtros por proveedor en 2.0B.

## Estado requerido de la Factura fundadora

La carga física de una Factura y su habilitación funcional como documento fundador son momentos distintos:

```text
Archivo cargado y persistido
≠
Factura apta para fundar Grupo de Factura
```

Una Factura puede ingresar correctamente mediante Carga Segura y quedar en estado `pendiente_ocr`. Ese estado no impide la persistencia del archivo ni del documento, pero todavía no permite crear un Grupo de Factura.

La política oficial es:

```text
FACTURA confirmado:
apta para fundar Grupo de Factura

FACTURA pendiente_ocr:
no apta

FACTURA observada:
no apta

FACTURA anulada:
no apta
```

El endpoint de candidatas mantiene el filtro:

```sql
tipo_documental = 'FACTURA'
AND estado = 'confirmado'
```

El endpoint `POST /api/v1/documental-v2/grupos-factura/asociar` debe aplicar la misma regla y rechazar cualquier Factura cuyo estado no sea `confirmado`.

Flujo aprobado:

```text
Carga Segura
  ↓
documento = pendiente_ocr
  ↓
OCR o validación manual
  ↓
documento = confirmado
  ↓
aparece en facturas-candidatas
  ↓
puede fundar Grupo de Factura
```

No se implementa confirmación automática ni OCR nuevo dentro de esta operación.

## Asociación

```json
{
  "documentoOperativoPrincipalId": 3,
  "facturaDocumentoId": 910002
}
```

El frontend no debe enviar:

- `usuarioId`
- `usuarioEmail`
- `empresaCodigo`
- `workspaceId`
- `contenedorOperativoId`
- metadata de OCR
- datos de proveedor
- datos de archivo

La identidad y el contexto se resuelven desde JWT/Gateway.

## Respuesta de creación

```json
{
  "success": true,
  "data": {
    "grupoFactura": {
      "id": 4,
      "contenedorOperativoId": 2,
      "documentoOperativoPrincipalId": 3,
      "facturaDocumentoId": 910002,
      "estado": "pendiente_revision"
    },
    "idempotente": false,
    "workspaceDebeRefrescar": true
  }
}
```

## Respuesta idempotente

```json
{
  "success": true,
  "data": {
    "grupoFactura": {
      "id": 4,
      "contenedorOperativoId": 2,
      "documentoOperativoPrincipalId": 3,
      "facturaDocumentoId": 910002,
      "estado": "pendiente_revision"
    },
    "idempotente": true,
    "workspaceDebeRefrescar": false
  }
}
```

## Errores funcionales

```text
DOCUMENTO_OPERATIVO_PRINCIPAL_NO_ENCONTRADO       404
DOCUMENTO_PRINCIPAL_NO_ACTIVO                     409
DOCUMENTO_OPERATIVO_PRINCIPAL_NO_AUTORIZADO       403
PRINCIPAL_NO_PERTENECE_AL_CONTEXTO_AUTORIZADO     403
CONTEXTO_OPERATIVO_INACTIVO                       409
FACTURA_NO_ENCONTRADA                             404
DOCUMENTO_NO_ES_FACTURA                           409
FACTURA_NO_CONFIRMADA                             409
FACTURA_ANULADA                                   409
FACTURA_YA_TIENE_GRUPO_ACTIVO                     409
```

### Factura no confirmada

```json
{
  "message": "La Factura debe estar confirmada antes de crear un Grupo de Factura.",
  "code": "FACTURA_NO_CONFIRMADA",
  "details": {
    "facturaDocumentoId": 910002,
    "estado": "pendiente_ocr"
  }
}
```

Este código aplica también cuando el estado sea `observada`.

### Factura anulada

```json
{
  "message": "Una Factura anulada no puede fundar un Grupo de Factura.",
  "code": "FACTURA_ANULADA",
  "details": {
    "facturaDocumentoId": 910002,
    "estado": "anulado"
  }
}
```

Si una Factura fundadora es anulada posteriormente, no se anula, elimina ni reemplaza automáticamente el Grupo de Factura. Ese tratamiento queda fuera del Sprint 2.0B.

## Auditoría backend

Al crear Grupo de Factura se registra en metadata del Grupo y campos de auditoría:

```json
{
  "tipoOperacion": "GRUPO_FACTURA_CREADO",
  "accion": "GRUPO_FACTURA_CREADO",
  "entidad": "grupo_factura",
  "origen": "OPERACION_DOCUMENTAL_V2",
  "sprint": "2.0B",
  "usuario": {
    "id": 1,
    "email": "admin@documental.local",
    "workspaceId": 1,
    "empresaCodigo": "BBTI",
    "clienteDestinoId": 2
  },
  "contexto": {
    "contenedorOperativoId": 2,
    "documentoOperativoPrincipalId": 3,
    "facturaDocumentoId": 910002
  },
  "request": {
    "requestId": "...",
    "correlationId": "...",
    "origen": "api-gateway"
  }
}
```

No se implementa timeline visual en 2.0B.

## Idempotencia

La idempotencia se define por:

```text
documentoOperativoPrincipalId + facturaDocumentoId
```

- Misma factura + mismo principal: devolver grupo existente con `idempotente=true` y `workspaceDebeRefrescar=false`.
- Misma factura + otro principal/grupo activo: `409 FACTURA_YA_TIENE_GRUPO_ACTIVO`.

## Flujo Workspace

Después del POST, el backend no devuelve workspace completo. React debe refrescar el endpoint propio del Workspace.

Resultado esperado:

```text
Contexto Operativo
  Documento Operativo Principal
    Grupo Factura
      Factura fundadora
      Adjuntos = 0
```

Resumen esperado:

```text
documentosOperativosPrincipales = 1
gruposFactura = 1
documentosGrupoFactura = 0
adjuntosNoClasificados = 0
```

## Ejemplo runtime

```bash
curl -k -s -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.bbtecnologia.com/api/v1/documental-v2/grupos-factura/asociar" \
  -d '{
    "documentoOperativoPrincipalId": 3,
    "facturaDocumentoId": 910002
  }' | jq
```
