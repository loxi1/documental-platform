# Production Readiness Pack 02

## Objetivo

Preparar los artefactos base de despliegue productivo para Documental Platform.

Este pack asume:

- EC2 para aplicación.
- AWS RDS PostgreSQL para base de datos.
- Cloudflare R2 para archivos.
- Docker Compose para servicios.
- Traefik como reverse proxy.
- NATS como mensajería.
- PostgreSQL NO corre en Docker en producción.

## Integración

Desde la raíz del repositorio:

```bash
unzip documental-platform-production-readiness-pack-02.zip
cp -r documental-platform-production-readiness-pack-02/* .

chmod +x deployment/scripts/*.sh

git add deployment/
git commit -m "infra: add production readiness deployment pack"
```

## Siguiente paso

1. Revisar `deployment/env/.env.production.example`.
2. Copiar a `.env.production`.
3. Completar dominios, RDS, R2, JWT y NATS.
4. Ejecutar build local de imágenes.
