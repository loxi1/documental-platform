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


---

## Vigencia operativa SOURCE LAB — 17/11/2026

ACTION: BBTI_SOURCE_DOCUMENTARY_CONTINUITY_R1.

El entorno SOURCE nativo ha sido recuperado y aceptado
por el PO. Las instrucciones históricas de reconstrucción
Docker LAB se conservan como referencia, no como orden
de reconstruir el entorno actualmente operativo.

| Componente | Runtime LAB acreditado |
|---|---|
| api-gateway | SOURCE nativo, puerto 3000 |
| ms-auth | SOURCE nativo, puerto 3001 |
| ms-documentos | SOURCE nativo, puerto 3002 |
| web-admin | SOURCE nativo, puerto 3005 |
| PostgreSQL | Contenedor LAB existente |
| NATS | Contenedor LAB existente |
| Almacenamiento | Cloudflare R2 DEV |
| OCR Python | systemd local aislado |

SOURCE baseline previo a esta adenda:
`9359b9720328d0bb4c429e90330c997269be5dc3`.

Node 24.16.0, pnpm 11.4.0; preparación de builds
R4 acreditada 7/7. No implica orden de reconstrucción
en cada sesión ni modificación del estándar R1.

OCR DEV: `documental-ocr-worker.service`.
Subjects DEV:
- `dev.source.r2dev.ocr.procesar-archivo`
- `dev.source.r2dev.documento.clasificado`

Carga segura acreditada con
DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED=true.

Mantener las credenciales y configuraciones efectivas
privadas, fuera de Git. No reutilizar secretos productivos.
No imprimir archivos .env ni entornos de procesos.

Conservar R2 DEV separado de producción; los documentos
legacy MinIO se resuelven según metadata, sin fallback
general ni migración masiva.

TEMP OC/OS y regularizaciones Factura/RH de OP:
OCR no bloqueante, recuperación por identificador,
ventana TEMP de 24 horas como contrato, promoción
solo tras confirmación.

Guía, NI y sustentos: conservar cargas y periodo
documental conforme a sus contratos específicos.

Las tres custodias obsoletas quedaron liberadas.
No recuperar procesos históricos ni detener terminales
actuales por referencia a PIDs antiguos.

Antes de cualquier intervención identificar listeners,
propietarios, procesos y checkout efectivo.
No eliminar .next mientras Web esté operativo.
No introducir supervisores, timers ni workers paralelos
por este cierre.

Los procedimientos exactos de arranque deben respetar
la carga efectiva de configuración y el aislamiento DEV.
No se declara acreditada una reconstrucción integral
desde cero mediante esta adenda.

Producción conserva su arquitectura independiente
R2 productivo, OCR systemd y despliegue Enterprise/GHCR.
La aceptación LAB no autoriza EC2.

### Precedencia operativa

La presente adenda prevalece sobre las referencias
operativas anteriores a candidatos aislados, supervisor
y UX3005 pendiente, exclusivamente respecto del runtime
SOURCE LAB recuperado y aceptado el 17/11.

Los servicios actualmente acreditados se ejecutan
de forma nativa. No introducir un supervisor por
interpretacion de instrucciones historicas.

Se conserva la evidencia G2-B anterior, sin extender
su alcance ni declarar probada nuevamente la revocacion
global durante la aceptacion del 17/11.


---

## Ratificación funcional y arquitectónica PO — 17/11/2026

La presente ratificación prevalece sobre las clasificaciones
históricas incompatibles de P3/R3, TEMP328/334 y NAS.

- Aceptación funcional PO: PASS para SOURCE LAB,
  Compras, Almacén, Finanzas y Contabilidad.
- P3/R3: la propuesta universal TEMP fue sustituida.
  Respetar el canal de carga existente según origen y
  tipo documental: TEMP o carga directa al periodo.
- Incidencia Almacén: regularizada mediante intervención
  en base de datos, según PO.
- Modal OCR Almacén: mantener visibles únicamente
  Guardar y confirmar y Cancelar. Ocultar los demás
  botones, no eliminarlos ni suprimir capacidades backend.
  Cancelar únicamente cierra el modal.
- TEMP328/334: incidencia operativa resuelta según PO.
  El diseño especial de recuperación queda histórico;
  no reabrirlo ni inferir eliminación física en R2.
- Compras: OC regularizada y APISPERU configurado,
  según PO, para corregir la selección del RUC emisor.
- RDS 0025: ejecutada en producción desde Enterprise
  según PO. Evidencia SQL aportada: gestion_documental,
  usuario postgres, auth_version integer NOT NULL
  DEFAULT 1. No repetir migración.
- G2-A residual: alcance no identificado suficientemente;
  no constituye un bloqueo acreditado.
- NAS DEV y archivado definitivo: entregable independiente,
  fuera del alcance de este cierre.

La ratificación funcional no acredita por sí misma
nuevas identidades de imágenes, despliegues EC2,
borrados físicos ni nuevas pruebas automatizadas.

### Manuales técnicos permanentes

Colección instalada por el PO el 17/11/2026:

`~/Documentos/importantesProyectos/Documentacion_tecnica/BBTI_MANUALES_2026-11-17/`

Punto de entrada: `00_LEER_PRIMERO_BBTI.md`.

Nueve manuales cubren arquitectura, operación SOURCE,
Git y releases, R2/OCR, producción, aceptación,
autonomía y custodia de los 48 archivos históricos.

No repetir investigaciones cerradas. Consultar el manual
específico y la documentación institucional vigente.
Las referencias Git de los manuales se actualizarán
después de la publicación SOURCE y Enterprise.


---

## R3 Factura TEMP — cierre G3 SOURCE con observaciones — 19/11/2026

Acción `BBTI_FACTURA_TEMP_G3_SOURCE_CLOSURE_R1`. Esta adenda actualiza exclusivamente este requerimiento; conserva los antecedentes. Fuente de aceptación y builds: orden PO/MSE 3.0 de cierre G3, no nueva ejecución por esta edición. Base SOURCE `8807b4a9a99870396ec35a7ef1011cec1402c745`, rama `feat/compras-factura-temp-recovery-r1`, cambios todavía sin commit ni integración a main.

**SOURCE aceptado con observaciones:** recuperación por el cargador, después de refrescar, OCR parcial editable, confirmación, dos pendientes simultáneos, aislamiento entre OC/OS y regresión de recuperación/carga/confirmación OC/OS. Testigo aportado: TEMP378, expediente121, principal541 (OC008979), documento542, archivo547, grupo150 y OCR522; periodo noviembre 2026. No equivale a aceptación productiva ni a una nueva consulta DB/R2.

**Recuperación entre usuarios: FAIL, DEFERRED_BY_PO.** El listado contextual y sus controles están implementados; no afirmar que otro usuario recupera correctamente por contar con pruebas offline. No relajar permisos, retirar el filtro de workspace ni suplantar al cargador para resolver esta observación. No se corrige en este cierre.

En Documentos de compra se muestran las facturas TEMP vigentes del contexto OC/OS y se selecciona un `tempId` individual. Recuperar lee el mismo PDF, extracción y borrador persistidos; no solicita OCR desde ese recuperador. La carga inicial conserva su procesamiento OCR. Campos incompletos o vacíos permanecen editables y se usa la confirmación/materialización existente. Se conservan recuperación OC/OS y acceso histórico por identidad propia válida; no se asocian TEMP antiguos por inferencias. No se añade autosave ni se modifica la vigencia de 24h, periodos, R2, materializadores o Almacén.

Pruebas heredadas: 218 PASS; tres typechecks PASS; builds Documentos/Gateway 2/2 PASS y Web Next16.2.7 PASS (22/22 prerender, exit0), ratificados por PO/MSE. No repetidos. Se reutilizó el candidato OCR persistido, pero no hay captura exhaustiva de red, verificación física independiente R2 posterior ni concurrencia exhaustiva acreditadas.

Operación SOURCE vigente: terminales ordinarias, Node24.16.0/pnpm11.4.0 y OCR systemd existente. Los arranques Documentos/Gateway con parser de `.env` raíz quedaron acreditados por la orden G3; el de Documentos comprueba carga segura=true y ejecuta `node --enable-source-maps dist/main`. No volver a iniciarlos por leer esta adenda. El build Web formal usó URLs PROD explícitas y flag local=false; **no ejecutar ese artefacto contra producción ni como Web LAB**. Se compiló mientras Web3005 seguía activo: desviación respecto a la recomendación de no escribir `.next` activo. PO dispone conservar Web activo y diferir limpieza hasta su siguiente detención ordinaria. No limpiar, reiniciar ni crear supervisores, PID files o timers.

Los metadatos OCR legacy `FINANZAS/TEMP_REGULARIZACION_OP` y la discrepancia intermedia `principalActivo` permanecen observaciones. La autorización y asociación R3 se basan en contexto validado persistido y no en esas etiquetas OCR. No se acredita una causa nueva ni se modifica otro módulo.

Contrato y permisos: [Cookbook Documentos](../28-api-cookbook/04-documentos.md#r3-factura-temp--contrato-contextual-y-estado-g3--19112026). Relevo y propuestas incrementales de manifest/inventario: [delta técnico](../../DELTA_TECNICO_MSE3_A_MSE_ACTUAL.md). Próximo paso: revisión MSE/PO y autorización de cierre Git SOURCE; después promoción integrada SOURCE → Enterprise → GHCR → EC2 por G4 expreso. NAS queda separado y posterior según PO. No hay migración ni cambio OCR Python por R3.


### Corrección cross-user R3 — 19/11/2026 — pendiente PO

Acción `BBTI_FACTURA_TEMP_CROSS_USER_FOCAL_CORRECTION_R1`. Estado actual: **CROSS_USER_RECOVERY=FIX_IMPLEMENTED_PENDING_PO_VALIDATION**. El FAIL/diferimiento anterior se conserva como evidencia histórica. Causa de código: Auth emite el ID de `auth.usuario_workspaces`, una asignación por usuario; exigir que coincida con el ID guardado por otro cargador excluía el pendiente. Se corrigieron solo las consultas compartidas `own`/`listCompras` de TmpRepository: validan asignación de origen y asignación activa/vigente del usuario actual, mismo sistema DOCUMENTAL, empresa y cliente, además del contexto OC/OS exacto. No se cambian JWT/permisos, owner de rutas generales, cargador, workspace original de carga, storage ni materialización.

27 pruebas focales PASS (24 casos ajenos al filtro se omitieron), typecheck Documentos PASS y diff-check PASS. Son pruebas offline, incluida inspección del contrato SQL; no acreditan consulta física ni UX entre usuarios. Testigo pendiente aportado por PO: TEMP382, cargador4, expediente121/principal541. MSE coordina compilación y actualización exclusiva de Documentos3002 conservando configuración; Gateway/Web/Auth sin cambios por esta corrección. No se ejecutó actualización de runtime ni nueva carga/confirmación en esta intervención. La consulta añade lectura de auth.usuario_workspaces/core.sistemas: permisos efectivos SQL del runtime no verificados aquí; si faltan, STOP sin GRANT automático. Revisión y aceptación PO pendientes antes de cerrar la observación.


---

## R3 Factura TEMP - consolidacion documental G3 - 19/11/2026

ACTION: BBTI_FACTURA_TEMP_G3_DOCUMENTARY_FINALIZATION_R1

- Base SOURCE: `8807b4a9a99870396ec35a7ef1011cec1402c745`.
- Rama focal: `feat/compras-factura-temp-recovery-r1`.
- Commit funcional SOURCE local: `793152d3cdc9ab752cfb699839358255a1db25c5`.
- Inventario funcional: 12 archivos, +593/-45.
- Commit documental e integracion SOURCE main: pendientes.
- Publicacion remota de R3: pendiente.

### Aceptacion SOURCE LAB y precedencia

Esta entrada actualiza el estado vigente de R3 Factura TEMP.
Conserva el FAIL, HOLD y diferimiento anteriores como
antecedentes historicos.

- CROSS_USER_RECOVERY=PASS_PO.
- CROSS_USER_CONFIRMATION=NOT_ACCREDITED.
- DOCUMENTOS_BUILD=PASS, exit 0.
- DOCUMENTOS_RESTART=PASS_PO.
- SOURCE_FUNCTIONAL_ACCEPTANCE=PASS_WITH_OBSERVATIONS.

El PO confirma que, despues de actualizar Documentos3002,
puede recuperar una factura cargada por otro usuario.
Este resultado acredita el recorrido funcional observado,
no una auditoria SQL, de seguridad o concurrencia integral.

Se conservan las aceptaciones anteriores: recuperacion
por cargador y despues de refrescar, OCR parcial editable,
confirmacion ordinaria, pendientes simultaneos, aislamiento
OC/OS y regresion OC/OS.

No inferir confirmacion cruzada, nueva materializacion,
verificacion fisica independiente R2 ni aceptacion PROD.

### Actualizacion operativa acreditada

Solo Documentos3002 fue recompilado y actualizado por
la correccion cross-user. El primer arranque encontro
EADDRINUSE por el proceso anterior activo. El PO confirma
recuperacion correcta despues del reinicio.

No repetir build ni reinicio por leer esta entrada.
Preservar Gateway3000, Auth3001, Web3005, PostgreSQL,
NATS, R2 DEV y OCR systemd existentes.

Web3005 permanece activo. La limpieza de .next queda
diferida hasta su detencion ordinaria. No ejecutar el
artefacto Web formal con URLs PROD como runtime LAB.

Sin PID files, timers ni supervisores adicionales.

### Evidencia tecnica y limites

- Pruebas G2: 218 PASS, evidencia historica.
- Typechecks G2: 3/3 PASS.
- Builds previos Documentos/Gateway: 2/2 PASS.
- Build formal Web: PASS, 22/22 prerender, exit 0.
- Correccion cross-user: 27 PASS, 0 FAIL,
  24 omitidas por filtro, dos suites.
- Typecheck focal Documentos: PASS.
- Build Documentos posterior a la correccion: PASS.
- SECURITY_FOCAL_RESULT=PASS_STATIC_WITH_OBSERVATIONS.
- STAGED_DIFF_CHECK=PASS.

No sumar las 218 pruebas y las 27 focales como casos
independientes. No afirmar repeticion integral posterior.

La correccion valida las asignaciones personales del
cargador y operador al mismo DOCUMENTAL, empresa y cliente,
conservando contexto OC/OS, permisos y propietario de las
rutas generales. No modifica Auth ni suplanta actores.

El recorrido real de recuperacion funciona en SOURCE LAB.
No se acredita una auditoria independiente de privilegios
SQL ni su disponibilidad en produccion. Si faltan permisos
SELECT requeridos, STOP, sin GRANT automatico.

Se conservan las observaciones OCR legacy, principalActivo,
captura de red no exhaustiva y concurrencia no acreditada.

### Alcance y promocion

- Migraciones nuevas: NONE.
- Cambios OCR Python: NONE.
- Cambios Auth: NONE.
- Cambios NAS: NONE.
- Enterprise R3: NOT_PROMOTED.
- GHCR R3: NOT_PUBLISHED.
- EC2 R3: NOT_DEPLOYED.
- Aceptacion PROD R3: NOT_PERFORMED.
- G4: NOT_AUTHORIZED.

Aplicar ONE_INTEGRATED_RELEASE de cuatro componentes,
tras cierre SOURCE y autorizacion independiente del PO,
bajo direccion de MSE Actual.

No atribuir a R3 digests de releases anteriores.
MSE Actual conserva gobernanza del manifest, promocion,
despliegue y cierre institucional posterior.

NAS constituye un entregable independiente y posterior.


---

## Consolidación de continuidad del release integrado — 19/11/2026

ACTION: BBTI_INTEGRATED_RELEASE_SOURCE_DOCUMENTARY_CONSOLIDATION_R1


### Publicación SOURCE de Factura TEMP — 19/11/2026

- Baseline SOURCE:
  `8807b4a9a99870396ec35a7ef1011cec1402c745`.
- Commit funcional:
  `793152d3cdc9ab752cfb699839358255a1db25c5`.
- Commit documental y cierre SOURCE publicado:
  `3716b71c2ff812710f4d9c44242dbad73331336f`.
- Integración fast-forward autorizada por PO: PASS.
- Publicación SOURCE main: CLOSED_PASS.
- main, origin/main y remoto real coincidentes en
  `3716b71c2ff812710f4d9c44242dbad73331336f`.
- Working tree limpio en la comprobación previa a esta edición.
- Rama `feat/compras-factura-temp-recovery-r1` preservada.
- Delta acumulado: 18 archivos, +1673/-45.
- Composición: 6 funcionales, 6 tests y 6 documentales.
- G3=CLOSED_PASS_WITH_OBSERVATIONS.
- CROSS_USER_RECOVERY=PASS_PO.
- CROSS_USER_CONFIRMATION=NOT_ACCREDITED.

Estas identidades corresponden al cierre publicado,
anterior al commit de la presente consolidación.
No anticipar la SHA de esta nueva adenda.

### Continuidad del release integrado del 18/11

- Enterprise y checkout EC2 acreditados: f26f292d.
- GHCR run 44327350315, job 134882118595.
- Publicación integrada linux/amd64: 4/4 PASS.
- Despliegue técnico: CLOSED_PASS.
- Rendimiento: CLOSED_PASS_WITH_OBSERVATIONS.
- Aceptación funcional productiva integral: PENDING.

Consultar [manifest rector](../31-governance/RELEASE_MANIFEST.md)
para las identidades completas, digests ejecutables,
índices OCI y evidencia durable del release anterior.

### Compatibilidad Enterprise y SQL productiva

Evidencia recibida y acreditada por MSE 2.0
en la delegación operativa del 19/11/2026.

- Enterprise baseline:
  `f26f292d2c07c9a75feba9db782c5b30982b1060`.
- Compatibilidad funcional/test: 12/12 PASS.
- Adaptaciones funcionales necesarias: NONE.
- DATABASE=gestion_documental.
- ROLE=document_platform.
- TRANSACTION_READ_ONLY=on.
- AUTH_USUARIO_WORKSPACES_SELECT=PASS.
- CORE_SISTEMAS_SELECT=PASS.
- SQL_PREFLIGHT=PASS.
- PRODUCTION_SQL_COMPATIBILITY=CLOSED_PASS.

La comprobación SQL fue realizada desde MS Documentos
productivo, según evidencia institucional de MSE Actual.
Supera la condición de privilegios no acreditados
registrada durante G3.

No repetir las consultas ni conceder GRANT.
No equivale a aceptación funcional productiva de R3.

### Preparación operativa del nuevo candidato

Después de publicar esta consolidación SOURCE:

1. Verificar identidades SOURCE y Enterprise.
2. Transferir las doce rutas funcionales/test.
3. Adaptar selectivamente documentación Enterprise.
4. Validar composición y solicitar autorización PO
   de commit y push Enterprise.
5. Preparar publicación integrada GHCR de 4 componentes.
6. Publicar únicamente con autorización PO.
7. Preparar evidencia EC2, baseline efectivo,
   digests, configuración y rollback.
8. Desplegar únicamente con autorización expresa PO.
9. Verificar técnicamente y coordinar aceptación real.
10. Consolidar documentalmente los resultados efectivos.

No constituye autorización de ejecución de estas
operaciones ni creación de gates administrativos.

Utilizar procedimiento del manual 05 y conservar:

- Checkout `/home/ubuntu/apps/documental-platform-bbti-prod`.
- Proyecto Compose `docker`.
- Ejecución autorizada mediante sudo -n.
- RDS, Cloudflare R2, NATS y Traefik.
- OCR Python systemd y override APISPERU.
- Configuraciones, secretos, redes y volúmenes.

Migración 0025 previamente aplicada; no reejecutar.
Extractor OCR instalado; no reinstalar.
Sin down global ni limpieza Docker.

Preparar rollback desde el runtime productivo efectivo
anterior, no desde un override ancestral.

STOP si el rollback compromete la revocación Auth.
No revertir auth_version ni restaurar Auth inseguro.

### Preservación de SOURCE LAB

No repetir compilaciones o reinicios de G3.
No modificar la configuración SOURCE acreditada.

Web3005 permanece activo por disposición PO.
Limpieza de .next diferida a la detención ordinaria.
No ejecutar el artefacto Web formal con URLs PROD
como runtime LAB.

Sin PID files, timers ni supervisores adicionales.

### Aceptación productiva posterior

Distinguir publicación GHCR, despliegue técnico,
aceptación funcional y cierre documental.

HTTP 200 no acredita aceptación funcional.

Coordinar recuperación tras refrescar, conservación
del archivo y OCR persistido, edición de incompletos,
aislamiento contextual, recuperación y confirmación
cross-user, confirmación ordinaria y regresiones.

Conservar pendientes de aceptación Auth y OCR
del release integrado anterior.

No presentar pruebas SOURCE LAB como pruebas PROD.

### Gobernanza y precedencia

Se preservan todas las entradas históricas. La presente
adenda prevalece únicamente sobre estados anteriores
incompatibles con estos acontecimientos acreditados.

MSE 2.0 acepta la entrega G3 y delega a MSE 3.0
la coordinación y ejecución operativa del ciclo G4.

- MODE=NORMAL.
- GOVERNANCE=R1.
- MANUALS_VERSION=R3.
- MAX_GATES=4.
- RELEASE_MODEL=ONE_INTEGRATED_RELEASE.
- ARCHITECTURE_OWNER=MSE_2_0.
- RELEASE_GOVERNANCE_OWNER=MSE_2_0.
- OPERATIONAL_EXECUTOR=MSE_3_0.
- AUTHORIZATION_OWNER=PO.
- MANUALS_AND_LIBRARIAN_OWNER=MSE_2_0.
- MSE3_IS_SUCCESSOR=NO.
- CODEX=OPTIONAL_SPECIALIZED_COLLABORATOR.

La delegación no concede autorización automática
de commit, push, publicación GHCR ni despliegue EC2.

No reabrir G2/G3 ni activar RECOVERY por estados
documentales históricos superados.

La colección permanente vigente es R3, diez manuales
00-09 del 18/11/2026, instalada en:

`~/Documentos/importantesProyectos/Documentacion_tecnica/BBTI_MANUALES_2026-11-18_R3/`

Consultar primero el manual 00 y los manuales
específicos según la intervención.

La actualización externa y transferencia a Bibliotecario
permanecen bajo responsabilidad de MSE 2.0.

### Estado del nuevo release Factura TEMP

- SOURCE_FUNCTIONAL_PUBLICATION=CLOSED_PASS.
- SOURCE_DOCUMENTARY_CONSOLIDATION=PREPARED_PENDING_PUBLICATION.
- ENTERPRISE_PROMOTION=PENDING.
- GHCR_PUBLICATION=NOT_AUTHORIZED.
- EC2_DEPLOYMENT=NOT_AUTHORIZED.
- PRODUCTION_FUNCTIONAL_ACCEPTANCE_R3=NOT_PERFORMED.
- POST_DEPLOY_DOCUMENTATION_R3=PENDING.

El release anterior del 18/11 y R3 Factura TEMP del 19/11
son acontecimientos diferenciados.

No atribuir a R3 imágenes o digests anteriores.
No introducir migraciones, cambios Auth, cambios OCR Python
ni integración NAS por este requerimiento.

NAS permanece fuera del alcance.


---

## 2026-11-19 — Cierre productivo R3 Factura TEMP

ACTION: BBTI_FACTURA_TEMP_POST_DEPLOY_DOCUMENTARY_CLOSURE_R1

Adenda exclusivamente documental posterior al despliegue
y aceptación funcional productiva del 19/11/2026.

Prevalece sobre estados anteriores incompatibles de R3.
Se preservan íntegramente los antecedentes históricos.


### Identidades acreditadas

- SOURCE funcional:
  `793152d3cdc9ab752cfb699839358255a1db25c5`.
- SOURCE cierre G3:
  `3716b71c2ff812710f4d9c44242dbad73331336f`.
- SOURCE consolidado previo a esta adenda:
  `5f5ff49b1e48d2dea200c4a1476a7cff3f6e9f58`.
- Enterprise funcional:
  `c2198dcb8a6eaeb063f45c31d6b225e630e81af9`.
- Enterprise publicado y desplegado:
  `5066a6e9eaeb95e3039ce16f6a0acb732846ea0e`.
- EC2 checkout acreditado durante despliegue:
  `5066a6e9eaeb95e3039ce16f6a0acb732846ea0e`.
- GHCR workflow: `.github/workflows/build-images.yml`.
- GHCR run: `44563965795`.
- GHCR job: `135700545256`.
- Publicacion integrada: 4/4 SUCCESS.
- Plataforma: linux/amd64.

### Operacion vigente

Web: https://bbtecnologia.com
API: https://api.bbtecnologia.com/api/v1

Compose productivo:

- Proyecto docker.
- deployment/env/.env.production.
- deployment/docker/docker-compose.production.yml.
- release.images.yml del release efectivo.
- /etc/documental-platform/ms-documentos.apisperu.override.yml.

APISPERU ya configurado.
No solicitar nuevas credenciales ni reinstalar.

El smoke test acredita disponibilidad, no consumo
efectivo del proveedor externo.

El procedimiento vigente de despliegue mantiene
ONE_INTEGRATED_RELEASE con cuatro aplicaciones.

No modificar runbooks, workflows ni configuracion
productiva por esta consolidacion documental.

### Despliegue integrado EC2

Directorio permanente:

`/home/ubuntu/releases/documental-platform-bbti/integrated-44563965795-5066a6e9-r1`

- Inicio: 2026-11-19T16:42:29Z.
- Recreacion y control final: 2026-11-19T16:42:49Z.
- Smoke test: 2026-11-19T16:44:56Z.
- Recreacion exclusiva: api-gateway, ms-auth,
  ms-documentos y web-admin.
- Runtime efectivo: 4/4 PASS.
- RestartCount: 0 en los cuatro servicios.
- NATS y Traefik preservados.
- OCR Python systemd activo, PID 540240,
  NRestarts=0 durante la comprobacion.
- Override APISPERU existente preservado.
- Configuracion productiva protegida: PASS.
- Sin intervencion administrativa RDS.
- Sin migraciones ni cambios OCR por R3.
- Sin rollback.

SHA256 release.images.yml:

`c581386de55e2063fdcc44b0f733f9530b58e93e85c61694d182f99351fb4c48`

SHA256 rollback.images.yml:

`10219b37c5a2f27409155af48cc1a9bbc681a4a8c57945d249881b3b31815a22`

El rollback corresponde al runtime efectivo anterior.
No autoriza rollback automatico ni reversion de auth_version.

Evidencias principales en el subdirectorio evidence:

- deployment.started.utc
- deployment.completed.utc
- deployment-compose.txt
- application-runtime.before.txt
- application-runtime.after.txt
- protected-runtime.before.txt
- protected-runtime.after.txt
- protected-config.before.sha256
- protected-config.after.sha256
- release-manifests.sha256
- production-health-smoke.txt

### Disponibilidad productiva

- API publica HTTPS: PASS.
- Web publica HTTPS: HTTP 200.
- API Gateway interno 3000: HTTP 200.
- MS Auth interno 3001: HTTP 200.
- MS Documentos interno 3002: HTTP 200.
- Web Admin interno 3005: HTTP 200.
- NATS health: PASS.
- OCR systemd: PASS.
- Integridad de manifests: PASS.

EC2_TECHNICAL_DEPLOYMENT=CLOSED_PASS.
PRODUCTION_HEALTH_SMOKE=CLOSED_PASS.

### Aceptacion funcional productiva PO

Fecha: 2026-11-19.

Resultados expresamente reportados por PO:

1. Carga de factura TEMP: PASS.
2. Recuperacion despues de actualizar: PASS.
3. Recuperacion por otro usuario: PASS.
4. Preservacion OCR y PDF: PASS.
5. Aislamiento documental: PASS.
6. Confirmacion por otro usuario: PASS.
7. Persistencia definitiva: PASS.
8. Regresion OC/OS: PASS.

PRODUCTION_FUNCTIONAL_ACCEPTANCE_R3=CLOSED_PASS.
R3_FUNCTIONAL_TESTS=8_OF_8_PASS.

La confirmacion cross-user pendiente de acreditacion
en SOURCE queda aceptada funcionalmente en produccion.

La evidencia funcional corresponde a declaracion PO;
no implica auditoria SQL/R2 independiente ni prueba
exhaustiva de concurrencia.

No extender esta aceptacion a pendientes historicos
Auth, OCR o consumo efectivo de APISPERU.

### Observacion posterior y decision PO

Contexto: BBTEC OC 002870, expediente 3,
documento base 500.

- TEMP 336 y 337: mismo nombre de factura FF62-1891.
- TEMP 338: factura FF62-1695, nombre diferente.
- Los registros fueron observados como pendientes.
- Identidad binaria SHA256 no verificada.
- Duplicidad documental definitiva no establecida.

PO decide mantener R3 PASS y diferir el diagnostico.
No realizar borrados, cambios de contexto ni
intervenciones correctivas por esta observacion.

Requerimiento futuro separado:

- Descartar/eliminar factura TEMP cargada por error.
- Cambiar OC/OS de una factura TEMP pendiente.

El diseno y autorizacion de ese requerimiento
permanecen pendientes.

TEMP_DUPLICATE_DIAGNOSTIC=DEFERRED_BY_PO.

### Gobernanza y continuidad

- MODE=NORMAL.
- GOVERNANCE=R1.
- MANUALS_VERSION=R3.
- MAX_GATES=4.
- RELEASE_MODEL=ONE_INTEGRATED_RELEASE.
- MSE 2.0 conserva arquitectura y gobierno institucional.
- MSE 3.0 dirige el ciclo operativo delegado.
- PO conserva las autorizaciones.
- Codex es colaborador opcional.

Preservar SOURCE nativo pnpm, OCR Python systemd
y Cloudflare R2 directo en LAB unificado y PROD.
No reintroducir MinIO como intermediario en ese circuito.

No reintroducir PID files, timers administrativos
ni supervisores adicionales para SOURCE.

No repetir pruebas, migracion 0025, builds, publicacion
GHCR o recreacion por cambios exclusivamente documentales.

Conservar la limpieza .next diferida hasta la detencion
ordinaria de Web LAB, segun disposicion PO.

La presente adenda no acredita su propia publicacion.
Registrar las identidades documentales posteriores
solo despues de commit/push y sincronizacion efectivos.

Pendientes:

1. Publicacion documental SOURCE autorizada.
2. Adaptacion y publicacion documental Enterprise.
3. Fast-forward documental EC2 autorizado,
   sin recreacion de servicios.
4. Entrega de continuidad a MSE Actual.
5. Actualizacion de manuales externos y Bibliotecario
   bajo responsabilidad institucional MSE 2.0.

No abrir G5. El cierre documental pertenece a G4.

Siguiente requerimiento: R2 NAS, conservando G1
y la validacion de infraestructura NAS DEV ya acreditadas.
No iniciar implementacion NAS antes del cierre R3.


---

## 2026-11-25 — Cierre institucional documental NAS R1

Repository=SOURCE. Esta adenda prevalece únicamente sobre estados históricos incompatibles de NAS; no reescribe antecedentes ni autoriza acciones por su lectura.

SOURCE conserva excluidos los scripts locales de recuperación no rastreados.

### Identidad del release y procedencia

| Plano | Identidad acreditada |
| --- | --- |
| SOURCE funcional NAS previo | `8db6fb57590e1f1715208ef8744d77fc248d37b1` |
| SOURCE corrección CSP publicada / HEAD anterior a esta revisión | `4776f2e907e64e3eaaacf5d6cff2874a907a3785` |
| Enterprise anterior | `4e9fb65feeeac1441508dd4d1aff10074bc6d0cc` |
| Enterprise constructor GHCR | `8cbdbc176158b69f676f5bbf8acef483af659ae1` |
| Enterprise documental publicado anterior a esta revisión | `33b646a7b73fb8ae549727d5cd3ac09b1bf08203` |
| EC2 checkout acreditado, no observado nuevamente | `33b646a7b73fb8ae549727d5cd3ac09b1bf08203` |
| GHCR | run **45508868647**, main / components=all, SUCCESS, 4/4, linux/amd64, 3m30s |

Workflow existente: `.github/workflows/build-images.yml`.
[Run acreditado](https://github.com/BBTI-SAC/documental-platform-bbti-prod/actions/runs/45508868647).
Los nuevos commits documentales de esta revisión no existen todavía: publicación SOURCE/Enterprise pendiente de autorización específica PO. No anticipar sus SHA ni confundirlos con el constructor.
### Producción acreditada y aceptación PO

Release activa acreditada: `/home/ubuntu/releases/documental-platform-bbti/integrated-45508868647-8cbdbc17-r1`.
Checkout: `/home/ubuntu/apps/documental-platform-bbti-prod`.
Validación técnica heredada del **25/11/2026 08:06:03 PET**: cuatro servicios RUNNING_PASS; API PASS; Web HTTP200; NATS HEALTH PASS; configuración NAS PASS; smbclient 4.23.8; raíz SMB READ_ONLY PASS; APISPERU preservado. No es una nueva inspección de esta edición.

Evidencias en `evidence/` de la release: `preparation-result.txt`, `deployment-execution.txt`, `runtime-validation.txt`, `runtime.before.json`, `runtime.after.json`, `images-pulled.json`, `release-overrides.sha256`.
Preservar `release.images.yml`, `rollback.images.yml`, `nas.production.override.yml`, `/etc/documental-platform/ms-documentos.apisperu.override.yml` y `.env.production`; no copiar secretos a Git.

PO, 25/11: «OC -> ok», «Factura -> ok», «Guia -> ok», «NI -> ok», «Tambien fui a contabilidad y la visualizacon es de nas», «yo hice la aceptacion transversal».
`PRODUCTION_TRANSVERSAL_ACCEPTANCE=PASS_PO`, `PRODUCTION_NAS_ARCHIVER=PASS_PO`, `PRODUCTION_NAS_VIEWER=PASS_PO`, `PRODUCTION_CSP_FUNCTIONAL_CORRECTION=PASS_PO`.
Es aceptación comunicada por PO; no nueva prueba automatizada ni certificación independiente de todos los casos individuales de Finanzas/OP/RH/sustentos.

Testigos PO bajo `/volume1/GESTION-DOCUMENTARIA/PLATAFORMA_DOCUMENTAL/`:

- `documentos/2026/04/BBTEC/OC_003214.pdf`
- `documentos/2026/04/BBTEC/OC_003214__FACTURA_F001-13640_20522718786.pdf`
- `documentos/2026/04/BBTEC/OC_003214__GUIA_T001-8018_20522718786.pdf`
- `documentos/2026/04/BBTEC/OC_003214__NOTA_INGRESO_0000003344.pdf`

Contabilidad: visualización NAS aceptada por PO. Archivo498 fue testigo anterior de CSP (`documentos/2026/04/BBTEC/OS_000262__FACTURA_F001-00001680_20610013822.pdf`); no se acredita una nueva prueba individual de 498.
### SOURCE nativo y dependencias existentes

Gateway3000, Auth3001, Documentos3002, Web3005; pnpm/monorepositorio vigente y paquetes compartidos; OCR Python systemd existente, NATS existente y R2 DEV directo. MinIO y contenedores LAB ancestrales son historia preservada, no requisitos del circuito NAS vigente. No crear LAB, PID, temporizadores administrativos, supervisores ni consumidores OCR paralelos. No ejecutar recetas de arranque/build por leer el cierre. Cambios docs-only no requieren builds ni reinicios. Mantener lockfile y contratos DEV/PROD; NAS DEV distinto de raíz PROD.
### Configuración productiva acreditada (referencia, no ejecutar)

```ini
NODE_ENV=production
R2_NAS_ACTIVATION_FROM=2026-11-24T22:48:35.970Z
R2_NAS_ARCHIVE_ENABLED=true
R2_NAS_AUTO_ENABLED=true
R2_NAS_NEW_DOCUMENTS_ENABLED=true
R2_NAS_VIEWER_ENABLED=true
R2_NAS_VIEWER_ACCEPTED=false
R2_NAS_DEV_DELETE_ENABLED=false
R2_NAS_DESTINATION=SYNOLOGY_PROD
R2_NAS_SMB_HOST=10.77.26.2
R2_NAS_SMB_SHARE=GESTION-DOCUMENTARIA
R2_NAS_SMB_ROOT=PLATAFORMA_DOCUMENTAL
R2_NAS_SMB_USER=documental_platform_dev
R2_NAS_SMB_AUTH_FILE=/run/secrets/nas-smb.auth
R2_NAS_PUBLIC_GATEWAY_URL=https://api.bbtecnologia.com
R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS=https://api.bbtecnologia.com
```

Autenticación host `/etc/documental-platform/nas-prod.auth`, root:root, modo 0600, montaje read-only. R2_ACCOUNT_ID, credenciales R2 y preview secret existentes configurados; valores excluidos. No regenerar cutoff/secretos ni reactivar NAS. `R2_NAS_VIEWER_ACCEPTED=false` es el último flag runtime acreditado; aceptación PO PASS_PO es otro hecho y no cambia dicho flag por esta edición. La allowlist API valida URLs generadas, no frame ancestors.
### Seguridad, retención y recuperación

`PRODUCTION_R2_DELETE=DISABLED_BY_DESIGN`; `DEV_ONLY_DELETE_RESTRICTION=PRESERVED`; `PRODUCTION_R2_RETENTION=ACTIVE`. El código exige NODE_ENV=development, destino SYNOLOGY_DEV, autorización exacta y demás controles; cambiar solo una variable no habilita DELETE productivo. La permanencia en R2 de Factura/Guía/NI OC003214 y facturaOS000262 citadas arriba es esperada y no invalida NAS ni visor.

`NAS_BACKUP_RESTORE=NOT_ACCREDITED`. Hyper Backup y Snapshot Replication diferidos a consulta PO. Synology BASIC/BTRFS sin redundancia acreditada; BTRFS no es backup. Cuota técnica compartida de 500 GiB. Usuario SMB `documental_platform_dev` compartido entre DEV/PROD: separación por raíces/destino/configuración, no credenciales independientes.
DEV: `GESTION-DOCUMENTARIA/_DEV_DOCUMENTAL_PLATFORM`; PROD: `GESTION-DOCUMENTARIA/PLATAFORMA_DOCUMENTAL`. VPN/OpenVPN y SMB existentes preservados.

RDS snapshot automático aceptado: `rds:database-1-2026-11-24-08-42`; sin snapshot manual adicional; restore no probado. Respaldo RDS no protege archivos NAS. Cualquier futura eliminación productiva exige autorización independiente, protección NAS, revisión del bloqueo de código, integridad y auditoría; no está autorizada por este cierre.

Rollback de aplicación condicionado a compatibilidad de 0025/0026, authVersion global, JWT contextual, contraseñas actuales y auditoría; no reducir auth_version, no revivir JWT ni restaurar Auth legacy incompatible. No restaurar RDS ni borrar reservas/archivos como rollback automático. Preservar evidencia e imágenes anteriores; si no existe destino acreditado compatible, STOP y decisión PO/roll-forward.
### Continuidad institucional y siguiente acción legítima

PO conserva autorización y aceptación. MSE Actual/MSE 2.0: arquitectura, gobierno de release/manuales/Bibliotecario; MSE 3.0: dirección técnica; MSE 3.1: operación DEV y ejecución delegada; Codex ejecutor. Máximo cuatro gates: G1/G2/G3 cerrados; esta actualización pertenece a G4 y no crea G5.
Documentos versionados gobiernan; colección externa permanente `BBTI_MANUALES_2026-11-18_R3`, revisión 25/11/2026, subordinada. Antecedentes19/11/24/11 no son tareas actuales. No reabrir Factura TEMP, custodias de los 48 archivos, SMB/VPN, migración 0026, ingeniería NAS ni aceptación transversal. No extender PASS_PO a otros requerimientos independientes.

Esta revisión es documental local: commit/push SOURCE y Enterprise pendientes de autorización específica. Historial Enterprise propio preservado; no copiar manifest/inventario completo desde SOURCE. Procedencia funcional SOURCE `4776f2e907e64e3eaaacf5d6cff2874a907a3785`; el futuro SHA documental SOURCE se registrará externamente al publicarlo, sin autorreferencias imposibles. EC2 sync=PENDING hasta autorización/acceso y ejecución docs-only fast-forward; sin pull de imágenes ni recreate.
Paquete Bibliotecario y legado en `/home/loxi1/bbti-evidence/nas-institutional-closure-20261125-r1/`; transferencia/indexación=PENDING_MSE_ACTUAL_VALIDATION. No crear R4. Próximo paso: revisión MSE Actual/PO del diff y autorización focal publicación SOURCE→Enterprise→sync documentalEC2. Futuro DELETE productivo y respaldo NAS son decisiones separadas, no ejecutar en este cierre.


---

## 2026-11-25 — Ampliación focal DELETE productivo, ingeniería local R1

### Estado vigente de la ampliación DELETE — 25/11/2026

ACTION=BBTI_PRODUCTION_R2_SAFE_DELETE_AND_FINAL_CLOSURE_R1. El mandato rector sustituye las recetas documentales pendientes anteriores, conserva el cierre NAS/CSP y añade ingeniería focal de eliminación productiva segura. NORMAL/R1, máximo cuatro gates, ONE_INTEGRATED_RELEASE.

- G1 focal: contrato y revisión directa Codex de los entregables previos completados; no validación externa MSE Actual.
- G2: implementación local y pruebas técnicas PASS; aceptación física DEV del flujo ordinario acreditada abajo. G3 pendiente de aceptación explícita PO y autorización de integración/publicación.
- SOURCE HEAD sigue `4776f2e907e64e3eaaacf5d6cff2874a907a3785`; el nuevo delta es local, sin commit/push. No hay SHA funcional nuevo ni constructor nuevo.
- Enterprise sigue `33b646a7b73fb8ae549727d5cd3ac09b1bf08203`, constructor `8cbdbc176158b69f676f5bbf8acef483af659ae1`. Sus14adendas documentales están preservadas; la extensión funcional NO está promovida.
- Producción continúa en release 45508868647, ya aceptada para NAS/visor/CSP. No hay nuevo GHCR, deploy, cambio de flags ni DELETE productivo en esta intervención.
- El bloqueo DEV-only describe esa release desplegada. El código SOURCE local ahora contempla autorización productiva separada, deshabilitada por defecto; no confundir ingeniería con activación.
### Contrato implementado para la autorización productiva

`R2_NAS_PRODUCTION_DELETE_ENABLED` está deshabilitado por defecto. No sustituye ni reutiliza `R2_NAS_DEV_DELETE_ENABLED`; en PROD este último permanece false. Se requiere adicionalmente `R2_NAS_PRODUCTION_DELETE_POLICY`, JSON de una decisión PO acreditada, nunca una autorización inferida del código.

La política versión 1 contiene `decisionId`, `proteccion.tipo` (`BACKUP_RECUPERABLE` o `RIESGO_COPIA_UNICA_ACEPTADO_PO`) y `proteccion.referencia`, `modo`, `desde`, `hasta`, y `contextos` con pares empresa/clienteId. La referencia no demuestra por sí sola un backup: antes de configurarla debe existir evidencia/decisión humana correspondiente. Fechas UTC estrictas, vigencia acotada, desde no anterior al cutoff original.

Modo `EXACTO`: lista de 1 a 20 identidades completas `{reservaId,archivoId,documentoId,version,empresa,clienteId,expedienteId}`; sin duplicados ni cruces de contexto. Es el mecanismo de piloto y recuperación B expresamente autorizada; ningún otro archivo se borra por activar el flag. Método interno `recuperarPendientesExactosProduccion()` reutiliza reserva/MOVE y no crea endpoint público de borrado. El lote entero se valida antes de reclamar trabajo. No usar scripts históricos ni barridos de prefijos.

Modo `NUEVOS`: sin lista de archivos y solo confirmaciones individuales desde `policy.desde`, dentro de los contextos autorizados. Así no adopta candidatos B ya confirmados. No impone las listas DEV como requisito de la operación ordinaria productiva. La elegibilidad documental existente mantiene sus verificaciones de archivo nuevo/fecha/contexto, más confirmación individual posterior al corte. No se usa la fecha de la OC/OS padre como autorización de borrado.

Se exige NODE_ENV=production, destino SYNOLOGY_PROD, host 10.77.26.2, share GESTION-DOCUMENTARIA, raíz PLATAFORMA_DOCUMENTAL, archivador/automatismo/nuevos/visor activos y aceptación de visor explícita. `R2_NAS_VIEWER_ACCEPTED=false` sigue siendo el flag productivo acreditado; PASS_PO anterior no lo cambia. No activar estos valores hasta autorización específica y protección/decisión de riesgo. Cutoff original preservado: `2026-11-24T22:48:35.970Z`.

Antes de DELETE: documento confirmado, reserva/tenant/contexto/versión y ruta definitiva coincidentes, lectura NAS independiente con tamaño/SHA256, disponibilidad por el camino de visor y ausencia de referencias incompatibles. Revalidar política; registrar durablemente decisión, protección e identidad R2/ETag antes de la intención DELETE, mediante la tabla 0026 y auditoría aditiva existentes.

El adaptador vuelve a hashear los bytes R2 y comprueba la cuenta contra el endpoint real del SDK. ETag es un token opaco, no SHA256. Con exclusión compartida y reserva permanente, el DELETE productivo envía `If-Match` del objeto verificado y no dispone de fallback incondicional. El cliente DELETE usa maxAttempts=1. Si la API rechaza la condición o existe sustitución/fallo/ambigüedad, no atribuir eliminación ni repetir DELETE automáticamente.

Los escritores genéricos y directos no pueden recrear o eliminar por fuera del archivador una clave reservada confirmada o incierta. Se conservan publicación NAS sin reemplazo, lease/CAS, protección del origen previo y reconciliación. Respuesta perdida+HEAD404 no acredita autoría; respuesta previa exitosa y ausencia posterior solo se acreditan para el mismo intento. Un intento incierto todavía presente tampoco se repite automáticamente. Fallos de NAS/DELETE no revierten la confirmación de negocio.

Las exclusiones numéricas 546/552/553 y autorizaciones 554/555 pertenecen a DEV y no se trasladan a identidades PROD por coincidencia de número. No se intervinieron esos objetos. Sin renombrar, recalcular periodo, modificar TEMP/OCR, esquemas, SQL 0025/0026 ni credenciales.
### Evidencias reales G2

- Node: 63 PASS/0 FAIL, tres suites afectadas (MOVE 35, adaptadores 22, exclusión 6); typecheck estricto PASS.
- Jest: 118 PASS/0 FAIL, 7 suites focales/afectadas; no repetición de suites históricas ajenas.
- PostgreSQL G2 real READ ONLY: 5 sentencias del repositorio Parse/Describe,29 parámetros Bind válidos, auditoría/lease y exclusión real entre 2 sesiones PASS; DML0. No reaplicación ni modificación de 0026.
- Build Nest Documentos:PASS en salida aislada con sello de fuentes. Gateway no requiere build por este delta, no tiene cambios funcionales.
- SDK real con transporte controlado: un solo intento DELETE ante 503 y transmisión de If-Match, sin credenciales productivas.
- Prueba física NUEVA R2 DEV: testigo UUID exclusivo 109 bytes; ETag incorrecto → HTTP 412 y objeto conservado; ETag correcto → HTTP 204 y HEAD 404. La documentación oficial consultada no enumera DELETE como operación condicional; su aplicación se acredita aquí por prueba DEV, no por suposición AWS ni por aceptación productiva.
- Prueba funcional DEV ordinaria solicitada al PO: TEMP423 → archivo592/documento588/reserva36/expediente4, BBTEC/cliente1. Ruta `documentos/2025/12/BBTEC/OC_002896.pdf`, 357458 bytes, SHA256 `3add252e5ebc057a20656d97404a60590d6af7beae3249c98ba4745a38920904`.
- Estado observado:NAS VERIFICADO, R2 ELIMINADO_ACREDITADO, trabajo COMPLETADO, último error null. Auditoría: intención 15:32:03.181Z→respuesta DELETE 204 a 15:32:03.445Z→ausencia/acreditación15:32:03.641Z, mismo UUID de intento. HEAD independiente 404 y lectura NAS independiente con hash/tamaño idénticos. Visualización PASS_PO; descarga aún no confirmada por PO.
- Actualización DEV:solo Documentos3002, entorno preservado en memoria, artefacto anterior privado y Gateway/Auth/Web preservados; READY 3/3 PASS. El último ajuste de verificación del endpoint es productivo y tiene build/pruebas propias; no se atribuye al recorrido físico DEV una ejecución bajo NODE_ENV=production.

Evidencias durables: `/home/loxi1/bbti-evidence/nas-production-safe-delete-20261125-r1/`, `CHECKPOINT.json`, `checkpoints/g2-conditional-delete-r1/`, `r2-conditional-delete-dev/result.json`, `dev-physical-592/result.json`, `dev-runtime/execution.json`. La prueba física ordinaria usa el flujo DEV existente; la rama productiva se prueba con configuración/adaptadores controlados hasta autorización G4.
### Fronteras reales y continuidad

Backup/restore NAS sigue NO_ACREDITADO. No equiparar BTRFS/SHA256/backup RDS con respaldo recuperable. Antes de DELETE productivo se requiere protección acreditada o una aceptación PO explícita, informada y acotada del riesgo de copia única. Ingeniería y prueba DEV no aceptan ese riesgo por el PO.

Publicación/commit SOURCE, promoción/commit/push Enterprise, GHCR integral y deploy EC2 requieren autorización específica ligada al delta revisado; se solicitarán juntas, separando decisiones irreversibles. Despliegue inicial con DELETE productivo false, sin ampliar candidatos B ni modificar cutoff/secretos/flagsNAS existentes. G4 no está cerrado.

Tras autorización:SOURCE→Enterprise preservando historias/adaptaciones→un workflow build-images.yml main/all→cuatro imágenes OCI/runnable linux/amd64→EC2 por digests; luego activación piloto exacta únicamente con protección/decisión y autorización de DELETE. No latest, gh CLI, build EC2, migración automática ni rollback ciego. Recuperación tras borrar debe conservar lectura NAS y estados 0026; no volver a un runtime dependiente del objeto R2 eliminado.

Los procedimientos docs-only anteriores eran válidos para el cierre pendiente previo. No ejecutarlos sobre este incremento funcional ni usar sus inventarios/baselines como autorización actual. No publicar Enterprise antes de acreditar el nuevo SOURCE publicado. No inventar SHA/RunID/digests futuros. Reutilizar manuales R3, preservar 08 y transferir paquete tras validación MSE Actual; no indexación Bibliotecario supuesta.


---

## 2026-11-25 — Aceptación G3 PO y autorización incremental de publicación

La aceptación G3 pendiente de las entradas anteriores queda acreditada por PO. Archivo592 / reserva36 / OC_002896: visualizaciónPASS_PO y descargaPASS_PO desde interfaz DEV, renombrada localmente592.pdf. Codex contrastó directamente357458bytes y SHA256 `3add252e5ebc057a20656d97404a60590d6af7beae3249c98ba4745a38920904`, idénticos a la lecturaNAS independiente ya acreditada. No se repitió upload, OCR, confirmación, DELETE ni pruebas anteriores.

Commit funcional SOURCE local: `b90eca0dd7fd3c1b7432b4266a7c64708e29cf6f` (15rutas exactas; parent4776f2e9). G3=ACCEPTED_BY_PO. El PO autoriza integración/publicación SOURCE, promoción selectiva Enterprise, GHCR integral y despliegue controlado conforme a R1/ONE_INTEGRATED_RELEASE. La publicación se ejecuta después de esta entrada; sus SHA/recibos efectivos se registran externamente y en las siguientes adendas sin autorreferencia.

DELETE productivo debe seguir deshabilitado hasta resolver la política de protecciónNAS. No existe autorización para borrar objetos productivos ni candidatosB. El flagDEV continúa false en producción. No nuevas migraciones. La aceptaciónPO no se presenta como validación independiente MSEActual ni como indexaciónBibliotecario; sus estados se acreditarán separadamente.

Evidencia: `/home/loxi1/bbti-evidence/nas-production-safe-delete-20261125-r1/PO_G3_AND_INCREMENTAL_AUTHORIZATION.json`, `dev-physical-592/result.json`, `source-functional-commit.json` y recibos de publicación posteriores. Los scripts locales SOURCE permanecen excluidos.


---

## 2026-11-25 — Cierre físico productivo DELETE permanente y continuidad institucional

ACTION=BBTI_PRODUCTION_R2_SAFE_DELETE_AND_FINAL_CLOSURE_R1; NORMAL/R1, colecciónR3, ONE_INTEGRATED_RELEASE. G1/G2/G3 cerrados. PO autoriza activación permanente y recuperación institucional exclusivamente reserva7/archivo504, más automatismo ordinario NUEVOS en BBTEC/cliente1 y BBTI/cliente2. Mandatos y declaracionesPO preservados en `/home/loxi1/bbti-evidence/nas-production-safe-delete-20261125-r1/final-physical-documentary-closure-r1`. No nueva ingeniería, build, migración ni publicaciónGHCR.

### Identidad de release y configuración efectiva

GHCRrun45698872132 SUCCESS4/4, constructorEnterprise `1e1377a83fea4811f93b19628aed4b2d0dcd7279`, checkout previoEC2 `0d8f4cb139ce13fe4f37c88f03ab3e973b363d9f`. Deploy integral y validación técnica PASS acreditados por MSE3.1, sin repetición. Releaseactiva `/home/ubuntu/releases/documental-platform-bbti/integrated-45698872132-1e1377a8-r1`. Cuatro digests linux/amd64 preservados:

- api-gateway:`sha256:55b04235af79c484fe2bc2c6ec9a2a1ecf2d09b373a89b7533c36b9b4ee60e34`
- ms-auth:`sha256:2bf72bdff09ed42508c739cbb0c4f09b9f192500d85c588885c21e72a507f80f`
- ms-documentos:`sha256:e830168139d3a550a871f48f72b7f628d3eccaf6696a26df433530c7368c81ea`
- web-admin:`sha256:bba959ab197ec890d2fed429a4857feff800a1d197ee94232589a362d0a4e75c`

Configuración aplicada por autorizaciónPO:versión1,modoNUEVOS,permanente:true,sin propiedad hasta. DELETE_FROM=`2026-11-25T20:00:00Z`; cutoffNASindependiente=`2026-11-24T22:48:35.970Z`;contextosBBTEC:1 yBBTI:2. DELETEPROD=true,DELETEDEV=false,visoraceptado=true. SoloDocumentos recreado porconfiguración con mismo digest; demáscontenedores preservados,health/ready200 PostgreSQL/NATS UP. No renovación ni fecha artificial. Revocación:deshabilitar flag productivo en últimooverride efectivo,validarCompose yrecrear soloDocumentos mismo digest; editar archivo no cambia el proceso yaejecutado. Preservar evidencia yno rollbackautomático.

### Recuperación institucional504 y aceptaciónPO

Archivo504/documento512/reserva7 UUID8618824d-9781-825a-a45b-6e0a06f7234b,v1,expediente3,BBTEC/cliente1. Ruta `documentos/2026/04/BBTEC/OC_003211__FACTURA_F001-7164_20600211618.pdf`. Única invocación de recuperarPendientesExactosProduccion bajoNUEVOS,sin ampliarEXACTO ni repetirconfirmación. NAS522007bytes/SHA256`d18207ca73ce7c8ff92d2b202d399f1538ac7298b9e40ec46c6781b89789f8b7`. DELETE204yHEAD404,autorización durable ymismaintención/respuesta/ausencia `4c304057-2005-4c98-b231-b2b8481bbbd5`,estadoELIMINADO_ACREDITADO/COMPLETADO,documentoconfirmado yrelaciónpreservada. PO confirmó explícitamentevisualizaciónPASS,descargaPASS ycontenidocorrecto;previewPOproveedorNAS, sin persistir ni reutilizar ticket compartido.

### Testigo nuevo automático505:GuíaTEO1-329

Archivo505/documento513/reserva8 UUID587e84b2-b2e6-8b76-a135-381fe52402a1,v1,BBTEC/cliente1/expediente3,adjunto_guia. Confirmación25/11 21:57:33.768334Z (16:57:33PET),CLAIM21:57:33.805812Z. PO confirmóflujoordinario yvisualización/descargaPASS. No recuperaciónmanual505 porCodex ni nueva confirmación provocada por la verificación. Cadena postcommitexistente:confirmación→NASverificado/lecturavisor→autorizaciónpermanente→DELETEcondicional204→ausencia acreditada yHEAD404. Mismointento `722ddaae-2ebb-40d0-8d33-6f79abfc5250`. If-Match exigido poradaptadorpublicado yETagopaco registrado; sin afirmar captura independiente de paquetes.

RutaR2/NASidéntica `documentos/2026/04/BBTEC/OC_003211__GUIA_TEO1-329_20600211618.pdf`;NASindependiente452079bytes/SHA256`a34797c1ff772c9fdded951528f448bcca24ec9a3ae70546f0b63934b9c1962d`,estadoCOMPLETADO/ELIMINADO_ACREDITADO,documentoconfirmado. DescargaHTTPindependiente desde endpointpúblicoautorizadoHTTP200(application/pdf) coincideexactamente en452079bytes ySHA256 conNAS/RDS. Ticket generado mediante lógica existente permaneció solo enmemoria, sin exposición nipersistencia.

### Conciliación de copias locales y exclusiones

507.pdf local1819732bytes/hash2ef7cd7b5d6e1f0cc05e1fd53bd8ce2eed0270dc550a51103428d945c3b88b93 no corresponde aarchivo507 enRDS;POidentificóelpreview504. Copiaslocales505.pdf y505-original.pdf también sonPDFgeneradosporvisor/navegador(CreatorFirefox,ProducerSkia/PDFm149),conbytes/hashesdistintos. No se declaran idénticas aNAS ni se usan comoprueba deidentidadalmacenada. La igualdadacreditada corresponde aloriginal recibido porHTTPpúblico yNAS, separada dePASS_PO. No fallodeintegridadservidoracreditado.

Reservas1–6/archivos498–503 quedanexcluidos porconfirmaciónanteriora20Z. Filascompletas conservanSHA256idénticos antes/después;ningunaintervención físicaenobjetosexcluidos. OC003211principal503/documento511 sigue enR2;su exclusión no afecta nuevosadjuntoselegibles. Losobjetosanterioresno se adoptanretroactivamente.

HyperBackupCLOSED_PASS_PO;recuperaciónhashPASS;riesgomismovolumenBASIC eintervaloentrebackupsdiarios aceptados. No se atribuyebackup previoacadanuevodocumento. Sinreaperturabackup,OCR/R2/NAS/periodos/migraciones/infraestructura, sinDELETEdirecto,cron,timersni nuevosservicios.

Cierre técnico/funcional físico acreditado; este incremento esexclusivamentedocumental. Commit/pushSOURCE→adendaspropiasEnterprise→sincronizaciónEC2 documental, sinrebuild nirecreate. SHAfinales ypreservaciónruntime se registran enrecibosexternos tras ejecución, evitandoautorreferencia. EntregaMSEActual paraactualizaciónincrementalR3,Bibliotecario,legadosucesoryresolucióndefinitivaG4;noafirmar indexaciónoaprobaciónexternanorecibida.
