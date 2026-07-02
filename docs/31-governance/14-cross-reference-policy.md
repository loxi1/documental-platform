# Cross Reference Policy

## Propósito

Evitar documentación aislada.

Todo documento importante debe terminar con una sección:

```md
## Referencias
```

## Referencias mínimas por tipo

### Domain

Debe referenciar:

- ADR relacionada.
- API relacionada.
- Business Flow.
- Data Dictionary.
- Motor Documental si aplica.

### API

Debe referenciar:

- Domain.
- Business Flow.
- Permisos.
- Data Dictionary.

### Data Dictionary

Debe referenciar:

- Domain.
- API.
- Migración o baseline.
- ADR si aplica.

### Product

Debe referenciar:

- UI Foundation.
- Product Architecture.
- Design Tokens.
- Component Catalog.

## Regla

Una regla de negocio no debe quedar documentada en un solo archivo sin referencias.
