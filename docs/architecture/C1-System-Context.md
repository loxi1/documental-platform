# C1 - System Context

## Actores

- Compras
- Almacén
- Finanzas
- Contabilidad
- Administrador

## Sistemas externos

- PostgreSQL (AWS RDS)
- Cloudflare R2
- OCR Worker
- SUNAT (futuro)
- Servicio RUC (futuro)

```mermaid
flowchart LR
U[Usuarios]-->P[Documental Platform]
P-->R[(AWS RDS)]
P-->S[(Cloudflare R2)]
P-->O[OCR Worker]
```
