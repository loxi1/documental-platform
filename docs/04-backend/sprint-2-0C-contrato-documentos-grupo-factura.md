# Sprint 2.0C — Alta operativa de Documentos del Grupo de Factura

## Estado

Autorizado para implementación backend/Gateway. React permanece bloqueado hasta validar contrato runtime.

## Objetivo

Asociar documentos existentes a un Grupo de Factura V2 persistido.

```text
Grupo de Factura persistido
  -> documento existente
      -> Guía de remisión
      -> Nota de ingreso
      -> Transferencia
      -> Detracción
```

## Tipos documentales oficiales

Se usan los tipos físicos existentes en `documentos.documentos.tipo_documental`:

```text
GUIA_REMISION
NOTA_INGRESO
TRANSFERENCIA
DETRACCION
```

No se usan en este sprint:

```text
PAGO_TRANSFERENCIA
PAGO_DETRACCION
NOTA_CREDITO
NOTA_DEBITO
OTRO
```

## Mapeo oficial

```text
GUIA_REMISION -> adjunto_guia
NOTA_INGRESO  -> adjunto_nota_ingreso
TRANSFERENCIA -> adjunto_transferencia
DETRACCION    -> adjunto_detraccion
```

## Endpoints

### Candidatos

```http
GET /api/v1/documental-v2/documentos-candidatos-grupo
```

Parámetros:

```text
grupoFacturaId       obligatorio
tipoDocumental       opcional
texto                opcional
pagina               opcional
limite               opcional
```

Respuesta mínima:

```json
{
  "documentoId": 910007,
  "tipoDocumental": "GUIA_REMISION",
  "tipoDocumentalLabel": "Guía de remisión",
  "tipoRelacion": "adjunto_guia",
  "numeroDocumento": "T001-00000077",
  "proveedorNombre": "PROVEEDOR S.A.C.",
  "proveedorRuc": "20100000001",
  "fecha": "2026-07-07",
  "estado": "confirmado",
  "nombreArchivo": "GUIA_T001-00000077.pdf",
  "yaAsociadoGrupoV2": false
}
```

### Asociación

```http
POST /api/v1/documental-v2/grupos-factura/documentos/asociar
```

Payload:

```json
{
  "grupoFacturaId": 2,
  "documentoId": 910007,
  "tipoRelacion": "adjunto_guia"
}
```

Respuesta creación:

```json
{
  "documentoGrupoFactura": {
    "id": 1,
    "grupoFacturaId": 2,
    "documentoId": 910007,
    "tipoRelacion": "adjunto_guia",
    "estado": "activo"
  },
  "idempotente": false,
  "workspaceDebeRefrescar": true
}
```

Respuesta idempotente:

```json
{
  "documentoGrupoFactura": {
    "id": 1,
    "grupoFacturaId": 2,
    "documentoId": 910007,
    "tipoRelacion": "adjunto_guia",
    "estado": "activo"
  },
  "idempotente": true,
  "workspaceDebeRefrescar": false
}
```

## Reglas funcionales

- Solo grupos V2 persistidos y activos admiten escritura.
- Los grupos del adaptador V1 permanecen en consulta.
- Un documento activo solo puede pertenecer a un grupo.
- La misma terna `grupoFacturaId + documentoId + tipoRelacion` es idempotente.
- Mismo documento y mismo grupo con otra relación devuelve conflicto funcional.
- Mismo documento en otro grupo activo devuelve conflicto funcional.
- No se mueven documentos entre grupos automáticamente.
- No se reclasifica `tipoRelacion` silenciosamente.
- No se modifica V1.
- React no envía identidad, empresa, workspace ni auditoría.
- Gateway/backend devuelven `tipoDocumentalLabel` y `tipoRelacion`.

## Errores funcionales mínimos

```text
GRUPO_FACTURA_NO_ENCONTRADO
GRUPO_FACTURA_NO_PERSISTIDO
GRUPO_FACTURA_NO_ACTIVO
GRUPO_FACTURA_NO_AUTORIZADO
DOCUMENTO_NO_ENCONTRADO
TIPO_DOCUMENTAL_NO_PERMITIDO_EN_GRUPO
TIPO_RELACION_NO_PERMITIDO
TIPO_RELACION_NO_COINCIDE_CON_DOCUMENTO
DOCUMENTO_YA_ASOCIADO_AL_GRUPO_CON_OTRA_RELACION
DOCUMENTO_YA_ASOCIADO_A_OTRO_GRUPO
```

## Auditoría

Para creación se registra en `metadata`:

```text
tipoOperacion = DOCUMENTO_GRUPO_FACTURA_ASOCIADO
resultadoOperacion = CREADO
entidadTipo = grupo_factura_documento
```

La llamada idempotente no duplica la auditoría funcional de creación. Los rechazos se dejan como log técnico estructurado salvo que el mecanismo central de auditoría del proyecto incorpore intentos fallidos.

Campos mínimos de contexto:

```text
grupoFacturaId
documentoOperativoPrincipalId
contenedorOperativoId
facturaDocumentoId
documentoId
tipoDocumental
tipoRelacion
usuarioId
usuarioEmail
workspaceId
empresaCodigo
clienteDestinoId
requestId
correlationId
origen
```

## Workspace posterior

Después del POST y refresco del Workspace:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura persistido
          -> Factura fundadora
          -> Guía / Nota de ingreso / Transferencia / Detracción
```

El backend actualiza:

```text
resumen.documentosGrupoFactura
resumen.documentosGrupoFacturaPersistidos
```

Si el mismo `documentoId` aparece por adaptador V1 y por asociación V2 persistida, el Workspace debe mostrarlo una sola vez. La versión V2 persistida prevalece para capacidades operativas.
