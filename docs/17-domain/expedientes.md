# Expedientes

## Qué representa

Un expediente agrupa documentos de negocio relacionados con una operación, proyecto, centro de costo u orden.

## Tabla principal

`documentos.expedientes`

## Reglas

- Un expediente puede existir sin factura.
- Compras, Almacén y Finanzas pueden trabajar con expedientes incompletos.
- Revisión Contable solo lista expedientes con factura confirmada para el período seleccionado.
- El expediente no define el período contable; lo define la factura.

## Relación documental

Los documentos se vinculan por `documentos.expediente_documentos`.

## Caso real

Expediente:

```text
id = 41
empresa_codigo = BBTI
codigo_expediente = 050201
descripcion = PRODUCCION C X DISTRIBUIR
```

Documentos vinculados:

- OC principal.
- Factura.
- Guía.
- Nota de ingreso.
- Transferencia.
- Detracción.
