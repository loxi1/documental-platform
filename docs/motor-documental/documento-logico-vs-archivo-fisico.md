# Documento lógico vs archivo físico

## Documento lógico

Tabla: `documentos.documentos`.

Representa el documento de negocio: factura, OC, guía, nota de ingreso, transferencia, detracción, etc.

Ejemplos:

- Factura F001-00017434 de REFERMAT.
- OC 007950.
- Detracción 296801526.

## Archivo físico

Tabla: `documentos.documentos_archivos`.

Representa el archivo almacenado en R2: PDF original, PDF escaneado, imagen, versión firmada, etc.

## Regla principal

Un documento lógico puede tener varios archivos físicos.

```text
Documento lógico
↓
Archivo v1 original
Archivo v2 escaneado
Archivo v3 firmado
```

## Caso real

Guía `EG07-00000163`:

- `documento_id = 3756`
- archivos físicos:
  - v1 original
  - v2 escaneado
  - v3 escaneado actual

Solo una versión debe estar marcada como actual.

## Reglas

- No crear otro documento lógico si la clave documental ya existe.
- Si existe la misma clave, sugerir `AGREGAR_VERSION`.
- No sobrescribir R2.
- Conservar historial de archivos.
