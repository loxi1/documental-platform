# Operations Manual

## Continuidad vigente — 11/11/2026

Acción `MSI_CODEX_GIT_MANIFEST_CONTINUITY_RECONCILIATION_R4`. Esta sección prevalece sobre las prioridades de las instantáneas anteriores, que se preservan. No reabre MVP101 ni autoriza repetir sus validaciones. Las referencias Git vigentes y el trabajo protegido están en [BRANCH_INVENTORY](../31-governance/BRANCH_INVENTORY.md#continuidad-git-reconciliada--11112026).

Para nuevos chats MI/MSII/MSI: leer este índice, [estándar SOURCE/release R1](../23-standards/11-source-development-and-release.md) y [estándar Git](../23-standards/07-git.md), después solo los contratos del encargo.

### Producción aceptada, GHCR preparado y trabajo posterior

| Frente | Identidad / evidencia | Estado |
| --- | --- | --- |
| Último MVP productivo aceptado | 05/11/2026; SOURCE `88edc03136a446308d8b18fa778bdccf6c002be3`; Enterprise `a57c328cbf62de39aa91ed541ae32b449927a5b6` | ACCEPTED_WITH_OBSERVATIONS / DEPLOYED histórico |
| Cierre documental de aceptación | SOURCE `aef47ca8c307449d2d985128196c297102e80a4d`; Enterprise `dcf14470e80519d3a6f1114180a4652a27de4017` | ACCEPTED; evidencia local, sin nueva consulta EC2 |
| SOURCE main actual | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5`, local=remoto consultado | COMMITTED_AND_PUSHED |
| Enterprise main / manifest GHCR | `f80d05e80b522c18ab20751a7e18a9e6f626984c`, local=remoto consultado | BUILT_NOT_DEPLOYED |
| Build de las imágenes publicadas | `2ed7dd0f2e73b58d6d595606af56b8477e9496e8`; Actions#34, run42401171156,07/11/2026, SUCCESS verificado por lectura API | No prueba despliegue |

Evidencia canónica de aceptación: `/home/loxi1/bbti-evidence/controlled-production-release-r1/REPORT.md` y `acceptance-documentary-closure.json`. Evidencia de publicación posterior: `/home/loxi1/bbti-evidence/prepare-ghcr-release-with-manifest-r1/state.json`, `ghcr-images.json` y `REPORT.md`. La observación productiva de ese preflight es del07/11; no presentarla como verificación runtime del11/11.

El producto publicado es SOURCE `1ebdbf4f...` → Enterprise `7323e1b0...`,26 archivos acreditados. Su manifest propio Enterprise es f80d05e8 y permanece intacto. No reemplazarlo por el de SOURCE ni añadir contenido posterior a sus digests:

| Imagen publicada | Digest GHCR |
| --- | --- |
| ms-documentos | `sha256:3d48dbcfebc60b1b69db84b2f2fabecee2b024ed991cb53511c585a2e51c37f7` |
| web-admin | `sha256:f54bfb0bc69a015452c5123f2f36c70ca196ecbfb85e83f784a8415359c93cf9` |

Gateway/Auth se reutilizan; el soporte DEV Auth/NATS de SOURCE está excluido de Enterprise. OCR Python systemd es un artefacto independiente: publicar GHCR no lo instala ni reinicia.

### UX integrada de Compras OC/OS y Subir Facturas

Complemento `MSI_CODEX_R4_UX_DOCUMENTATION_COMPLETION_R1`. Cambios ya integrados en SOURCE y Enterprise mediante los commits acreditados en el [Inventario Git](../31-governance/BRANCH_INVENTORY.md); no requieren reintegración funcional. Esta precisión no modifica las adiciones previas R4 ni la continuidad separada de Mi Perfil/G2-B.

**Terminología OC/OS aprobada y presente en `NuevoExpedienteWizard.tsx`:**

- Descripciones: «Registrar una OC» y «Registrar una OS».
- Instrucción exacta PO: «Selecciona el documento principal, vincúlalo un Centro de costo o PR».
- Etiqueta: «Código y descripción»; placeholder: «Buscar por PR o centro costo».
- Se retiró «Se prevalidará antes de subir. Pueden coexistir varios principales distintos dentro del mismo contexto».
- Las sugerencias y el resumen de selección dejaron de mostrar los detalles Empresa, Cliente, Documentos y Alertas retirados por el alcance UX aprobado.

**Acciones verificadas por flujo y modo:**

| Acción / condición | Comportamiento acreditado |
| --- | --- |
| OC/OS, validación OCR editable en Compras | `accionesComprasSimplificadas` se activa con contexto COMPRAS y tipo OC u OS: oculta Rechazar OCR y Guardar cambios. Quedan Cancelar y Guardar y confirmar, sujetos a las validaciones y restricciones existentes. |
| Subir Facturas, validación OCR editable en Compras | La condición incluye expresamente FACTURA; el editor de Compras transmite ese contexto al mismo modal. Aplica la misma simplificación, sin atribuir botones de otros modos a este flujo. |
| Cancelar y X del modal OCR | Invocan `onClose`: cierran la interfaz sin guardar, confirmar, rechazar ni descartar el temporal. No cancelan por sí mismos una operación backend ni borran el archivo; la carga pendiente conserva su recuperación existente. |
| Guardar y confirmar | Invoca la acción de confirmación correspondiente; no equivale a un cierre visual. Las condiciones de validación, duplicidad, permisos y modo siguen vigentes. |
| Cerrar | Se conserva en el modo de consulta del modal. En `OcrProcessingDialog.tsx` aparece ante error y cierra la interfaz/estado de error; este control ya existía, no es un botón nuevo de este hotfix. |
| Modo versión existente | Mantiene su rama específica de Cancelar y Confirmar versión; no se presenta como el flujo normal Guardar y confirmar. |
| Ocultar creación manual | Alterna `showCreateNew` en el wizard y únicamente contrae el formulario de creación manual. No se atribuye un botón Ocultar a los modales OCR de OC/OS o Factura. |

El helper `onReject` conserva sus usos correspondientes fuera de la simplificación; no confundir ocultar un botón en este contexto con eliminar globalmente una acción backend. La revisión R3 fue estática; este complemento no ejecuta aplicación, pruebas ni una nueva aceptación funcional.

**Código, imágenes y producción:** el alcance está integrado en SOURCE `1ebdbf4f82ec3cae84b6a6caafc979353af2172a` y Enterprise `7323e1b0ae62584c08714d06ab5bbf6bbd036292`, dentro del producto publicado por GHCR #34 / manifest `f80d05e8`. Esto no acredita su despliegue productivo. Se preservan el último MVP aceptado, los digests históricos y los pendientes productivos ya documentados. No confundir este UX integrado con Mi Perfil pendiente ni con el E2E de contraseña/revocación G2-B.

### Continuidad focal pendiente

| Frente | Implementación y archivos | Integración / aceptación / siguiente gate |
| --- | --- | --- |
| P3/R3 | `apps/ms-documentos/src/documentos/carga-segura/{carga-segura.service.ts,carga-segura.persistence.ts,carga-segura.repository.ts,carga-segura.compensation.ts}` y `documentos/tmp/tmp.repository.ts`; snapshots P3 preservados | PARTIAL_HOLD; PRE_PUT_RECOVERY=NOT_FUNCTIONALLY_CLOSED. No ejecutar investigación ni parches en R4 |
| Almacén doble consulta | `89cd4c6e...`: `AlmacenBandeja.tsx` y `AlmacenBandeja.double-filter.test.cjs` | SOURCE INTEGRATED/PUSHED; LAB_VALIDATED históricamente reportado; Enterprise NOT_INTEGRATED; producción NOT_VERIFIED/no incluida en GHCR#34 |
| Mi Perfil UX | candidato `/home/loxi1/bbti-isolated/compras-almacen-period-finalization-r1`; `apps/web-admin/src/app/mi-perfil/page.tsx`, `apps/web-admin/src/layout/AppHeader.tsx` | UNCOMMITTED / IMPLEMENTED_NOT_INTEGRATED; aceptación UX exacta NOT_VERIFIED sin artefacto PO independiente |
| Cambio de contraseña G2-B | exportación `/home/loxi1/bbti-isolated/password-g2b-isolated-r1` sin .git; cambios Auth/Gateway | G2B_TECHNICAL_VALIDATION=PASS_WITH_E2E_PENDING, conforme evidencia MSE recibida en orden R4; FULL_FUNCTIONAL_ACCEPTANCE=NOT_GRANTED |

**P3/R3:** la orden R4 acredita recepción `MSE_R3_P3_PRE_PUT_FOCAL_FINDINGS_R1`; conservar el encargo `MSI_CODEX_R3_P3_PRE_PUT_CLOSURE_PREPARATION_R1` como siguiente gate, no ejecutado. Antecedentes locales: `/home/loxi1/evidencias/documental-platform/p3-continuidad/BBTI_P3_CONTINUIDAD_2026-11-02.md` y `BBTI_CODEX_R2_TECHNICAL_CLOSURE_PLAN_R1.md`. Son antecedentes/propuesta y no sustituyen el hallazgo MSE posterior. No inferir cierre PRE_PUT por tener código de fencing o por las pruebas MVP. No se localizó un informe MSE autónomo con ese identificador durante la lectura focal; su recepción procede de la orden, no de nuevas pruebas.

**Almacén:** conserva la búsqueda backend y elimina exclusivamente el filtrado textual frontend redundante. No reintroducirlo. El commit 89cd4c6e es hijo directo de 5efcb743; no forma parte de las imágenes construidas desde 2ed7dd0f. La aceptación LAB es histórica declarada, no reejecutada ni productiva.

**Mi Perfil:** alcance observado: presentación legible de empresa/sistema/perfil, eliminación de IDs técnicos y vigencia de la UI, organización de tarjetas y encabezado. Se preserva selección de workspace mediante `useAuth`, almacenamiento de sesión y `selectWorkspace`; el botón de contraseña continúa como disponibilidad futura/deshabilitado. No convertir la aprobación UX genérica en aceptación del cambio de contraseña. No se encontró un acta local independiente con los textos PO exactos; confirmar esa evidencia antes de integrar, sin descartar el trabajo.

**G2-B:** hashes actuales comprobados:
- `apps/ms-auth/src/auth/auth.nats.controller.ts`: `d50aef757d976a09b76526559c0241aef9f665df8992a2438cfebbea9bd06a6e`.
- `apps/api-gateway/src/auth/auth.controller.ts`: `d9ec83bbb8397d774aaa4234e127388bddd1c859ecda93ea5be8b9a8bd991857`.

Diferencias focales adicionales frente a SOURCE main: Auth `auth.service.ts`, `auth.repository.ts`, `auth.repository.spec.ts`, `auth.service.spec.ts` y `schemas/change-password.schema.ts`. La rama/worktree registrada `feat/g2b-auth-version-r1` está limpia en89cd4c6e; **no equivale a la exportación modificada** y no acredita integración de esos cambios.

Resultados MSE recibidos en la orden, sin repetirlos: AUTH_NATS_RPC_401=PASS; GATEWAY_HTTP_401=PASS; AUTH_FOCAL_TESTS=19/19_PASS. PASSWORD_CHANGE_E2E=NOT_EXECUTED; JWT_GLOBAL_REVOCATION_E2E=NOT_EXECUTED. Los hashes coincidentes no acreditan esos E2E. Conservar respaldos `/home/loxi1/bbti-isolated/_g2b-safety-backups/`, base clonada y exportación; no iniciar sus servicios.

### Migraciones: procedimiento vigente y límite G2-B

Seguir [estrategia de migraciones](../06-database/02-migraciones.md), [onboarding](../30-developer-onboarding/06-como-crear-una-migracion.md) y runner versionado `packages/database/src/migrations/`. Unidad administrada: SQL definitivo + SHA256 en `infra/postgres/migrations/manifest.sha256`; verificación de archivos/runner, LAB y autorización propia de DB_WRITE antes de aplicar. Este texto describe el estándar, no lo ejecuta ni prepara una migración.

En R4, las 12 entradas hasta 0024 conservan SHA256 del manifest `ff291e6e99b28edbb9ea9ca743083a06f77d704460142fb42a23f91153533d5b`, integridad local comprobada, sin consultar ledger. No existe 0025 en ese manifest. Para G2-B se dispone reutilizar posteriormente la base natural LAB3005, sin crear bases adicionales; no eliminar la clonada, cambiar conexiones, alterar auth_version, crear 0025 SQL ni ejecutar migraciones ahora. Su diseño/migración formal requiere una autorización separada después de cerrar la reconciliación Git.

### Pendientes productivos y autoridad

```ini
APISPERU_PRIVATE_PROVISION=PENDING
REMOTE_BACKUP_AUTHORIZATION=PENDING
OCR_CHANGE_AUTHORIZATION=PENDING
PRODUCTION_DEPLOY_AUTHORIZATION=PENDING
```

Último preflight acreditado: APISPERU_TOKEN ausente en Documentos; respaldo OCR local recuperable verificado, respaldo remoto/cambio OCR/despliegue no ejecutados. No se encontró evidencia local posterior que cambie estos estados. No solicitar credenciales ni inspeccionar tokens de aplicación o producción; las consultas Git usan el mecanismo privado existente sin revelar valores. No consultar ni modificar producción en R4.

Se conservan las observaciones productivas históricas OCR tardío, expiración TEMP, referencia R2 HTTP403 y16 errores globales de tipado conocidos. No se tratan como defectos nuevos ni se corrigen aquí. NAS permanece fuera del alcance y no sustituye R2 por presunción.

**Siguiente acción segura:** revisión MSI/PO del diff documental y de las aceptaciones pendientes por frente. Publicación documental, integración Almacén/Mi Perfil/G2-B, investigación P3, migración y promoción productiva requieren sus autorizaciones propias. No crear nuevas ramas/worktrees ni limpiar los existentes en esta orden. Esta edición permanece sin stage/commit/push en los dos worktrees identificados en el inventario.

---


Manual operativo oficial de Documental Platform.

## Objetivo

Centralizar los procedimientos para desplegar, configurar, operar, monitorear, recuperar y actualizar la plataforma.

## Entrada al ciclo de desarrollo

Comenzar por el [estándar canónico SOURCE y release R1](../23-standards/11-source-development-and-release.md), aprobado por PO, ratificado por MI e integrado en SOURCE. Allí se definen inicio, gates, evidencia NORMAL/RELEASE/RECOVERY y transferencia de continuidad. Este índice es el punto de entrada; no se necesita otro bootstrap duplicado.

## Continuidad vigente — 05/11/2026

Acción `POST_MVP_SUCCESSOR_CONTINUITY_UPDATE_R1`. Este estado sustituye las instrucciones de pendientes de integración/G1 de la instantánea del 26/10, que se conserva abajo como antecedente; no deben reejecutarse automáticamente.

Para nuevos chats de MI, MSII y MSI, leer en este orden:

1. Este [Operations Manual](README.md).
2. [Estándar SOURCE y release R1](../23-standards/11-source-development-and-release.md).
3. [Estándar Git](../23-standards/07-git.md).

Después, consultar exclusivamente los contratos y documentos necesarios para el trabajo asignado.

```ini
MVP_STATUS=ACCEPTED_WITH_OBSERVATIONS
MVP_DEPLOYMENT=PASS
PO_ACCEPTANCE=APPROVED
DOCUMENTARY_CLOSURE=PASS
RELEASE_RECONCILIATION=NOT_REQUIRED
NEXT_WORKSTREAM=NAS_PREPARATION
```

El PO declaró aceptación funcional productiva el **05/11/2026**: Compras PASS (carga R2 TEMP y promoción definitiva), Almacén PASS (carga y validación de Guía), Finanzas/Regularización PASS (TEMP y promoción definitiva) y Contabilidad PASS (visualización de registros de los demás módulos). Son resultados declarados por el PO, diferenciados de las pruebas automatizadas y verificaciones técnicas del despliegue.

Observaciones abiertas: recuperación OCR tardía sin E2E productivo completo; expiración TEMP sin verificación productiva; referencia histórica R2 con HTTP 403; 16 errores globales de tipado conocidos. Se preservan como límites/antecedentes, no como defectos nuevos del despliegue; esta continuidad no los corrige ni reabre el release.

**Siguiente entregable: preparación NAS**, responsable MSI, supervisión MSII y autoridad Product Owner. Debe mantenerse aislada del MVP productivo; no se presume que NAS sustituya Cloudflare R2 y esta orden no autoriza cambios de infraestructura.

### Identidades y evidencia canónica

- SOURCE funcional: `88edc03136a446308d8b18fa778bdccf6c002be3`.
- Enterprise funcional / origen de imágenes: `a57c328cbf62de39aa91ed541ae32b449927a5b6`.
- Aceptación documental SOURCE: `aef47ca8c307449d2d985128196c297102e80a4d`.
- Aceptación documental Enterprise: `dcf14470e80519d3a6f1114180a4652a27de4017`.
- Inventario funcional: 101 archivos, sin cambios. EC2 mantiene el runtime del despliegue aceptado; esta actualización de continuidad no se sincroniza a EC2.

Consultar el [manifest rector](../31-governance/RELEASE_MANIFEST.md), `/home/loxi1/bbti-evidence/controlled-production-release-r1/REPORT.md` y `acceptance-documentary-closure.json` en ese mismo directorio. No reconstruir el historial, repetir aceptación ni reconciliar los 101 archivos. Mantener separados SOURCE, Enterprise, GHCR y EC2; los commits documentales no cambian imágenes ni implican un despliegue.

Preservar SOURCE dirty, configuración y datos productivos. Esta actualización no autoriza builds, migraciones, cambios RDS/R2, recreaciones ni otro release.

## Antecedente archivado — 26/10/2026

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


## Actualización posterior de continuidad — 11/11/2026

Acción: MSE_UNIFIED_MANIFEST_CONTINUITY_G2B_APPLY_R1.

La inspección productiva READ_ONLY confirma Documentos/Web GHCR#34 ejecutándose en EC2; Gateway/Auth permanecen conservados. Véase la adenda de identidad productiva del RELEASE_MANIFEST. Las referencias anteriores BUILT_NOT_DEPLOYED son instantáneas previas, no el último estado observado. Aceptación funcional posterior al MVP: NOT_VERIFIED; aceptación MVP05/11 preservada.

R4 documental publicado: SOURCE `d343a1bfb9ecc4f933ea425486de892fe74009b1` / Enterprise `85b6486ecbf7ae2c652cafd84f2217b0e43590a2`. Las menciones anteriores a R4 sin commit conservan únicamente su contexto histórico.

G2-B: backend E2E y revocación global PASS; mínimo8 probado focalmente, máximo72bytesUTF8 preservado. Nueve archivos candidatos; delta final NOT_ESTABLISHED, ampliable por interceptor/UX. Integración y UX3005 PENDING; producción G2-B NOT_EXECUTED; trazabilidad versionada auth_version pendiente. Conservar pnpm/supervisor, puertos originales, R2 DEV directo y OCR local.

Evidencias: `/home/loxi1/bbti-evidence/unified-manifest-continuity-g2b-r2/{ec2-ghcr-identity.json,g2b-backend-e2e.json,g2b-candidate-inventory.json}`. Ver detalles en el manifest; no repetir inventarios ni crear otro manifest.
