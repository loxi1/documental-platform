# Cookbook Documentos

## Editar documento confirmado

```bash
TOKEN="<access-token>"

curl -X PATCH "http://localhost:3000/api/v1/documentos/3779/editar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoDocumental":"PAGO_DETRACCION",
    "metadata":{
      "numero":"296801526",
      "fechaEmision":"2026-02-05",
      "moneda":"SOLES",
      "montoTotal":"240"
    },
    "observacion":"Corrección de moneda desde Finanzas"
  }'
```

## Reglas

- No reprocesa OCR.
- No sube archivo.
- Mantiene auditoría.
