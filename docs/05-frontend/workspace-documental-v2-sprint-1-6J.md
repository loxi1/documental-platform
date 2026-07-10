# Sprint 1.6J — Consumo de vista enriquecida en Workspace Documental V2

## Objetivo

Actualizar la vista `Workspace Documental V2` para consumir los campos normalizados entregados dentro de `vista` por el contrato Gateway.

Ruta frontend validada:

```text
/documental-v2/workspace/41
/workspace/expedientes-v1/41
```

Endpoint oficial:

```text
GET /api/v1/documental-v2/workspace/expedientes-v1/:id
```

## Alcance

Solo frontend.

No se toca:

```text
Backend
Gateway
ms-documentos
PostgreSQL
OCR
R2
NATS
Eventos
Alertas
Carga de archivos
Edición
Confirmaciones
```

## Regla principal

El frontend usa únicamente campos normalizados dentro de `vista`.

No debe leer datos de negocio desde:

```text
metadata.ocr
metadata.compatibilidad.documentoV1
estructuras legacy internas
```

No debe inferir:

```text
proveedor
fecha
monto
serie
número
```

## Campos consumidos

### Documento Operativo Principal

```text
vista.titulo
vista.numeroDocumento
vista.proveedorNombre
vista.proveedorRuc
vista.fechaEmision
vista.montoTotal
vista.moneda
vista.nombreArchivo
vista.tipoDocumentalLabel
vista.estado
vista.esPrincipalActivo
```

### Grupo de Factura

```text
vista.facturaLabel
vista.facturaSerie
vista.facturaNumero
vista.proveedorNombre
vista.proveedorRuc
vista.fechaEmision
vista.importeTotal
vista.moneda
vista.estadoRevisionLabel
vista.documentos[]
```

## Resultado UX esperado

Antes:

```text
OC
Documento ID 1
Factura 2
```

Ahora:

```text
OC 007950
Proveedor: CORPORACION ACEROS AREQUIPA S.A.
RUC: 20370146994
Fecha: 23/04/2026
Monto: USD 4,181.92

Factura F011-00001135
Proveedor: CORPORACION COMATPE SAC
RUC: 20516403650
Fecha: 04/05/2026
Importe: 40.00
Estado: Pendiente de revisión
```

## Fallbacks

Si un campo normalizado viene `null`, vacío o ausente, la UI muestra:

```text
No informado
```

o:

```text
—
```

según el contexto visual.

No se busca el dato en metadata OCR.

## Archivos ajustados

```text
apps/web-admin/src/components/documental-v2/DocumentoOperativoPrincipalCard.tsx
apps/web-admin/src/components/documental-v2/GrupoFacturaCard.tsx
apps/web-admin/src/components/documental-v2/AdjuntosList.tsx
apps/web-admin/src/components/documental-v2/WorkspaceDocumentalV2.tsx
apps/web-admin/src/components/documental-v2/workspace-v2-utils.ts
apps/web-admin/src/types/documental-v2-workspace.ts
```
