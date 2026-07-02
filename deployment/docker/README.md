# Docker Deployment

## Producción

Archivo principal:

```bash
deployment/docker/docker-compose.production.yml
```

## Servicios

- traefik
- api-gateway
- ms-auth
- ms-documentos
- ocr-worker
- nats

## No incluye

- PostgreSQL
- pgAdmin

En producción PostgreSQL vive en AWS RDS.
