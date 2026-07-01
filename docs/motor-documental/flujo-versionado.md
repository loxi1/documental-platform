# Versionado Documental

## Qué representa

El versionado permite asociar múltiples archivos físicos a un mismo documento lógico.

## Casos

- Archivo original.
- Escaneado posterior.
- Documento firmado.
- Archivo corregido.
- Reemplazo visual, sin borrar historial.

## Operaciones aprobadas

- Agregar versión.
- Marcar versión actual.
- Consultar historial.
- Reemplazar visualmente sin sobrescribir archivo físico.

## Reglas

- Una sola versión actual por documento lógico.
- No se elimina el archivo anterior.
- Si se detecta duplicado por clave documental, la acción sugerida es agregar versión.

## API relacionada

- `POST /api/v1/documentos/:documentoId/archivos/:archivoId/agregar-version`
- `GET /api/v1/documentos/:id/archivos`
