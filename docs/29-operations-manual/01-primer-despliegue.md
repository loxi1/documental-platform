# Primer Despliegue

## Objetivo

Orquestar el primer despliegue de Documental Platform en producción utilizando las autoridades y runbooks existentes.

Este documento no sustituye los checklists ni los runbooks especializados.

## 1. Readiness de infraestructura

Antes del primer deploy completar:

`11-deployment-readiness-checklist.md`

Debe quedar preparada y validada la infraestructura requerida:

- EC2;
- RDS PostgreSQL;
- Cloudflare R2 privado;
- Docker / Docker Compose para los servicios de aplicación;
- Traefik / HTTPS;
- variables y secretos productivos;
- backups y plan de restore.

La configuración productiva se complementa con:

`04-configuracion-produccion.md`

## 2. Release de aplicación

El software que llega al primer despliegue debe haber completado el procedimiento definido en:

`docs/31-governance/07-release-process.md`

La cadena estándar es:

`development branch → SOURCE main → Enterprise main → CI/GHCR → EC2`

No desplegar directamente desde SOURCE, un development branch, un worktree o el index.

## 3. Base de datos

Antes de cualquier cambio de esquema:

- validar backup/snapshot requerido;
- verificar la migración autorizada;
- ejecutar únicamente las migraciones incluidas en el control correspondiente;
- validar el resultado antes de continuar.

El primer despliegue no autoriza migraciones adicionales por conveniencia.

## 4. OCR productivo

OCR PROD no pertenece al stack Docker/GHCR de aplicación.

Su autoridad operativa es:

`docs/18-runbooks/ocr-worker-host.md`

OCR productivo corre nativamente en Ubuntu mediante Python venv + systemd.

## 5. Deploy de aplicación

Ejecutar el procedimiento:

`docs/18-runbooks/deploy-produccion.md`

El checkout EC2 debe provenir de Enterprise main y corresponder a la release autorizada.

## 6. Go-live

Después del deploy completar:

`10-checklist-go-live.md`

El go-live requiere health técnico y validación funcional; levantar contenedores por sí solo no constituye cierre.

## 7. Cierre

Registrar como mínimo:

- commit Enterprise desplegado;
- imágenes/digests acreditados;
- estado de infraestructura;
- estado de migraciones autorizadas;
- runtime witness;
- resultado del smoke;
- resultado del checklist de go-live.

Sólo después corresponde declarar el primer despliegue cerrado.
