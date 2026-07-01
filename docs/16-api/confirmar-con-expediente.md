# POST /api/v1/documentos/ocr-resultados/:id/confirmar-con-expediente

## Qué representa

Confirma un resultado OCR y lo convierte en documento oficial vinculado a expediente.

## Reglas

- Backend recalcula clave documental.
- Backend completa cliente, expediente y RUC comprador.
- Backend valida tipo de relación.
- Backend persiste fecha final confirmada.
- Para `FACTURA`, `fecha_emision` define período contable.
- Actualiza `ocr_resultados.estado = confirmado`.
- Vincula en `expediente_documentos`.

## Request ejemplo FACTURA

```json
{
  "expedienteId": "41",
  "tipoRelacion": "adjunto_factura",
  "esPrincipal": false,
  "orden": 10,
  "metadata": {
    "tipoDocumental": "FACTURA",
    "clienteAbreviatura": "BBTI",
    "serie": "F001",
    "numero": "00017434",
    "rucEmisor": "20603430248",
    "fechaEmision": "2026-01-06",
    "montoTotal": "748.90",
    "rucComprador": "20565747356",
    "codigoExpediente": "050201"
  },
  "observacion": "Guardar y confirmar adjunto desde Compras"
}
```

## Request ejemplo PAGO_DETRACCION

```json
{
  "expedienteId": "41",
  "tipoRelacion": "adjunto_detraccion",
  "esPrincipal": false,
  "orden": 20,
  "metadata": {
    "tipoDocumental": "PAGO_DETRACCION",
    "clienteAbreviatura": "BBTI",
    "numero": "296801526",
    "numeroOperacion": "296801526",
    "numeroConstancia": "296801526",
    "fechaEmision": "2026-02-05",
    "fechaPago": "2026-02-05",
    "banco": "BANCO DE LA NACION",
    "rucProveedor": "20391062057",
    "proveedor": "Instituto De Seguridad Minera",
    "montoTotal": "240",
    "moneda": "SOLES",
    "rucComprador": "20565747356",
    "codigoExpediente": "050201",
    "documentoRelacionado": "FFA1 - 00029972"
  },
  "observacion": "Guardar y confirmar pago desde Finanzas"
}
```
