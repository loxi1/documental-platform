# Documental Platform

Documental Platform es una plataforma privada de gestión documental por Workspace.

## Entrada rápida

| Necesidad | Documento |
|---|---|
| Visión | `docs/project/00-VISION-PROYECTO.md` |
| Arquitectura | `docs/02-arquitectura/01-arquitectura-general.md` |
| Motor Documental | `docs/motor-documental/Motor-Documental-Architecture.md` |
| Producto/UI | `docs/03-producto/01-product-guidelines.md` |
| Infraestructura | `docs/07-infraestructura/01-despliegue.md` |
| Gobierno | `GOVERNANCE.md` |
| Contribuir | `CONTRIBUTING.md` |

## Regla principal

El conocimiento oficial vive en el repositorio, no en chats.

# documental-platform
levanta proyecto:
docker exec -it dp_postgres psql -U postgres -d documental_platform


pnpm --filter @documental/api-gateway build
pnpm --filter @documental/api-gateway start:dev

pnpm --filter @documental/ms-documentos build
pnpm --filter @documental/ms-documentos start:dev

pnpm --filter @documental/ms-auth build
pnpm --filter @documental/ms-auth start:dev


rm -rf apps/web-admin/.next
pnpm --filter web-admin build
pnpm --filter web-admin dev


source .venv/bin/activate
loxi1@Servidor-Ubuntu:~/projects/apps/documental-platform/workers/ocr-worker$ python -m app.main

loxi1@Servidor-Ubuntu:~/projects/apps/documental-platform/workers/ocr-worker$ python -m app.test_subscribe_clasificado
