# Sprint 1.3F - Centro de costo / Mantenimiento de expedientes

## Estado

**Cerrado funcionalmente con auditoría en ambiente local/demo.**

El módulo trabaja directamente sobre la tabla `documentos.expedientes` y se expone como mantenimiento contable de centros de costo.

## Ruta frontend

```text
/revision-contable/expedientes
```

Nombre funcional en UI:

```text
Centro de costo
```

## Acceso permitido

- admin
- contabilidad

No visible ni permitido para:

- compras
- almacén
- finanzas

## Tabla principal

```text
documentos.expedientes
```

Campos relevantes:

- id
- empresa_codigo
- codigo_expediente
- descripcion
- estado
- metadata
- cliente_destino_id
- creado_en
- actualizado_en

## Campos de auditoría agregados

- creado_por
- actualizado_por
- anulado_en
- anulado_por
- motivo_anulacion

## Tabla de auditoría agregada

```text
documentos.expediente_auditoria
```

Registra:

- expediente_id
- accion
- estado_anterior / estado_nuevo
- codigo_anterior / codigo_nuevo
- descripcion_anterior / descripcion_nueva
- metadata_anterior / metadata_nueva
- usuario_id
- usuario_email
- perfil
- empresa_codigo
- cliente_destino_id
- request_id
- session_context_id
- detalle
- creado_en

## Endpoints implementados

### Listado paginado

```http
GET /api/v1/expedientes/mantenimiento?page=1&pageSize=50&q=texto
```

El backend toma `empresaCodigo` y `clienteDestinoId` desde el token del workspace.

### Detalle

```http
GET /api/v1/expedientes/mantenimiento/:id
```

### Crear

```http
POST /api/v1/expedientes/mantenimiento
```

Payload:

```json
{
  "codigoExpediente": "TEST-001",
  "descripcion": "EXPEDIENTE DE PRUEBA",
  "metadata": {}
}
```

### Editar

```http
PATCH /api/v1/expedientes/mantenimiento/:id
```

Payload permitido:

```json
{
  "codigoExpediente": "050201",
  "descripcion": "PRODUCCION C X DISTRIBUIR",
  "metadata": {}
}
```

### Cambiar estado / anular

```http
PATCH /api/v1/expedientes/mantenimiento/:id/estado
```

Payload para anular:

```json
{
  "estado": "anulado",
  "motivoAnulacion": "Motivo ingresado por contabilidad"
}
```

## Reglas de negocio

- `empresa_codigo` se toma del token.
- `cliente_destino_id` se toma del token.
- No se permite editar empresa ni cliente destino desde frontend.
- `codigo_expediente` es único por empresa + cliente_destino_id + codigo_expediente.
- No hay eliminación física.
- Anular significa cambiar `estado = anulado`.
- Anulado no es reversible desde UI.
- La anulación se bloquea si existe un documento principal relacionado.

Regla de bloqueo:

```sql
SELECT 1
FROM documentos.expediente_documentos
WHERE expediente_id = :id
  AND es_principal = true
LIMIT 1;
```

## Campos devueltos al frontend

- id
- expedienteId
- empresaCodigo
- codigoExpediente
- descripcion
- clienteDestinoId
- clienteNombre
- clienteAbreviatura
- clienteRuc
- estado
- metadata
- totalDocumentos
- tieneDocumentoPrincipal
- creadoPor
- actualizadoPor
- anuladoEn
- anuladoPor
- motivoAnulacion
- creadoEn
- actualizadoEn

## Validaciones realizadas

- Listado paginado: OK.
- Búsqueda por `q`: OK.
- Filtro por empresa del workspace: OK.
- Filtro por cliente destino del workspace: OK.
- Edición de expediente 41: OK.
- Creación de expediente de prueba 682: OK.
- Edición de expediente de prueba 682: OK.
- Anulación de expediente de prueba 682: OK.
- Auditoría de creación, edición y anulación: OK.
- Bloqueo a compras con 403: OK.
- Campo `tieneDocumentoPrincipal`: OK.

## Auditoría validada

Acciones registradas:

- expediente.creado
- expediente.actualizado
- expediente.anulado

El motivo de anulación se guarda en:

```sql
documentos.expediente_auditoria.detalle->>'motivoAnulacion'
```

## UI validada por Maestro Sucesor II

La UI en `/revision-contable/expedientes` incluye:

- Listado.
- Búsqueda.
- Paginación.
- Ver detalle.
- Crear.
- Editar.
- Anular con motivo.
- Bloqueo visual por `tieneDocumentoPrincipal`.
- Manejo de conflicto backend.
- UI limpia sin campos técnicos.

## Pendiente menor

Mejorar el mensaje del 409 cuando se intenta anular un expediente con documento principal.

Mensaje deseado:

```text
No se puede anular el centro de costo porque tiene un documento principal relacionado.
```

Código deseado:

```text
EXPEDIENTE_TIENE_DOCUMENTO_PRINCIPAL
```

## Commit sugerido

```bash
git commit -m "feat(expedientes): add audited contable maintenance"
```
