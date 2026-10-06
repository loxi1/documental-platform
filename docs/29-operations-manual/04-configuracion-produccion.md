# Configuración de Producción

## Propósito

Resumir la configuración productiva de Documental Platform y dirigir cada operación a su autoridad correspondiente.

Este documento no sustituye los runbooks de deploy, backup, restore u OCR.

## Infraestructura

- aplicación: EC2 t3a.large;
- base de datos: AWS RDS PostgreSQL db.m6g.large;
- almacenamiento de objetos: Cloudflare R2 privado;
- reverse proxy: Traefik;
- servicios de aplicación: Docker Compose;
- OCR productivo: Ubuntu host + Python venv + systemd.

PostgreSQL productivo no corre en Docker.

MinIO pertenece a LAB y no forma parte de producción.

## Servicios Docker productivos

- web-admin;
- api-gateway;
- ms-auth;
- ms-documentos;
- NATS;
- Traefik.

OCR Worker no pertenece al stack Docker/GHCR productivo.

## Configuración y secretos

La configuración productiva debe mantenerse fuera del repositorio cuando contenga secretos.

Usar como referencias:

- `../18-runbooks/production-env.md`
- `11-deployment-readiness-checklist.md`

## Backup y restore

Las operaciones de backup y restore de RDS se gobiernan por:

- `../18-runbooks/backup-rds.md`
- `../18-runbooks/restore-rds.md`

Restore no forma parte automática de un deploy ni de un rollback de aplicación.

## OCR

La autoridad operativa del OCR productivo es:

- `../18-runbooks/ocr-worker-host.md`

La actualización de dependencias OCR del host se documenta en:

- `../18-runbooks/actualizar-ocr.md`

## Release y deploy

La cadena estándar es:

`development branch → SOURCE main → Enterprise main → CI/GHCR → EC2`

Autoridades:

- gobernanza de release: `../31-governance/07-release-process.md`;
- estándar Git: `../23-standards/07-git.md`;
- deploy EC2: `../18-runbooks/deploy-produccion.md`;
- actualización posterior: `06-actualizar-version.md`;
- go-live: `10-checklist-go-live.md`.

No se despliega EC2 directamente desde SOURCE, development branches, worktrees o índices.
