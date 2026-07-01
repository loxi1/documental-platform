# PATCH /api/v1/documentos/:id/editar

## Qué representa

Edita datos principales de un documento ya confirmado sin reprocesar OCR.

## Reglas

- Requiere token.
- No cambia archivo físico.
- No reprocesa OCR.
- Registra auditoría `EDITADO_DOCUMENTO_MANUAL`.
- Backend recalcula clave documental si corresponde.

## Request ejemplo

```json
{
  "tipoDocumental": "PAGO_DETRACCION",
  "metadata": {
    "tipoDocumental": "PAGO_DETRACCION",
    "clienteAbreviatura": "BBTI",
    "numero": "296801526",
    "fechaEmision": "2026-02-05",
    "fechaPago": "2026-02-05",
    "banco": "BANCO DE LA NACION",
    "rucProveedor": "20391062057",
    "proveedor": "Instituto De Seguridad Minera",
    "montoTotal": "240",
    "moneda": "SOLES",
    "documentoRelacionado": "FFA1 - 00029972"
  },
  "observacion": "Corrección de moneda desde Finanzas"
}
```
