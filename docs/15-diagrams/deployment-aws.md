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
