# GET /api/v1/expedientes/bandeja-contable

## Qué representa

Lista expedientes que pertenecen al período contable seleccionado, usando la factura confirmada como ancla.

## Query params

- `empresa`: código de empresa, ejemplo `BBTI`.
- `anio`: año contable, ejemplo `2026`.
- `mes`: mes contable, ejemplo `1`.

## Regla principal

Solo devuelve expedientes con `FACTURA` confirmada cuya `fecha_emision` cae dentro del período.

## Response conceptual

```json
{
  "success": true,
  "data": [
    {
      "expediente_id": "41",
      "empresa_codigo": "BBTI",
      "codigo_expediente": "050201",
      "factura_id": 3755,
      "serie": "F001",
      "numero": "00017434",
      "fecha_emision": "2026-01-06",
      "documento_principal": {
        "tipoDocumental": "OC",
        "numero": "007950"
      },
      "documentos": []
    }
  ]
}
```

## Endpoint alias

También puede existir:

```text
GET /api/v1/expedientes/revision-contable
```
