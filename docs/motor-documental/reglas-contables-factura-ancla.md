# Regla Contable: Factura Ancla

## Qué representa

Para Revisión Contable, la factura confirmada es el documento ancla del período contable.

## Regla principal

Un expediente solo entra a Revisión Contable si tiene una `FACTURA` confirmada.

## Período contable

El período contable se determina por:

```text
documentos.documentos.fecha_emision de la FACTURA confirmada
```

Nunca por:

- fecha de OC
- fecha de OS
- fecha de guía
- fecha de transferencia
- fecha de detracción
- fecha de carga
- fecha de confirmación OCR

## Ejemplo

Factura:

```text
F001-00017434
fecha_emision = 2026-01-06
```

Período contable:

```text
2026-01
```

El expediente aparece en Revisión Contable para enero 2026 aunque otros documentos tengan fechas de febrero, abril o junio.
