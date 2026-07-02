# Document Metadata Standard

## Propósito

Estandarizar metadata para documentos principales.

## Formato recomendado

```yaml
---
title:
owner:
status:
version:
last_review:
source_of_truth:
related:
---
```

## Estados permitidos

- Draft
- Review
- Approved
- Deprecated
- Archived

## Owners permitidos

- Product Owner
- Knowledge Manager
- Chief Architect
- Domain Architect
- Product Architect

## Ejemplo

```yaml
---
title: Factura Ancla Contable
owner: Domain Architect
status: Approved
version: 1.0
last_review: 2026-07
source_of_truth: true
related:
  - 11-adr/ADR-004-factura-periodo.md
  - 17-domain/facturas.md
---
```
