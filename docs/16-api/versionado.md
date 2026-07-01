# APIs de Versionado

## POST /api/v1/documentos/:documentoId/archivos/:archivoId/agregar-version

Agrega un archivo existente como nueva versión de un documento lógico.

### Request

```json
{
  "tipoVersion": "escaneado",
  "observacion": "Archivo duplicado agregado como versión",
  "marcarComoActual": true
}
```

### Reglas

- Mueve o vincula el archivo al documento lógico destino.
- Actualiza versión.
- Si `marcarComoActual = true`, desmarca versiones anteriores.
- Actualiza OCR como `confirmado_como_version` si aplica.

## GET /api/v1/documentos/:id/archivos

Consulta historial de versiones de un documento lógico.

### Response conceptual

```json
{
  "success": true,
  "data": [
    {
      "id": 3817,
      "documentoId": 3756,
      "tipoVersion": "original",
      "version": 1,
      "esVersionActual": false
    },
    {
      "id": 3820,
      "documentoId": 3756,
      "tipoVersion": "escaneado",
      "version": 3,
      "esVersionActual": true
    }
  ]
}
```
