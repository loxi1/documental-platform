# POST /api/v1/documentos/archivos/:archivoId/procesar-ocr

## Qué representa

Solicita al OCR Worker procesar un archivo físico ya subido.

## Reglas

- Usa NATS subject `ocr.procesar-archivo`.
- Requiere que el OCR Worker esté activo.
- Genera o actualiza `documentos.ocr_resultados`.
- Devuelve metadata propuesta.
- No confirma documento.

## Request ejemplo

```json
{
  "tipoEsperado": "PAGO_DETRACCION",
  "areaOrigen": "FINANZAS",
  "clienteAbreviatura": "BBTI",
  "expedienteId": "41",
  "tipoRelacionSugerida": "adjunto_detraccion",
  "canalIngreso": "FINANZAS_EDITAR_UPLOAD",
  "reprocesar": true
}
```

## Response ejemplo

```json
{
  "success": true,
  "data": {
    "ok": true,
    "documentoId": 3779,
    "archivoId": 3840,
    "tipoDocumental": "PAGO_DETRACCION",
    "estado": "pendiente_validacion",
    "metadata": {
      "banco": "BANCO DE LA NACION",
      "fechaPago": "2026-02-05",
      "clienteRuc": "20565747356",
      "clienteAbreviatura": "BBTI"
    },
    "ocrResultadoId": 80,
    "requiereValidacionUsuario": true
  }
}
```

## Error conocido

Si no hay worker activo:

```text
Empty response. There are no subscribers listening to that message ("ocr.procesar-archivo")
```
