# Operations Manual

Manual operativo oficial de Documental Platform.

## Objetivo

Centralizar los procedimientos para desplegar, configurar, operar, monitorear, recuperar y actualizar la plataforma.

## Entrada al ciclo de desarrollo

Comenzar por el [estándar canónico SOURCE y release R1](../23-standards/11-source-development-and-release.md), aprobado por PO, ratificado por MI e integrado en SOURCE. Allí se definen inicio, gates, evidencia NORMAL/RELEASE/RECOVERY y transferencia de continuidad. Este índice es el punto de entrada; no se necesita otro bootstrap duplicado.

## Continuidad vigente — 26/10/2026

Registro de continuidad en el punto de entrada existente; no crea otro manual ni manifiesto. Acción `BBTI_POST_DEPLOY_CONTINUITY_AND_NEXT_BRANCH_R1`. Para identidades exactas de release consultar únicamente el [manifiesto canónico](../31-governance/RELEASE_MANIFEST.md); para ramas y worktrees, el [inventario Git](../31-governance/BRANCH_INVENTORY.md).

```ini
PROJECT=DOCUMENTAL_PLATFORM_BBTI
CURRENT_PHASE=POST_DEPLOY_DOCUMENTARY_CLOSURE_PENDING_INTEGRATION
SOURCE_MAIN_HEAD=a393932aea98c5e1b0736694b980997ebd4b0f98
SOURCE_REMOTE_SYNC=YES_OBSERVED_BEFORE_DOCUMENTARY_EDIT
ACTIVE_WORKTREE=/home/loxi1/projects/apps/documental-platform-test-failures-finanzas-filter
ACTIVE_REQUIREMENT=TEST_FAILURES_2_AND_FINANZAS_FILTER
APPROVED_SCOPE=DOCUMENTATION_AND_LOCAL_BRANCH_PREPARATION_ONLY
TEST_STATUS=PO_MANAGED_9_PASS_21_CHECKS_INHERITED;R2_122_PASS_2_FAIL_REPORTED
PENDING_DECISION=DOCUMENTATION_INTEGRATION_AND_MSII_G1_SCOPE
NEXT_ACTION=MSII_G1_FOCAL_DIAGNOSIS
PRODUCTION_STATUS=R2_RUNTIME_HEALTHY_OBSERVED;AUTH_USERS_PASS_REPORTED
AUTH_USERS_PROVISIONING=PASS_REPORTED
NEW_USERS=4
WORKSPACE_RELATIONS=8
USER_IDS=6,7,8,9
HISTORICAL_USERS=PRESERVED
HISTORICAL_WORKSPACES=PRESERVED
POSTCHECK=PASS_REPORTED
PO_PASSWORD_RESOLUTION=REPORTED_COMPLETE
SIGNED_ACKNOWLEDGEMENTS=NOT_YET_VERIFIED
AUTH_USERS_PROVISIONING_REEXECUTION=FORBIDDEN
```

**Procedencia y límites.** El cierre de datos, IDs y claves procede de la orden MI/PO adjunta el 26/10/2026; no de una consulta RDS de esta edición. Cinco históricos y once relaciones preservados según ese reporte. La evidencia local del último intento de cambio de claves sigue BLOCKED/NOT_EXECUTED; no demuestra el cierre posterior reportado. Falta anexar esa evidencia posterior y verificar acuses, sin repetir aprovisionamiento ni cambiar credenciales. No registrar secretos, hashes de autenticación o material de recuperación.

**Hechos observados.** SOURCE y Enterprise main sincronizados con consulta remota; EC2 coincide con Enterprise, limpio; runtime R2 running, web/API HTTP 200. Evidencia fechada en `/home/loxi1/evidencias/documental-platform/post-deploy-continuity-r1/`. El cierre documental permanece sin commit; la nueva rama funcional nace del main publicado y está limpia. Integrar estos documentos cuando lo autorice el PO y actualizar focalmente la rama antes de implementar; no mezclar este diff con código funcional.

**Próximo G1, sin implementación.** MSII coordinará con MSI un diagnóstico único de (1) `[object Object]` y `reprocesar:true` en Guía versionada, (2) duplicidad OCR archivo 8/resultados 10 y 11 y (3) alcance PO del filtro Finanzas, contrastando `documental_v2.finanzas.correspondencia.autorizar_excepcion`. Son antecedentes, no causas raíz. La implementación funcional y el push no están autorizados.

**Antecedentes archivados.** Las instantáneas R2/Actions #28 y C04/C06 HOLD conservan su alcance; no son nuevos bloqueos ni requieren reconciliación histórica. Registro del Bibliotecario y recepción institucional no confirmados por esta edición.

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
