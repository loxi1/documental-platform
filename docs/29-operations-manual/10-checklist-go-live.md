# Checklist Go Live

## Objetivo

Acreditar que una release desplegada puede entrar o permanecer en servicio productivo.

Este checklist se ejecuta después del deploy y no sustituye:

- `11-deployment-readiness-checklist.md` para readiness del primer despliegue;
- `docs/18-runbooks/deploy-produccion.md` para la operación de deploy;
- `docs/31-governance/07-release-process.md` para la gobernanza completa del release.

## Release y provenance

- [ ] commit SOURCE main de la release identificado.
- [ ] commit Enterprise main desplegado identificado.
- [ ] Enterprise push acreditado.
- [ ] CI asociado al commit Enterprise = PASS.
- [ ] imágenes GHCR correspondientes identificadas.
- [ ] digest esperado/verificado cuando esté disponible.
- [ ] checkout EC2 = commit Enterprise esperado.

## Base de datos

Cuando el entregable involucra base de datos:

- [ ] backup/snapshot requerido acreditado.
- [ ] migraciones autorizadas aplicadas.
- [ ] resultado de migraciones verificado.

Si el entregable no involucra cambios de base de datos, registrar N/A en lugar de ejecutar operaciones innecesarias.

Restore de RDS no forma parte automática del go-live.

## Runtime

- [ ] contenedores de aplicación requeridos running/healthy.
- [ ] API health = PASS.
- [ ] Web health = PASS.
- [ ] HTTPS = PASS.
- [ ] R2 permanece privado y operativo.
- [ ] variables productivas requeridas presentes.
- [ ] secretos no expuestos ni incorporados al repositorio.

## OCR

Cuando el flujo desplegado depende de OCR:

- [ ] `documental-ocr-worker.service` operativo.
- [ ] OCR witness = PASS.
- [ ] logs OCR sin error bloqueante relacionado con el entregable.

OCR PROD corre en host/systemd y no debe incorporarse al stack Docker/GHCR de aplicación.

## Smoke funcional

- [ ] smoke específico del entregable = PASS.
- [ ] capacidades críticas adyacentes requeridas = PASS o N/A justificado.
- [ ] no existe regresión bloqueante conocida para el alcance autorizado.

El health técnico no sustituye el smoke funcional.

## Operación

- [ ] logging disponible.
- [ ] monitoreo disponible.
- [ ] rollback de aplicación identificable si fuera necesario.
- [ ] responsables conocen el estado de la release.

## Criterio de cierre

### GO / CLOSED_PASS

Sólo corresponde cuando:

- provenance de release está acreditada;
- runtime witness está acreditado;
- health requerido = PASS;
- smoke del entregable = PASS;
- controles de datos aplicables = PASS;
- no existe bloqueo operativo conocido dentro del alcance.

### NO-GO

No cerrar el release cuando:

- EC2 no corresponde al commit Enterprise esperado;
- las imágenes no pueden relacionarse con la release autorizada;
- API o Web health falla;
- el smoke del entregable falla;
- una migración requerida no está validada;
- existe una regresión bloqueante;
- OCR requerido por el flujo no está operativo.

Levantar contenedores por sí solo no constituye `CLOSED_PASS`.
