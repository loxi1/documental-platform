# Production Readiness Pack 02B — OCR en Host

Corrige el Pack 02 para respetar la decisión vigente:

**El OCR Worker NO corre como contenedor Docker en producción.**

Corre como servicio Python instalado en el sistema operativo de la EC2.

## Incluye

- `deployment/docker/docker-compose.production.yml` sin `ocr-worker`
- `deployment/env/.env.production.example`
- `deployment/systemd/documental-ocr-worker.service`
- `deployment/scripts/install-ocr-host.sh`
- `deployment/scripts/ocr-status.sh`
- `docs/18-runbooks/ocr-worker-host.md`
