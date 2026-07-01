# Cookbook OCR

## Procesar OCR

```bash
curl -X POST "http://localhost:3000/api/v1/documentos/archivos/3840/procesar-ocr" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoEsperado":"PAGO_DETRACCION",
    "areaOrigen":"FINANZAS",
    "clienteAbreviatura":"BBTI",
    "expedienteId":"41",
    "tipoRelacionSugerida":"adjunto_detraccion",
    "canalIngreso":"FINANZAS_EDITAR_UPLOAD",
    "reprocesar":true
  }'
```

## Interpretación

- `pendiente_validacion`: usuario debe revisar.
- `claveDocumental = null`: faltan datos mínimos.
- `camposFaltantes`: guía al formulario.
