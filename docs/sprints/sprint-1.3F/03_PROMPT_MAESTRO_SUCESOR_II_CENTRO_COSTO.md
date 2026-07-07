# Prompt para Maestro Sucesor II - Centro de costo / Mantenimiento de expedientes

Maestro Sucesor II,

Backend de Centro de costo / Mantenimiento de expedientes queda validado para consumo desde Web Admin.

## Ruta frontend sugerida

```text
/revision-contable/expedientes
```

Nombre funcional:

```text
Centro de costo
```

## Acceso

Mostrar solo para:

- admin
- contabilidad

Ocultar para:

- compras
- almacén
- finanzas

## Endpoints disponibles

```http
GET /api/v1/expedientes/mantenimiento?page=1&pageSize=50&q=texto
GET /api/v1/expedientes/mantenimiento/:id
POST /api/v1/expedientes/mantenimiento
PATCH /api/v1/expedientes/mantenimiento/:id
PATCH /api/v1/expedientes/mantenimiento/:id/estado
```

## Listado

Columnas:

- Código
- Descripción
- Estado
- F. creación
- F. actualización
- Acciones

Ocultar:

- ID
- Empresa
- Cliente destino
- clienteDestinoId
- metadata técnica

## Acciones

- Ver
- Crear
- Editar
- Anular

## Crear

Campos:

- Código
- Descripción

Payload:

```json
{
  "codigoExpediente": "...",
  "descripcion": "..."
}
```

No enviar empresa ni cliente destino. El backend los toma del token.

## Editar

Campos editables:

- Código
- Descripción

Payload:

```json
{
  "codigoExpediente": "...",
  "descripcion": "..."
}
```

No editar:

- id
- expedienteId
- empresaCodigo
- clienteDestinoId
- totalDocumentos
- tieneDocumentoPrincipal
- creadoPor
- actualizadoPor
- anuladoEn
- anuladoPor
- creadoEn
- actualizadoEn

## Anular

Payload:

```json
{
  "estado": "anulado",
  "motivoAnulacion": "Motivo ingresado por contabilidad"
}
```

Regla visual:

Si `tieneDocumentoPrincipal = true`:

- Deshabilitar botón Anular.
- Mostrar mensaje:
  "No se puede anular porque ya tiene documento principal relacionado."

Si `tieneDocumentoPrincipal = false`:

- Permitir Anular.
- Solicitar motivo.
- Mostrar confirmación.

## Paginación

Usar:

- page
- pageSize
- total
- totalPages
- hasNextPage
- hasPreviousPage

Comportamiento:

- Al buscar, volver a página 1.
- Deshabilitar Anterior en página 1.
- Deshabilitar Siguiente en última página.

## Estado

El módulo queda funcionalmente listo para demo gerencial.
