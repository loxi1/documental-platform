# Revisión Contable Flow

```mermaid
flowchart TD
    Factura[Factura confirmada]
    Fecha[fecha_emision]
    Periodo[Período contable]
    Expediente[Expediente asociado]
    Matriz[Matriz documental]
    Revision[Revisión contable]

    Factura --> Fecha
    Fecha --> Periodo
    Periodo --> Expediente
    Expediente --> Matriz
    Matriz --> Revision
```

## Regla

Revisión Contable nace desde facturas confirmadas por período, no desde expedientes sin factura.

## Referencias

- `../11-adr/ADR-004-factura-periodo.md`
- `../17-domain/revision-contable.md`
- `../16-api/revision-contable.md`
