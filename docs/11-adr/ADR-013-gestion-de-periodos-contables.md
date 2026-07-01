**Estado:** Base inicial  
**Responsable:** Arquitectura Funcional

---
# ADR-013 Gestión de Períodos Contables

## Estado

Propuesto.

## Contexto

En MVP, el período se calcula desde la fecha_emision de la factura confirmada.

## Decisión futura

Cuando existan cierres mensuales formales, crear core.periodos_contables y asociar expedientes a períodos cerrados.

## Regla

Un cambio posterior en la factura no debe mover automáticamente un expediente de un período cerrado.
