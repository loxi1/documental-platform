# Runbooks

Runbooks operativos existentes de Documental Platform.

## Release y producción

- `deploy-produccion.md` — despliegue de una release Enterprise autorizada en EC2.
- `rollback.md` — reversión controlada de una release de aplicación.
- `ec2-bootstrap.md` — preparación/bootstrap de EC2.
- `production-env.md` — configuración del entorno productivo.

## Base de datos

- `backup-rds.md` — respaldo de RDS.
- `restore-rds.md` — restauración de RDS.

Las migraciones requieren su propio control autorizado. Este índice no implica autorización para ejecutarlas.

## OCR

- `ocr-worker-host.md` — autoridad operativa del OCR productivo nativo en Ubuntu/systemd.
- `actualizar-ocr.md` — actualización controlada del OCR.

OCR PROD no pertenece al stack Docker/GHCR de aplicación.

## Seguridad e infraestructura

- `rotacion-secretos.md` — rotación de secretos.
- `renovar-certificados.md` — renovación de certificados.

## Configuración funcional

- `agregar-empresa.md` — incorporación/configuración de empresa.

## Autoridad de release

El procedimiento completo de promoción está definido en:

`docs/31-governance/07-release-process.md`

El estándar Git está definido en:

`docs/23-standards/07-git.md`

Los runbooks ejecutan operaciones concretas; no sustituyen la gobernanza de release.

## Regla documental

Este índice enumera únicamente runbooks materializados en este directorio.

No deben anunciarse procedimientos inexistentes como si fueran runbooks operativos disponibles.

## Continuidad vigente reportada: R2, 23/10/2026

- [Manifest vigente e identidades](../31-governance/RELEASE_MANIFEST.md).
- [Procedimiento focal R2 e incidente de recreación](DEPLOYMENT_RUNBOOK.md).
- [Verificación y aceptación pendiente](DEPLOYMENT_VERIFICATION.md).
- [Rollback R2 → C1 preparado, no ensayado](ROLLBACK_RUNBOOK.md).
- [Inventario local SOURCE/Enterprise y ramas](../31-governance/BRANCH_INVENTORY.md).

Estos registros distinguen producción reportada por PO/MSII de inspección local directa; no autorizan ejecutar sus comandos.
