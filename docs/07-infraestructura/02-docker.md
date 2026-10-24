# Docker

## Servicios productivos en Docker

El stack Docker de aplicación incluye:

- web-admin
- api-gateway
- ms-auth
- ms-documentos
- NATS
- Traefik

## OCR productivo

OCR Worker no forma parte del stack Docker/GHCR productivo.

En producción corre nativamente en Ubuntu mediante:

- Python venv;
- systemd;
- dependencias OCR instaladas en el host.

La autoridad operativa es:

`../18-runbooks/ocr-worker-host.md`

NATS permanece en Docker y el OCR host consume NATS mediante la conectividad local autorizada.

## LAB

El entorno LAB puede utilizar un OCR Worker contenerizado para pruebas y validación.

La existencia del contenedor OCR en LAB no autoriza incorporarlo al stack Docker productivo.

MinIO pertenece al entorno LAB y no forma parte de la arquitectura productiva.

## Regla

Los cambios de estrategia de ejecución de OCR deben documentarse explícitamente y actualizar las autoridades de infraestructura y operación antes de utilizarse en producción.

## Continuidad R2 — 23/10/2026

Fuente: paquete MSII `PAQUETE_CODEX_R2_DOCUMENTACION_INVENTARIO_2026-10-23.md` y actualización ME `ACTUALIZACION_BIBLIOTECARIO_TECNICO_R2_2026-10-23.md`, ambos en `/home/loxi1/Descargas/`. Producción R2 = **DEPLOY_TECHNICAL_PASS reportado por PO/MSII**; aceptación funcional integral = **PENDING**, E2E = **NOT_VERIFIED**. Esta actualización documental no accedió a EC2/GHCR/RDS ni autoriza operaciones.

Commit Enterprise R2: `e1f099faeb4dfdc9f2b49b9984fe211935875ff3`. Ver [manifest vigente](../31-governance/RELEASE_MANIFEST.md), [deploy](../18-runbooks/DEPLOYMENT_RUNBOOK.md) y [rollback](../18-runbooks/ROLLBACK_RUNBOOK.md).

Los únicos servicios de aplicación recreados en R2 fueron api-gateway, ms-auth, ms-documentos y web-admin. NATS/Traefik permanecen en Docker; OCR en documental-ocr-worker.service, fuera de la recreación de aplicaciones.
