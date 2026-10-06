# Deployment AWS

## Infraestructura objetivo

- EC2 t3a.large.
- PostgreSQL AWS RDS db.m6g.large.
- Cloudflare R2.
- Docker Compose para servicios de aplicación.
- Traefik.
- Cloudflare Tunnel cuando aplique.

## Límites de ejecución

En producción:

- Web Admin, API Gateway, ms-auth, ms-documentos, NATS y Traefik se ejecutan mediante Docker.
- OCR Worker se ejecuta nativamente en Ubuntu mediante Python venv + systemd.
- OCR Worker no pertenece al stack Docker/GHCR productivo.
- PostgreSQL se ejecuta en AWS RDS y no en Docker.
- Cloudflare R2 es el almacenamiento de objetos productivo.
- MinIO pertenece a LAB y no forma parte de la arquitectura productiva.

## Referencias

- `../07-infraestructura/02-docker.md`
- `../07-infraestructura/05-ocr-worker.md`
- `../15-diagrams/deployment-aws.md`
- `../18-runbooks/ocr-worker-host.md`
