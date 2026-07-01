# Cookbook Revisión Contable

## Buscar expedientes por período contable

```bash
curl "http://localhost:3000/api/v1/expedientes/bandeja-contable?empresa=BBTI&anio=2026&mes=1"
```

## Resultado esperado

Debe devolver expedientes con factura confirmada cuya fecha de emisión esté en enero 2026.

Ejemplo:

```text
Expediente 050201
Factura F001-00017434
fecha_emision = 2026-01-06
```

## Regla

No usar fecha de carga ni fecha de OC.
