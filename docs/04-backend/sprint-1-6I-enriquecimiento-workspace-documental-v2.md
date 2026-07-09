# Sprint 1.6I — Enriquecimiento del Workspace Documental V2

## Objetivo

Enriquecer el contrato del Workspace Documental V2 para que Web Admin reciba campos de presentación normalizados dentro de cada bloque `vista`.

El frontend no debe leer `metadata.ocr`, estructuras legacy internas ni inferir proveedor, RUC, fecha, monto, serie, número o nombres de archivo.

## Alcance

Se implementa en `ms-documentos` una capa de mapeo de presentación:

```text
WorkspaceDocumentalV2UseCase
  -> WorkspaceDocumentalV2ViewMapper
      -> DocumentoVisualMapper
      -> documental-v2-labels
```

## Reglas respetadas

- No cambia la jerarquía V2.
- No rompe el payload actual.
- Solo agrega campos nuevos dentro de `vista`.
- No escribe V1.
- No escribe V2 automáticamente.
- No toca Frontend.
- No toca Gateway.
- No OCR.
- No R2.
- No NATS.
- No eventos.
- No alertas.
- Si un dato no existe de forma confiable, se devuelve `null`.

## Campos enriquecidos

### Contexto Operativo

Campos agregados dentro de `contenedorOperativo.vista`:

```text
clienteDestinoNombre
tipoContextoLabel
periodoRevision
fechaCreacion
```

### Documento Operativo Principal

Campos agregados dentro de `documentosOperativosPrincipales[].vista`:

```text
numeroDocumento
titulo
proveedorNombre
proveedorRuc
fechaEmision
montoTotal
moneda
nombreArchivo
tipoDocumentalLabel
```

### Grupo de Factura

Campos agregados dentro de `gruposFactura[].vista`:

```text
facturaSerie
facturaNumero
facturaLabel
proveedorNombre
proveedorRuc
fechaEmision
importeTotal
moneda
estadoRevisionLabel
```

### Adjuntos

Campos agregados dentro de `gruposFactura[].documentos[].vista` y `adjuntosNoClasificados[].vista`:

```text
documentoId
tipoDocumental
tipoDocumentalLabel
serie
numero
documentoLabel
fechaEmision
estado
nombreArchivo
```

## Fuentes de datos

El backend puede leer metadata legacy, OCR o compatibilidad para normalizar el contrato visual. El frontend no debe leer esas estructuras.

Orden de preferencia para documentos:

```text
metadata.ocr.metadata
metadata directa del documento
metadata.compatibilidad.documentoV1
metadata.compatibilidad
```

No se infieren datos desde texto OCR libre.

## Compatibilidad

Los campos existentes se mantienen.

Ejemplo compatible:

```json
{
  "documentoId": 1,
  "tipoPrincipal": "OC",
  "esPrincipalActivo": true,
  "estado": "confirmado",
  "numeroDocumento": "007950",
  "titulo": "OC 007950",
  "proveedorNombre": "CORPORACION ACEROS AREQUIPA S.A.",
  "proveedorRuc": "20370146994",
  "fechaEmision": "2026-04-23",
  "montoTotal": 4181.92,
  "moneda": "USD",
  "nombreArchivo": "OC_007950.pdf",
  "tipoDocumentalLabel": "Orden de compra"
}
```
