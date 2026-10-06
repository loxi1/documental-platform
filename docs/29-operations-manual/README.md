# Operations Manual

Manual operativo oficial de Documental Platform.

## Objetivo

Centralizar los procedimientos para desplegar, configurar, operar, monitorear, recuperar y actualizar la plataforma.

## Índice operativo

1. `01-primer-despliegue.md` — preparación inicial de infraestructura.
2. `02-nuevo-desarrollador.md` — incorporación de desarrolladores.
3. `03-configuracion-local.md` — configuración del entorno local.
4. `04-configuracion-produccion.md` — configuración del entorno productivo.
5. `05-backup-restore.md` — respaldo y recuperación.
6. `06-actualizar-version.md` — actualización de una release autorizada.
7. `07-incidentes.md` — tratamiento operativo de incidentes.
8. `08-monitoreo.md` — monitoreo.
9. `09-observabilidad.md` — observabilidad.
10. `10-checklist-go-live.md` — gate operativo de go-live.
11. `11-deployment-readiness-checklist.md` — readiness para primer despliegue AWS.

## Autoridades relacionadas

El procedimiento completo de promoción de software está definido en:

`docs/31-governance/07-release-process.md`

El estándar Git está definido en:

`docs/23-standards/07-git.md`

El deploy normal de una release ya autorizada está definido en:

`docs/18-runbooks/deploy-produccion.md`

El rollback productivo está definido en:

`docs/18-runbooks/rollback.md`

La operación del OCR productivo está definida en:

`docs/18-runbooks/ocr-worker-host.md`

## Regla de autoridad

Este manual no redefine la cadena de release.

La ruta estándar es:

`development branch → SOURCE main → Enterprise main → CI/GHCR → EC2`

Los runbooks describen operaciones concretas dentro de esa cadena y deben mantenerse alineados con `docs/31-governance/07-release-process.md`.

Los documentos históricos, evidencias, handoffs y paquetes de revisión no sustituyen estas autoridades operativas.
