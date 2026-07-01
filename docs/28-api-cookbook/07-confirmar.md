# Cookbook Confirmar OCR

## Confirmar detracción

```bash
curl -X POST "http://localhost:3000/api/v1/documentos/ocr-resultados/80/confirmar-con-expediente" \
  -H "Content-Type: application/json" \
  -d '{
    "expedienteId":"41",
    "tipoRelacion":"adjunto_detraccion",
    "esPrincipal":false,
    "orden":20,
    "metadata":{
      "tipoDocumental":"PAGO_DETRACCION",
      "clienteAbreviatura":"BBTI",
      "numero":"296801526",
      "numeroOperacion":"296801526",
      "numeroConstancia":"296801526",
      "fechaEmision":"2026-02-05",
      "fechaPago":"2026-02-05",
      "banco":"BANCO DE LA NACION",
      "rucProveedor":"20391062057",
      "rucComprador":"20565747356",
      "montoTotal":"240",
      "moneda":"SOLES",
      "codigoExpediente":"050201"
    },
    "observacion":"Guardar y confirmar pago desde Finanzas"
  }'
```

## Resultado

Documento confirmado y vinculado al expediente.
