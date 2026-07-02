# Changelog — Production Readiness Pack 02

## Agregado

- Deployment structure.
- Production env example.
- Docker Compose production.
- Dockerfile Nest genérico.
- Dockerfile OCR Worker.
- Traefik production config.
- Scripts deploy, rollback, healthcheck, logs, backup, restore.

## Decisiones

- PostgreSQL no se ejecuta en Docker en producción.
- RDS es la base productiva.
- R2 es almacenamiento privado.
- Traefik es único punto público HTTP/HTTPS.
