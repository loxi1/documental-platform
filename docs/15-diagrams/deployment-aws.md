# Deployment AWS

```mermaid
flowchart TD
    User[Usuario]
    CF[Cloudflare]
    EC2[EC2 t3a.large]
    Docker["Docker Compose en EC2"]
    Host["Ubuntu host en EC2"]
    Traefik[Traefik]
    Web[Web Admin]
    Gateway[API Gateway]
    Auth[ms-auth]
    Docs[ms-documentos]
    NATS[NATS]
    OCR["OCR Worker - Python venv + systemd"]
    RDS[(RDS PostgreSQL db.m6g.large)]
    R2[(Cloudflare R2)]

    User --> CF
    CF --> EC2
    EC2 --> Docker
    EC2 --> Host
    Docker --> Traefik
    Docker --> Web
    Docker --> Gateway
    Docker --> Auth
    Docker --> Docs
    Docker --> NATS
    Host --> OCR
    Traefik --> Web
    Traefik --> Gateway
    Gateway --> Auth
    Gateway --> Docs
    Docs --> NATS
    NATS --> OCR
    Docs --> RDS
    Docs --> R2
```

## Referencias

- `../07-infraestructura/01-despliegue.md`
- `../07-infraestructura/02-docker.md`
- `../07-infraestructura/05-ocr-worker.md`
- `../18-runbooks/ocr-worker-host.md`
- `../29-operations-manual/11-deployment-readiness-checklist.md`

## Continuidad R2 — 23/10/2026

Fuente: paquete MSII `PAQUETE_CODEX_R2_DOCUMENTACION_INVENTARIO_2026-10-23.md` y actualización ME `ACTUALIZACION_BIBLIOTECARIO_TECNICO_R2_2026-10-23.md`, ambos en `/home/loxi1/Descargas/`. Producción R2 = **DEPLOY_TECHNICAL_PASS reportado por PO/MSII**; aceptación funcional integral = **PENDING**, E2E = **NOT_VERIFIED**. Esta actualización documental no accedió a EC2/GHCR/RDS ni autoriza operaciones.

Commit Enterprise R2: `e1f099faeb4dfdc9f2b49b9984fe211935875ff3`. Ver [manifest vigente](../31-governance/RELEASE_MANIFEST.md), [deploy](../18-runbooks/DEPLOYMENT_RUNBOOK.md) y [rollback](../18-runbooks/ROLLBACK_RUNBOOK.md).

Los únicos servicios de aplicación recreados en R2 fueron api-gateway, ms-auth, ms-documentos y web-admin. NATS/Traefik permanecen en Docker; OCR en documental-ocr-worker.service, fuera de la recreación de aplicaciones.
