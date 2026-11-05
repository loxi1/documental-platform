# Manifest vigente reportado — R2

## Candidato aceptado G3 — Finanzas período, observados y tests, 27/10/2026

Acción: `BBTI_FINANZAS_TESTS_RELEASE_CLOSURE_R1`. **G3=ACCEPTED_BY_PO; PO_VISUAL_ACCEPTANCE=PASS. Candidato preparado; no integrado, publicado ni desplegado por esta orden.** Este registro es el único manifiesto candidato; los parches, hashes y resultados externos son evidencias, no otro manifiesto rector. Prevalece sobre las fases preparatorias anteriores conservadas abajo.

### Identidad y composición pendiente

- SOURCE base publicado: `a393932aea98c5e1b0736694b980997ebd4b0f98`, árbol `34fd8c0ad68bf8a404224d95c7d4065e3e45d959`.
- Rama: `feat/test-failures-finanzas-filter`; worktree `/home/loxi1/projects/apps/documental-platform-test-failures-finanzas-filter`; HEAD base, cambios aún sin commit.
- Commit documental SOURCE, commit funcional y SOURCE main objetivo: **PENDING_AUTHORIZED_INTEGRATION**. No inventar SHA de un commit futuro ni confundir el HEAD base con el candidato dirty. Después de la integración registrar SHA/árbol efectivos en evidencia y en Enterprise, sin exigir igualdad de hashes entre repositorios ni ciclos de commits para autorreferenciar este archivo.
- Enterprise base local: `d60b6af89a99e6a4bdb2a48e7d6891d7ee4b59ac`, árbol `2ae8d7af78d889a9c247f7c6285f26ce2af78425`, limpio en esta preparación; frescura remota no reconsultada. Enterprise objetivo/árbol: **PENDING_PROMOTION**.
- GHCR: **PENDING_PUBLICATION**, sin tags ni digests nuevos acreditados. EC2 objetivo/runtime: **PENDING_PROMOTION**; R2 anterior permanece como referencia productiva, no como imagen del candidato nuevo.
- Composición funcional/test: 13 rutas. Cierre documental separado: `docs/06-database/05-seeds.md`, `docs/29-operations-manual/README.md`, `docs/31-governance/BRANCH_INVENTORY.md`, `docs/31-governance/README.md`, este manifiesto. Total previsto SOURCE: 18 rutas en dos commits focales; ningún otro código, lockfile, secreto o artefacto de build.

| Ruta del candidato funcional | Clasificación |
|---|---|
| `apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.spec.ts` | Test |
| `apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.ts` | Funcional |
| `apps/api-gateway/src/documental-v2/orden-pago-gateway.spec.ts` | Test |
| `apps/api-gateway/src/documentos/documentos.controller.spec.ts` | Test |
| `apps/api-gateway/src/documentos/documentos.financial-exception.spec.ts` | Test |
| `apps/ms-documentos/src/documental-v2/finanzas/evaluar-correspondencia-pago-factura.controller.spec.ts` | Test |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.controller.ts` | Funcional |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.detalle.spec.ts` | Test |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.periodo.spec.ts` | Test |
| `apps/ms-documentos/src/expedientes/expedientes.repository.revision-contable.spec.ts` | Test |
| `apps/ms-documentos/src/expedientes/expedientes.repository.ts` | Funcional |
| `apps/web-admin/src/components/finanzas/FinanzasBandeja.periodo.test.cjs` | Test |
| `apps/web-admin/src/components/finanzas/FinanzasBandeja.tsx` | Funcional |

No copiar el worktree completo a Enterprise. Materializar exclusivamente las rutas aprobadas desde el SOURCE integrado. Conciliar este manifiesto aditivamente con Enterprise conservando Actions #28, R2 y sus registros propios; no sustituirlo por el archivo SOURCE completo. Las evidencias externas y enlaces `node_modules` no son contenido Git.

### Tests históricos y resultado vigente

1. `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.detalle.spec.ts`, suite **Detalle OP READ ONLY**, caso **detalle válido sin archivo devuelve IDs, metadata y numeración visual**: expectativa corregida con `conceptoClasificacion: null`; PASS en la suite actual.
2. `apps/api-gateway/src/documentos/documentos.controller.spec.ts`, suite **DocumentosGatewayController - auditoría OCR**, caso **propaga identidad y correlación al confirmar OCR con expediente**: expectativa corregida con `x-finanzas-correspondencia-autorizar-excepcion: "false"`; PASS actual. No se retiraron campos ni headers del producto.

El antecedente R2 122 PASS / 2 FAIL procede del informe `ENTERPRISE_R2_INTEGRATION_MANIFEST_20261023/`, base reconstruida `cd823203…` con patch; no contiene una identidad definitiva de commit de aquella ejecución. PO ratifica su resolución por estas expectativas. No identificar esas dos diferencias con las incidencias Guía versionada/OCR archivo 8 ni afirmar que esas incidencias se implementaron en esta release.

Resultado Jest vigente: **19 suites, 282 PASS / 0 FAIL** (216 backend Finanzas, 66 Gateway). Correcciones adicionales de specs: rutas independientes de cwd, dos casos antes inalcanzables dentro del mock Axios, tipado de headers y contrato de período/búsqueda/paginación del Gateway. Pruebas de interacción frontend vigentes tras ajuste visual: **3 PASS**, separadas de los 282 Jest. El resultado inicial G2 74 PASS es antecedente de otro alcance, no se suma a los 282.

Build frontend: PASS; compilación productiva Gateway/ms-documentos con `tsconfig.build.json --noEmit`: PASS; typecheck frontend: PASS. Typecheck global incluyendo todos los specs: errores preexistentes fuera del alcance corregido; no afirmar PASS global. Builds de código funcional acreditados antes de correcciones exclusivamente de tests; no requieren nuevas imágenes por esas correcciones.

### Aceptación y LAB

PO confirma visualmente en 3007: período obligatorio (factura OC/OS; emisión OP), observados ambos orígenes, regresión Contabilidad y disposición final aceptados. El período inicia en el mes actual, sin carga automática antes de Consultar; búsqueda automática desde tres caracteres tras la consulta inicial. Un solo botón Consultar; Agregar OP junto al subtítulo; Observados y filtros en una fila de escritorio. La aceptación visual es **PO_REPORTED_PASS**, no observación automática de Browser.

LAB aislado: frontend 3007, Gateway 3107, ms-documentos 3207; identidad de archivos verificada, health HTTP 200, PostgreSQL `gestion_documental_lab` con `default_transaction_read_only=on` y `transaction_read_only=on`; LAB 3005 y dependencias conservados. Consultas reales READ ONLY de período/búsqueda/paginación, OC/OS y OP y ruta contable: PASS; observados OP acreditados con datos existentes. Caso observado OC/OS: no encontrado en los meses consultados por el ejecutor; cobertura por pruebas y aceptación visual PO, sin fabricar registros. Browser automático no disponible. `.next` del worktree eliminado; los contenedores tienen su build propio. Esas identidades LAB no son artefactos GHCR productivos.

### Promoción, rollback y límites

Secuencia obligatoria: **SOURCE main → Enterprise main → GHCR → EC2**. Preparación de comandos y verificaciones en `/home/loxi1/evidencias/documental-platform/finanzas-tests-release-closure-r1/release-plan.md`; no añade gates a G1–G4. G3 aceptado; autorizaciones de commits/publicación SOURCE, promoción Enterprise, GHCR y ejecución productiva deben quedar expresamente registradas antes de cruzar cada frontera. Esta orden prepara, no ejecuta dichas operaciones.

Imágenes necesarias: `api-gateway`, `ms-documentos`, `web-admin`; `ms-auth` runtime, NATS, Traefik, OCR y RDS deben conservarse. El workflow Enterprise `build-images.yml` es manual y publica cuatro imágenes incluyendo ms-auth: requiere decisión PO sobre publicar las cuatro sin cambiar runtime auth, o autorizar publicación selectiva acreditada de las tres. No modificar workflow ni ejecutar publicación por inferencia.

Antes de mutar EC2 fijar commit Enterprise, run CI y tres digests inmutables, freeze, Compose base/override y rollback. Mantener `ms-auth` en su digest anterior; recrear exclusivamente los tres servicios de esta release. Comprobar witness técnico y smoke funcional posterior. Rollback: tres referencias R2 previas y override autorizado conservados más abajo; confirmar su identidad/provenance y disponibilidad antes de deploy. No usar latest, no construir en EC2, no down global ni reiniciar OCR. Sin migraciones, DB_WRITE, usuarios o credenciales en esta release. Ledger no revalidado por este cierre; no reconstruir manifiestos históricos.

Evidencia durable base: `/home/loxi1/evidencias/documental-platform/`. Expedientes `finanzas-period-observados-g2-r1/`, `finanzas-jest-correction-r1/`, `finanzas-g3-local3007-r1/` (incluido `ui-adjustment/`), `post-deploy-continuity-r1/` y `finanzas-tests-release-closure-r1/`. Este último conserva snapshots, parches separados, inventario SHA-256 y plan operativo. No contiene env privados, contraseñas, hashes de autenticación ni materiales de recuperación.

---

## Cierre vigente — R2 y administración PO_MANAGED, 26/10/2026

Acción: `BBTI_POST_DEPLOY_CONTINUITY_AND_NEXT_BRANCH_R1`. Verificación focal `2026-10-26T22:52:56.914616+00:00`. Las secciones anteriores de preparación conservadas más abajo son antecedentes; el candidato administrativo está promovido. La promoción administrativa no construyó ni sustituyó imágenes R2.

- SOURCE main `a393932aea98c5e1b0736694b980997ebd4b0f98`, árbol `34fd8c0ad68bf8a404224d95c7d4065e3e45d959`; remoto consultado igual.
- Enterprise main `d60b6af89a99e6a4bdb2a48e7d6891d7ee4b59ac`, árbol `2ae8d7af78d889a9c247f7c6285f26ce2af78425`; remoto consultado igual.
- Checkout EC2 `d60b6af89a99e6a4bdb2a48e7d6891d7ee4b59ac`, árbol `2ae8d7af78d889a9c247f7c6285f26ce2af78425`, main limpio. Este checkout administrativo no identifica por sí solo el código construido dentro de las imágenes R2.
- Release de servicios: **R2**, referencia institucional `r2-e1f099fa-r1`; identidad observada por referencias inmutables de Config.Image. No se reconsultaron manifests OCI ni attestations GHCR; no confundir referencia configurada, Image ID y digest de manifest remoto.

| Servicio | Referencia configurada observada | Estado |
|---|---|---|
| /dp_api_gateway | `ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway@sha256:4ba59c185f52d308cffd163179819b26bbfa4b8b27968be1864c65eccb11ec0a` | running |
| /dp_ms_auth | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth@sha256:e299d52aa019c9d76e37618641ba2bce61b740b2df9c4523e8935e2df4a726b5` | running |
| /dp_ms_documentos | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos@sha256:949f9510bdc00c03842bb1218ffa817f941076d5eebc3bfa700a5a355ee7541f` | running |
| /dp_web_admin | `ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin@sha256:bab1a81e88262ac89d0c15bef87f20e1e80c6e5f1d370693e3f562fcf6ff49ad` | running |

Compose efectivo de las cuatro aplicaciones, según labels Docker: proyecto `docker`; base `/home/ubuntu/apps/documental-platform-bbti-prod/deployment/docker/docker-compose.production.yml`; override `/home/ubuntu/releases/documental-platform-bbti/r2-e1f099fa-r1/release.images.yml`; EnvironmentFile `/home/ubuntu/apps/documental-platform-bbti-prod/deployment/env/.env.production` (contenido secreto no leído). NATS/Traefik usan la misma base con `deployment/docker/docker-compose.ec2.yml`; no extrapolarles el override de aplicaciones. No se ejecutó `compose config` ni se volcó el entorno.

- Override release presente, SHA-256 `6895811e0dacdd2e0a22f4b34898e827a804e6a62fe9f03ba4c00d803651e07a`.
- Rollback preparado presente: `/home/ubuntu/releases/documental-platform-bbti/r2-e1f099fa-r1/rollback.images.yml`, SHA-256 `5232b404f7cfa046286caadd5b51be3eb20a8404366a58432f0061f0fcdd6776`; no ejecutado ni ensayado aquí.
- Smoke observado: web HTTP 200; API health HTTP 200; seis contenedores running; OCR active/running, NRestarts=0. No equivale a aceptación funcional integral.
- Migraciones nuevas: N/A, cambio administrativo sin esquema. Ledger LAB/producción actual: NOT_VERIFIED en este cierre; no se consultó RDS ni ejecutó runner. 0023/0024 y antecedentes conservados; no reservar/reutilizar 0025.
- Pruebas PO_MANAGED heredadas: 9 PASS / 21 comprobaciones PASS, snapshot aprobado, sin nueva ejecución. LAB previo conservado. Tests R2 heredados: 122 PASS / 2 FAIL en su ejecución histórica. Son diferencias de expectativa independientes de las incidencias Guía/OCR y del nuevo filtro. Su resolución actual está acreditada por los casos Jest corregidos y la aceptación PO; no se reescribe el resultado histórico como PASS. Build: N/A para este cierre documental y ajuste administrativo sin servicios modificados; build histórico R2 no repetido.
- Digest administrativo vigente `5b65b19d9e36d7f3e1744b1f5415cd23fa544e36bd13e3e79209b99d949ebdea`; no es manifiesto de migraciones.
- Autoridad: órdenes PO de promoción SOURCE/Enterprise/EC2 y PO_MANAGED acreditadas en la sesión; cierre de aprovisionamiento y resolución de claves **PASS_REPORTED** por orden MI/PO adjunta, no reejecutados ni revalidados en RDS. Acuses firmados NOT_YET_VERIFIED. No reejecutar aprovisionamiento ni cambios de contraseña desde estas instrucciones.

Evidencia institucional: `/home/loxi1/evidencias/documental-platform/`, expedientes `auth-users-po-managed-release-r1/`, `auth-users-po-managed-r1/`, `auth-users-option-a-final-preflight-r1/` y `post-deploy-continuity-r1/`. El resultado local `auth-users-password-change-r1/result.json` acredita un intento anterior BLOCKED/NOT_EXECUTED, no el cierre posterior reportado; falta evidencia material posterior de ese cambio. Esta diferencia se registra sin reabrir RDS ni invalidar por inferencia el reporte del PO.

Continuidad funcional y siguientes decisiones: [Operations Manual](../29-operations-manual/README.md#continuidad-vigente--26102026). Historia Actions #28 y R2 íntegra a continuación.

---

## Antecedente histórico — preparación del candidato administrativo usuarios BBTI/BBTEC R1

Acción: `BBTI_AUTH_USERS_FINAL_IMPLEMENTATION_AND_RELEASE_PREPARATION_R1`.
Estado: **PREPARADO PARA REVISIÓN; NO PROMOVIDO NI EJECUTADO EN PRODUCCIÓN**.
Este candidato es independiente de la release R2 reportada más abajo; no modifica sus
imágenes, digests o aceptación. No se crea un segundo manifiesto de release.

- Rama SOURCE: `feat/auth-users-standard-g2-r1`; base `88305c864df33368c47e770e45a05c29355735c7`.
- Commit definitivo SOURCE: PENDING; commit Enterprise y checkout EC2: PENDING.
- Artefacto: [procedimiento administrativo](../../packages/database/admin/auth-users-r1/README.md).
- Integridad: [SHA256SUMS administrativo](../../packages/database/admin/auth-users-r1/SHA256SUMS),
  distinto del manifiesto institucional de migraciones; no se escriben versiones en el ledger.
- SHA-256 de `provision.mjs`: `3d272d9a8b26a88c98b6160e0cecc37ddbec0fea5de29e54670a479341a35bf3`.
- SHA-256 de `SHA256SUMS`: `d33adeb49c1ab3f92c73bae71e2e85a1fbaf38617a3d3283ed94fd46f6330eb4`.

Composición exacta propuesta SOURCE/Enterprise (sin evidencias externas ni secretos):

```text
docs/06-database/05-seeds.md
docs/31-governance/RELEASE_MANIFEST.md
packages/database/admin/auth-users-r1/provision.mjs
packages/database/admin/auth-users-r1/provision.test.mjs
packages/database/admin/auth-users-r1/isolated.test.mjs
packages/database/admin/auth-users-r1/README.md
packages/database/admin/auth-users-r1/rotation-proposal.md
packages/database/admin/auth-users-r1/private-delivery.mjs
packages/database/admin/auth-users-r1/production-entrypoint.mjs
packages/database/admin/auth-users-r1/production.test.mjs
packages/database/admin/auth-users-r1/SHA256SUMS
```

Ruta de aprobación y promoción: rama focal → aceptación/commit SOURCE → SOURCE main
validado/publicado → materialización focal Enterprise main validada/publicada → checkout
Enterprise EC2 fijado al commit aprobado → preflight READ ONLY → DB_WRITE específico
4 usuarios/8 workspaces → postcheck productivo y acuses privados individuales.
No desarrollar en Enterprise ni copiar worktrees completos. Preservar su historia y
los trabajos ajenos; si existe conflicto material, detener la promoción. Comparar el
manifiesto administrativo y bytes con SOURCE; no asumir igualdad de hashes Git entre
repositorios. La evidencia LAB/O3 previa se reutiliza como antecedente fechado.

GHCR = N/A; imágenes modificadas = ninguna; recreación de servicios = N/A.
La actualización futura del checkout no autoriza ejecutar el aprovisionamiento.
`production-entrypoint.mjs` requiere main limpio/commit/ruta aprobados, digest aprobado,
configuración productiva local, base/rol/servidor verificados, custodia fuera de Git y
huellas públicas verificadas. Producción no se habilita por la mera existencia del script.
Aprobación externa de responsables/canal/rotación, claves reales y directorios privados:
PENDING; no hay credenciales productivas generadas por esta preparación.

Controles previos: identidad RDS y estado histórico 5 usuarios/11 workspaces, claves
naturales y conflictos, custodia disponible, acuses, autorización y digest exacto.
Controles posteriores: 4 usuarios/8 relaciones, permisos/favoritos exactos, históricos
intactos, auditoría y entrega confirmada. Ante incertidumbre, conservar operationId y
verificar READ ONLY antes de recuperar; no repetir creación ni resetear contraseñas.
Rollback DB: transacción antes de COMMIT; después, no eliminar usuarios automáticamente.
Entrega pendiente: recuperar los mismos sobres/operación sin regeneración. Toda
compensación o rotación posterior requiere autorización propia.

Evidencia focal: `~/evidencias/documental-platform/auth-users-final-components-r1/`.
Las claves sintéticas de pruebas no son claves verificadas de destinatarios productivos.
La promoción, escritura productiva, commits, push y despliegue no se ejecutaron en esta orden.


## Nota de uso — estándar R1, 26/10/2026

Consultar el [estándar canónico R1](../23-standards/11-source-development-and-release.md), aprobado por PO, ratificado por MI e integrado en SOURCE. Este sigue siendo el registro canónico para RELEASE; NORMAL no exige un manifiesto histórico. Los estados SOURCE pendientes descritos el 23/10 son antecedentes superados por el cierre de reconciliación acreditado por PO. No se actualiza ni revalida aquí la identidad productiva reportada. Para una nueva promoción registrar commit SOURCE, commit Enterprise, identidades GHCR/EC2, pruebas de aceptación, rollback y autorización PO en este mismo manifiesto, sin duplicarlo.


Fecha de continuidad: 23/10/2026. **CURRENT_PRODUCTION=R2**, **DEPLOY_TECHNICAL_PASS=REPORTED_BY_PO_MSII**, **MVP_FUNCTIONAL_ACCEPTANCE=PENDING**. Sustituye como referencia actual al registro Actions #28 conservado más abajo; no se revalidó producción en esta orden.

Enterprise local comprobado: `e1f099faeb4dfdc9f2b49b9984fe211935875ff3`; main y origin/main local apuntan al mismo commit. La rama activa es `integration/enterprise-r2-po-20261023`. SOURCE tiene identidad distinta y cambios pendientes: [inventario](BRANCH_INVENTORY.md).

| Servicio | Referencia GHCR R2 reportada en Config.Image |
|---|---|
| api-gateway | `ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway@sha256:4ba59c185f52d308cffd163179819b26bbfa4b8b27968be1864c65eccb11ec0a` |
| ms-auth | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth@sha256:e299d52aa019c9d76e37618641ba2bce61b740b2df9c4523e8935e2df4a726b5` |
| ms-documentos | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos@sha256:949f9510bdc00c03842bb1218ffa817f941076d5eebc3bfa700a5a355ee7541f` |
| web-admin | `ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin@sha256:bab1a81e88262ac89d0c15bef87f20e1e80c6e5f1d370693e3f562fcf6ff49ad` |

Las cuatro referencias fueron reportadas running; frontend y gateway HTTP 200; OCR activo, NATS y Traefik running. Finanzas: confirmación visual PO. Esto no acredita aceptación integral. Pruebas previas: 122 PASS / 2 FAIL de expectativas de contrato, no bloqueantes según reconciliación previa; no convertir los fallos en PASS ni afirmar nueva ejecución.

Checkout EC2 reportado: `/home/ubuntu/apps/documental-platform-bbti-prod`; proyecto Compose `docker`; base `deployment/docker/docker-compose.production.yml`; entorno `deployment/env/.env.production`. Override release `/home/ubuntu/releases/documental-platform-bbti/r2-e1f099fa-r1/release.images.yml`; rollback C1 en el mismo directorio, `rollback.images.yml`. No confundir estas rutas EC2 con los repositorios locales.

Fuentes: paquete MSII y actualización ME del 23/10/2026 en `/home/loxi1/Descargas/`. [Deploy R2](../18-runbooks/DEPLOYMENT_RUNBOOK.md), [verificación](../18-runbooks/DEPLOYMENT_VERIFICATION.md), [rollback](../18-runbooks/ROLLBACK_RUNBOOK.md). Rollback preparado, no ensayado. Los digests históricos de abajo pertenecen a otros expedientes; no usarlos como override C1 R2 sin acreditar el archivo correspondiente.


---

## Registro histórico anterior (conservado)

# Manifest de release MVP — Actions #28

Control: `MVP-RELEASE-DOCUMENTARY-CONSOLIDATION-R11-FINAL`. Fecha: 2026-10-16. Estado: **CONSOLIDADO PARA REVISIÓN FINAL Y PUBLICACIÓN DOCUMENTAL CONTROLADA**. Despliegue NO autorizado.

## Cadena de identidad

- SOURCE main: `ca49e734393d370087b490568ac28c5b00e36368`, tree `807c428e9948e7102be912cd4a0f7ea32689fcf4`.
- Enterprise main: `6a61551420a18a041b732db10b2f56f84b7147b5`, parent `32b0a2b9fa536c7e71c315529f8e4278d64b7e22`, tree `275e826a561430469d1c0d039010fb47f6edaa8f`.
- Actions #28: run `38974113305`, evento PUSH, rama main, commit Enterprise anterior, conclusión SUCCESS. Fuente: resumen oficial aportado por el PO en R11; no se presenta como nueva verificación API (R9C recibió 403).
- GHCR: manifests y configs verificados en R9C. Registros oficiales aportados por PO, inspeccionados en R10B, vinculan servicio, tag, revisión VCS y config exacto con cada manifest GHCR. Los registros no contienen el digest manifest literal ni conclusión global; esta última procede del resumen PO. No afirmar attestation criptográfica firmada del workflow.

| Servicio | Referencia GHCR inmutable | Registro de build | Plataforma |
|---|---|---|---|
| api-gateway | `ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway@sha256:f60b6928b1f92efcd3247b1e60f9ba62a154ddcfd897f6a0ecf33be06bbaac10` | `BBTI-SAC~documental-platform-bbti-prod~IXMZE4.dockerbuild.zip` | linux/amd64 |
| ms-documentos | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos@sha256:48191dcbfb2283abd53d90566588167061534fe67a7e122280a9411fd091e721` | `BBTI-SAC~documental-platform-bbti-prod~EZTXUQ.dockerbuild.zip` | linux/amd64 |
| ms-auth | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth@sha256:d54b28f426c0ddd0f5ccc46c031bfe3310f5beb6d519b8158a4a95e7024671d7` | `BBTI-SAC~documental-platform-bbti-prod~NSX5IO.dockerbuild.zip` | linux/amd64 |
| web-admin | `ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin@sha256:2d224d284e0136e3c3a3b034c6872f0a2b405bc3cef9835d877ee827e25b3547` | `BBTI-SAC~documental-platform-bbti-prod~2LEFZE.dockerbuild.zip` | linux/amd64 |

## Frontend productivo

Argumentos efectivos acreditados en el registro web-admin:

```text
NEXT_PUBLIC_APP_URL=https://bbtecnologia.com
NEXT_PUBLIC_API_URL=https://api.bbtecnologia.com/api/v1
NEXT_PUBLIC_AUTH_API_URL=https://api.bbtecnologia.com/api/v1
NEXT_PUBLIC_APP_NAME=Documental Platform
NEXT_PUBLIC_ALLOW_LOCAL_API_FOR_TESTS=NOT_SUPPLIED
```

Sin localhost/configuración LAB en estos argumentos públicos. Son valores fijados durante build; no prometer que variables runtime los sustituyan. No se hizo inspección exhaustiva del bundle ni tráfico runtime. El frontend LAB local y sus URLs 3017/3117 no son artefacto productivo #28.

## Configuración y baseline productiva

El nuevo release es candidato publicado, NO estado ejecutado observado en EC2. No hubo inspección EC2 en R11. Última identidad histórica registrada: runtime `caf689b87bbd045221b821c4b9ffba19929634b9`, checkout `da19e9f0`; no asumir vigencia actual ni aceptación funcional integral.

Preservar RDS productivo, R2, OCR systemd, secretos, volúmenes, redes, puertos, NATS y servicios externos. No sustituir por PostgreSQL/MinIO/worker/roles/redes del LAB. No ejecutar migraciones automáticamente. Verificar compatibilidad y ledger productivo mediante control separado; el ledger LAB no acredita producción.

OCR histórico efectivo: unidad `/etc/systemd/system/documental-ocr-worker.service`, usuario `documental-ocr`, WorkingDirectory `/opt/documental-platform/current/workers/ocr-worker`, Python `/opt/documental-platform/venvs/ocr-worker/bin/python`, EnvironmentFile `/etc/documental-platform/ocr-worker.env`. Revalidar propiedades saneadas antes de desplegar; no sustituir por unidad versionada de desarrollo ni cambiar worker con las cuatro aplicaciones.

Variables requeridas por nombre, nunca secretos: `DATABASE_URL`, `JWT_SECRET`, `NATS_URL`, `MS_AUTH_URL`, `MS_DOCUMENTOS_URL`, `DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED`; R2 `R2_ENDPOINT_URL`/`R2_ENDPOINT` según consumidor, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_REGION`, `R2_FORCE_PATH_STYLE`. Frontend: argumentos arriba. Verificar consumo/configuración efectiva; no copiar roles ni permisos LAB a producción. Auth puede requerir auditoría/último acceso; Documentos requiere operaciones propias del MVP, no convertir el rol RO LAB en rol productivo universal.

## Cobertura

Baseline: árbol completo Enterprise `275e826a561430469d1c0d039010fb47f6edaa8f`, no solo ocho archivos modificados. Inventario reproducible futuro: `git ls-tree -r --full-tree 6a61551420a18a041b732db10b2f56f84b7147b5`. Los manifests históricos parciales no limitan el MVP. Se preservan Finanzas OP/OCOS, calendarios/parser, RH/factura/TEMP, asociación documental/A7F, OCR normal e histórico, bandejas y reglas empresa/cliente existentes. Esto define contenido, no certifica exhaustivamente cada flujo.

Dependencias de construcción: Dockerfiles comprometidos `deployment/docker/Dockerfile.nest` y `Dockerfile.next`, lockfile del árbol exacto, Node Alpine y tooling según registros. No prometer reproducibilidad binaria con tags/herramientas mutables; identidad operativa fijada por manifest digest. No reconstruir en EC2.

RELEASE_MANIFEST_STATUS=CONSOLIDATED_FOR_FINAL_REVIEW_NOT_DEPLOYMENT_AUTHORIZATION.
Gates previos: backup recuperable, baseline efectiva y rollback verificables, plataforma, configuración/esquema compatibles, aprobación PO de ventana y referencias exactas. Ver runbooks.

## Evidencias y límites

Expediente base: `/home/loxi1/projects/evidence/documental-platform-bbti/actions28/`.

- R8B: `/tmp/bbti-enterprise-r8b/result.json`: commit/push, parent/tree, coincidencia de ocho blobs; archivo temporal, conservar en paquete durable antes de publicación documental.
- R9C: `credential-match-r9c-20261016/RESULT.md`, `ghcr-only/verification.json`, cuatro manifests y SHA256SUMS.
- R10B: `build-record-r10b-20261016/RESULT.md`, `records-projection.json`, SHA256SUMS. Extensión ZIP pero formato gzip/TAR OCI; integridad de archivos/blobs validada sin ejecución ni importación Docker.
- R11: resumen oficial del run suministrado en la instrucción PO. No se reconsultaron Actions/GHCR.

Digest del archivo descargado, índice OCI del registro, config de imagen, digest local Docker y manifest GHCR son identidades diferentes. La tabla usa exclusivamente manifests GHCR. El tag del commit acredita referencia publicada en R9C; `latest` no es identidad del release.


---

## Release MVP preparado — 05/11/2026 — aprobación de despliegue PENDIENTE

Acción `MVP_ENTERPRISE_PRODUCTION_RELEASE_CONTROLLED_R1`; continuidad `MVP_RELEASE_RESUME_FROM_SOURCE_MAIN_R1`. Registro definitivo de preparación, no evidencia de despliegue. Prevalece sobre estados preparatorios anteriores del mismo alcance; no borra su historia.

**RELEASE_RECORD_FINGERPRINT=d640bae51d6609703afb1ce91cdc814d52e976d919308afe54109e185e21cd92** (SHA256 del JSON canónico externo `release-record.json`, no un commit Git ni digest OCI).

### Identidades y frontera documental

- FUNCTIONAL_SOURCE_COMMIT=`88edc03136a446308d8b18fa778bdccf6c002be3` — SOURCE main publicado y verificado.
- FUNCTIONAL_ENTERPRISE_COMMIT=`a57c328cbf62de39aa91ed541ae32b449927a5b6` — Enterprise main publicado y verificado.
- CANDIDATE_CONTENT_FINGERPRINT=`39a446582ba5c4f529b97fab965f2fd7676bc7b6bea0e3f2111dd3716f2390fe`; 101 rutas exactas (51 funcionales/50 tests), incluidas las nueve correcciones E2E y sus dependencias.
- BUILD_RUN=`42085042466` ([GitHub Actions](https://github.com/BBTI-SAC/documental-platform-bbti-prod/actions/runs/42085042466)), `SUCCESS`. Los cuatro manifests OCI y sus configs se verificaron por SHA256; la procedencia de BuildKit contiene VCS revision igual al commit funcional Enterprise.
- MANIFEST_SOURCE_COMMIT y MANIFEST_ENTERPRISE_COMMIT son, en cada repositorio, los commits documentales que introducen este RELEASE_RECORD_FINGERPRINT en `docs/31-governance/RELEASE_MANIFEST.md`. Se resuelven exactamente por `git log -1 --format=%H -S d640bae51d6609703afb1ce91cdc814d52e976d919308afe54109e185e21cd92 -- docs/31-governance/RELEASE_MANIFEST.md`, y se fijan en la evidencia de promoción antes del gate PO. No se inserta una SHA autorreferencial imposible dentro de su propio commit. Ambos commits documentales conservan los 101 hashes; NO requieren nuevas imágenes.
- El workflow es manual (`workflow_dispatch`): las imágenes quedan fijadas al commit FUNCIONAL Enterprise anterior; publicar este registro documental no dispara otro build. El checkout productivo futuro se fijará al commit DOCUMENTAL Enterprise, con los mismos contenidos funcionales.
- G3 Finanzas 27/10 ya incorporado en Enterprise `15bcc460ce325ff7493a4b6860a39ce17dbfa364`; no se repromovió como otro candidato. Historia R2 y Actions #28 conservadas. Actions #32/run40519336692 es SUCCESS_REPORTED histórico; no prueba despliegue ni identifica las imágenes de este registro.

### Publicación frente a despliegue

| Servicio | Tag publicado | Digest OCI publicado | Selección productiva |
|---|---|---|---|
| `api-gateway` | `ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway:a57c328cbf62de39aa91ed541ae32b449927a5b6` | `sha256:d0e0875318b91512b308add1fbf80d9542239eca1ffc3a32125bd3a29b0f4a12` | Desplegar `ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway@sha256:d0e0875318b91512b308add1fbf80d9542239eca1ffc3a32125bd3a29b0f4a12` sólo tras aprobación PO |
| `ms-auth` | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth:a57c328cbf62de39aa91ed541ae32b449927a5b6` | `sha256:398ae9c0c8c7153d4ed5270aea7a9b4d4da4b317cd4bc80b198bbd83b37cc201` | Conservar Auth actual: `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth@sha256:e299d52aa019c9d76e37618641ba2bce61b740b2df9c4523e8935e2df4a726b5`; la imagen nueva NO se desplegará |
| `ms-documentos` | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos:a57c328cbf62de39aa91ed541ae32b449927a5b6` | `sha256:817a2490d1a4a2891da3f0381dde024e118886e4fbb4a8a348fd8bbc6a94a7ab` | Desplegar `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos@sha256:817a2490d1a4a2891da3f0381dde024e118886e4fbb4a8a348fd8bbc6a94a7ab` sólo tras aprobación PO |
| `web-admin` | `ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin:a57c328cbf62de39aa91ed541ae32b449927a5b6` | `sha256:78db00064093665c89ce60ac6944cc135a5acb652a74d2d8c85e4cd9e8d35691` | Desplegar `ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin@sha256:78db00064093665c89ce60ac6944cc135a5acb652a74d2d8c85e4cd9e8d35691` sólo tras aprobación PO |

Auth se comprobó expresamente: árbol de código sin cambios entre Enterprise base y commit funcional, paquetes shared/config/database sin cambios y typecheck/build aprobados. Se reconstruyó/publicó por el workflow vigente de cuatro imágenes; se conserva su digest productivo para evitar una recreación innecesaria. El login funcional productivo no se ejecutó en el preflight.

### Inventario funcional inmutable anterior al despliegue

| Ruta | SHA256 |
|---|---|
| `apps/api-gateway/src/common/finanzas-workspace-access.ts` | `578cdbe563c22404b3c77aef6c018e0c24d87863cded39057788eecc3ad68539` |
| `apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.spec.ts` | `6a7391c615a4c28687a3300a053d9eaa523cb5afa146ffa97f7f8d19f8d54e6e` |
| `apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.ts` | `309780211f5a59ca0d443477dd0e03476dc5fccc66a4192716df579cc632aaf3` |
| `apps/api-gateway/src/documentos/documentos.controller.ts` | `3ad0b756800406cb81484e24c7d3331e593e255567d10fde6d479b68e58b6f02` |
| `apps/api-gateway/src/documentos/documentos.financial-exception.spec.ts` | `41c70e6cf08a396908217981f39d24d23af872a1e4dd366653e6dd6f9760036d` |
| `apps/api-gateway/src/documentos/documentos.tmp-documental.controller.spec.ts` | `d85eca1384919afd41f43550285bf1e57922868be1c4a57896ed56c577c0b045` |
| `apps/ms-documentos/src/common/interceptors/api-response.interceptor.ts` | `224e44d64ae7c96f4c357c6551d39f8e6ec6a3c8cee2ee2429fc1fe87faaef72` |
| `apps/ms-documentos/src/common/interceptors/request-logger.interceptor.spec.ts` | `47538712c16b1a44bdec2364dde201c3b2a1f4a9bf6bb1eea8f948adf27ec54f` |
| `apps/ms-documentos/src/common/interceptors/request-logger.interceptor.ts` | `cfcda4726441c1edb5f75245907b6967cfc016daf4981d4764ea11bf6bd2ece6` |
| `apps/ms-documentos/src/documental-v2/finanzas/grupo-financiero.spec.ts` | `03f9849209586ec64304150ceeafbad8f61df902302d39d7af1439f4bcb9b1e8` |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.controller.spec.ts` | `978bb23089bcf80d581d7615383e018a420916971c3775b9acf748ed6adba6d9` |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.controller.ts` | `575d0c0b0fdad14913424390e67b43cf505ae8e6b82b02a0c07cff7030a4a2e0` |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.dto.ts` | `1a83fcd00ad555e0dad8cff8bc4c7742bfa744e10079338dcb303b7318f60d0b` |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.excepcion-finanzas.spec.ts` | `dd060c87b05d5a0e26f6e5c7d8a61b63519eafee70d68013895883903f6188bf` |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.observar-pendiente.spec.ts` | `4a559ec91b909cd2607d21cd695d17bba4a2815d9575fd6c72e82f977ca542d4` |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.service.spec.ts` | `e490d07698cc14eeb22618714f5fea4988a1b8586c4aaafa87da05c3572fc461` |
| `apps/ms-documentos/src/documental-v2/finanzas/orden-pago.service.ts` | `0b8d3d4e68572fff65b3876941d067680a95ef7e709473be2baa8cecdde0ca4e` |
| `apps/ms-documentos/src/documental-v2/grupo-factura-documento.repository.ts` | `4fcf59750ef3cfc574ec26773ea4cd0b017c5ce20ff688e8fe4ea97a9cdbafa3` |
| `apps/ms-documentos/src/documental-v2/use-cases/asociar-documento-principal-v2.recreacion.spec.ts` | `cbca6ad970278a2307b527abbc39d4f66cb6437c1e78a1b0b5c95960ad5177af` |
| `apps/ms-documentos/src/documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase.ts` | `0dc0290e33616847b9dbf36ca46685d0e4424dcacc0545f3ddde6bae17675f59` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.compensation.spec.ts` | `ee5e1c49e21c251db5bd213d12c4bbf0bc1679acfbad5bc9e86639d165246910` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.compensation.ts` | `6fbac106f8912df618839636a11c60fd147283ee1025ae7defcc1fea84c898cc` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.constants.ts` | `fe47e34f99a3cdcfee4caea73ed11083b1ccd5dd02e236c44c714579eb15db96` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.fingerprint.spec.ts` | `5e686b90353241bd1b3030621fd18267353e01f45775f469868d3f744252af4f` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.fingerprint.ts` | `23491110d05f5ff5df567cea2b2b685af48440fece6ac0bcb9b1099e665a9bcf` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.p3-commit-boundary.spec.ts` | `ae99a3abc35145dae32fb2de76ef5f2a12fba7c0ebb0ad2e7f720ef09635e078` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.p3-service-boundary.spec.ts` | `466d0e1d0b092c3d0b6fa5de5b71d328e6ef444d562a25a0faa36f22630674e2` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.p3-terminal-atomicity.spec.ts` | `f421bb4694ed9442353acaf941f466bf2875f3ed8e0a0b22b3cfecd25960e840` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.persistence.spec.ts` | `672b67699168a92662c1cfb7c33c2238df4cc7e0de3604ba149db8a2ead3782a` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.persistence.ts` | `cfcb7c7f24fb7cf19db723cdba989b1a2c2c44dacfb4f7344da701f615947229` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.repository.spec.ts` | `18136737c05711b1069b5098b3a81fb8320aef16b18b0ebda25c2751ea4f7811` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.repository.ts` | `69578173f9ccdeafd5a34c841ea046f5e12c1d72ea015c201d296526ddcd2a77` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.safe-put.spec.ts` | `23b13710eaa48d98e15fa73c1c67fff2b2854063d7637b59bd3e23d5164228b6` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.service.spec.ts` | `3ceb84b4c75a97942d39baee9d91e5367f8666e791d0da372b6a211b9c803fca` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.service.ts` | `0a22ba3060bb966c1d6915582f18fe1b6643b4ee54dbb8ccb4ea165a14abd4ce` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.storage.spec.ts` | `29da0baea5856c03e1f78cafacdba395ce3d8ec90055215df2ddaf0d7761c9ee` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.storage.ts` | `f5fa0e337e87a90982843c62ab99055afbe69780c7cf842ba4cfeda0f06adf0e` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.types.ts` | `77cd674d127770767912fc73d1e46a6a26d32dc27df453e1ee7211210db15f64` |
| `apps/ms-documentos/src/documentos/carga-segura/http/carga-segura-http.filter.ts` | `76753a7bf8e9f8dad044679dadde9da456f3e98750e8b8d8f011cb89f6d2d32a` |
| `apps/ms-documentos/src/documentos/carga-segura/http/carga-segura-http.validation.ts` | `0a7b3733ab3f57384cc4fd45162f3a453cc89028d6a7ac522734fb730a6e228f` |
| `apps/ms-documentos/src/documentos/documentos-upload.service.spec.ts` | `f8d15f7bde01477c89f0555fd8489efcca473f81f972520680ddc9438079c848` |
| `apps/ms-documentos/src/documentos/documentos-upload.service.ts` | `4c021127430920b14229f098fd1867ab5d833790070ed33f54a02b51bfe5d2a8` |
| `apps/ms-documentos/src/documentos/documentos.controller.ts` | `80bd382bc8eabfa60f10038f32e1e27b7a2982d0c6aa482aabb3b20469961de0` |
| `apps/ms-documentos/src/documentos/documentos.module.ts` | `2da347489503c14c0a9750db86c16b431add1f21daac8017ef3e95b9a699c795` |
| `apps/ms-documentos/src/documentos/documentos.op-observacion.spec.ts` | `890676eb9e6ee0ed8bcab766fb00ed2504f842d2f9c1e4111d240cb1ab93d0cb` |
| `apps/ms-documentos/src/documentos/documentos.recovery-confirmacion.spec.ts` | `bb84471026c8c3d718d7eee811c93f5c9342171f88d70946b68b2e011f1eeb58` |
| `apps/ms-documentos/src/documentos/documentos.repository.tmp-materialization.spec.ts` | `70403c3ba91eaad4934bf1628a41ad775a1ee0418be3b47a12c107d7880cd5ad` |
| `apps/ms-documentos/src/documentos/documentos.repository.ts` | `037c04e921d925664439b94d37f784ed9b28a4136b871d72b60b44739b8306f7` |
| `apps/ms-documentos/src/documentos/documentos.service.ocr-coalescing.spec.ts` | `6817a4026bb6e31b19e9b161b89ed5f2c3614fb514208f2e03f57bb4af4ec6ee` |
| `apps/ms-documentos/src/documentos/documentos.version-context.controller.spec.ts` | `4997afd6a0caafd688713dd16a6311ea5e8728ce53369662a5328806214532a6` |
| `apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.repository.ts` | `9da7a2fd504a9b13d5169fc38e15e5719cbc0cc70fad310855d6f33b5f32b43c` |
| `apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.service.spec.ts` | `9aff36a344b83804304d0963a1902ed3dd365ae9cdbc00bb59512f9fde58785e` |
| `apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.service.ts` | `7bb274700179c5367921fb630a8667fa7481501e74bad5001be1f63ebd9e58e4` |
| `apps/ms-documentos/src/documentos/orden-pago/orden-pago-archivo.reemplazo.spec.ts` | `a44ddc5a791ea19b20c45a2286e1751b24006226fbf890980ab8ff41586becda` |
| `apps/ms-documentos/src/documentos/orden-pago/orden-pago-archivo.service.spec.ts` | `134d20afb4c6013b7b9068f27508033eeb82556865536b61926285feba85987a` |
| `apps/ms-documentos/src/documentos/orden-pago/orden-pago-archivo.service.ts` | `a1bf2d794c9aac43c2467c7a458a102ddd39894815ceef85cbe72b0b0843115c` |
| `apps/ms-documentos/src/documentos/orden-pago/orden-pago-fecha-emision.spec.ts` | `86427a255d634c27e53121b97af3ece96742cd0eac7c7ed93fcabd9232ae1129` |
| `apps/ms-documentos/src/documentos/orden-pago/orden-pago-fecha-emision.ts` | `ccc927515ee7aca80eb08b7ed0170575c470301821c83edeb8f33dd9a4d64097` |
| `apps/ms-documentos/src/documentos/periodo-documental-r2.fecha.spec.ts` | `f927db7f2f223f40fea869086ffa6717ff89d2ead0f289bb3942c74df2793778` |
| `apps/ms-documentos/src/documentos/periodo-documental-r2.fecha.ts` | `3433d3d6eb7cab66badb5003c3e4408a5842109eb248b690baa141e452b952c9` |
| `apps/ms-documentos/src/documentos/periodo-documental-r2.repository.spec.ts` | `e5367e6b1c395c94aff0c07292c92b31239c860a454391a239057ea165bb0f54` |
| `apps/ms-documentos/src/documentos/periodo-documental-r2.repository.ts` | `6b333176fd62588fc611ea1fabfcbbdf36369157340b724f6cf3be5ef5637366` |
| `apps/ms-documentos/src/documentos/periodo-documental-r2.resolver.spec.ts` | `3878294257f8431e0fd1dbdc52801201de979513de2dd4b5cc76c394ae152990` |
| `apps/ms-documentos/src/documentos/periodo-documental-r2.resolver.ts` | `3f566743bd16a589fbb60c5bdd2a3dedc71345609f732b0c0662024a09936fbb` |
| `apps/ms-documentos/src/documentos/r2-source-closure.spec.ts` | `e04a89ef52dfc2a6cdc97a31f84e868ad5aec09ae7577fafc3d8971812b7e088` |
| `apps/ms-documentos/src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.repository.spec.ts` | `992fad138ff21f2850fdf6d1199d7b57182d73c1619fb569a4eea4084f41aea5` |
| `apps/ms-documentos/src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.repository.ts` | `d646ececf6ad1a9cf43a6f86cfcb1a54dde5f8a69d7eacc53b22dff3cd904c92` |
| `apps/ms-documentos/src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.service.spec.ts` | `1e9d3068abe685bccb5aa19f68eb117c21df66d55b40da24ac04dbcbe35cf060` |
| `apps/ms-documentos/src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.service.ts` | `840c274491ec35a81dc91a58835d27cabdb3e40ae0be046fee9b7ba4b66d7e14` |
| `apps/ms-documentos/src/documentos/tmp/duplicate-document-origin.ts` | `3b413a89b08c05acec01a74401496b8a4e7baf311a61bf769d9f97a328dbfd5d` |
| `apps/ms-documentos/src/documentos/tmp/tmp.controller.ts` | `76432ced40077d81d599d52e4bf664641f1630582471eb64b05b147d56e804fb` |
| `apps/ms-documentos/src/documentos/tmp/tmp.documental.spec.ts` | `02e8cf26591ccdd7708af296f230b5cc304d241f4ba9508b81e4c8103a28c82e` |
| `apps/ms-documentos/src/documentos/tmp/tmp.overwrite-recovery-closure.spec.ts` | `77b1bd97d72dcab62f55833fcb0313698b50672489ad05d114fe7e59e16d8a73` |
| `apps/ms-documentos/src/documentos/tmp/tmp.regularizacion-expiry-g2.spec.ts` | `f154a8b51c6e3cce2a819d2ea65e53361a9b476e9077e3255b26d1059f4899c4` |
| `apps/ms-documentos/src/documentos/tmp/tmp.repository.spec.ts` | `8787aa28fe05459cc842d5d1035d41c002ef29a58f4f0ca66d4e6f3dd1c5fdd4` |
| `apps/ms-documentos/src/documentos/tmp/tmp.repository.ts` | `9159aeffa2fa7d13423351be833ff757a370aed8a6ea8041f6d2f8be510c365c` |
| `apps/ms-documentos/src/documentos/tmp/tmp.service.spec.ts` | `caae10d34cde12332ae339725f15f57e6170d316d8188615c2b7a086ee23f348` |
| `apps/ms-documentos/src/documentos/tmp/tmp.service.ts` | `8053e089f4afc614c1b1f2d3ff4307693b3736644c04c05e2d070d14738d07eb` |
| `apps/ms-documentos/src/expedientes/expedientes.controller.ts` | `dc3e2137287a70ad3e30f32df1f6f75e0328b48d3f1ae73e1aeb92747b0752b3` |
| `apps/ms-documentos/src/expedientes/expedientes.repository.revision-contable.spec.ts` | `ad7f4025cd93f08a585565dea3b0e1800ddd59ec99b3a043bb19082a5422bc37` |
| `apps/ms-documentos/src/expedientes/expedientes.repository.ts` | `87597bfef511f4ccc60c044bf026492c1315bc9a2aff9018d6cb2ae890ed4b97` |
| `apps/ms-documentos/src/expedientes/expedientes.service.ts` | `e9b958b9d9797319b8fcb95421fed2c0b2848aa2121462b9322293f15e5f0012` |
| `apps/web-admin/src/components/almacen/AlmacenBandeja.periodo.test.cjs` | `df9964efe52b7df0ce0d39a904f681ac8bd803610c9d1a01a14bc8b1bed11667` |
| `apps/web-admin/src/components/almacen/AlmacenBandeja.tsx` | `7b9b726941c1d7537582e4a1f4167adac16b6c2cf9b0b8bf51a16c9fa96bd645` |
| `apps/web-admin/src/components/almacen/AlmacenExpedienteEditor.focal-corrections.test.cjs` | `cec9a94833d15fd2e007783439d48b455e35adfabef671fbe56fb9c2a3672a96` |
| `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx` | `13b901f3a9880a90096bab1b0f07025a1c7df24169490bfdf3d261a030bac724` |
| `apps/web-admin/src/components/compras/Compras.temp.test.cjs` | `e4eb5376279755b25c5466322d9e5cc8eb786e1b7e6d83eedc42961fbcf89caf` |
| `apps/web-admin/src/components/compras/NuevoExpedienteWizard.tsx` | `98b64edcb0f638b2e3fd7fd44fbbbf1021cdfd3da031c03fe8e5dc4f3bdc21fd` |
| `apps/web-admin/src/components/finanzas/FinanzasDocumentoPrincipalOperativoCard.grupo.test.cjs` | `8bb72b74fdf0da8dd1fe346506c25bf515c9a834fe1d5ece2f7a5415cbc7477d` |
| `apps/web-admin/src/components/finanzas/FinanzasDocumentoPrincipalOperativoCard.tsx` | `b2ebc552524b473d4003ae5b6f5f267a0faa690002cfff1f259e41e3b80990b4` |
| `apps/web-admin/src/components/finanzas/FinanzasExpedienteEditor.tsx` | `9dacb2772139c79149774a2643a70a7ca4c2c0dcfc6fb32165ef64b70ae841a4` |
| `apps/web-admin/src/components/finanzas/FinanzasExpedienteView.tsx` | `71d30a4fc1abffbca445a4baefe654b65b9bc05f93c6e59046ca9a7bc53db9ae` |
| `apps/web-admin/src/components/finanzas/FinanzasGrupoFacturaPagoPanel.tsx` | `a089d63a72f5f4a89e6b60d73dae06efc1f052fe86d92e0d1214a87990ac2bbd` |
| `apps/web-admin/src/components/finanzas/OrdenPagoAdjuntarPagoView.payment-support.test.cjs` | `7d1a6b0ebb63525cb379254a90821c34e8d1faa4b9e1d3bbcab8d12ad528c3f4` |
| `apps/web-admin/src/components/finanzas/OrdenPagoAdjuntarPagoView.tsx` | `576fa265851fb5e4143a450aabbb0e876eadd083b85bd58707125b9612199927` |
| `apps/web-admin/src/components/finanzas/RegularizarOrdenPagoModal.temp-recovery.test.cjs` | `f3cf81ec698f075f0cdaaa2aad139b857c456ed75d12ef93efd5c4a603e5856f` |
| `apps/web-admin/src/components/finanzas/RegularizarOrdenPagoModal.tsx` | `a693bc3e15d359f78350bf6122fb1b2194a83746b3f0868c42d0c6cbc4bcc5d3` |
| `apps/web-admin/src/lib/auth-storage.finanzas-excepcion.test.cjs` | `76bff1482a4c3cc424f26d7716059c2a0f9c92a78ac0c743dd35c89ba320f097` |
| `apps/web-admin/src/lib/auth-storage.ts` | `333497a8b083cd6ccc2119c24da48a4fb95191e3c42e8ee38cb9fbc8f079cca6` |
| `apps/web-admin/src/services/carga-segura.temp.test.cjs` | `86c9ce92493bc33b3fa9ba6e3c2537c50238a0f95f1baa35e9f5a458d51e3eae` |
| `apps/web-admin/src/services/carga-segura.ts` | `63e036dab99441bf558459ac12cb7948d333906a5270f34b7368294fb016cde6` |

Fuera del candidato: secretos y configuración productiva/LAB; tres ajustes Auth/NATS exclusivos del LAB; dos .bak; auxiliares, Dockerfiles/toolchain y utilidades de diagnóstico. Los 48 dirty del checkout original SOURCE se preservan íntegros; la integración se hizo en worktree main limpio y aislado. No se copiaron commits backup completos. Los paquetes compartidos/lockfile existentes se conservan.

### Aceptación y pruebas

PO_FUNCTIONAL_ACCEPTANCE=RECORDED: el PO validó en navegador Compras OC/OS; Almacén Guía/NI/adjuntos/versiones; ambos orígenes de sustentos; Finanzas/observación de duplicado; regularización Factura/RH; Contabilidad; preview; persistencia y recuperación OCR, sobre MinIO LAB. No es aceptación productiva ni de R2 DEV.

Backend LAB real PASS_FOR_EXECUTED_SCOPE: nueve archivos íntegros por bytes/hash; preview firmado MinIO; OP45 pagado250/saldo150 antes/después de observar duplicado; confirmación duplicada409; una auditoría859 y ningún vínculo financiero del documento observado146. Los 101 contenidos pasaron 275 tests focales/13 suites en SOURCE aislado y 275 tests/13 suites en Enterprise, con mocks donde corresponde; no se suman como 550 casos únicos ni sustituyen la prueba real. Typechecks productivos Gateway/Auth/Documentos/Web PASS; builds locales Enterprise de cuatro apps y dependencias PASS.

GLOBAL_TYPECHECK=KNOWN_FAILURES: exactamente los mismos 16 errores de tests (13 de aridad,1 unknown,1 cast SQL mock,1 proyección), sin errores nuevos. Tres errores afectan archivos candidatos cuyos54 casos Jest pasan. No se ocultaron los fallos ni se declara PASS global.

OCR/TEMP: OCR real LAB y asociación/reutilización por archivoId acreditados; fallos inducidos, callbacks tardíos y todos los estados parciales/concurrentes TEMP/fencing no acreditados E2E. Se conservan reintentos, identidad, CAS/fencing y estados terminales; recuperación real PUT_STARTED sin nuevo PUT en operaciones148/149; PRE_PUT no ampliado. Sólo eliminación nativa de TEMP sintético propio después de materialización; fixtures finales retenidos.

### Preflight productivo READ_ONLY y límites R2

- EC2 `ip-172-31-8-212` / `34.235.203.61`; checkout `main` limpio en `d60b6af89a99e6a4bdb2a48e7d6891d7ee4b59ac`. Seis contenedores activos; OCR systemd active/running, NRestarts0. Sin reinicios ni cambios EC2.
- RDS endpoint verificado, base `gestion_documental`, TLS activo; transacciones explícitas READ ONLY sobre metadatos. Relaciones/columnas requeridas presentes,49 permisos de tabla comprobados y secuencias necesarias autorizadas. Árbol packages/database idéntico al candidato; sin archivos de migración nuevos ni migraciones ejecutadas. No se leyó ni modificó información financiera.
- Health Documentos200, PostgreSQL/NATS up. R2 Cloudflare HEAD bucket200 mediante el adaptador configurado; sin uploads, borrados, movimientos, GET de documentos de negocio ni escrituras R2.
- Carga segura habilitada en producción. AUTH_NATS_NAMESPACE y OCR_REQUEST_SUBJECT sin override LAB; sujeto estándar OCR `ocr.procesar-archivo` preservado. No copiar `dev.source.auth`, `lab.ocr` ni MinIO a producción.
- Disco libre135482331136 bytes; memoria disponible6604 MiB; x86_64 compatible con manifests linux/amd64 verificados.
- R2_COMPATIBILITY=PARTIAL: la lectura de conectividad no acredita PUT condicional, checksum, materialización o E2E real en R2. R2_DEV=NOT_ACCREDITED; aceptación LAB=MINIO. No se declara validación funcional productiva ni de OCR productivo por el estado activo del worker.

### Plan exacto, rollback y autorización

PO_PRODUCTION_DEPLOYMENT_APPROVAL=PENDING. RELEASE_STATUS=PREPARED. EC2_DEPLOYMENT=NOT_EXECUTED; PRODUCTION_SMOKE_TESTS=NOT_EXECUTED. No cambiar producción antes de la aprobación independiente del PO.

Tras aprobación: revalidar identidades; sincronizar checkout con el commit documental Enterprise acreditado; conservar EnvironmentFile, puertos, redes y configuración; crear exclusivamente `/home/ubuntu/releases/documental-platform-bbti/mvp-42085042466-a57c328c` y overrides revisados; descargar las tres imágenes por digest y recrear secuencialmente ms-documentos, api-gateway y web-admin con Compose proyecto docker, base `deployment/docker/docker-compose.production.yml`, override de release y `--no-deps --pull never`. Mantener ms-auth en su digest anterior, NATS/Traefik/OCR/RDS/R2 intactos. No construir en EC2, no down global, no migraciones rutinarias ni limpieza. Smokes previstos de salud/readiness, API/UI y lecturas funcionales mínimas; cualquier escritura productiva adicional requiere alcance explícito.

Rollback de ESTA release: restaurar checkout anterior `d60b6af89a99e6a4bdb2a48e7d6891d7ee4b59ac` y las referencias productivas actuales siguientes, conservando configuración y datos. El archivo histórico rollback.images.yml (hash5232...) apunta a un release aún anterior y NO es el rollback seleccionado para esta promoción. Las cuatro imágenes actuales están cacheadas e inspeccionadas en EC2; el override actual release.images.yml coincide con estas referencias y SHA256 `6895811e0dacdd2e0a22f4b34898e827a804e6a62fe9f03ba4c00d803651e07a`.

- `api-gateway`: `ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway@sha256:4ba59c185f52d308cffd163179819b26bbfa4b8b27968be1864c65eccb11ec0a`
- `ms-auth`: `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth@sha256:e299d52aa019c9d76e37618641ba2bce61b740b2df9c4523e8935e2df4a726b5`
- `ms-documentos`: `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos@sha256:949f9510bdc00c03842bb1218ffa817f941076d5eebc3bfa700a5a355ee7541f`
- `web-admin`: `ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin@sha256:bab1a81e88262ac89d0c15bef87f20e1e80c6e5f1d370693e3f562fcf6ff49ad`

Ante falta de salud/errores materiales: detener nuevas operaciones, preservar evidencia e identidades y aplicar exclusivamente el rollback aprobado de servicios; nunca revertir automáticamente datos financieros o borrar objetos R2. El rollback local preparado replica el runtime actual, no referencias históricas supuestas. No se ejecutó rollback aquí.

Evidencia: `/home/loxi1/bbti-evidence/controlled-production-release-r1/` contiene state.json, release-record.json, ghcr-images.json, manifiestos/configs verificados por digest, build-run.latest.json, logs de checks/builds/tests, production-preflight.json, production-schema-compatibility.json, production-rds-and-sequences.json, overrides preparados localmente y binding de commits documentales. Es evidencia externa, no otro manifest rector.


---

## Evidencia de ejecución productiva — 05/11/2026

**EXECUTION_RECORD_FINGERPRINT=60feefbf4227f3fd7910a06605636085e034ef6c25aabe982455f47f80f81e65**. Corresponde al registro previo `d640bae51d6609703afb1ce91cdc814d52e976d919308afe54109e185e21cd92` y a su inventario inmutable de 101 rutas/huella `39a446582ba5c4f529b97fab965f2fd7676bc7b6bea0e3f2111dd3716f2390fe`. Esta sección sólo añade ejecución; no modifica inventario, código, digests aprobados ni pruebas históricas.

- PO_PRODUCTION_DEPLOYMENT_APPROVAL=APPROVED, por orden directa del PO. RELEASE_STATUS=DEPLOYED. EC2_DEPLOYMENT=PASS. RELEASE_ACCEPTED=NO.
- FUNCTIONAL_SOURCE_COMMIT=`88edc03136a446308d8b18fa778bdccf6c002be3`; FUNCTIONAL_ENTERPRISE_COMMIT=`a57c328cbf62de39aa91ed541ae32b449927a5b6`. Manifest previo SOURCE=`b1bd90a8e9c376c068d96c3055f27f494eee0442` / Enterprise=`da709acb84e23b0ff8062007f9e57c1646a05d26`.
- Checkout EC2 en la recreación: `da709acb84e23b0ff8062007f9e57c1646a05d26`, main limpio. La sincronización documental posterior sólo puede avanzar al commit que introduce esta sección, sin cambios funcionales ni recreaciones; su identidad se fija en el binding de evidencia y se resuelve mediante Git -S de este EXECUTION_RECORD_FINGERPRINT. No se generan builds documentales ni SHA autorreferenciales.
- Host `ip-172-31-8-212` / `34.235.203.61`. Recreación secuencial UTC `2026-11-05T19:14:54.416142+00:00` → `2026-11-05T19:15:29.573362+00:00`: ms-documentos, api-gateway, web-admin. Cada servicio pasó salud antes del siguiente.

| Servicio actualizado | Referencia efectiva verificada |
|---|---|
| `ms-documentos` | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos@sha256:817a2490d1a4a2891da3f0381dde024e118886e4fbb4a8a348fd8bbc6a94a7ab` |
| `api-gateway` | `ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway@sha256:d0e0875318b91512b308add1fbf80d9542239eca1ffc3a32125bd3a29b0f4a12` |
| `web-admin` | `ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin@sha256:78db00064093665c89ce60ac6944cc135a5acb652a74d2d8c85e4cd9e8d35691` |

Auth conservó `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth@sha256:e299d52aa019c9d76e37618641ba2bce61b740b2df9c4523e8935e2df4a726b5` y el mismo contenedor. NATS y Traefik conservaron IDs; OCR systemd conservó MainPID 425185, active/running y NRestarts 0. El archivo de configuración productivo conserva tamaño, modo y timestamp exacto; no se leyeron ni imprimieron sus secretos. Se usó --env-file existente para preservar interpolación/labels y --no-build --no-deps --pull never para impedir builds o recreaciones por arrastre.

### Verificaciones reales y límites

- Documentos health 200, PostgreSQL/NATS up; Gateway health 200; Web login 200. HTTPS público login/Compras/Almacén/Finanzas y API health/readiness200. La ruta financiera protegida sin sesión devuelve401. Auth health 200, PostgreSQL/NATS up. No se efectuó login ni se fabricaron tokens.
- Lectura de mantenimiento del OC existente: archivo467/documento472; preview nativo 200; GET R2 del bucket configurado 200; 53.514 bytes PDF, SHA256 coincide con PostgreSQL. Workspace documental y consulta contable nativos 200. Son lecturas técnicas autorizadas mediante SSH, NO acreditación de los seis flujos autenticados de navegador.
- Incidencia preservada: archivo474/documento481 referencia un bucket distinto del configurado y devuelve403 AccessDenied. El mismo resultado se reprodujo con SDK 3.1073.0 y fuente de preview idéntica en las librerías del Auth anterior conservado. No se hizo rollback completo como prueba A/B. La referencia histórica no se modificó; la lectura del bucket configurado es un caso de control separado, no sustituye este fallo.
- R2_PRODUCTION_VALIDATION=PARTIAL: lectura e integridad del caso configurado PASS; no se probaron uploads, PUT condicional, checksum de escritura o materialización productiva. OCR_PRODUCTION_VALIDATION=PARTIAL: worker activo/preservado; no se emitieron trabajos. Persisten límites OCR/TEMP y 16 errores globales de tipado previamente documentados.
- PRODUCTION_SMOKE_TESTS=PARTIAL. No se acreditaron lecturas funcionales autenticadas de Finanzas/regularización ni aceptación integral de navegador; falta sesión/validación PO correspondiente. No declarar RELEASE_ACCEPTED por salud/HTTP200 o por aceptación LAB previa.

### Incidencias de control y contingencia

Antes de recrear servicios, dos comprobaciones detuvieron preparación: timestamp de nanosegundos redondeado 95 ns en transporte JSON (archivo conservaba ctime/mtime de septiembre) e ID Docker expuesto como índice OCI en lugar de config digest. Se corrigieron únicamente los verificadores externos, manteniendo comparación exacta y la cadena OCI aprobada. No se cambiaron funcionalidades, config o imágenes para forzar PASS.

ROLLBACK_EXECUTED=NO. El caso 403 histórico no presentó evidencia de regresión del despliegue; los tres servicios y el caso R2 configurado pasan. El rollback preparado conserva los cuatro digests anteriores verificados; no se usó el rollback histórico de una versión aún más antigua. No hubo migraciones, escrituras financieras sintéticas, borrado/movimiento/escritura de objetos R2 ni trabajos OCR inducidos.

Aceptación productiva: PENDING_PO_AND_AUTHENTICATED_FUNCTIONAL_VERIFICATION. Mantener abiertos el acceso a la referencia histórica474 y las verificaciones no ejecutadas; no modificar datos para cerrar artificialmente el release.

Evidencia externa: `/home/loxi1/bbti-evidence/controlled-production-release-r1/`, execution-record.json, production-postdeploy.json, production-configured-storage-read.json, production-r2-preview-investigation.json, deployment-prepare.log y deployment-rollout.log. Esta actualización sigue SOURCE main → Enterprise main y no altera los 101 contenidos ni dispara otra publicación GHCR.

---

## Aceptación funcional productiva del PO — 05/11/2026

ACTION=MVP_PRODUCTION_ACCEPTANCE_DOCUMENTARY_CLOSURE_R1

PO_FUNCTIONAL_ACCEPTANCE=APPROVED. RELEASE_STATUS=ACCEPTED_WITH_OBSERVATIONS. Autoridad: declaración expresa del Product Owner recibida el 05/11/2026. Este registro aditivo actualiza el estado posterior a la ejecución; conserva los registros históricos de aceptación pendiente sin reescribirlos.

### Evidencia funcional declarada por el Product Owner

| Frente | Resultado declarado | Alcance comunicado por el PO |
|---|---|---|
| Compras | PASS_PO | Carga TEMP en `data-prod/documentos/tmp/` y promoción definitiva a `data-prod/documentos/2026/05/BBTI/`. |
| Almacén | PASS_PO | Carga y validación de Guía. |
| Finanzas / Regularización | PASS_PO | Carga TEMP y promoción a la carpeta definitiva correspondiente bajo `data-prod/documentos/2026/`. |
| Contabilidad | PASS_PO | Visualización de los registros incorporados desde los demás módulos. |

Las rutas y resultados anteriores son evidencia declarada por el PO, no pruebas automatizadas nuevas ni inferencias a partir de healthchecks. Se conservan literalmente las rutas comunicadas, sin reinterpretar su período documental. Esta intervención no ejecuta cargas, materializaciones, operaciones financieras ni validaciones E2E adicionales. Las verificaciones técnicas previas y sus límites permanecen en la sección de ejecución.

### Observaciones abiertas preservadas

1. Recuperación OCR tardía no acreditada mediante E2E productivo.
2. Expiración TEMP no verificada en producción.
3. Referencia histórica R2 con HTTP 403: archivo474/documento481; sin modificar referencias, objetos, permisos ni credenciales.

La aceptación con observaciones no declara cerrados estos tres puntos ni amplía el alcance de las pruebas técnicas.

### Identidades y trazabilidad conservadas

- Inventario funcional: 101 rutas; huella `39a446582ba5c4f529b97fab965f2fd7676bc7b6bea0e3f2111dd3716f2390fe`; sin modificaciones.
- SOURCE funcional: `88edc03136a446308d8b18fa778bdccf6c002be3`. Enterprise funcional / origen de imágenes: `a57c328cbf62de39aa91ed541ae32b449927a5b6`.
- Registro de ejecución publicado: SOURCE `8477adef4393b8e0a8ef2eee3a2e25cb8c19020d`; Enterprise `a8899cc0108292e0decceb69b48e0eabb5a33dc7`.
- ms-documentos conserva `sha256:817a2490d1a4a2891da3f0381dde024e118886e4fbb4a8a348fd8bbc6a94a7ab`.
- api-gateway conserva `sha256:d0e0875318b91512b308add1fbf80d9542239eca1ffc3a32125bd3a29b0f4a12`.
- web-admin conserva `sha256:78db00064093665c89ce60ac6944cc135a5acb652a74d2d8c85e4cd9e8d35691`.
- ms-auth conserva su digest productivo anterior `sha256:e299d52aa019c9d76e37618641ba2bce61b740b2df9c4523e8935e2df4a726b5`.
- Rollback e identidades anteriores permanecen en las secciones precedentes. No se reconstruyen imágenes ni se recrean contenedores por esta aceptación documental.

Publicación exclusivamente documental SOURCE main → Enterprise main. Sincronización EC2 limitada al manifest, con revalidación de identidades de servicios, OCR y metadatos de configuración antes/después; ningún cambio de runtime autorizado por esta sección. Los SHA de este registro se resuelven por Git mediante su ACTION y quedan fijados en `acceptance-documentary-closure.json` de la evidencia externa `/home/loxi1/bbti-evidence/controlled-production-release-r1/`, evitando referencias SHA autorreferenciales.
