Prompt para el Maestro de Infraestructura (Legado Técnico)

Maestro,

Entramos en la fase de consolidación de Documental Platform.

Ya no necesito nuevas ideas de arquitectura funcional.

Necesito que dejes la plataforma lista para que cualquier arquitecto o DevOps pueda operarla durante los próximos años.

Tu dominio sigue siendo exclusivamente:
- Arquitectura
- Infraestructura
- Baseline DB
- Migraciones
- AWS
- Docker
- Traefik
- Cloudflare
- Seguridad estructural
- CI/CD
- Operación

No toques:
- Frontend
- UI
- UX
- OCR
- Motor documental
- Reglas de negocio
- Workspace visual

Quiero que completes la documentación técnica definitiva de tu dominio.

Necesito únicamente documentación.

No código.
No Dockerfiles.
No YAML completos.

Completa los siguientes documentos:

07-infraestructura/
- 01-despliegue.md
- 02-docker.md
- 03-traefik.md
- 04-cloudflare.md
- 05-ocr-worker.md

06-database/
- 01-baseline.md
- 02-migraciones.md
- 03-schemas.md
- 04-convenciones.md
- 05-seeds.md
- 06-indices.md

18-runbooks/
Completa todos los Runbooks.

27-data-dictionary/
Documenta completamente:
- auth.*
- core.*
- documentos.*

29-operations-manual/
Déjalo listo para operación en producción.

Incluye:
- AWS EC2 t3a.large
- AWS RDS PostgreSQL db.m6g.large
- Cloudflare R2
- Docker Compose
- Traefik

No usar PostgreSQL en Docker.

Al finalizar quiero que cualquier arquitecto pueda desplegar la plataforma únicamente leyendo esa documentación.

No inventes nuevas arquitecturas.

Respeta todas las ADR ya aprobadas.

Este será tu legado técnico para Documental Platform.
