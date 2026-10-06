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
