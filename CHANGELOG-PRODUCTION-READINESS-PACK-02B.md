# Changelog — Production Readiness Pack 02B

## Corregido

- OCR Worker removido de Docker Compose productivo.
- OCR Worker definido como servicio systemd en host.
- Agregado script de instalación OCR en EC2.
- Agregado Dockerfile Next para web-admin.
- Agregado web-admin al compose productivo.
- Actualizado `.env.production.example`.

## Decisión

Producción usa Docker para servicios web/backend y host Python para OCR.
