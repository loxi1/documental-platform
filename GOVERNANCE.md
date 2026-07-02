# Engineering Governance

## Objetivo

Definir cómo evoluciona Documental Platform sin perder coherencia.

## Roles

| Rol | Responsabilidad |
|---|---|
| Product Owner | Prioridad, negocio, aceptación funcional |
| Chief Architect | Arquitectura, infraestructura, seguridad |
| Domain Architect | Motor Documental, backend, API, Data Dictionary |
| Product Architect | Producto, UX, UI Foundation |
| Knowledge Manager | Handbook, MkDocs, referencias, gobierno documental |

## Flujo de cambio

```text
Necesidad
↓
Análisis funcional
↓
ADR si aplica
↓
Implementación
↓
Pruebas
↓
Documentación
↓
Review
↓
Merge
```

## Reglas

- Ningún cambio importante entra solo como código.
- Ninguna API nueva entra sin documentación.
- Ninguna tabla nueva entra sin Data Dictionary.
- Ninguna operación productiva entra sin Runbook.
- Ningún componente visual repetido entra si existe componente común.
