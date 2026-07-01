# OCR Worker y Extractores

## Qué representa

El OCR Worker procesa archivos desde R2, extrae texto y propone metadata documental.

## Tipos soportados

- `FACTURA`
- `OC`
- `OS`
- `GUIA_REMISION`
- `NOTA_INGRESO`
- `PAGO_TRANSFERENCIA`
- `PAGO_DETRACCION`

Pendientes de consolidación documental:

- `RECIBO_HONORARIO`
- OCR escaneado avanzado

## Salida estándar esperada

Cada extractor debe devolver:

```text
metadata
metadataSource
confidence
camposDetectados
camposFaltantes
```

## Regla

El OCR produce una propuesta. La validación humana confirma el documento oficial.

## Ejemplo PAGO_DETRACCION

OCR puede detectar parcialmente:

- banco
- fecha de pago
- RUC proveedor
- cliente RUC
- cliente nombre

Si no detecta número de operación o monto, debe quedar pendiente de validación manual.

## No hacer

- No confirmar automáticamente si faltan campos mínimos.
- No generar clave documental incompleta.
- No responder 500 por metadata incompleta.
