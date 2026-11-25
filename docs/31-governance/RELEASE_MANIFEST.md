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


---

## Integración SOURCE del producto validado en LAB3005 — 07/11/2026

Acción: `INTEGRATE_LAB3005_PRODUCT_TO_SOURCE_R1`. PO autorizó la integración y publicación SOURCE exclusivamente. **Enterprise pendiente; imágenes nuevas pendientes; producción NO desplegada por esta acción.** La aceptación productiva MVP del 05/11/2026 permanece `ACCEPTED_WITH_OBSERVATIONS`: sus 101 archivos, commits, digests, rollback, historia R2, G3 Finanzas y Actions #28/#32 se conservan íntegros. No se infiere despliegue a partir de CI.

### Identidades y alcance integrado

- SOURCE main base: `65492bb0a6f2b70bf62b28b54677ba0ad273592d`.
- Commit funcional SOURCE: `1ebdbf4f82ec3cae84b6a6caafc979353af2172a` — 26 rutas (17 implementación, 9 pruebas), inventario SHA256 abajo.
- Commit separado de soporte DEV: `ae478918e4ae7241a2944c2c776a9e486d807648` — únicamente los proveedores NATS de Gateway/Documentos y `auth.nats.controller.ts` de Auth.
- El commit documental que incorpora esta entrada y la publicación SOURCE se identifican externamente en `/home/loxi1/bbti-evidence/integrate-lab3005-to-source-r1/`, evitando autorreferencia circular.
- Enterprise main conocido localmente: `44340e491f9b68952978320c30bf2227000fb6bc`. Incorporación de este producto: **PENDING_AUTHORIZED_ENTERPRISE_INTEGRATION**. No copiar el manifest SOURCE sobre Enterprise: sus historias son deliberadamente distintas y la incorporación deberá ser aditiva.
- Nuevos digests GHCR, ejecución CI y despliegue EC2: **PENDING_NOT_EXECUTED**. Las identidades productivas y rollback anteriores siguen como referencia histórica acreditada, no como nuevas imágenes.

El producto incluye OCR OC/OS comprador/proveedor, corrección manual del modal y sugerencia explícita de razón social, contexto TEMP nuevo frente a edición, Compras UX/período/búsqueda local y Almacén/período/normalización de fecha de factura. No cambia APISPERU, esquema SQL ni contratos de otros extractores. Se excluyen secretos, `.bak`, dependencias, builds, adaptadores efímeros y evidencias locales.

El soporte DEV conserva `auth.*` por defecto y habilita `dev.source.auth.*` únicamente mediante configuración explícita idéntica y previa al registro de handlers en los tres procesos. Rechaza namespaces vacíos o inválidos. No incorpora endpoints, credenciales ni subjects DEV como configuración productiva. Es soporte optativo de desarrollo, separado del commit funcional.

### Evidencia de validación

El PO declara completado satisfactoriamente el MVP funcional en LAB3005. Esa declaración corresponde al LAB; **no constituye aceptación productiva de estos cambios**. Se reutilizan las 110 pruebas funcionales y las 33 del modal acreditadas; no se repitieron.

Validación de integración: compilaciones TypeScript de Config, Shared, Database, Documentos, Gateway y Auth PASS; frontend Next.js16.2.7 build completo con Webpack, TypeScript y 22 páginas estáticas PASS; sintaxis Python e identidad del extractor PASS. Dieciocho comprobaciones puras adicionales de los tres archivos DEV PASS (mocks de transporte, decoradores NestJS reales, namespaces predeterminado/DEV/inválidos, subjects no Auth y preservación del observable). Sin conexiones NATS ni servicios reales.

El build usó exclusivamente dependencias locales copiadas al checkout de integración, sin instalaciones, y las variables públicas ya versionadas del workflow Enterprise. Se preservaron las fuentes Geist/Geist Mono; Google Fonts se obtuvo con acceso autorizado. Los intentos previos y su diagnóstico se conservan: DNS del sandbox y ausencia inicial de variables públicas de build, corregidos solo en el entorno de ejecución. No se modificaron archivos funcionales para eludirlos ni se publicaron artefactos del build local.

Temporal344 acredita carga directa R2 DEV, lectura, transporte OCR y persistencia ordinaria, sin materialización. Extractor Python SHA256: `972c6cee6ad8e994405b527fc5316a2c949041cfb5ade07a4373333ae7295eb3`. El PDF con texto embebido no acredita reconocimiento real de documentos escaneados.

### Desarrollo y fronteras conservadas

LAB3005 permanece sin cambios: Web3005 → Gateway3000 → Documentos3002, Auth3001, pnpm y OCR Python R2 DEV. El checkout dirty original permanece en `034a1abc7af9b4fe1a107dbe72ad3893e1f47992`, con 48 entradas protegidas. De ellas, 42 archivos no secretos ya eran iguales a main, tres corresponden al soporte DEV ahora separado, dos son respaldos excluidos y una configuración privada excluida. No se reintegró indiscriminadamente el dirty.

R2 DEV usa cuenta `45c5e83f071c47dc00ea3b924b98828e`, bucket `data-prod`, base histórica LAB separada y subjects exclusivos. El nombre del bucket no identifica producción. No se promovieron credenciales ni configuración DEV. La futura sustitución de referencias al candidato y del adaptador LAB por SOURCE integrado exige intervención controlada posterior; no se conmutó el runtime en esta acción.

APISPERU ya tiene soporte backend en main: consulta de catálogo primero y respaldo externo opcional. Su credencial productiva debe acreditarse e inyectarse privadamente solo en Documentos; nunca frontend, Git ni copia del token LAB. No se consultó ni modificó configuración productiva.

### Continuación y rollback

Secuencia prevista, pendiente de autorizaciones posteriores: incorporación selectiva SOURCE → Enterprise y adenda propia → builds/publicación GHCR → preflight productivo → despliegue autorizado. Componentes funcionales: **OCR Python → ms-documentos → web-admin**, backend antes de frontend por el campo opcional `canalIngreso`. Gateway/Auth productivos podrán conservar sus digests mientras no exista una necesidad adicional demostrada. Publicar cuatro imágenes con el workflow existente no implica desplegar las cuatro.

Antes de producción faltan: hash/identidad y respaldo recuperable del OCR Python efectivo, configuración APISPERU productiva, commits Enterprise, digests nuevos y aprobación independiente del despliegue. Mantener las imágenes y configuración anteriores como rollback; no considerar acreditado el rollback del fichero OCR hasta completar su respaldo. No se ejecutaron migraciones ni operaciones de producción.

Se preservan las observaciones históricas: OCR tardío sin E2E productivo completo, expiración TEMP sin verificación productiva, referencia R2 histórica HTTP403 y antecedente de 16 errores globales de tipado conocidos. No se reabrió ese diagnóstico general. Los temporales180 y344 no fueron modificados.

### Inventario incremental de producto (26 rutas)

| Ruta | Clase | SHA256 |
| --- | --- | --- |
| `apps/ms-documentos/src/documentos/tmp/tmp.controller.ts` | IMPLEMENTATION | `b703d41f42b699af69d42171210f45d68a8fc5a83aff7532c380ceba8404124f` |
| `apps/ms-documentos/src/documentos/tmp/tmp.ocr-context-experiment.spec.ts` | TEST | `eca3de2f857520297e71d315d4283dbe47c54b6d209c5cfbae5ed85d9e9df0b7` |
| `apps/ms-documentos/src/documentos/tmp/tmp.repository.ts` | IMPLEMENTATION | `cb1c35b8f07711d49a371523a49160b9bc71376e181029b5b1a72c5eeeea30e5` |
| `apps/ms-documentos/src/documentos/tmp/tmp.service.ts` | IMPLEMENTATION | `a795186082278e8b187c7e309c349d41afd3cf153fb64f2e96a26d573e5b0be4` |
| `apps/ms-documentos/src/expedientes/expedientes.compras-periodo.spec.ts` | TEST | `db20e3575061679a79f093cabd3b7e0f46cf7b2ba615c87423b576293b9443ff` |
| `apps/ms-documentos/src/expedientes/expedientes.controller.ts` | IMPLEMENTATION | `d68a23947f029d3d5f30ec90304b2a9061c66302035fb221d680d763b7a79c5d` |
| `apps/ms-documentos/src/expedientes/expedientes.repository.ts` | IMPLEMENTATION | `8160aee8c8a713a26525ba4ff09a63c8aa64dd700fb23b6d62dd5859f6195b73` |
| `apps/ms-documentos/src/expedientes/expedientes.service.ts` | IMPLEMENTATION | `75ad2675052f82787685d58b2c40feca76987c6731201ff0c5abe6a5e2320a81` |
| `apps/web-admin/src/components/almacen/AlmacenBandeja.periodo.test.cjs` | TEST | `0427ea83c782e534ce1c1b2c93be885af569ff3d92eb396964f8713ad12b5087` |
| `apps/web-admin/src/components/almacen/AlmacenBandeja.tsx` | IMPLEMENTATION | `365ac00850aeb31f20a9c44812fbb54fb7b3c65f3c9da5512783d9f87ee59f1c` |
| `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx` | IMPLEMENTATION | `848ba3a485bffcaec57d37086d9974f22083cd181545f74ed3365743059ffaa2` |
| `apps/web-admin/src/components/compras/ComprasBandeja.tsx` | IMPLEMENTATION | `09d357e7ae0f809df57950dbcb887d8a27ff2561d53b5184eddbdfd6bba929c8` |
| `apps/web-admin/src/components/compras/NuevoExpedienteWizard.tsx` | IMPLEMENTATION | `3d312cd719b1c839eb09ef7364a5145805638b15cc5c96f2b40c535c94c8b7c6` |
| `apps/web-admin/src/components/ocr/OcrValidationModal.initial-upload.test.cjs` | TEST | `b38fe1a2e004b7c38190f6d0e5792f3d2c743e535b60043ba1de73791585fce9` |
| `apps/web-admin/src/components/ocr/OcrValidationModal.provider-edit.test.cjs` | TEST | `c8016f77c8660f95bfa00c89459621b4f98be031b1f26c690347f6eb3c7de9c6` |
| `apps/web-admin/src/components/ocr/OcrValidationModal.tsx` | IMPLEMENTATION | `7aef4461ec34ed34a04a2e3515c5792c052bc141cf8a75fa8d168c8b1783070a` |
| `apps/web-admin/src/lib/almacen-periodo.test.cjs` | TEST | `0300c1a4402b6734bb2b12bd7675ce9a225209d1634f1c5592317d06efe5cd75` |
| `apps/web-admin/src/lib/almacen-periodo.ts` | IMPLEMENTATION | `42f5e348f7e9ae0164911e1d823d09caf6e2e4c8287e271f3d81de7f9b189111` |
| `apps/web-admin/src/lib/compras-periodo.test.cjs` | TEST | `953890eda2d500a9a7b28b22a03f6d7a3369231e34b65d20e265a0a7ec315ff9` |
| `apps/web-admin/src/lib/compras-periodo.ts` | IMPLEMENTATION | `5be66cc76a09b89a201182040df51031e536077a3b116133de5f52c7104ed461` |
| `apps/web-admin/src/services/carga-segura.temp.test.cjs` | TEST | `fe2a6db447b1a445f827f86dc46c5969f2e42773d40664359e0a5fa42f375646` |
| `apps/web-admin/src/services/carga-segura.ts` | IMPLEMENTATION | `b50452417c24b28b78ea10d8c0999a7187ab570581a36861218a5e7a5c32e851` |
| `apps/web-admin/src/services/expedientes.ts` | IMPLEMENTATION | `c7c28cf89a281d9154a24cd4125d5d306d5009843b9d985b551e36abb630fd74` |
| `apps/web-admin/src/services/revision-contable.ts` | IMPLEMENTATION | `892d1a2d8c7ba47ee928c2a3fd349380a48af3f4566afc01cc53e768780c7f46` |
| `workers/ocr-worker/app/extractors/orden_extractor.py` | IMPLEMENTATION | `972c6cee6ad8e994405b527fc5316a2c949041cfb5ade07a4373333ae7295eb3` |
| `workers/ocr-worker/app/test_orden_roles_experiment.py` | TEST | `fc2e6ef38e0f67b94b651e715d4e65b490e218e3a5fc37bc6be3955ca6d7a389` |


## Continuidad unificada: identidad productiva observada y candidato G2-B — 11/11/2026

Acción: MSE_UNIFIED_MANIFEST_CONTINUITY_G2B_APPLY_R1. Aplicación documental del delta R2 aprobado; no constituye nueva autorización de despliegue ni aceptación funcional.

Se conserva íntegra la integración SOURCE producto `1ebdbf4f82ec3cae84b6a6caafc979353af2172a`, el soporte DEV `ae478918e4ae7241a2944c2c776a9e486d807648` y la adenda `5efcb743245f38662cb3e4960ee91ad6a7ab2232`. No se repiten ni modifican los26 hashes, las tres rutas DEV ni el inventario MVP101.

### Identidad productiva posterior

Inspección READ_ONLY del11/11/2026: checkout EC2 limpio `f80d05e80b522c18ab20751a7e18a9e6f626984c`. Manifest observado SHA256 `923741f5884f89f3bdb7f1dd27784f34608f14d3ffb87aa4f0bbf3808ad4ae00`, coincidente con Enterprise antes de esta adenda. Actions#34/run42401171156: SUCCESS; build Enterprise `2ed7dd0f2e73b58d6d595606af56b8477e9496e8`.

| Servicio | Digest efectivo observado | StartedAt |
| --- | --- | --- |
| Documentos | `sha256:3d48dbcfebc60b1b69db84b2f2fabecee2b024ed991cb53511c585a2e51c37f7` | `2026-11-07T21:14:08.985017452Z` |
| Web | `sha256:f54bfb0bc69a015452c5123f2f36c70ca196ecbfb85e83f784a8415359c93cf9` | `2026-11-07T21:15:24.3394647Z` |
| Gateway conservado | `sha256:d0e0875318b91512b308add1fbf80d9542239eca1ffc3a32125bd3a29b0f4a12` | `2026-11-05T19:15:21.813323243Z` |
| Auth conservado | `sha256:e299d52aa019c9d76e37618641ba2bce61b740b2df9c4523e8935e2df4a726b5` | `2026-10-24T03:18:24.223569413Z` |

Documentos/Web: publicados, presentes localmente y ejecutándose en EC2. StartedAt acredita arranques asociados al07/11; no reconstruye la autorización ni toda la secuencia histórica. La observación del11/11 no es una fecha de autorización.

POST_MVP_EXECUTION_IDENTITY=VERIFIED; POST_MVP_FUNCTIONAL_ACCEPTANCE=NOT_VERIFIED. La aceptación MVP05/11 permanece ACCEPTED_WITH_OBSERVATIONS. No se revalidaron OCR, APISPERU, RDS, R2 ni sus pendientes.

Evidencia durable: `/home/loxi1/bbti-evidence/unified-manifest-continuity-g2b-r2/ec2-ghcr-identity.json`. Esta observación supera como último estado conocido las referencias históricas BUILT_NOT_DEPLOYED; dichas entradas se conservan sin modificación.

### Cambiar clave G2-B: candidato independiente, no promovido

```ini
G2B_CANDIDATE_FILES=9
G2B_FINAL_INTEGRATION_DELTA=NOT_ESTABLISHED
G2B_BACKEND_E2E=PASS
G2B_GLOBAL_REVOCATION=PASS
G2B_UX3005=PENDING
G2B_PRODUCTION_DEPLOYMENT=NOT_EXECUTED
```

Los nueve archivos constituyen un inventario candidato, no un delta final aceptado. El interceptor frontend y la UX pueden ampliar el alcance de integración. Mínimo8 implementado y probado focalmente; máximo72bytesUTF8 preservado. El E2E backend previo y las pruebas posteriores de política son evidencias distintas; no se declara validación UX ni activación de esa política en LAB3005.

`auth_version` fue funcional en pruebas; su trazabilidad versionada permanece pendiente. Activación selectiva/reversión del supervisor, tratamiento401 frontend y confirmación visible de éxito siguen pendientes antes de aceptación UX. No se atribuyen commits, imágenes ni despliegues productivos G2-B futuros.

Evidencias durables: `/home/loxi1/bbti-evidence/unified-manifest-continuity-g2b-r2/g2b-backend-e2e.json` y `/home/loxi1/bbti-evidence/unified-manifest-continuity-g2b-r2/g2b-candidate-inventory.json`.

Cierre documental R4 ya publicado: SOURCE `d343a1bfb9ecc4f933ea425486de892fe74009b1` / Enterprise `85b6486ecbf7ae2c652cafd84f2217b0e43590a2`. Son identidades documentales independientes del checkout EC2 observado y no acreditan otro despliegue.


---

## Continuidad posterior G3/G4-A — 13/11/2026

Registro documental incremental; no acredita promoción Enterprise ni despliegue productivo.

La composición G2-B/Almacén comprende 17 rutas únicas. Su historia SOURCE incluye estos tres commits G3:

- `45b367022dadc58e7ce17de46c3dd9f361cb8def`: G2-B, 16 rutas.
- `85cf59a141d5336ecb80766c3d6f0405d3ef7e4e`: modal OCR Almacén.
- `8ec3c7e4c0340aace5554f568dc2c1bb9e259482`: contraste del botón de contraseña actualizada, sobre una ruta ya incluida.

G3=ACCEPTED_WITH_OBSERVATIONS. El PO aceptó cambio de contraseña, nuevo login, invalidación observable de sesión anterior y botón de éxito. Almacén Guía/NI queda aceptado con observaciones; ALMACEN_VISUAL_ACCEPTANCE=NOT_ACCREDITED.

La corrección posterior `35a318eb7e3d7b9561661afba4849fb7ec3aa616` modifica exclusivamente el contenido y SHA-256 de `tests/g2b/policy.test.cjs` para comprobar limpieza de sesión/contexto/caché y apertura del modal de éxito. No modifica código funcional ni aumenta las 17 rutas únicas.

SOURCE_G4A=COMMITTED_AND_PUSHED.
SOURCE_PUBLISHED_MAIN=35a318eb7e3d7b9561661afba4849fb7ec3aa616.
ENTERPRISE_G4A=NOT_COMMITTED.
GHCR_G4A=NOT_ACCREDITED.
EC2_G4A=NOT_ACCREDITED.
AUTH_VERSION_PRODUCTION=UNKNOWN.
G4A_PRODUCTION_FUNCTIONAL_ACCEPTANCE=NOT_ACCREDITED.

Referencias: `g3-release-handoff-r1/HANDOFF.md`, objetos Git de los cuatro commits y baseline posterior ratificado por PO/MSE. Las evidencias externas se encuentran bajo `/home/loxi1/bbti-evidence/`.

---

## Adenda de reconciliación documental — 16/11/2026

Acción `BBTI_RELEASE_MANIFEST_ADDITIVE_EDIT_R1`. Adenda estrictamente aditiva; no reemplaza, reordena ni elimina ningún estado histórico anterior de este manifest, incluida la sección "Continuidad posterior G3/G4-A — 13/11/2026", que se conserva íntegra como antecedente.

### Corrección 1 — Estado Git local de G4-A en Enterprise

La sección histórica del 13/11/2026 registró `ENTERPRISE_G4A=NOT_COMMITTED`. Evidencia Git posterior, obtenida en modo solo lectura sobre el checkout Enterprise operativo (`/home/loxi1/projects/apps/documental-platform-bbti-prod`), acredita que la rama `main` tiene como HEAD el commit `6622daf0e0c70d64e1d0662baf0b345ded69fdf2`: integración de 17 archivos G4-A acreditada; worktree limpio al momento de la verificación. `origin/main` local coincidente con ese HEAD al momento de dicha verificación; publicación remota actual no verificada.

```ini
ENTERPRISE_G4A=COMMITTED_LOCAL
ENTERPRISE_PUSHED_REMOTE=NOT_VERIFIED
GHCR_G4A=NOT_ACCREDITED
EC2_G4A=NOT_ACCREDITED
UX_ACCEPTED_G4A=NOT_ACCREDITED
AUTH_VERSION_PRODUCTION=UNKNOWN
```

Esta corrección describe únicamente el estado del checkout Enterprise local inspeccionado; no se presenta la integración Git local como despliegue ni como aceptación productiva.

### Corrección 2 — Expediente GHCR Finanzas del 27/10/2026, no desplegado

Se registra el expediente `finanzas-release-promotion-r1` (27/10/2026) como antecedente GHCR, hasta ahora no reflejado en este manifest:

```ini
ENTERPRISE_COMMIT=15bcc460ce325ff7493a4b6860a39ce17dbfa364
GITHUB_ACTIONS_RUN=40519336692
GHCR_IMAGES_PUBLISHED=4_OF_4
EC2_DEPLOY_AUTHORIZED=false
PRODUCTION_SERVICE_RECREATE=false
FINANZAS_GHCR_2026_10_27=PUBLISHED_NOT_DEPLOYED
```

Este build publicó cuatro imágenes en GHCR asociadas al commit Enterprise `15bcc460ce325ff7493a4b6860a39ce17dbfa364`, pero no fue desplegado en EC2. Es anterior al release productivo documentado del 05–07/11/2026 en este mismo manifest; no se reinterpreta como el último runtime productivo, y ninguno de los digests de ese release documentado se modifica o sustituye por esta adenda.

Evidencia consultada:

```text
/home/loxi1/evidencias/documental-platform/finanzas-release-promotion-r1/result.json
/home/loxi1/evidencias/documental-platform/finanzas-release-promotion-r1/release-freeze.json
/home/loxi1/evidencias/documental-platform/finanzas-release-promotion-r1/ghcr-digests.json
```


## Adenda histórica G4-A — reconciliación RDS 0025 y GHCR — 16/11/2026

**ACTION:** `BBTI_G4A_SOURCE_MANIFEST_ADENDA_R1`
**MODE:** `FOCAL_DOCUMENTARY_CHANGE`
**SCOPE:** `SOURCE_MANIFEST_ONLY`

### Identidades Git y continuidad

- SOURCE main de referencia: `384424247439b1376275aeaaf676b29f5e2f71e5`.
- Enterprise main de referencia: `e691d48179605465d796a9f6cb7a47d9ad5401a3`.
- Integración funcional G4-A Enterprise: `6622daf0e0c70d64e1d0662baf0b345ded69fdf2`.
- Referencia Git utilizada como tag GHCR: `42e94d9bd925a3b4ff838e2e5c31938f529fd6ea`.

La ascendencia de `6622daf0` respecto de `42e94d9b` fue verificada: `PASS`.

El commit `42e94d9b` es documental y no debe confundirse con el commit de integración funcional ni con el estado Git Enterprise posterior `e691d481`.

### Migración RDS 0025

- Migración: `0025_auth_usuarios_auth_version.sql`.
- Coincidencia de contenido SOURCE/Enterprise: `PASS`.
- Coincidencia de `infra/postgres/migrations/manifest.sha256`: `PASS`.
- Estado de ejecución RDS producción: `CLOSED_PASS`.
- Esta adenda no ejecuta ni modifica migraciones.

### GHCR G4-A

Tag de referencia:
`42e94d9bd925a3b4ff838e2e5c31938f529fd6ea`.

Cuatro manifiestos remotos accesibles: `4/4 PASS`.

Digests acreditados de manifiestos `linux/amd64`:

| Servicio | Digest linux/amd64 |
|---|---|
| `api-gateway` | `sha256:2bc36f8bbae870d1193a21c8fabb01cefb4d73d14822e000e661ab2609ee42aa` |
| `ms-auth` | `sha256:f5af1ad3f1040c7776976a10f022eb309a53d6af4627868b2690542422ead502` |
| `ms-documentos` | `sha256:4253bd542e2d3823c2cf16f447f84436b0956d3fb2a4cef1f417a497259214fd` |
| `web-admin` | `sha256:0da3a689b322a991812ee8a30b807e84861561b334c4063f5e64d8c01fa51832` |

Los descriptores `unknown/unknown` observados en el índice no se consideran imágenes ejecutables `linux/amd64`.

### Decisión de reconstrucción

Entre la referencia `42e94d9b` y Enterprise main `e691d481` únicamente cambiaron el SQL de migración `0025` y el manifest de checksums.

Los Dockerfiles empleados para las cuatro imágenes de aplicación no incorporan directamente `infra/postgres/migrations`.

**NEW_BUILD_FOR_0025=NOT_REQUIRED.**

Esta conclusión se limita al cambio conocido `0025`; no constituye autorización de despliegue.

### Estado de promoción y aceptación

- SOURCE/Enterprise promoción de esta adenda: `PENDING`.
- EC2 G4-A: `NOT_ACCREDITED`.
- UX G4-A: `NOT_ACCEPTED`.
- Commit/push de esta adenda: `NOT_EXECUTED`.
- Build/push GHCR adicional: `NOT_EXECUTED`.
- Intervención RDS, EC2, LAB, R2 o NAS: `NOT_EXECUTED`.

Esta entrada es histórica y aditiva. No sustituye ni reescribe estados anteriores.

### Siguiente gate

Revisión del diff por MSE Actual y autorización independiente del PO para commit/push SOURCE. La integración documental Enterprise permanece pendiente y requiere su propio control.


---

## Adenda de continuidad SOURCE y reconciliación productiva — 17/11/2026

ACTION: BBTI_SOURCE_DOCUMENTARY_CONTINUITY_R1.

Registro incremental de estados acreditados. Se conserva
íntegramente la historia anterior. Este cierre documental
no constituye una autorización de despliegue.

### Ejecución productiva histórica del 07/11

La publicación selectiva de Documentos y Web corresponde
al run GHCR 42401171156, build Enterprise
`2ed7dd0f2e73b58d6d595606af56b8477e9496e8`,
y manifest Enterprise
`f80d05e80b522c18ab20751a7e18a9e6f626984c`.

El expediente `prepare-ghcr-release-with-manifest-r1`
acredita publicación y preflight. Sus archivos
production-preflight.json y production-after.json
corresponden a la preparación, no a la ejecución posterior.

El testigo independiente del 11/11, contenido en
`unified-manifest-continuity-g2b-r2/ec2-ghcr-identity.json`,
acredita las siguientes identidades de ejecución:

| Servicio | Digest observado | StartedAt UTC |
|---|---|---|
| ms-documentos | sha256:3d48dbcfebc60b1b69db84b2f2fabecee2b024ed991cb53511c585a2e51c37f7 | 2026-11-07T21:14:08.985017452Z |
| web-admin | sha256:f54bfb0bc69a015452c5123f2f36c70ca196ecbfb85e83f784a8415359c93cf9 | 2026-11-07T21:15:24.3394647Z |
| api-gateway | sha256:d0e0875318b91512b308add1fbf80d9542239eca1ffc3a32125bd3a29b0f4a12 | 2026-11-05T19:15:21.813323243Z |
| ms-auth | sha256:e299d52aa019c9d76e37618641ba2bce61b740b2df9c4523e8935e2df4a726b5 | 2026-10-24T03:18:24.223569413Z |

POST_MVP_DOCUMENTOS_WEB_DEPLOY=ACCREDITED_HISTORICAL.
POST_MVP_OCR_UPDATE=NOT_ACCREDITED.
POST_MVP_APISPERU_CONFIGURATION=NOT_ACCREDITED.
POST_MVP_PRODUCTION_UX=NOT_ACCREDITED.
CURRENT_EC2_RUNTIME=NOT_REVALIDATED.

El extractor OCR previo y el candidato, el backup
local y el plan de rollback están preservados en
el expediente de preparación. No se acredita aquí
su ejecución posterior en EC2.

### Continuidad G4-A

La adenda SOURCE del 16/11 quedó comprometida en
`9359b9720328d0bb4c429e90330c997269be5dc3`.

Enterprise main observado:
`e691d48179605465d796a9f6cb7a47d9ad5401a3`.

Se conserva la integración funcional `6622daf0`,
la publicación GHCR referenciada por `42e94d9b`,
el cierre histórico RDS 0025 y los cuatro digests
completos registrados en la adenda precedente.

NEW_BUILD_FOR_0025=NOT_REQUIRED.
EC2_G4A=NOT_ACCREDITED.
G4A_PRODUCTION_UX=NOT_ACCREDITED.
ENTERPRISE_SECOND_DOCUMENTARY_ADENDA=PENDING.

### Cierre SOURCE LAB del 17/11

Baseline funcional y documental observado:
`9359b9720328d0bb4c429e90330c997269be5dc3`.

SOURCE_NATIVE_RUNTIME=CLOSED_PASS.
SOURCE_FUNCTIONAL_ACCEPTANCE=CLOSED_PASS_WITH_OBSERVATIONS.
CONTABILIDAD_UX=PASS_PO.
CUSTODY_RELEASE=CLOSED_PASS.

Aceptación testigo PO: login/workspace, Mi Perfil,
cambio de contraseña, lectura R2, Compras OC temporal,
factura OC y recuperación/versionado, Guía y versión,
Nota de Ingreso, sustentos OC y OP, regularización
Factura y RH OP y visualización en Contabilidad.

Contabilidad: OC en mayo y OP172/OP173 en noviembre
de 2026. No equivale a aprobación contable ni a
aceptación de estos cambios en producción.

Runtime SOURCE nativo pnpm; almacenamiento R2 DEV;
OCR Python systemd local aislado. Se conserva la
separación con R2 y OCR productivos.

Las observaciones funcionales y límites del alcance
se registran en docs/ai/successor-II/README.md.

Referencia de respaldo y evidencia histórica:
`/home/loxi1/bbti-evidence/`.

No repetir pruebas, migraciones, builds o despliegues
por esta actualización documental.


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

### Inventario funcional comprometido

- `apps/api-gateway/src/documentos/documentos.controller.ts`
- `apps/api-gateway/src/documentos/documentos.tmp-compras.controller.spec.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.compras-recovery.spec.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.controller.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.documental.spec.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.repository.spec.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.repository.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.service.ts`
- `apps/web-admin/src/components/compras/CompraExpedienteEditor.temp-recovery.test.cjs`
- `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx`
- `apps/web-admin/src/services/carga-segura.temp.test.cjs`
- `apps/web-admin/src/services/carga-segura.ts`

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

### Referencias de continuidad

- [Delta tecnico MSE 3.0](../../DELTA_TECNICO_MSE3_A_MSE_ACTUAL.md).
- [Manual operativo](../29-operations-manual/README.md).
- [Contrato API](../28-api-cookbook/04-documentos.md).
- [Legado](../ai/successor-II/README.md).
- [Inventario Git](BRANCH_INVENTORY.md).

Esta adenda es exclusivamente R3 Factura TEMP.
No sustituye entradas historicas ni reconcilia
otros releases o estados productivos.


---

## Consolidación de continuidad del release integrado — 19/11/2026

ACTION: BBTI_INTEGRATED_RELEASE_SOURCE_DOCUMENTARY_CONSOLIDATION_R1


### A. Cierre técnico del release integrado — 18/11/2026

Evidencia institucional recibida de MSE Actual mediante
BBTI_FACTURA_TEMP_INTEGRATED_RELEASE_DELEGATION_R1.

- Enterprise construido y desplegado:
  `f26f292d2c07c9a75feba9db782c5b30982b1060`.
- Workflow: `build-images.yml`.
- Workflow ID: `347721921`.
- GHCR run: `44327350315`.
- Job: `134882118595`.
- Resultado: SUCCESS.
- Plataforma: linux/amd64.
- Publicación integrada: 4/4.
- Checkout EC2 acreditado:
  `f26f292d2c07c9a75feba9db782c5b30982b1060`.
- EC2_TECHNICAL_DEPLOYMENT=CLOSED_PASS.
- Inicio de recreación: aproximadamente
  2026-11-18T15:43:26Z.
- PRODUCTION_FUNCTIONAL_ACCEPTANCE=PENDING.
- PERFORMANCE_EVALUATION=CLOSED_PASS_WITH_OBSERVATIONS.

Namespace:

`ghcr.io/bbti-sac/documental-platform-bbti-prod`

### Identidades OCI del release del 18/11

| Componente | Índice OCI | Digest ejecutable linux/amd64 |
|---|---|---|
| api-gateway | sha256:c24e34cddbffe3ee9867039191bdad8c0062f2732436a0d030a87af452b824be | sha256:c805dc12dfa44c59b44518ed41677a14e9d446de976cccebaa98c188126642ea |
| ms-auth | sha256:aa883522747e712507607b20382fa2026f7913a4bfd7dddb68b49c3959cce950 | sha256:9853bab33639fee12c469399e38e2e86fbd96338fddfddfc4b9c2941d0d4b72a |
| ms-documentos | sha256:14c20f4f59cf0d5d92068d4795c4f71ea58f4200c8ff72d8283739bd79f255c3 | sha256:f8382aeeb2c15149dc859c2dd8ed51ca70bae40283a6395b49371a36f0a9cdb2 |
| web-admin | sha256:a51f9d6f799d5c077a0e5a3df70289a7d97b4f8c5f46ed4398ae308c0aaa226f | sha256:65f3abc54efbd4d1baf41cacb2b77346b1ba65b5cb064c167349e570c7aa3df4 |

No confundir índices OCI, digests ejecutables,
tags e Image IDs. No se añaden tags o Image IDs
no suministrados en la evidencia de delegación.

### Evidencia durable EC2 del release anterior

Directorio:

`/home/ubuntu/releases/documental-platform-bbti/integrated-44327350315-f26f292d-r1`

- release.images.yml
- rollback.images.yml
- release-manifests.sha256
- deployment.started.utc
- deployment.completed.utc
- application-runtime.before.txt
- application-runtime.after.txt
- protected-runtime.before.txt
- protected-runtime.after.txt
- production-health-smoke.txt
- ocr-SHA256SUMS

SHA256 release.images.yml:

`10219b37c5a2f27409155af48cc1a9bbc681a4a8c57945d249881b3b31815a22`

SHA256 rollback.images.yml histórico:

`f78de4bb062a3b79f32a3efbe582159176601221ba90427a387412c4079cdbda`

El rollback histórico no constituye automáticamente
el rollback autorizado del siguiente candidato.

Para R3 se debe acreditar el runtime efectivo anterior,
preservar su configuración y preparar un nuevo rollback.

STOP obligatorio si el rollback puede reintroducir
aceptación de tokens revocados. No restaurar Auth inseguro
ni revertir auth_version o su ledger por inferencia.

### OCR Python y migración 0025

Extractor instalado en producción:

`/opt/documental-platform/current/workers/ocr-worker/app/extractors/orden_extractor.py`

SHA256 instalado acreditado:

`972c6cee6ad8e994405b527fc5316a2c949041cfb5ade07a4373333ae7295eb3`

Servicio systemd preservado y activo en el cierre acreditado.
No repetir instalación del extractor.

Migración 0025 auth_version previamente aplicada.
No reejecutar ni revertir.

El cierre técnico del despliegue y del extractor no
constituye aceptación funcional de Auth u OCR con
documentos reales en producción.

No se efectúa nueva comprobación del runtime EC2
mediante esta consolidación SOURCE.

### B. Preparación del nuevo release Factura TEMP

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

### Alcance del siguiente candidato integrado

Transferir exclusivamente las doce rutas funcionales/test
inventariadas en la adenda G3 y comprometidas en
`793152d3cdc9ab752cfb699839358255a1db25c5`.

Incorporar selectivamente documentación aprobada.
Adaptar manifest e inventario al historial Enterprise.
Registrar procedencia SOURCE mediante Source-Commit.

No copiar el árbol SOURCE completo ni sustituir
el manifest rector propio de Enterprise.

Publicación posterior desde Enterprise main aprobado
con el workflow existente y las cuatro aplicaciones.

No modificar workflows ni realizar partial builds.

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

### Identidades OCI del release efectivo

Namespace:

`ghcr.io/bbti-sac/documental-platform-bbti-prod`

#### api-gateway

- OCI index:
  `sha256:83fcc53d91b22e494bd49be7f4863f6c03dc109e4d4bfff675aa8e652dc9339c`
- Runnable linux/amd64:
  `sha256:65e94bbd0532f079b8915c074c308db40ab501180b122f6bbd94eb17e3209b98`

#### ms-auth

- OCI index:
  `sha256:d06a9df9acee690d72a4f8b3c5d942fe41b6a231f5ca00c8e7ad3022897cf1d7`
- Runnable linux/amd64:
  `sha256:48b20317bcca69dd403faad87ffab04d1e18b614ab8a91f19b62c3258d4d4dcd`

#### ms-documentos

- OCI index:
  `sha256:fd7cfe59997e31fc1e2a8158a060bc35eede06bff5d127208679fc68e23f8176`
- Runnable linux/amd64:
  `sha256:5ae2be43ad35d52cb18344c8805238d8b2677f6a8fd8e779770e44517cd131a2`

#### web-admin

- OCI index:
  `sha256:c3d330048ae140deb9e3940d98df9ce7330ae6ce6ce38d393c190f7054368859`
- Runnable linux/amd64:
  `sha256:7c574d2e30f6ce42176db66a6a22a58b671a72fc65f1324bd0940e99a9030313`

Los cuatro digests runnable fueron utilizados en EC2.
No confundir indices OCI, manifests ejecutables y tags latest.

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


## 2026-11-23 — Integracion incremental NAS G2 en SOURCE

ACTION=BBTI_G2_CANONICAL_SOURCE_INTEGRATED_CONTINUITY_R1

- MODE=NORMAL.
- GOVERNANCE=R1.
- RELEASE_MODEL=ONE_INTEGRATED_RELEASE.
- SOURCE base: `18d0e1bd53d40da002872471924af41d001dd8bb`.
- Rama SOURCE: main.
- Procedencia: feat/g2-nas-integral-candidate-r1.
- Integracion local autorizada por MSE Actual.
- Composicion funcional: 43 archivos, 41 preservados y 2 deltas incorporados.
- SOURCE commit/push: HOLD.

### Alcance funcional

- Archivado documental R2/NAS y nomenclatura.
- Visor NAS desacoplado del procesamiento.
- Tickets HMAC y autorizacion contextual.
- Rutas Gateway y Documentos.
- Verificacion de integridad SHA-256.
- Regularizacion frontend condicionada al procesamiento.
- Preservacion de carga normal, TEMP, OCR, confirmacion y recuperacion.
- Compatibilidad integral pendiente de validacion SOURCE.

### Migracion

- Archivo: `infra/postgres/migrations/0026_archivados_documentales.sql`.
- SHA-256: `609bb06532b8bcc745a0caff695bd60e20eb98079e33436b542c9aae0343aae6`.
- Aplicacion anterior acreditada en G2.
- No repetir migracion ni modificar SQL aplicado.

### Inventario integrado SHA-256

| Archivo | SHA-256 |
|---|---|
| `apps/api-gateway/src/documentos/documentos.controller.ts` | `473bb53d6df135247b3ad3bffaecc0cdc298757244cac96acaa6f6dd22d57288` |
| `apps/ms-documentos/src/documental-v2/documental-v2.module.ts` | `b0a03333b12ccb9bd527c32363043e340441255181cff6dfacf4139c3da94a67` |
| `apps/ms-documentos/src/documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase.ts` | `58118bc83120da40553b976cb365e5efe8be423187fc755a802d3c06d8d29a5d` |
| `apps/ms-documentos/src/documental-v2/use-cases/regularizar-obligacion-op-factura.usecase.ts` | `4fd4511abbe72101050d337cd4bfdfbfd966e87bca40b60b24bcb2db3686183a` |
| `apps/ms-documentos/src/documental-v2/use-cases/regularizar-obligacion-op-recibo-honorario.usecase.ts` | `8afcaccb390f895b7d794a6b50adfec186096f168a876fcbfda1aeea3ee61fa4` |
| `apps/ms-documentos/src/documentos/archivado/archivado-core.module.ts` | `22a9747aaf1d378d3e3015967d5ff42a25d163e140c286dbb078dc85d19bee68` |
| `apps/ms-documentos/src/documentos/archivado/archivado-documental.service.ts` | `dc25a558dd6fe536437ac37153da263984f9544aac585f441d0b3d3a084a119e` |
| `apps/ms-documentos/src/documentos/archivado/archivado-exclusion.ts` | `46f9d63f6f17140275b467e5f2f5c818b93382f419c31a29f2138c7de3e96bb4` |
| `apps/ms-documentos/src/documentos/archivado/archivado-move.service.ts` | `82d5e11612ef8433b0302d0bf16a86b261ced15ff132bac981cb4a74fd750ef2` |
| `apps/ms-documentos/src/documentos/archivado/archivado-nomenclatura.ts` | `33767c8103da52384df5326c5e3900b99bb466e5d9f328a1243c0e7efe440548` |
| `apps/ms-documentos/src/documentos/archivado/archivado-preview-token.ts` | `46cd2c64c16561f2b37b22fab5f2ad789fe72997af85fcc19796b9c067df49fc` |
| `apps/ms-documentos/src/documentos/archivado/archivado-r2.adapter.ts` | `64b16e5b258d70c306dcee7cd9ea1823db9097cacfe05804404fc93a9ea93273` |
| `apps/ms-documentos/src/documentos/archivado/archivado-runtime.service.ts` | `209733167e66d4e42e6f427fc098022a2d58cbf6b395fdf7c5995f635fb2f219` |
| `apps/ms-documentos/src/documentos/archivado/archivado-runtime.spec.ts` | `01d5cd7b3968cb542bc4e66e1ebccf6d7b65a9a338f60a088d635ee19e4d3850` |
| `apps/ms-documentos/src/documentos/archivado/archivado-seguridad.ts` | `3879685434de202a60fbae08b18751192cd4538eddeab81905d3a25c8f282532` |
| `apps/ms-documentos/src/documentos/archivado/archivado-smb.adapter.ts` | `e63d6d7a74f15709164fe94a344fc1daf3f45c420aa3621d8afd7a4cf236aa2f` |
| `apps/ms-documentos/src/documentos/archivado/archivado-writers.spec.ts` | `779b56e453b98f37ed2bb56f0f49ac794f6c602b547655dd132ef1dd38efd5be` |
| `apps/ms-documentos/src/documentos/archivado/archivado.controller.ts` | `9482baf62946f7429f2e3cb4f1a3e3fa3b03e65ced2770213b67cd613663bc70` |
| `apps/ms-documentos/src/documentos/archivado/archivado.repository.ts` | `d1654e584ef28a500c27d70ea35d80ba38af5d3a733b3b449c3c81def613478a` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.persistence.ts` | `79a9674309fe919065886ab311481166de6cf52470533e17c3013e4d8a35c4a2` |
| `apps/ms-documentos/src/documentos/carga-segura/carga-segura.storage.ts` | `4415df7b34aa5edc1f9dd24d1302b8b51845e0edb6fde2cf9a3ad75256ba466b` |
| `apps/ms-documentos/src/documentos/documentos-preview.nas-contract.spec.ts` | `1b81854d3a9f39c42998f26cc1fb3a6383c69598c27c13e15bb6be1fec16ff18` |
| `apps/ms-documentos/src/documentos/documentos-preview.service.ts` | `5e3f239449da7a630a7557132080f92c3ec282c8b2e5d7f9a73ec9d85a68a45c` |
| `apps/ms-documentos/src/documentos/documentos-upload.service.ts` | `1a038da40d761136abf8db0ed18320816b60e3dd70ee991e1c1269b3183cd64d` |
| `apps/ms-documentos/src/documentos/documentos.controller.ts` | `634f0d039237f82a765ee011a42ed0c1f9a5bceb2b2e20d82c6a839610058811` |
| `apps/ms-documentos/src/documentos/documentos.module.ts` | `a4153aa7788b16b779edaf9cefd9651aecf43be24ba35e818f75b53b44b8e5dd` |
| `apps/ms-documentos/src/documentos/documentos.repository.ts` | `8d6b1f408c88de79f79681484a5c4d6e824aae560711d4fa8935097a31ab7f0b` |
| `apps/ms-documentos/src/documentos/documentos.service.ts` | `5a52f544922253405010615335009ea4551f65aed32116bb604a1869681facbe` |
| `apps/ms-documentos/src/documentos/orden-pago/orden-pago-archivo.repository.ts` | `030c344a85b02176025489f0cf31a2e1504a79515bc88c25b2ed8eea0ca10b60` |
| `apps/ms-documentos/src/documentos/orden-pago/orden-pago-archivo.service.ts` | `606583bb8afecbbec50603731140028b59ab0ab10e787f0f488bdc37b2c77ac1` |
| `apps/ms-documentos/src/documentos/tmp/tmp.service.ts` | `24c4fc5e3f5eaf46da79bd30e1b04621e163cf864be7826dcb01408bb3a7d157` |
| `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx` | `ed6297cb14d8256a0c1e25dd907bc3d950b7b8e8999d845d621556438178112b` |
| `apps/web-admin/src/components/documentos/ArchivadoResumen.tsx` | `3ccb796a291366a639aacf7eeeacb9f91a2acd2fba201d1fa82775717fd55bdf` |
| `infra/postgres/migrations/0026_archivados_documentales.sql` | `609bb06532b8bcc745a0caff695bd60e20eb98079e33436b542c9aae0343aae6` |
| `infra/postgres/migrations/manifest.sha256` | `f4ea628f89fa26fbaed078c25db1957172f364219d71400ee4c1c92420737f8f` |
| `tests/r2-nas/archivado-adapters.test.cjs` | `97e3abc4ad502ac6ea9d56089849c58a59a6f31c3c90c99e4e40e0eecc31ea41` |
| `tests/r2-nas/archivado-core.test.cjs` | `8fa0979c115f0459547441a992ce9f439d8679efa5384dafbbad0fcaa0d898bc` |
| `tests/r2-nas/archivado-domain.test.cjs` | `004e2ee5d2e135ca1bf22f39416ecd90ca02dc40a531dda0a2ec5d41a97ff686` |
| `tests/r2-nas/archivado-exclusion.test.cjs` | `d4d13335fdb336164b5892e214496b76f60657b6f930227021d272ccbf423083` |
| `tests/r2-nas/archivado-move.test.cjs` | `a0aa24d90278a1f3c481003f6637f03fd78abcd28a832042cd214c973b6e933e` |
| `tests/r2-nas/archivado-preview.test.cjs` | `570720ee0f8323f2ea77c5f06d6d90d76545f6876213b2ba8310c000e9aa2fce` |
| `tests/r2-nas/archivado-staging.test.cjs` | `efb7119df00500c57e2f8d3038b364f1b58816ff3412c22e25194bc37056b482` |
| `tests/r2-nas/verify-offline.cjs` | `0ff40d8554d6e6356884a391031965fc59dff8ad992b19d4ce4b343875e9468c` |

### Configuracion DEV prevista

- SOURCE nativo, Node v24.16.0 y PNPM.
- Cloudflare R2 DEV directo.
- OCR Python systemd y NATS existentes.
- NAS DEV: GESTION-DOCUMENTARIA/_DEV_DOCUMENTAL_PLATFORM.
- R2_NAS_VIEWER_ENABLED=true.
- R2_NAS_ARCHIVE_ENABLED=false.
- R2_NAS_PUBLIC_GATEWAY_URL=http://localhost:3000.
- Secreto HMAC y credenciales fuera de Git.
- R2 DELETE debe permanecer deshabilitado.
- Configuracion efectiva runtime pendiente.

### Evidencias y pendientes

- Candidato: PNPM offline PASS, paquetes internos 3/3 PASS.
- Candidato: Documentos y Gateway build exit 0.
- Candidato: Web build exit 1 por rechazo de URL local.
- HMAC 7/7 y Jest 13/13 PASS anteriores.
- NAS archivo 546: lectura e integridad acreditadas anteriormente.
- NAS bytes: 388820.
- NAS SHA-256: 1fc2f2755fb1e04599d110a4d5bc73327612ff73123010efae006788dd347295.
- SOURCE integracion funcional: 43/43 conciliados.
- SOURCE build integral: PENDING.
- SOURCE runtime: PENDING.
- HTTP E2E 546: PENDING.
- Validacion visual PO: PENDING.
- Aceptacion funcional PO: PENDING.
- Enterprise, GHCR y EC2: HOLD.

La presente adenda registra integracion local, no acredita
publicacion Git, aceptacion funcional ni despliegue productivo.

### Acreditacion build integral y pruebas focales SOURCE

- Node v24.16.0; PNPM 11.4.0.
- MS Auth build: PASS.
- MS Documentos build: PASS.
- API Gateway build: PASS.
- Web Admin build formal: PASS.
- Web build con URLs HTTPS institucionales y flag local false.
- No se modifico la validacion de seguridad Web.
- Build integral SOURCE: 4/4 PASS.
- Evidencia: /home/loxi1/bbti-source-build-zqQj15.
- Pruebas focales SOURCE: 2 suites, 13/13 PASS.
- Ajuste exclusivo de dos archivos de pruebas.
- Sin cambios adicionales de codigo funcional.
- PostgreSQL configurado: gestion_documental_g2_prodclone_20261028.

Hashes actualizados que prevalecen sobre el inventario inicial:

- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.spec.ts`: `4bf7f9290195b178640326b089a20e76b9431df761d4103e19be454d847bfa11`.
- `apps/ms-documentos/src/documentos/documentos-preview.nas-contract.spec.ts`: `fbb1bcc212cbbf786907130e2d71f253cd7662a23850d7f746b3bd96cb249f1b`.

- Runtime y HTTP E2E: pendientes.
- Validacion visual PO: pendiente.
- SOURCE commit/push: HOLD.


## 2026-11-23 — BBTI_NAS_MVP_TRANSVERSAL_SOURCE_COMPLETION_R1

Incremento local SOURCE sobre main `18d0e1bd53d40da002872471924af41d001dd8bb`.
Conserva los cambios acumulados anteriores. Sin commit, push, promoción ni activación runtime.
Estado: IMPLEMENTACION_PARCIAL_VALIDADA_OFFLINE; no acredita cierre integral del MVP ni aceptación PO.

### Implementación nueva acreditada técnicamente

- Un único runtime compartido mediante ArchivadoCoreModule y CargaSeguraStorageModule; sin ciclo Documentos/DocumentalV2 ni proveedor R2 duplicado.
- ArchivadoPostcommit recoge documento y archivo exactos, deduplica, aísla solicitudes concurrentes y ejecuta después de resolver el commit exterior. Rollback no procesa; fallo posterior no revierte la confirmación.
- Integración de la frontera postcommit en Compras TEMP, confirmación V2/recuperación Almacén, confirmación simple, OP inicial con TEMP, regularizaciones Factura/RH OP y aceptación de versiones. Las variantes sin regla siguen bloqueadas individualmente.
- Selector exacto con versión opcional y OP sin expediente, acreditada mediante principal, contenedor, empresa/cliente y relaciones persistidas; no fabrica expediente.
- Preparación semántica previa a promoción para regularizadores Factura/RH OP, consumiendo el periodo OP existente y conservando la reserva hasta asociación final.
- Principales de igual tipo/número pero diferente identidad no se colapsan. Colisión de nomenclatura bloquea archivado sin inventar variante.
- Reintento de TEMP ya archivado usa evidencia durable y no exige HEAD/PUT del definitivo eliminado.
- Lectura NAS sin privilegios de confirmación OCR, manteniendo JWT/contexto. Resumen Gateway conserva control contextual sin exigir confirmar OCR. Regularización conserva autorización de escritura.
- Fallback R2 cuando NAS falla y R2 está PRESENTE; R2 eliminado nunca produce URL R2 de fallback, incluso con visor deshabilitado.
- Parámetros NAS por entorno y origen público HTTPS productivo mediante allowlist exacta. No se modificaron configuraciones activas ni credenciales.

### Política y configuración preparada, NO activada

- R2_NAS_ARCHIVE_ENABLED: registro; R2_NAS_VIEWER_ENABLED: lectura; R2_NAS_AUTO_ENABLED: procesamiento postcommit (nuevo, false por defecto).
- Ámbito DEV explícito: R2_NAS_DEV_ALLOWED_FILE_IDS, R2_NAS_DEV_ALLOWED_EXPEDIENTE_IDS o R2_NAS_DEV_ALLOWED_OP_IDS. Listas de enteros positivos, vacías por defecto. OP se contrasta con relaciones persistidas, no con metadata aportada.
- R2_NAS_DEV_DELETE_ENABLED: false por defecto; exige NODE_ENV=development, destino SYNOLOGY_DEV, visor aceptado e identidad exacta autorizada. No existe habilitación DELETE general/productiva.
- Host/share/root/user: R2_NAS_SMB_HOST, R2_NAS_SMB_SHARE, R2_NAS_SMB_ROOT, R2_NAS_SMB_USER. DEV mantiene valores acreditados. Producción exige valores explícitos y rechaza raíz DEV. Archivo protegido existente: R2_NAS_SMB_AUTH_FILE.
- URL pública: R2_NAS_PUBLIC_GATEWAY_URL; producción exige HTTPS y pertenencia exacta a R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS. Mantiene secreto de tickets existente, sin publicarlo.
- Archivo 546: entrada focal cerrada. Archivos 546/552/553 excluidos de procesamiento ordinario/manual/diario nuevo.

### Validación ejecutada

- Node offline: 116/116 PASS, siete suites; typecheck estricto del núcleo PASS. Evidencia temporal `/tmp/bbti-archive-offline-PlrpHe/result.json` y logs por suite.
- Jest MS Documentos: 198/198 PASS, 14 suites focales (archivado, preview, TMP, orquestador, OP, materializadores y regularizadores).
- Jest Gateway: 2/2 PASS, `src/documentos/documentos.archivado-read.spec.ts`.
- Total focal: 316 PASS, 0 FAIL en los resultados finales de las suites ejecutadas.
- Builds Nest MS Documentos y Gateway PASS con configuración extendida de tsconfig.build.json y salida aislada en `/tmp/bbti-nas-mvp-transversal-build-r1/`, sin sobrescribir dist en uso.
- El typecheck general que incluye todos los fixtures del repositorio encontró errores fuera de las suites modificadas (constructores/mocks históricos). No se presenta como PASS global; los builds de producción y el typecheck focal sí pasaron.
- Sin pruebas integradas DB/SMB/R2 ni aceptación visual nueva. Migración 0026 no modificada ni ejecutada; SHA256 observado `609bb06532b8bcc745a0caff695bd60e20eb98079e33436b542c9aae0343aae6`.

Comandos de validación reutilizables:

```bash
BBTI_EXISTING_DEPS_SOURCE=/home/loxi1/projects/apps/documental-platform node tests/r2-nas/verify-offline.cjs
pnpm --filter @documental/ms-documentos exec jest --runInBand --runTestsByPath src/documentos/archivado/archivado-postcommit.spec.ts src/documentos/archivado/archivado-configuracion.spec.ts src/documentos/archivado/archivado-core.module.spec.ts src/documentos/archivado/archivado-runtime.spec.ts src/documentos/documentos-preview.nas-contract.spec.ts src/documentos/factura-temp/factura-temp-materialization.service.spec.ts src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.service.spec.ts src/documental-v2/use-cases/regularizar-obligacion-op-factura.spec.ts src/documental-v2/use-cases/regularizar-obligacion-op-recibo-honorario.spec.ts src/documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase.spec.ts src/documentos/orden-pago/orden-pago-archivo.service.spec.ts src/documentos/tmp/tmp.service.spec.ts src/documentos/factura-temp/factura-temp-materialization.repository.spec.ts src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.repository.spec.ts
pnpm --filter @documental/api-gateway exec jest --runInBand --runTestsByPath src/documentos/documentos.archivado-read.spec.ts
```

### Pendientes reales y límites del resultado

- Se conservan NUEVO_TARDIO y la protección ARCHIVADO_ORIGEN_PREVIO_REQUIERE_REGULARIZACION. Canonicaliza antes de NAS, pero su objeto técnico previo no se elimina automáticamente; tiene contexto durable y bloqueo identificable. No se acredita el ciclo completo DELETE para esos casos.
- En cargas con identidad conocida solo al confirmar, la canonicalización tardía aún ocurre después del commit documental y antes de copiar NAS. No se acredita el orden íntegro materialización canónica antes del commit para todos los caminos.
- Sustentos de transferencia/detracción y versiones: propuestas preparadas y probadas únicamente en resolverNombrePropuesto(), sin llamadas desde el flujo real. Requieren aprobación literal PO. Seguros, independientes sin principal y extensiones no PDF sin regla recuperada permanecen bloqueados.
- La ruta común y nombres aprobados V1 están implementados; no se declara cobertura integral de todos los escritores/orígenes ni aceptación transversal visual.
- Regularización utiliza el mismo motor y selectores exactos; no se instaló programación diaria. La UI existente por expediente no se amplió con una pantalla específica para OP sin expediente.
- MSE/PO deben coordinar actualización ordinaria únicamente de MS Documentos y Gateway. Auth/Web/OCR/DB/NATS no se reinician por este incremento. No se arrancaron ni detuvieron servicios en esta ejecución.
- Sin SQL operativo, transferencias, DELETE real, infraestructura, Enterprise, GHCR ni EC2. Cierre 546 y preservación 552/553 no revalidados ni intervenidos.


## 2026-11-23 — Continuación directa: cierre de ingeniería NAS para variantes aprobadas

Complementa aditivamente BBTI_NAS_MVP_TRANSVERSAL_SOURCE_COMPLETION_R1. No elimina ni reinterpreta la evidencia histórica de la sección anterior. SOURCE permanece main `18d0e1bd53d40da002872471924af41d001dd8bb` con el incremento local sin commit/push.

ESTADO: ENGINEERING_APPROVED_VARIANTS_PASS_OFFLINE; aceptación integrada PO pendiente. No es aceptación productiva ni evidencia de operaciones físicas nuevas.

### Cierres implementados

- `ArchivadoMaterializacionService.ejecutar()` reserva durablemente el destino antes del COPY/PUT, reutiliza el escritor R2 existente y su exclusión, verifica contenido e identidad, y actualiza referencias/confirmación en la transacción documental antes de su commit final. La reserva independiente se obtiene por un canal reservado adquirido antes de los bloqueos de negocio; concurrencia acotada, sin nuevo pool, servicio, PID o temporizador.
- El rollback conserva el origen y la reserva no confirmada; el destino ya creado se verifica y reutiliza en el reintento sin otro PUT. No hay NAS dentro de la transacción documental. No se elimina el respaldo de origen durante la preparación.
- El puente final bloquea archivo/documento, utiliza los resolutores documentales existentes, y consume la emisión propia o la Factura/OP organizadora persistida. No usa el mes del upload como sustituto. Una Factura fundadora encuentra su principal también por `grupos_factura.factura_documento_id`.
- Carga guiada y candidata de versión persisten tenant/workspace/actor; Gateway deriva esos encabezados del JWT validado. El materializador tardío ordinario puede así operar con identidad completa. El flujo sin identidad válida falla antes del PUT.
- Compras TEMP, materializadores Factura/RH OP y OP inicial conservan la preparación semántica existente. Cargas normales/Almacén y confirmaciones V2/simple completan la materialización cuando la identidad se conoce al confirmar. Todos reutilizan el postcommit exacto ya implementado. Versiones y sustentos no aprobados siguen bloqueados individualmente.
- Para documentos nuevos correctamente materializados el MOVE recibe ruta/nombre definitivos persistidos, modo NUEVO, sin recalcularlos. NUEVO_TARDIO queda para recuperación/regularización; ARCHIVADO_ORIGEN_PREVIO_REQUIERE_REGULARIZACION permanece intacto y probado.
- El origen técnico de una materialización nueva tiene identidad durable `origenMaterializacion`. Con DELETE explícitamente autorizado, después de verificar NAS/visor se comprueban sus referencias, bytes y SHA256; se registran ORIGEN_INTENTO, ORIGEN_RESPUESTA y ORIGEN_AUSENCIA por lease/CAS antes de completar la eliminación del definitivo R2. La respuesta perdida seguida de 404 no acredita autoría ni dispara otro DELETE. No hay tabla adicional ni modificación de 0026.
- Las pruebas acreditan ausencia de copias técnicas y definitivas R2 al completar el ciclo simulado autorizado. Con DELETE deshabilitado, ambas copias se preservan deliberadamente y el trabajo queda recuperable; esto no se presenta como MOVE físico completado.

### Validación real de esta continuación

- Recuperados: 195/195 Jest Documentos (13 suites afectadas) y 5/5 Gateway (dos suites, incluyendo propagación de identidad).
- Último pase focal pendiente completado tras la interrupción: 69/69 Node, tres suites (dominio 21, MOVE 31, adaptadores 17), cero fallos; typecheck estricto del núcleo PASS.
- Evidencia del pase final: `/tmp/bbti-archive-offline-cZKfGV/archivado/result.json` y tres logs del mismo directorio. Los pases completos anteriores quedan conservados, sin duplicarlos como nuevas pruebas.
- Builds Nest Documentos y Gateway PASS con salidas separadas del runtime en `/tmp/bbti-nas-mvp-transversal-build-r1/`. Documentos recompilado al reanudar para incluir FOR UPDATE OF f,d. Gateway PASS recuperado de la ejecución previa, sin reconstrucción innecesaria.
- BBTI_ARCHIVE_SUITE_FILTER confirmado aplicado en `tests/r2-nas/verify-offline.cjs`; selección limitada a nombres de suites conocidos.
- `git diff --check` PASS. Índice Git vacío. 0026 conserva SHA256 `609bb06532b8bcc745a0caff695bd60e20eb98079e33436b542c9aae0343aae6`; no se aplicó ni modificó.

Reproducción focal, offline:

```bash
BBTI_EXISTING_DEPS_SOURCE=/home/loxi1/projects/apps/documental-platform BBTI_ARCHIVE_SUITE_FILTER=archivado-domain.test.cjs,archivado-move.test.cjs,archivado-adapters.test.cjs node tests/r2-nas/verify-offline.cjs
pnpm --filter @documental/ms-documentos exec jest --runInBand --runTestsByPath src/documentos/archivado/archivado-materializacion.spec.ts src/documentos/archivado/archivado-runtime.spec.ts src/documentos/archivado/archivado-postcommit.spec.ts src/documentos/archivado/archivado-core.module.spec.ts src/documentos/documentos-upload.archivado.spec.ts src/documentos/documentos-upload.service.spec.ts src/documentos/factura-temp/factura-temp-materialization.service.spec.ts src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.service.spec.ts src/documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase.spec.ts src/documental-v2/use-cases/regularizar-obligacion-op-factura.spec.ts src/documental-v2/use-cases/regularizar-obligacion-op-recibo-honorario.spec.ts src/documentos/orden-pago/orden-pago-archivo.service.spec.ts src/documentos/tmp/tmp.service.spec.ts
pnpm --filter @documental/api-gateway exec jest --runInBand --runTestsByPath src/documentos/documentos.controller.spec.ts src/documentos/documentos.archivado-read.spec.ts
```

### Configuración para la futura aceptación DEV, no aplicada

Antes del único arranque coordinado y antes de crear el expediente nuevo, establecer una fecha UTC de corte y conservarla durante toda la aceptación/reintentos. No se cambia por cada documento. La fecha controla elegibilidad, nunca el periodo contable.

```bash
export NODE_ENV=development
export R2_NAS_DESTINATION=SYNOLOGY_DEV
export R2_NAS_ARCHIVE_ENABLED=true
export R2_NAS_VIEWER_ENABLED=true
export R2_NAS_AUTO_ENABLED=true
export R2_NAS_DEV_NEW_DOCUMENTS_ENABLED=true
export R2_NAS_ACTIVATION_FROM="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export R2_NAS_DEV_EMPRESAS=BBTI
export R2_NAS_DEV_CLIENTE_IDS=2
export R2_NAS_DEV_ALLOWED_FILE_IDS=
export R2_NAS_DEV_ALLOWED_EXPEDIENTE_IDS=
export R2_NAS_DEV_ALLOWED_OP_IDS=
export R2_NAS_DEV_DELETE_ENABLED=false
```

La configuración admite expedientes creados después del corte desde su primera confirmación y OP nuevas sin expediente mediante relaciones persistidas. Excluye archivos históricos y 546/552/553. No exige conocer previamente archivoId/expedienteId ni reiniciar por documento.

El cargador institucional debe mantener DB/R2/NATS del `.env` DEV acreditado, aplicando después solo estas variables NAS públicas. Ejemplo para el futuro arranque de Documentos, únicamente con el servicio anterior detenido ordinariamente, puerto libre y coordinación PO/MSE:

```bash
node -e 'const {parseEnv}=require("node:util");const {readFileSync}=require("node:fs");const {spawnSync}=require("node:child_process");const env={...process.env,...parseEnv(readFileSync(".env","utf8"))};const keys=["R2_NAS_DESTINATION","R2_NAS_ARCHIVE_ENABLED","R2_NAS_VIEWER_ENABLED","R2_NAS_AUTO_ENABLED","R2_NAS_DEV_NEW_DOCUMENTS_ENABLED","R2_NAS_ACTIVATION_FROM","R2_NAS_DEV_EMPRESAS","R2_NAS_DEV_CLIENTE_IDS","R2_NAS_DEV_ALLOWED_FILE_IDS","R2_NAS_DEV_ALLOWED_EXPEDIENTE_IDS","R2_NAS_DEV_ALLOWED_OP_IDS","R2_NAS_DEV_DELETE_ENABLED"];for(const k of keys)if(process.env[k]!==undefined)env[k]=process.env[k];env.NODE_ENV="development";const r=spawnSync("node",["--enable-source-maps","dist/main"],{cwd:"apps/ms-documentos",env,stdio:"inherit"});process.exit(r.status??1)'
```

El build validado usa salida separada, no reemplaza el dist activo. Antes de un arranque posterior, preparar los dist de los dos servicios afectados mediante los builds institucionales desde SOURCE. No reiniciar Auth/Web/OCR/DB/NATS por este incremento.

DELETE permanece false; habilitar true solo bajo autorización física explícita PO, antes del arranque coordinado de esa aceptación. No se habilita aquí. Mantener las configuraciones existentes de autenticación NAS, R2 y tickets, sin copiar secretos.

En producción el procesamiento ordinario no depende de listas DEV: `R2_NAS_NEW_DOCUMENTS_ENABLED` y la fecha de activación consideran archivos nuevos acreditados. DELETE productivo continúa deshabilitado; no hay promoción/configuración productiva autorizada por este registro.

### Matriz única de decisiones literales pendientes

P = OC, OS u OP con asociación válida; N = número persistido del principal.

| Variante | Patrón preparado, inactivo | Decisión |
|---|---|---|
| Transferencia | `P_N__TRANSFERENCIA_BANCO_OPERACION.pdf` | Aprobación literal PO pendiente |
| Detracción | `P_N__DETRACCION_BANCO_OPERACION.pdf` | Aprobación literal PO pendiente |
| Versión | `<nombre-v1-sin-extension>__V<version>.pdf` | Aprobación literal PO pendiente |
| Seguro, independiente sin principal, no PDF | Sin patrón aprobado recuperado | No inventar; permanece bloqueado individualmente |

Las variantes V1 PDF aprobadas OC/OS/OP, Factura OC/OS/OP, Guía/NI OC/OS y RH OP conservan sus patrones literales. No se activaron los patrones propuestos.

### Identidad de código y restricciones conservadas

- archivado-materializacion.service.ts: `17ec83aeaa0fed096cebe95c59a5e3c9c23b613028675a26ae7c54a9155a4c2b`.
- archivado-documental.service.ts: `ab0517b25c83e7b2785803eecd837698a056ef6caadd0671a145270db10c4fd4`.
- archivado-move.service.ts: `0b247a014272eab4072a67a1c4bef9b6b9a1178a7fbbd3600db7c8ba9c71c5cc`.
- archivado-runtime.service.ts: `d25014107debb1d3a237756966c0fa4004e6d8e38c85d76ac09617b7c5f2370d`.

Sin SQL operativo, cambios DB, transferencias, DELETE real, reinicios, commits, push, Enterprise, GHCR o EC2. Sin intervención física de 546/552/553. Aceptación integrada y visual PO pendiente; las pruebas offline no la sustituyen. No quedan bloqueos de ingeniería identificados para las variantes aprobadas; las variantes sin regla literal permanecen sujetas a la decisión indicada.


## 2026-11-23 — BBTI_NAS_COMPRAS_TEMP_SERIALIZATION_FIX_R1

Corrección focal SOURCE durante aceptación física. Sin activación runtime ni nueva aceptación funcional.

### Causa acreditada

La ruta `TmpService.documental()` → `ArchivadoDocumentalService.prepararCompras()` → `ArchivadoRepository.reservar()` pasaba un objeto JavaScript en el parámetro **$6::jsonb** del INSERT de `documentos.archivados_documentales` (columna `contexto`). El mismo defecto estaba presente en el SELECT de comprobación de replay.

El cliente institucional se crea en `packages/database/src/index.ts` con `postgres(...)` y posteriormente se comparte con `drizzle(sql, {schema})`. El driver Drizzle sustituye los serializers JSON/JSONB (OID 114/3802) por una función transparente. Por ello el objeto llega sin serializar al Bind de postgres@3.4.9 y a `Buffer.byteLength()`, reproduciendo `TypeError / ERR_INVALID_ARG_TYPE`. Sin inicializar Drizzle, la misma prueba pasa: no es evidencia suficiente probar solo un cliente postgres aislado.

La sentencia exacta se contrastó mediante Parse/Describe sin ejecución del INSERT. Tipos de sus 17 parámetros: `2950,25,23,20,23,3802,25,23,23,25,25,25,1043,20,25,25,23`. Únicamente el sexto valor produjo tipo wire `object`; bigint, fechas ISO y restantes valores comprobados serializan correctamente.

### Cambio mínimo y alcance compartido

- `apps/ms-documentos/src/documentos/archivado/archivado.repository.ts`, `reservar()`: serializa una sola vez `JSON.stringify(i.contexto)` y utiliza el texto JSON en INSERT y replay.
- No se cambian serializers globales, adaptadores de conexión ni configuración Drizzle. El servidor sigue recibiendo JSONB objeto, no una cadena JSON doblemente codificada.
- La corrección se comparte con Compras TEMP, OP, materialización de confirmación y registro/regularización mediante el repositorio común. No se detectó otra entrada de objeto JSON crudo en los adaptadores unsafe del núcleo revisado; las demás evidencias JSON ya se pasan serializadas.
- Se preservan los cambios anteriores de TmpRepository, autorización, nomenclatura, reserva permanente, CAS, auditoría, postcommit y protecciones DELETE.

### Regresión efectiva y verificaciones

- Nuevo `tests/r2-nas/archivado-postgres-readonly.cjs`: opt-in exclusivamente DEV, postgres@3.4.9 inicializado con Drizzle, sesión `default_transaction_read_only=on`, identidad exacta de base. Captura las sentencias generadas por el repositorio SOURCE y describe sus tipos sin ejecutar escrituras; ejecuta SELECT con los mismos parámetros/tipos, reproduce el fallo anterior y verifica el round-trip corregido de INSERT y replay. Bigint y fecha ISO PASS. Sin cambios de node_modules ni dependencias.
- PostgreSQL DEV identificado: contenedor existente `bbti-mvp3005-postgres`, IP `172.29.0.2`, base `gestion_documental_g2_prodclone_20261028`. La inspección Docker leyó exclusivamente nombre/IP/puertos; no variables ni credenciales.
- Consulta READ_ONLY de TEMP 385: `almacenada`, vigente, origen registrado, `promovida_en=NULL`, `documento_id=NULL`, `archivo_id=NULL`, `requiere_reconciliacion=false`, sin destino/reserva en metadata, cero archivos y cero reservas asociados. Estado idéntico antes/después de la prueba. Recuperabilidad SQL acreditada; objeto R2 no consultado ni promovido.
- Node focal: **53/53 PASS** (dominio 21, MOVE/repositorio 32); typecheck estricto PASS. Evidencia `/tmp/bbti-archive-offline-S3jF7w/archivado/result.json` y logs del mismo directorio.
- Jest focal: **31/31 PASS**, `tmp.documental.spec.ts` y `archivado-materializacion.spec.ts`.
- Build Nest MS Documentos PASS, con salida separada en `/tmp/bbti-nas-serialization-fix-r1-build/dist/`, sin sobrescribir el dist activo. Gateway no afectado; no reconstruido.
- `git diff --check` PASS. No se promovió TEMP 385 ni se ejecutaron COPY, PUT, DELETE o escrituras PostgreSQL.

Comandos reproducibles (no son autorización de promoción ni de reinicio):

```bash
BBTI_PG_READONLY_REGRESSION=1 node tests/r2-nas/archivado-postgres-readonly.cjs
BBTI_EXISTING_DEPS_SOURCE=/home/loxi1/projects/apps/documental-platform BBTI_ARCHIVE_SUITE_FILTER=archivado-domain.test.cjs,archivado-move.test.cjs node tests/r2-nas/verify-offline.cjs
pnpm --filter @documental/ms-documentos exec jest --runInBand --runTestsByPath src/documentos/tmp/tmp.documental.spec.ts src/documentos/archivado/archivado-materializacion.spec.ts
```

Identidad del incremento:

- Repositorio SOURCE corregido SHA256: `3c0dd53dea07b691a3875a202a7173d950dc258402241f5eaff37f5f5dee004b`.
- Regresión READ_ONLY SHA256: `d0f11edc22517669e4a875095d3554e2733bab8114f0aa2d2628e31bfb1fee7a`.
- Repositorio compilado SHA256: `2582a6dcdde42e2149e937e7f041db784fcad2a211ebaf28531f3071b49094a5`.

SOURCE_FIX=VALIDATED. ACTIVE_RUNTIME_UPDATE=PENDING_MSE_PO. TEMP_385_RETRY=NOT_EXECUTED.
Sin reinicios, migraciones, modificaciones de configuración, credenciales, escrituras DB, R2/NAS físicos, intervención de archivos 546/552/553, commit/push, Enterprise, GHCR ni EC2. Producción intacta. La nueva confirmación física no se declara PASS y no se ejecuta automáticamente.


## Continuidad automática NAS transversal — BBTI_NAS_AUTOMATIC_ELIGIBILITY_CONTINUITY_R1

Corrección SOURCE de elegibilidad DEV: se conserva el corte `2026-11-24T02:24:30Z`, confirmación documental, metadata `archivadoNuevo=true` y fecha de creación del archivo posterior al corte. Se elimina únicamente la exigencia de antigüedad del expediente/documento principal: un archivo nuevo elegible puede pertenecer a un expediente existente. Los archivos 546/552/553 siguen excluidos. Las listas históricas de IDs no permiten eludir estos controles.

Autorización simultánea por pares explícitos `R2_NAS_DEV_CONTEXTS=[{"empresa":"BBTI","clienteId":2},{"empresa":"BBTEC","clienteId":1}]`. No se cruzan empresas y clientes mediante producto cartesiano; configuración malformada deniega. Compatibilidad con listas antiguas solo cuando definen un único par inequívoco. PostgreSQL debe corroborar empresa/cliente del archivo y su expediente o asociación OP vigente; no se modifica la resolución de periodo ni nomenclatura.

El conector postcommit, alGuardar y procesamiento diario conservan el motor existente. No se añade scheduler, servidor ni consumidor. La copia ordinaria admite ambos contextos; DELETE DEV exige además identidad exacta del conjunto autorizado por PO (reserva3/archivo554/documento549 y reserva4/archivo555/documento550, BBTEC/cliente1/expediente6), whitelist 554/555 y flags existentes. Una whitelist ampliada no amplía esta autorización. Integridad NAS, verificación del visor, referencias físicas, lease/CAS y evidencia durable del motor permanecen obligatorios.

Recuperación preparada en `recuperarPendientesExactosDev` y adaptador `apps/ms-documentos/scripts/recuperar-nas-554-555.cjs`: preflight completo de las dos identidades antes de reclamar, sin volver a confirmar/subir/materializar. Rechaza origen técnico alternativo o NUEVO_TARDIO para este lote, no procesa otras reservas, no repite una eliminación ya completada y detiene el lote ante error informando resultados parciales. El adaptador comprueba base y servidor DEV, no inicia Nest ni utiliza consumidores NATS y solo modifica variables en su propio proceso.

Comando preparado para ejecución posterior MSE/PO; **NO EJECUTADO en esta intervención**, puede producir copia NAS y DELETE exclusivamente de 554/555 tras verificaciones:

```bash
cd /home/loxi1/projects/apps/documental-platform
NODE_PATH="$PWD/apps/ms-documentos/node_modules" \
BBTI_NAS_COMPILED_DIR=/tmp/bbti-nas-eligibility-continuity-r1-build/dist \
BBTI_NAS_RECOVER_554_555=ARCHIVAR_554_555 \
R2_NAS_VIEWER_ACCEPTED=true \
node apps/ms-documentos/scripts/recuperar-nas-554-555.cjs
```

Configuración de continuidad ordinaria, pendiente de incorporación coordinada al runtime activo (no se edita .env ni se reinician servicios aquí): NODE_ENV=development, R2_NAS_DESTINATION=SYNOLOGY_DEV, R2_NAS_ARCHIVE_ENABLED=true, R2_NAS_VIEWER_ENABLED=true, R2_NAS_AUTO_ENABLED=true, R2_NAS_DEV_NEW_DOCUMENTS_ENABLED=true, corte original y pares anteriores. DELETE requiere además R2_NAS_DEV_DELETE_ENABLED=true, R2_NAS_DEV_DELETE_FILE_IDS=554,555 y R2_NAS_VIEWER_ACCEPTED=true. Aplicar las variables públicas después de la carga institucional de configuración para evitar que .env las reemplace. No es necesario reiniciar por cada empresa o documento una vez activada esta configuración conjunta. Otros documentos nuevos pueden archivarse, pero no quedan autorizados para DELETE por esta intervención.

Validación actual: 34/34 pruebas focales PASS (runtime y postcommit); build MS Documentos PASS con salida aislada `/tmp/bbti-nas-eligibility-continuity-r1-build/dist`; sintaxis del adaptador PASS. Gateway no afectado. Logs: `/tmp/bbti-eligibility-final-tests.log` y `/tmp/bbti-eligibility-final-build.log`. Se cubren expediente antiguo/archivo nuevo, ambos pares y cruces rechazados, históricos, configuración inválida, lote exacto y completo, fallo parcial sin reintento, no-op completado y límites DELETE. No se declara aceptación física ni adopción del código por servicios activos.

Hashes del incremento y artefacto:

- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.service.ts`: `fc09a3bec08c686632dd0d788771286ab791b1d020f4b5a0c99e6f3fb4cfcea5`.
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.spec.ts`: `78c0364a783efe2374eabe9dc34d3d220232e543ed79e26613c4974bc1909d9f`.
- `apps/ms-documentos/scripts/recuperar-nas-554-555.cjs`: `34eddbcf018428a14f39bcfa162de2a65d4528da35469310006527d974250adf`.
- `/tmp/bbti-nas-eligibility-continuity-r1-build/dist/documentos/archivado/archivado-runtime.service.js`: `6e5161a8d62042a12806257e07b457d866bd4fd2451ec8407280df99496582b2`.

REAL_STORAGE_MUTATIONS=NO. SERVICES_RESTARTED=NO. Migraciones, credenciales, nomenclaturas pendientes, archivos protegidos, Enterprise, GHCR y EC2 intactos. Sin commit/push ni consultas productivas.


## 2026-11-24 — BBTI_NAS_TRANSVERSAL_REAL_ACCEPTANCE_CORRECTION_R1

**Estado: CORRECCIONES_FOCALES_VALIDADAS_OFFLINE; aceptación física transversal pendiente.** SOURCE canónico, sin commit/push. Esta adenda sustituye únicamente las restricciones operativas DEV por listas estáticas del incremento anterior; conserva sus evidencias y el corte `2026-11-24T02:24:30Z`.

### Conciliación real READ ONLY

Sesión PostgreSQL `gestion_documental_g2_prodclone_20261028`, `transaction_read_only=on`, sin DDL/DML. Una primera SELECT rechazó una columna no disponible (42703); se corrigió la proyección y la segunda SELECT concluyó. No se consultaron contraseñas, tokens ni datos personales. Se concilió exclusivamente 556–560 y carga392:

| Archivo / documento / reserva | Hecho acreditado SQL | Resultado físico disponible |
|---|---|---|
| 556 / 551 / 5 | OC002952, expediente4, BBTEC/cliente1; R2 y NAS `documentos/2026/01/BBTEC/OC_002952.pdf`; nuevo, NASVERIFICADO, trabajoREINTENTABLE, R2NO_COMPROBADO | HEAD R2 existe,355063 bytes; previewNAS HTTP200 aportado PO |
| 557 / 552 / 6 | FACTURA FF62-00001878, expediente4; ambos destinos `documentos/2026/03/BBTEC/OC_002952__FACTURA_FF62-00001878_20101351921.pdf`; nuevo, NASVERIFICADO, REINTENTABLE, NO_COMPROBADO | PreviewNAS correcto aportado PO; sin nuevo GET ni DELETE |
| 558 / 553 / 7 | **Tipo confirmado OC**, numero000177, expediente6; ambos destinos `documentos/2025/09/BBTEC/OC_000177.pdf`; nuevo, NASVERIFICADO, REINTENTABLE, NO_COMPROBADO | HEAD OC existe,327057 bytes; HEAD FOC_000177.pdf no existe. No se infiere OS por filename |
| 559 / 554 / 8 | GUIA_REMISION T004/307; carga390, expediente4; origen ALMACEN_LEGACY_UPLOAD_GUIA; archivo sin archivadoNuevo; reservaHISTORICO,PENDIENTE. R2 técnico390__..., NAS canónico OC_002952__GUIA_T004-307_20101351921.pdf | PreviewR2 aportado PO; no transferencia nueva |
| 560 / 555 / 9 | NOTA_INGRESO0000003279; carga391, expediente4; origen ALMACEN_LEGACY_UPLOAD_NOTA_INGRESO; archivo sin archivadoNuevo; reservaHISTORICO,PENDIENTE. R2 técnico391__..., NAS canónico OC_002952__NOTA_INGRESO_0000003279.pdf | PreviewR2 aportado PO; no transferencia nueva |
| 561 / 556 / sin reserva | Sustento carga392, TRANSFERENCIA, FINANZAS_EDITAR_UPLOAD, expediente4; clave392__03_TRANSFERENCIA_BBVA_114460_compania_electro.pdf; archivadoBloqueo=VARIANTE_SIN_REGLA_APROBADA | No nomenclatura literal autorizada; no se inventa regla |

La prohibición sobre **archivos**552/553 se conserva; documentoId552/553 de esta tabla no son esos archivos. Todos los registros consultados pertenecen a BBTEC/cliente1.

### Causas y correcciones

1. CargaSeguraPersistence marcaba archivadoNuevo en metadata del documento, pero omitía el flag en metadata del **archivo**, que es lo consumido por el puente y el runtime. Guía/NI se clasificaban como HISTORICO, conservaban clave técnica y quedaban excluidas del postcommit automático. Se añade el flag al INSERT real del archivo cuando feature habilitada. La confirmación existente ahora reserva/materializa el nombre definitivo antes de su commit y registra el archivo exacto para el postcommit. No se modifica periodo/OCR ni se copia lógica del archivador.
2. DELETE DEV seguía limitado a la cohorte554/555: nuevos archivos556+ podían copiarse sin eliminación. Nuevo opt-in `R2_NAS_DEV_DELETE_NEW_CONFIRMED=true` habilita el recorrido DEV nuevo aprobado, sin alta por archivo/reinicio. Antes de construir el motor se vuelve a acreditar en SQL archivo/documento/version, confirmación, markerNuevo, fecha posterior al corte y contexto institucional. Se preservan NAS/visor, exclusión, referencias, lease/CAS, evidencia durable de respuesta y HEAD posterior, incertidumbre y protecciones de origen técnico. No habilita DELETE productivo. El modo legacy exacto554/555 sigue disponible si no se activa el nuevo modo.
3. `R2_NAS_DEV_DYNAMIC_CONTEXTS=true` permite resolver contextos desde las relaciones persistidas verificadas, sin listas estáticas. SQL conserva correspondencia empresa/cliente entre archivo, documento y expediente o principal/grupo OP activo. PROD ya utilizaba relaciones institucionales y no depende de listas DEV; no se activa ni modifica PROD.
4. ComprasTEMP OC/OS/Factura ya utiliza prepararCompras→reserva→promoción→confirmar→postcommit. SQL/HEAD no corroboran la discrepancia FOC reportada. No se modifica tipo ni filename por inferencia. OP inicial y regularizadores Factura/RH mantienen sus puntos prepararOp/prepararRegularizador→promoción→confirmación exacta. La confirmación V2 registra tras asociaciones; no se sustituye por Regularizar ahora.
5. Guided/version upload SOURCE ya contiene markerNuevo condicionado al feature. La ausencia de marker en561 no prueba por sí sola si su runtime cargó ese código/configuración: causa operacional exacta UNKNOWN. Además, TRANSFERENCIA carece de regla aprobada, bloqueo conservado. No se afirma cobertura física de OP/regularizadores ni de todos los flujos por pruebas de puentes.

### Validación de este incremento

- 56/56 Jest PASS en5 suites: runtime, nuevo archivado-real-writers (10casos), materialización, postcommit y atomicidad terminal de carga segura. Los casos nuevos ejecutan el cuerpo real de persistencia Guía/NI con executor simulado; confirmaciones OC/OS/OP, Factura OC/OP, Guía, NI y RH OP atraviesan el puente real con reserva/materializador simulado y verifican orden materialización→commit→NAS. No sustituyen E2E PostgreSQL/R2 físico.
- 38/38 Node PASS: MOVE32 y preview6, typecheck estrictoPASS. Primer intento sandbox EPERM al iniciar subprocesos; repetición autorizada offline PASS. Evidencia `/tmp/bbti-archive-offline-nMesEB/archivado/result.json`.
- Build MS DocumentosPASS con salida `/tmp/bbti-nas-real-acceptance-build/dist`; dist activo no sobrescrito. Gateway no afectado.
- Logs `/tmp/bbti-nas-real-acceptance-tests.log`, `/tmp/bbti-nas-real-acceptance-move.log`, `/tmp/bbti-nas-real-acceptance-build.log`. git diff --checkPASS.

### Recuperación preparada, NO ejecutada

- Reservas5/6/7: usar `recuperarPendientesExactosDev` con tuplas `{reservaId:5,archivoId:556,documentoId:551,empresa:'BBTEC',clienteId:1,expedienteId:4}`, `{reservaId:6,archivoId:557,documentoId:552,empresa:'BBTEC',clienteId:1,expedienteId:4}`, `{reservaId:7,archivoId:558,documentoId:553,empresa:'BBTEC',clienteId:1,expedienteId:6}`. Preflight de lote completo y motor existente, sin upload/reconfirmación. No ejecutar el script antiguo554/555 como sustituto.
- Reservas8/9: **HOLD individual**. El contrato aplicado0026 fija r2_key/ruta permanentemente y archivo_id único. Sus identidades ya fueron reservadas con ruta física técnica y destinoNAS distinto. No basta marcar metadata ni llamar el recuperador canónico: este rechaza la discrepancia. Conciliación de esas reservas requiere procedimiento específico revisado; no se reescriben reservas, no se permite duplicarlas, no se reconfirma ni se renombra físicamente aquí. La prevención para nuevos Guía/NI sí está corregida. No se añade migración ni se debilita inmutabilidad para solventar el legado de esta aceptación.
- Archivo561: HOLD por nomenclatura literal de sustento pendiente. Propuestas existentes únicamente: `<OC|OS|OP>_<numero>__TRANSFERENCIA_<BANCO>_<OPERACION>.pdf`, equivalente DETRACCION y versiones `<nombre-v1>__V<version>.pdf`; no llamadas desde flujo operativo hasta aprobación PO. No se toma el número original del filename como dato de dominio.

### Comando SOURCE conjunto preparado, NO ejecutado

Solo después de autorización/coordinación para detener el listener anterior y acreditar puerto3002 libre. Arranca únicamente Documentos; no inicia otros roles, scheduler ni supervisor. Mantiene secretos en memoria y aplica flags después de parsear .env. No se requiere configuración por empresa. El flag de visor conserva la aceptación física previa aportada; el motor comprueba disponibilidad en cada operación destructiva.

```bash
# PREPARADO, NO EJECUTADO. Solo tras parada coordinada del MS Documentos anterior y puerto 3002 libre.
# No ejecutar junto al listener existente. Conserva .env y secretos privados, sin imprimirlos.
cd /home/loxi1/projects/apps/documental-platform
node <<'NODE'
const fs=require('node:fs'),{parseEnv}=require('node:util'),{spawnSync}=require('node:child_process');
const root=process.cwd();
const env={...process.env,...parseEnv(fs.readFileSync('.env','utf8')),
 NODE_ENV:'development',NODE_PATH:root+'/apps/ms-documentos/node_modules',
 R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_VIEWER_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',
 R2_NAS_DESTINATION:'SYNOLOGY_DEV',R2_NAS_DEV_NEW_DOCUMENTS_ENABLED:'true',
 R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z',R2_NAS_DEV_DYNAMIC_CONTEXTS:'true',
 R2_NAS_DEV_DELETE_ENABLED:'true',R2_NAS_DEV_DELETE_NEW_CONFIRMED:'true',R2_NAS_VIEWER_ACCEPTED:'true'};
const r=spawnSync(process.execPath,['--enable-source-maps','/tmp/bbti-nas-real-acceptance-build/dist/main.js'],
 {cwd:root+'/apps/ms-documentos',env,stdio:'inherit'});
process.exit(r.status??1);
NODE
```

No se ejecutó este comando, ninguna recuperación, reinicio, upload, confirmación, PUT/COPY/DELETE, migración, commit/push, Enterprise, GHCR ni EC2. HEAD R2 y SELECT DEV fueron exclusivamente lectura. Producción intacta. No se declara aceptación integral.

Hashes SOURCE afectados en esta intervención:

- `apps/ms-documentos/src/documentos/carga-segura/carga-segura.persistence.ts`: `3ef6ce85e8e2e5b5c03eafadcba1b370c43e3165d326a8e7153097c95893bc75`.
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.service.ts`: `522d75707f2c0b1f48a5868817b7cbe5d7376212d3be49d6cad7d2d9f31e62ff`.
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.spec.ts`: `8449bb1463011fa35629c362ddc5b55ecac09b2256700d57a10a95b5b6766a29`.
- `apps/ms-documentos/src/documentos/archivado/archivado-real-writers.spec.ts`: `25f222d8a0336964dcd6cb7b341a9d9fe33d3e8d5966adc2ccd3fca605df5a91`.


## 2026-11-24 — BBTI_NAS_MVP_TRANSVERSAL_FINAL_CONTINUITY_R1

Continuación del checkpoint de aceptación real anterior. SOURCE main18d0e1bd53d40da002872471924af41d001dd8bb, incremento local conservado; sin commit/push. **Ingeniería focal aprobada por pruebas; MVP_PHYSICAL_ACCEPTANCE=PENDING.** No se recuperan, reconcilian, renombran, borran ni reprocesan los smokes anteriores. La propuesta previa de recuperación556–561 queda cancelada por decisión expresa PO. TEMP397/398 y archivos566/567 no se regularizan realmente.

### Causa acreditada común Factura/RH OP y corrección

Los logs originales de los requests no se localizaron en las ubicaciones focales consultadas. Se reprodujeron ambos caminos con casos de uso y repositorios reales compilados, executor READ ONLY, SELECTs reales y Parse/Describe + SELECT Bind de parámetros para las escrituras, **sin ejecutar INSERT/UPDATE**. Se incorporó Drizzle a postgres para conservar el contrato institucional de serializers. La excepción reproducida es `Error: ARCHIVADO_CONFIRMACION_NO_ACREDITADA` en ArchivadoRepository.confirmar; no ERR_INVALID_ARG_TYPE. No se atribuye el fallo a la edición manual27→28 ni a OCR.

Para archivos566 y567, cada reserva12/13 contiene expediente6, mientras el archivo persistido tiene expediente_idNULL. Provider, bucket, key, hash, empresa y cliente coinciden. La SELECT con el mismo WHERE de confirmar devuelve0 para ambos porque `(a.expediente_id IS NULL OR f.expediente_id=a.expediente_id)` no es true. Los dos INSERT de los materializadores utilizaban NULL literal. Las asociaciones y snapshot previos son parte de la transacción definitiva y el fallo impide su commit.

Corrección para **documentos nuevos**: obtenerExpedienteOpPersistido reutiliza relaciones OP→contenedor→expediente con empresa/cliente, principal activo, documento confirmado y bloqueo compartido. Ambos repositorios de materialización persisten ese expediente en vez de NULL cuando existe reserva NAS. Conservan NULL legítimo para OP sin expediente. Replays con contexto discrepante se rechazan, no se reparan silenciosamente. No se modifica la reserva, periodo, OCR, nombres operativos ni los registros anteriores.

Segundo cierre: registrarDocumentoConfirmado ya no excluye indiscriminadamente archivos con reserva. Una reserva vinculada y confirmada con identidad completa se reutiliza y registra el postcommit exacto de la asociación posterior, sin volver a resolver periodo/nombre ni UPDATE redundante. La reserva aún no confirmada se confirma con las protecciones originales. TMP_DOCUMENTAL mantiene su confirmación propia y no introduce segunda identidad. No se reconstruye el runtime.

### Aislamiento del siguiente recorrido DEV

SELECT READ ONLY acreditó MAX(archivo.id)=567. Se conserva el corte original `2026-11-24T02:24:30Z` y se añade una frontera de admisión DEV verificable `R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID=568`. No es una lista de empresas ni de nuevos archivos: todos los archivos posteriores elegibles pueden entrar sin reinicios; todos los IDs anteriores quedan fuera, incluso si tienen timestamps futuros. Se aplica en SQL y antes de consultar/reclamar. No se deduce nueva elegibilidad desde la fecha del expediente.

`R2_NAS_DEV_DELETE_NEW_CONFIRMED=true` requiere frontera positiva explícita; sin ella falla cerrado. Mantiene R2_NAS_DEV_DYNAMIC_CONTEXTS=true, relaciones institucionales, confirmación, markerNuevo, fecha posterior al corte, tenant, identidad exacta, NAS/visor, referencias/exclusión, lease/CAS, auditoría durable, HEAD posterior y tratamiento de respuestas inciertas. Los archivos546/552/553 siguen excluidos por identidad. PROD no utiliza esta frontera DEV y su DELETE permanece deshabilitado. No hay barrido nuevo ni scheduler, no se ejecuta ejecutarDiario ni Regularizar ahora.

### Matriz consolidada y campos de dominio

| Origen/variante | Patrón | Fuente autorizada | Estado |
|---|---|---|---|
| OC / OS V1 PDF | OC_NUMERO.pdf / OS_NUMERO.pdf | documentos.tipo_documental,numero; fecha_emision propia; empresa contextual | APROBADO, operativo |
| Factura OC/OS V1 PDF | OC_NUMERO__FACTURA_SERIE-NUMERO_RUC.pdf, equivalente OS | principal activo y grupos; factura serie,numero,ruc_emisor,fecha_emision | APROBADO, operativo |
| Guía OC/OS V1 PDF | OC_NUMERO__GUIA_SERIE-NUMERO_RUC.pdf, equivalente OS | principal/grupo autorizado; documento serie,numero,ruc_emisor; periodo factura vinculada | APROBADO; OS solo si dominio admite |
| NI OC/OS V1 PDF | OC_NUMERO__NOTA_INGRESO_NUMERO.pdf, equivalente OS | documento.numero y principal; periodo factura vinculada | APROBADO; OS solo si dominio admite |
| OP inicial PDF | OP_NUMERO.pdf | OP documento.numero y fecha_emision; contenedor | APROBADO, operativo |
| Factura OP / RH OP V1 PDF | OP_NUMERO__FACTURA_SERIE-NUMERO_RUC.pdf / OP_NUMERO__RH_SERIE-NUMERO_RUC.pdf | OP y documento fiscal persistidos; periodo emisiónOP | APROBADO; contexto expediente corregido |
| Sustentos OC/OS/OP | PRINCIPAL_NUMERO__TRANSFERENCIA_BANCO_OPERACION.ext / __DETRACCION_BANCO_OPERACION.ext | tipo/principal; metadata bancaria validada (banco,numeroOperacion/numeroConstancia), sin filename ni números inventados | RATIFICACIÓN LITERAL PENDIENTE; propuesta aislada |
| Versiones admitidas por dominio | V1sin sufijo; nombrebase__V2.ext; __V3etc | archivo.version y periodo original autorizado | RATIFICACIÓN LITERAL PENDIENTE; no habilita nuevos versionamientos |
| OP imagen | OP_NUMERO.png / OP_NUMERO.jpg | MIME/firma existentes image/png,image/jpeg y OP.numero | Upload admite formato; nombre NAS operativo sigue bloqueado hasta ratificación; propuesta preparada, sin conversión |
| Seguro independiente OP | OP_NUMERO__SEGURO_POLIZA_NUMERO.ext | principalOP y póliza explícitamente validada; no se localizó campo contractual universal numeroPoliza | RATIFICACIÓN Y CAMPO DE DOMINIO PENDIENTES; propuesta pura, no nuevo tipo habilitado |
| Factura de seguro | OP_NUMERO__FACTURA_SERIE-NUMERO_RUC.pdf | identidad fiscal FACTURA, no clasificación SEGURO | APROBADO como FACTURA |

El delta puro resolverNombrePropuesto prepara extensiones pdf/png/jpg, sufijos de versión y póliza, siempre marcado PROPUESTA_NO_APROBADA y sin llamadas desde materializadores/runtime. Resolver operativo no activa esas reglas. No se impone padding ni se cambian identidades humanas.

### Caminos efectivos preservados

Compras OC/OS/factura: prepararCompras→reserva→promoción existente→asociación/confirmación→postcommit exacto. Almacén: carga-segura marca **archivo** nuevo, confirmación V2/simple materializa destino canónico antes del commit; guía/NI consumen periodo de factura. OP inicialPDF: prepararOp→promoción→complete→confirmar. Factura/RH OP: prepararRegularizador→promoción y archivo con expediente correcto→regularización de negocio→confirmación de reserva→postcommit. La materialización PROMOTED aislada no sustituye la asociación final ni activa NAS por upload. Sustentos/versiones sin aprobación literal se bloquean individualmente. Contabilidad/otros visores conservan los contratos actuales de previewNAS y fallbackR2; no se modifican rutas de lectura.

### Pruebas y build reales

- 97/97 Jest PASS en10 suites afectadas: integración nueva OP(10), escritores transversales(10), runtime(32), materialización, postcommit, repositorios fiscales Factura/RH, casos de uso regularizadores y fechaOP. Son simulaciones de transacción/SQL/storage, no E2E físico.
- 6/6 Jest adicionales PASS en nomenclatura propuesta: extensionesOP, sustentos OC/OS/OP, versiones y póliza/facturaSeguro.
- Tras el endurecimiento final: runtime32/32 PASS; puente/escritores20/20 PASS. No se cuentan de nuevo para inflar los103 casos únicos.
- Node: MOVE32 y preview6 PASS; dominio21 PASS final; typecheck estrictoPASS. Un primer dominio dio9 fallos porque su fixture respondía id1 a la nueva SELECT de reserva vinculada; se ajustó exclusivamente esa respuesta a [] y se conservó la prueba TMP sin consultas adicionales. No campaña de fixtures ajenos. Evidencias finales dominio `/tmp/bbti-archive-offline-FadwwK/archivado/result.json`; MOVE/preview del pase `/tmp/bbti-archive-offline-AaCidd/archivado` (dominio falló en ese pase, no se presenta como PASSglobal).
- Build final MS DocumentosPASS, salida aislada `/tmp/bbti-nas-mvp-final-continuity-r1-build/dist`, después de todos los cambios. Gateway/Web/Auth no afectados en este incremento; no se reconstruyen. Dist activo no sobrescrito.
- Logs: /tmp/bbti-nas-final-focused.log, /tmp/bbti-nas-final-runtime-tests.log, /tmp/bbti-nas-final-bridge-tests.log, /tmp/bbti-nas-final-naming-tests.log, /tmp/bbti-nas-final-offline.log, /tmp/bbti-nas-final-domain.log, /tmp/bbti-nas-final-build.log, /tmp/bbti-nas-final-readonly-evidence.log. Driver READ ONLY: escrituras del negocio descritas, cero DML ejecutado. git diff --checkPASS.

### Terminal2 definitivo — PREPARADO, NO EJECUTADO

Sustituye operativamente los comandos anteriores para la próxima aceptación. Requiere parada coordinada del Documentos anterior por MSE/PO; el script **no detiene procesos** y rechaza puerto3002 ocupado o preflight fallido. Compila SOURCE final con Node24.16.0 y solo entonces arranca Documentos, conservando config privada y aplicando flags después de parsear.env. Sin listas por empresa/archivo; sin recuperar smokes previos. La frontera568 se conserva durante todo este recorrido, no se recalcula por documento o empresa.

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /home/loxi1/projects/apps/documental-platform
export PATH=/home/loxi1/.nvm/versions/node/v24.16.0/bin:$PATH
[ "$(node --version)" = v24.16.0 ] || { echo STOP_NODE_VERSION; exit 1; }
# Preflight only: never stops/restarts an existing listener.
listeners=$(ss -H -ltn 'sport = :3002') || { echo STOP_PORT_PREFLIGHT; exit 1; }
if [ -n "$listeners" ]; then echo STOP_PORT3002_OCCUPIED; exit 1; fi
pnpm --filter @documental/ms-documentos build
node <<'NODE'
const fs=require('node:fs'),assert=require('node:assert/strict'),{parseEnv}=require('node:util'),{spawnSync}=require('node:child_process');
const root=process.cwd();
assert.equal(process.version,'v24.16.0');
const env={...process.env,...parseEnv(fs.readFileSync('.env','utf8')),
 NODE_ENV:'development',MS_DOCUMENTOS_PORT:'3002',
 R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_VIEWER_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',
 R2_NAS_DESTINATION:'SYNOLOGY_DEV',R2_NAS_DEV_NEW_DOCUMENTS_ENABLED:'true',
 R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z',
 R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID:'568',R2_NAS_DEV_DYNAMIC_CONTEXTS:'true',
 R2_NAS_DEV_DELETE_ENABLED:'true',R2_NAS_DEV_DELETE_NEW_CONFIRMED:'true',R2_NAS_VIEWER_ACCEPTED:'true'};
const url=new URL(env.DATABASE_URL);
assert.equal(decodeURIComponent(url.pathname.slice(1)),'gestion_documental_g2_prodclone_20261028');
assert(['127.0.0.1','localhost','bbti-mvp3005-postgres','172.29.0.2'].includes(url.hostname),'STOP_NOT_DEV_DATABASE');
assert.equal(env.R2_NAS_SMB_HOST??'192.168.0.198','192.168.0.198');
assert.equal(env.R2_NAS_SMB_SHARE??'GESTION-DOCUMENTARIA','GESTION-DOCUMENTARIA');
assert.equal(env.R2_NAS_SMB_ROOT??'_DEV_DOCUMENTAL_PLATFORM','_DEV_DOCUMENTAL_PLATFORM');
const r=spawnSync(process.execPath,['--enable-source-maps',root+'/apps/ms-documentos/dist/main.js'],
 {cwd:root+'/apps/ms-documentos',env,stdio:'inherit'});
process.exit(r.status??1);
NODE
```

### Checkpoint y siguiente acción

Checkpoint focal persistente previsto: `/home/loxi1/bbti-evidence/r2-nas-g2-focal-integration-r1/checkpoints/nas-mvp-final-continuity-r1`. Incluye archivos SOURCE completos del incremento actual, hashes, patch contraHEAD como referencia histórica (no aplicación automática), logs, reproducción READ ONLY y Terminal2.sh. No incluye.env, credenciales, dependencias ni builds. El código canónico permanece en SOURCE; este checkpoint no es otro candidato/LAB. RELEASE_MANIFEST y este apartado conservan las decisiones y restricciones.

Último punto: corrección y validaciones offline terminadas; runtime no reiniciado. Siguiente: MSE/PO coordina Terminal2 y aceptación por aplicación con documentos nuevos568+, sin recuperar nada anterior. Pendientes reales: ratificación literal sustentos/versiones/imágenesOP/póliza, y aceptación física nueva de los caminos aprobados. No se promete cobertura física transversal ni eliminación productiva.

REAL_STORAGE_MUTATIONS=NO. SERVICES_RESTARTED=NO. Sin migraciones, cambios de reservas aplicadas, recuperación de smokes, commit/push, Enterprise, GHCR, EC2 ni producción.

Hashes SOURCE del incremento focal:

- `apps/ms-documentos/src/documentos/orden-pago/orden-pago-fecha-emision.ts`: `acd8bdb9547d15aebd4ba5bd723a57021d48fc5fdf29a0256d26b3ac238e3782`.
- `apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.repository.ts`: `4166f58070c5053f8eecaa9eecbd72031ec57af1b93c58aa998b1779068ca5eb`.
- `apps/ms-documentos/src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.repository.ts`: `6dab8560f772abc830725b1d1ce6328c7fbf93935fb21432b0442e20f45ca7b1`.
- `apps/ms-documentos/src/documentos/archivado/archivado-documental.service.ts`: `f592f21c8a7b2c0e1e5435c5dbb70b9c6b22d2da2efff7faec10ebb4cf5fa7a4`.
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.service.ts`: `5e38d245a65a2eccd6c85c65ebe1f793adbcebb515328ad90f8f3219d07d74db`.
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.spec.ts`: `ed7157ddeef4f4f0e7d2d757e699bc6b49a008fd78f53b9d351b5d899ded2836`.
- `apps/ms-documentos/src/documentos/archivado/archivado-op-regularizadores.integration.spec.ts`: `7733cc56db1c2648312f1c5218fc47e715d5ad4fe710b820eb2057a49a4bbcfe`.
- `apps/ms-documentos/src/documentos/archivado/archivado-nomenclatura.ts`: `6981eaea763e74cd11e3c06896ad6f9673dd80b82a86c86463012ce0addceadf`.
- `apps/ms-documentos/src/documentos/archivado/archivado-nomenclatura-propuesta.spec.ts`: `2a29dbce7cdaf4c04784ece4aecaa36f58bd86cc9c8a27af0bbf081b7931e23b`.
- `tests/r2-nas/archivado-domain.test.cjs`: `da4ea8f39bcaae4a1fcdfb6e790f11bee72ed3fadeb5dd19b98efd078dc81829`.

Terminal2.sh SHA256: `dcd8bbc93b913d520a7ecdce44f16f0151778d11acb94fcebc45c83b59e9680a`.

Checkpoint persistido y verificado: `/home/loxi1/bbti-evidence/r2-nas-g2-focal-integration-r1/checkpoints/nas-mvp-final-continuity-r1`,64 archivos SOURCE completos con SHA256 coincidentes, sin secretos/dependencias/builds. Incluye TERMINAL2.sh, logs, inventario y patch de referencia no aplicable automáticamente. Copia del manifest tomada antes de esta constancia final; contrato y comando de la adenda íntegros. CHECKPOINT=PASS.


## 2026-11-24 — BBTI_NAS_MVP_FINAL_NAMING_IMPLEMENTATION_R1

**PO_NAMING_APPROVAL=CONFIRMED. ENGINEERING_FINAL_NAMING=PASS_OFFLINE. MVP_PHYSICAL_ACCEPTANCE=PENDING.** Se ratifican expresamente sustentos OC/OS/OP, versiones documentales ya admitidas y OP inicial PDF/PNG/JPG. Las filas de propuestas pendientes de la adenda anterior quedan superadas solo para este alcance. Seguros/pólizas/subtipos nuevos están **EXCLUIDOS**, no pendientes de implementación ni habilitados por el concepto del gasto. Factura de seguro sigue FACTURA.

### Matriz definitiva operativa

Ruta común `documentos/AAAA/MM/EMPRESA/NOMBRE.ext`, sin CLIENTE ni IDs técnicos en el nombre definitivo. Conservar números validados sin padding inventado.

| Origen/tipo admitido | Nombre definitivo V1 | Periodo institucional |
|---|---|---|
| OC / OS | OC_NUMERO.pdf / OS_NUMERO.pdf | Emisión propia |
| Factura OC/OS | OC_NUMERO__FACTURA_SERIE-NUMERO_RUC.pdf; equivalente OS | Emisión factura |
| Guía OC/OS | OC_NUMERO__GUIA_SERIE-NUMERO_RUC.pdf; equivalente OS donde dominio admite | Factura vinculada |
| NI OC/OS | OC_NUMERO__NOTA_INGRESO_NUMERO.pdf; equivalente OS donde dominio admite | Factura vinculada |
| Transferencia OC/OS/OP | OC_NUMERO__TRANSFERENCIA_BANCO_OPERACION.pdf; equivalentes OS/OP | Factura vinculada para OC/OS; emisiónOP para OP |
| Detracción OC/OS/OP | OC_NUMERO__DETRACCION_BANCO_OPERACION.pdf; equivalentes OS/OP | Factura vinculada para OC/OS; emisiónOP para OP |
| OP inicial | OP_NUMERO.pdf / OP_NUMERO.png / OP_NUMERO.jpg | Emisión OP |
| Regularización Factura OP | OP_NUMERO__FACTURA_SERIE-NUMERO_RUC.pdf | Emisión OP |
| Regularización RH OP | OP_NUMERO__RH_SERIE-NUMERO_RUC.pdf | Emisión OP |
| Versiones ya admitidas | V1 sin sufijo; NOMBRE_BASE__V2.ext, __V3.ext, __Vn.ext | Referencia original, nunca fecha de carga |

### Integración efectiva

- ResolverNombreArchivado habilita las reglas aprobadas. Sustentos requieren banco y numeroOperacion explícitos, validados y persistidos; el puente lee `documento.metadata.validacionManual.metadata` o `documento.metadata.ocr.metadata`, nunca originalFilename, candidatoOCR crudo ni un numero genérico que pueda ser importe. Banco se normaliza tipográficamente a mayúsculas/espacios como `_`; el número conserva ceros y segmentos seguros. Datos ausentes/tipos no string/segmentos inseguros bloquean individualmente `IDENTIDAD_BANCARIA_INCOMPLETA`, manteniendo el archivo recuperable. `buildClaveDocumental` no cambia: conserva su identidad bancaria y contrato vigente.
- El puente consume relaciones activas grupo→principal→contenedor para OC/OS/OP. Sustentos OC/OS reutilizan el resolutor institucional de relaciones, extendiendo exclusivamente su operación interna `NUEVO_SUSTENTO` con la misma regla de factura vinculada; no se crea otro resolutor ni se usa reloj. OP conserva emisiónOP. Reserva/materialización canónica precede al commit; NAS utiliza la ruta persistida.
- Versiones: originalV1 único del mismo documento/empresa/cliente aporta periodo y, cuando existe, nombre semántico archivado. Se utiliza su ruta SQL aun cuando el objetoR2 original ya haya sido eliminado tras NAS. Se conserva nombre base, se sustituye un sufijo previo y se evita acumulación; versión/type/empresa/periodo incoherentes se bloquean. Si el original conserva clave técnica histórica, se mantiene esa clave y se deriva exclusivamente el nuevo nombre semántico desde identidad documental confirmada, sin copiar su nombre original técnico. No se renombra el legado. Solo el escritor de aceptación de versión ya existente invoca este flujo.
- Se detectó que el upload candidato de versión puede no traer expediente_id. Al aceptar, el puente completa exclusivamente el expediente del nuevo archivo desde el original autorizado mediante CAS en la misma transacción; contexto diferente se rechaza. No modifica el archivo original ni añade permisos/versionamientos al dominio. DestinosV2/V3 y reservas son distintos; PUT condicional, reserva permanente y exclusión impiden sobrescritura. No se toca el contrato inmutable0026.
- OP inicial: prepararOp→prepararCompras conserva MIME validado por las firmas institucionales, elige pdf/png/jpg y reserva antes de la promoción. Las regularizaciones Factura/RH permanecen PDF y conservan la corrección del expediente ya acreditada; no existe implementación SEGURO ni POLIZA. El nombre histórico resolverNombrePropuesto queda como alias compatible del resolver aprobado; ya no activa propuestas independientes.
- Materializador conserva ContentType real, rechaza discrepancia MIME/extensión antes de reservar/copiar y mantiene identidad/hash/tamaño, compensación, referencias y postcommit. No se falsean imágenes como PDF.
- Visor: la misma ruta NAS valida formato por firma del contenido y extensión de la reserva después de la lectura íntegra autorizada; respuesta PDF/PNG/JPG correcta. Controller y Gateway conservan contenido, nosniff, caché privada y ticket/controles actuales; Gateway solo admite esos MIME explícitos, sin convertir ni etiquetar todo comoPDF. No se cambia endpoint ni autorización. Este ajuste de headers hace necesario actualizar el artefacto Gateway en su operación ordinaria coordinada antes de aceptación de imágenes; **no se reinició ni activó aquí**.

### Protecciones conservadas

Factura/RH OP y markerNuevo Guía/NI intactos. Postcommit exacto único, sin Regularizar ahora como sustituto ordinario. R2_NAS_DEV_DYNAMIC_CONTEXTS=true y R2_NAS_DEV_DELETE_NEW_CONFIRMED=true, frontera568 y corte `2026-11-24T02:24:30Z` conservados. No listas por empresa/archivo nuevo, no reproceso de smokes anteriores. Archivos546/552/553 excluidos. DELETE sigue exigiendo identidad, ámbitoDEV, NAS/visor, auditoría durable, referencias, lease/CAS/exclusión, respuesta atribuida y HEAD posterior; incertidumbre no se transforma en eliminación acreditada. DELETE productivo deshabilitado. No se habilitó ni ejecutó rutina diaria nueva.

### Validación de este incremento

- **153 casos Jest únicos PASS**: 72 Documentos en5 suites focales de nombres/integración/materialización/runtime/regularizadoresOP; 74 en6 suites de regresión afectada (visor formatos, escritores, postcommit, previewNAS, OP inicial, periodo institucional); 7 Gateway en2 suites (formatos y lectura). Los pases finales21 de nombres/puente y4 de Gateway repiten casos existentes; no se suman otra vez.
- Se cubren transferencias/detracciones OC/OS/OP con metadata persistida, ausencia/tipo inválido de campos, claveDocumental preservada, V2/V3 y V1 no sobrescrita, periodo original, contexto de versión, OP PDF/PNG/JPG, firmas/MIME/extensión, materialización→commit→NAS y error sin falso éxito. Regularizadores Factura/RH OP continúan PASS con/sin expediente, rollback e idempotencia. Son ejecutores/storage simulados; no E2E físico.
- **65/65 Node PASS**: núcleo44 y dominio21; typecheck estrictoPASS. Primer pase rechazó dos expectativas históricas que aún trataban nombres recién aprobados como bloqueados y un fixtureTEMP sin version. Se adaptaron exclusivamente esas expectativas a la decisiónPO y se añadió version1 al fixture. Pase final `/tmp/bbti-archive-offline-LzEhmP/archivado/result.json` PASS.
- Builds finales **MS DocumentosPASS y GatewayPASS**, salidas aisladas `/tmp/bbti-nas-final-naming-r1-build/documentos/dist` y `/tmp/bbti-nas-final-naming-r1-build/gateway/dist`. Dist activos no sobrescritos. Sin nuevas dependencias, instalaciones ni migraciones.
- Logs: `/tmp/bbti-nas-naming-final-focused.log`, `/tmp/bbti-nas-naming-regression.log`, `/tmp/bbti-nas-naming-gateway-tests.log`, `/tmp/bbti-nas-naming-last-base.log`, `/tmp/bbti-nas-naming-gateway-last.log`, `/tmp/bbti-nas-naming-node-final.log`, `/tmp/bbti-nas-naming-docs-build.log`, `/tmp/bbti-nas-naming-gateway-build.log`. git diff --checkPASS. Bash syntax TERMINAL2.sh PASS, sin ejecutarlo.

### Activación y checkpoint

Se actualiza el checkpoint **existente** `/home/loxi1/bbti-evidence/r2-nas-g2-focal-integration-r1/checkpoints/nas-mvp-final-continuity-r1/`, conservando su revisión previa en history/before-final-naming-r1, sin otro candidato ni entorno. Incluye código completo actualizado, hashes, logs, patch de referencia no automático y el TERMINAL2.sh actualizado. No contiene credenciales,.env, dependencias ni builds.

Comando único preparado, **NO EJECUTADO**:

```bash
bash /home/loxi1/bbti-evidence/r2-nas-g2-focal-integration-r1/checkpoints/nas-mvp-final-continuity-r1/TERMINAL2.sh
```

Ese script comprueba Node24.16.0 y puerto3002 libre, compila SOURCE final y solo entonces arranca MS Documentos con flags conjuntos después de parsear.env. No utiliza un dist anterior ni inicia Gateway/otros roles. Conserva origenDEV, frontera568, corte original, secretos y proceso ordinario. MSE/PO coordina actualización de Gateway por el deltaMIME cuando corresponda; su build ya está acreditado. No hay reinicios automáticos ni ejecución de instrucciones por leer esta adenda.

PENDING_NAMING_DECISIONS=NONE dentro del alcance aprobado. Ausencia de banco/operación/identidad u original unívoco es incidencia individual recuperable, no autorización para inventarlos. Seguros/pólizas excluidos. MVP_PHYSICAL_ACCEPTANCE=PENDING con documentos nuevos. Sin PUT/COPY/DELETE reales, lecturas físicas de nuevos documentos, SQL operativo, recuperación/conciliación de smokes, commit/push, Enterprise, GHCR, EC2 ni producción.

Hashes SOURCE de esta intervención:

- `apps/ms-documentos/src/documentos/archivado/archivado-nomenclatura.ts`: `e16faec6c51b4cb8446f0864dceb8db645b3bd751de2dc53783b6dec9afcfbe3`.
- `apps/ms-documentos/src/documentos/archivado/archivado-documental.service.ts`: `0daf97fcf2797b004f09a748ce5057631e9f1b539d23c1d1f049ea062a9da3c3`.
- `apps/ms-documentos/src/documentos/archivado/archivado-materializacion.service.ts`: `840f1b4007c9e1e0204acc8de2e2bdc3af8fa368b39ecff74344101afd8e6e1d`.
- `apps/ms-documentos/src/documentos/archivado/archivado-materializacion.spec.ts`: `49f088cb5ffbc9abd60099fcf77d771340520abfa87acbed707dbfcc0d0583fe`.
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.service.ts`: `8b835b4cc40aa3c5844cbd8bce28285f336258fda6b0261ec74755c07309700b`.
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.spec.ts`: `2793bedb2f2fc201a1b93933a8647d3646adc24384e909795aa0f5289f59a454`.
- `apps/ms-documentos/src/documentos/archivado/archivado.controller.ts`: `e08776befb5007ced4a17d74c5b48a3dd59c402a27d57862592299f024757d1d`.
- `apps/ms-documentos/src/documentos/archivado/archivado-formats.spec.ts`: `fec841706c009e145a5f47312681640a3046b0fe7a7d47252958ccc9847c754c`.
- `apps/ms-documentos/src/documentos/archivado/archivado-nomenclatura-propuesta.spec.ts`: `4f5de31c5e9a1c8bae2b689aa1ed8a06d7f51fea9824196f1d3a5b175e716f95`.
- `apps/ms-documentos/src/documentos/archivado/archivado-final-naming.integration.spec.ts`: `c40285b1346c78917fc92033c195779e0977c393b18a96c490d75d8919da01c6`.
- `apps/ms-documentos/src/documentos/periodo-documental-r2.resolver.ts`: `43889ae12e573bc7827aae662b74e93e416df4584d3bfee5f18cb14ff0c1059d`.
- `apps/api-gateway/src/documentos/documentos.controller.ts`: `dae292fe0eb30146cd61638015e291d6df3ab5171a9b4483cc3014010189e04d`.
- `apps/api-gateway/src/documentos/documentos.archivado-formats.spec.ts`: `a8e99f4ce838f57a26b4b56240eaf25eac97ad4cb5690f8f9e302fa3aa4f79c9`.
- `tests/r2-nas/archivado-core.test.cjs`: `ef3e6fcfd688cad9143aae03bac8c9dafa0ab272ffd57eb8da1d28736cb775fc`.
- `tests/r2-nas/archivado-domain.test.cjs`: `028dc6f7adb2cb299b634594dc4ad82b45272a9c20e5b44070361855864c3c57`.

TERMINAL2.sh actualizado SHA256: `be25dbe2a43de2a38d88c05d31565779a4dbbbe0a7e6fc8713531c3443b21e62`.


## 2026-11-24 — BBTI_NAS_MVP_PHYSICAL_ACCEPTANCE_FOCAL_CORRECTION_R1

Continuación focal del checkpoint final de nombres. SOURCE canónico; un único incremento integrado, sin commit/push. **Tres causas corregidas para documentos nuevos; MVP_PHYSICAL_ACCEPTANCE=PENDING.** No se procesa, recupera, concilia ni modifica ningún smoke anterior. Gateway no modificado ni reconstruido en esta intervención; solo MS Documentos requiere futura actualización coordinada.

### Aceptación física aportada por PO, preservada sin repetición

Según confirmación física PO, NAS contiene exactamente las rutas siguientes y R2 DEV ya fue eliminado para esos cuatro documentos:

- documentos/2026/03/BBTEC/OS_000248.pdf
- documentos/2026/03/BBTEC/OS_000248__FACTURA_E001-1119_20541464264.pdf
- documentos/2026/01/BBTEC/OC_002968.pdf
- documentos/2026/03/BBTEC/OC_002968__FACTURA_FE01-59004_20508179031.pdf

OC_OS_ARCHIVING=PASS_PHYSICAL_PO; OC_OS_INVOICE_ARCHIVING=PASS_PHYSICAL_PO; R2_DELETE=PASS_PHYSICAL_PO. No se repitieron HEAD/GET ni se tocaron estos documentos. No se extrapola ese PASS a Guía/NI/sustentos/OP.

### A. Guía/NI: API real de conexión reservada

Causa acreditada PO y confirmada por código/driver real: postgres@3.4.9 reserve() expone unsafe/release, **no begin()**. La llamada session.begin provocaba TypeError; el mock anterior inventaba begin y ocultaba el error. Eliminada esa llamada y corregido el mock.

transaccionReservaDurable utiliza BEGIN, trabajo y COMMIT explícitos exclusivamente en la misma conexión previamente reservada. Acredita las etiquetas de respuesta BEGIN/COMMIT; un COMMIT que responde ROLLBACK no se toma como éxito. Error en BEGIN/trabajo/COMMIT ejecuta ROLLBACK en la misma conexión y acredita su respuesta. Nunca usa sql.begin global para la reserva independiente. El sql.begin funcional del orquestador permanece separado.

Se mantiene la adquisición antes de bloqueos de negocio, concurrencia acotada2, reserva durable sin FK no confirmada antes de COPY/PUT, supervivencia al rollback funcional y exclusión física. COPY no comienza si el commit durable falla o es incierto. El postcommit NAS solo se emite después del commit funcional.

Si ROLLBACK no puede acreditarse, se retiene la conexión y **no se llama release**: postgres3.4.9 no ofrece un destroy público individual en el objeto reservado. La instancia rechaza nuevas reservas independientes con503 ARCHIVADO_CONEXION_RETENIDA_REQUIERE_REVISION; no cierra el pool global, no mata backend ajeno ni reinicia servicios. Es una condición excepcional fail-closed que requiere revisión operativa si sucede realmente, no un fallo presente observado. Se prueban BEGIN/COMMIT/ROLLBACK fallidos y no liberación incierta.

Regresión real `tests/r2-nas/archivado-reserved-readonly.cjs`: postgres3.4.9 + Drizzle, sesiones default_transaction_read_only=on, SELECT únicamente para el trabajo. Acreditó reserved.beginABSENT, misma conexión/PID, COMMIT, rollback de error de aplicación, rollback tras errorSQL22012, canal independiente del rollback funcional y estado final idle observado por otra conexión. No INSERT de reservas, DML/DDL ni operaciones de almacenamiento. El pool del test es privado al proceso y se cierra al terminar; no es el pool del servicio activo.

Reproducción autorizada del test READ ONLY (no requisito de repetirlo):

```bash
BBTI_NAS_RESERVED_READONLY=1 BBTI_NAS_RESERVED_COMPILED=/tmp/bbti-nas-physical-correction-build/dist NODE_PATH="$PWD/apps/ms-documentos/node_modules" node tests/r2-nas/archivado-reserved-readonly.cjs
```

Grupo161, lectura DEV efectiva: principal184, documento569, tipoOC, numero002968, expediente6, BBTEC/cliente1, factura570. La resolución institucional del archivador es correcta; no se cambia ni se utiliza el principal513 sugerido por prevalidación. Los tests del orquestador real + puente/materializador reales con SQL/storage simulados producen OC_002968__GUIA_TG01-0030634_20508179031.pdf y OC_002968__NOTA_INGRESO_0000003257.pdf en marzo2026. No se reconfirman OCR549/551 ni archivo575.

### B. Sustentos: datos persistidos correctos, validación de caracteres demasiado estrecha

SELECT READ ONLY acreditó:

| Carga | Archivo/documento | Tipo/estado y relación | Banco/operación persistidos | Resultado previo |
|---|---|---|---|---|
|403|572/568|TRANSFERENCIA confirmado; grupo160, principalOS; origenFINANZAS_EDITAR_UPLOAD|documento.metadata.ocr.metadata.banco=BBVA; numeroOperacion=2,452-8|archivadoNuevo=true; IDENTIDAD_BANCARIA_INCOMPLETA; sin reserva|
|407|576/572|TRANSFERENCIA confirmado; grupo161, principalOC; mismo escritor|misma estructura, BBVA; numeroOperacion=2,453-0|mismo bloqueo; sin reserva|

No era una ausencia ni error de extracción: la estructura que lee el archivador es la efectivamente persistida. ClavesDocumentales acreditadas BBTEC|TRANSFERENCIA|BBVA|2,452-8 y BBTEC|TRANSFERENCIA|BBVA|2,453-0. Se conserva literalmente esa identidad. No se atribuye a importe/OCR sin evidencia, ni se usa filename o numero documental como fallback.

El validador del segmento operación excluía coma, aunque las operaciones estaban validadas/persistidas. Se admite coma literal entre segmentos alfanuméricos, conservando ceros y guiones; no se elimina ni sustituye para fabricar otra identidad. El patrón PO PRINCIPAL_NUMERO__TRANSFERENCIA/DETRACCION_BANCO_OPERACION.pdf no cambia. Se conserva banco/operación y buildClaveDocumental. Se rechazan espacios, traversal, comillas, barras, punto y coma, metacaracteres y datos ausentes. El adaptador SMB admite la misma coma segura como parte del filename sin shell ni separador de comandos; también corrige su antiguo filtroPDF-only para los formatosOP ya aprobados PNG/JPG.

Escritores OC/OS/OP usan el mismo puente de confirmación y la misma extracción bancaria persistida. Pruebas de los tres orígenes y ambos tipos con operación2,453-0 producen el destino correcto, periodo de factura para OC/OS y emisiónOP para OP, sin cambiar claveDocumental. No se recuperan cargas403/407 ni se modifican sus registros. Nombres que corresponderían con sus datos validados: OS_000248__TRANSFERENCIA_BBVA_2,452-8.pdf y OC_002968__TRANSFERENCIA_BBVA_2,453-0.pdf; no materializados aquí.

### C. OP: TEMP409 PNG rechazado por regla PDF-only

Lectura DEV: TEMP409 image/png, almacenada, documento574, archivoNULL, promovida_enNULL, integración incompleta; OP0000000185. Destino reservado documentos/2026/11/BBTEC/OP_0000000185.png. Reserva20 sin archivo/documento confirmados. Coinciden bucket, clave, hash, empresa, cliente e identidades de promoción/integración. Cero archivos referidos por carga409. La condición PDF-only explica el conflicto efectivo; no se detectó otra discrepancia en esos controles. No se reintenta la creación ni se cambia su numeración.

destination() reutiliza extensionArchivadoDesdeMime, admite exclusivamente pdf/png/jpg según MIME persistido, verifica namespace de empresa exacto, destino exacto e identidad no vacía y exacta. La prueba institucional de reserva sigue siendo acreditarDestino(), antes de validar y antes de I/O. Los destinos técnicos/históricos conservan sus reglas separadas. Las promociones efectivas simuladas PDF/PNG/JPG son idempotentes, sin otra copia; se rechazan MIME/extensión, empresa, reserva, identidad o extensión no admitida. SEGUROS sigue siendo concepto financiero válido, no se implementan pólizas ni tipo documentalSEGURO. Regularizadores Factura/RH conservan la corrección del expediente y su contratoPDF.

### Protección del próximo recorrido — propuesta, NO activada

Snapshot READ ONLY: MAX archivo577, MAX carga409, MAX reserva20. Reservas pendientes3/4/5/6/7/8/9/10/11/12/13/20; sin archivo definitivo10/11/12/13/20 (TEMP395/396/397/398/409). No se procesó ninguna. Algunas reservas son anteriores a la frontera568 y otras nacen de la aceptación descartada; un límite de archivo por sí solo no basta si después un TEMP viejo genera un archivo nuevo.

Se propone admisión **archivo>=578, carga>=410 cuando exista origen de carga y reserva>=21**. Se extiende el mecanismo existente de watermark de identidad, sin nueva tabla, motor, scheduler o lista por empresa/documento. El corte2026-11-24T02:24:30Z no cambia. La preparación semántica rechaza una carga anterior antes de reservar/copiar; el puente evita materializar archivos/cargas anteriores; el runtime evita reclamar reservas anteriores y revalida la carga real del archivo enSQL. Cargas ausentes legítimas de escritores directos conservan el filtro de archivo y reserva. Identidades de reserva permanente y relaciones multitenant intactas.

Configuraciones añadidas, **solo propuestas para la próxima autorización**:

- R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID=578
- R2_NAS_DEV_ACCEPTANCE_MIN_CARGA_ID=410
- R2_NAS_DEV_ACCEPTANCE_MIN_RESERVA_ID=21

El runtime activo conserva su configuración anterior568; no se escribió.env ni se activaron estos valores. MSE/PO debe aprobarlos y revalidarlos si hubo nuevas cargas tras el snapshot. No se recalculan silenciosamente al arrancar ni por documento. Contextos dinámicos, DELETE_DEV opt-in, exclusiones546/552/553, NAS/visor, integridad, referencias, auditoría, CAS, HEAD e incertidumbre preservados; DELETE productivo deshabilitado.

### Pruebas, artefactos y alcance

- **210 Jest únicos PASS**:46 en4 suites focales (corrección física/driver simulado, materialización, nombres/escritores bancarios y promoción semántica) +164 en5 suites de regresión afectada (TmpService, OP inicial, Factura/RH integración, runtime, orquestador). Pase final17 repite casos tras ajuste de excepción503, no se suma.
- **67 Node PASS**: núcleo44, adaptadores17, staging6; typecheck estrictoPASS. Evidencia `/tmp/bbti-archive-offline-WusQrG/archivado/result.json`. Sin procesos ni almacenamiento reales salvo subprocesos de pruebas.
- **Driver real READ ONLY PASS**: mismo canal y API real, BEGIN/COMMIT/ROLLBACK y estadoidle; log `/tmp/bbti-nas-reserved-driver-readonly.log`. No se confunde este test de conexión con inserción real de reservas ni E2E físico.
- Build final **MS DocumentosPASS** en `/tmp/bbti-nas-physical-correction-build/dist`, salida aislada sin sobrescribir dist activo. Gateway/Auth/Web/OCR no modificados ni reconstruidos.
- Logs `/tmp/bbti-nas-physical-focal-final.log`, `/tmp/bbti-nas-physical-regression.log`, `/tmp/bbti-nas-physical-final-admission.log`, `/tmp/bbti-nas-physical-node.log`, `/tmp/bbti-nas-physical-docs-build.log`, `/tmp/bbti-nas-physical-temp409-readonly.log`. Diagnóstico sanitizado `/tmp/bbti-nas-physical-diagnostic.json`; comandos READ ONLY preservados en checkpoint. git diff --checkPASS y bash-n TERMINAL2.shPASS.

### Comando exacto preparado — requiere aprobación MSE/PO de los límites

Se actualiza el checkpoint existente conservando su revisión previa bajo history/before-physical-correction-r1. TERMINAL2.sh exige los tres límites explícitos y no tiene nuevos valores por defecto; compila SOURCE con Node24.16.0, exige3002libre y aplica configuraciónDEV después de parseEnv. No modifica ni detiene ningún proceso. No es activación de la propuesta por generar el archivo.

**NO EJECUTADO; usar únicamente después de autorización MSE/PO:**

```bash
R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID=578 \
R2_NAS_DEV_ACCEPTANCE_MIN_CARGA_ID=410 \
R2_NAS_DEV_ACCEPTANCE_MIN_RESERVA_ID=21 \
bash /home/loxi1/bbti-evidence/r2-nas-g2-focal-integration-r1/checkpoints/nas-mvp-final-continuity-r1/TERMINAL2.sh
```

Solo MS Documentos afectado. No solicitar reinicioGateway por esta corrección. Aceptación física siguiente exclusivamente con documentos nuevos y ámbito aprobado; smokes descartados permanecen intactos. No nuevas nomenclaturas, gates, LAB, motores, PID, temporizadores, seguros/pólizas, migraciones, reservas reescritas, commit/push, Enterprise/GHCR/EC2 ni producción.

REAL_STORAGE_MUTATIONS=NO. REAL_SQL_MUTATIONS=NO (SELECT y control transaccional READ ONLY, cero DML/DDL). SERVICES_RESTARTED=NO. SOURCE_COMMIT_PUSH=NO. PRODUCTION=UNCHANGED. MVP_PHYSICAL_ACCEPTANCE=PENDING.

Hashes SOURCE focales:

- `apps/ms-documentos/src/documentos/archivado/archivado-materializacion.service.ts`: `cde002d28bd21ebb47cab28fcb9237b2f806c7e7dd018c536a9b52929697e701`.
- `apps/ms-documentos/src/documentos/archivado/archivado-materializacion.spec.ts`: `99f6da0a99a23ddc6c9ea0974ff630a44c1ed6b79ea23cf95bd68acd581d3c04`.
- `apps/ms-documentos/src/documentos/archivado/archivado-nomenclatura.ts`: `1b08c91333b5efc15deacc2fe29edfc1e4917f30e00f234a06274a1cc058f475`.
- `apps/ms-documentos/src/documentos/archivado/archivado-smb.adapter.ts`: `6d18067203546872e104ab9d61d750f13358de495003a5d9b950a4ea44bf821d`.
- `apps/ms-documentos/src/documentos/archivado/archivado-documental.service.ts`: `892359675f26a77514fe186fbf268ee4fabbedb895e393163baf89b909073f7f`.
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.service.ts`: `ad5d00b3df7e041dd5f37141208290e15e4fd156b3aceced0c383341eb25e16e`.
- `apps/ms-documentos/src/documentos/archivado/archivado-seguridad.ts`: `9559319292d040adc96469a9cbb6ec7c5fd834a66d1c4b4184520eaea068e1c6`.
- `apps/ms-documentos/src/documentos/archivado/archivado-physical-correction.spec.ts`: `9616a02a57f63771d0a56f854303ec5e813bf93a32067c8ae2c0c1fef07b9ec8`.
- `apps/ms-documentos/src/documentos/archivado/archivado-final-naming.integration.spec.ts`: `66e2a334263849c654d6e6c899bf0f5a3b44a79e63bf3adeab2e827a79132a10`.
- `apps/ms-documentos/src/documentos/tmp/tmp.service.ts`: `4670726ee6b112739d1ce6b312309d62212fbb6d1f9accae1631d7098b0c57b3`.
- `apps/ms-documentos/src/documentos/tmp/tmp-semantic-formats.spec.ts`: `06ac466d39abe1b7201dcf7648cd722e05219cee65987b4a51cc62828c8e0307`.
- `tests/r2-nas/archivado-reserved-readonly.cjs`: `a520a1f1d8638946a94bbe15c991b0fc913e23550cc2a4f5782af77559e55556`.

TERMINAL2.sh preparado SHA256: `155a9075912552072cfa41aa74d5a8b8667bb1f3a4160ce956ffaf9f03bcd6f4`.


---

## Cierre de ingenieria NAS y preparacion institucional SOURCE - 24/11/2026

ACTION=BBTI_NAS_INTEGRATED_RELEASE_SOURCE_PREPARATION_R1

MODE=NORMAL
GOVERNANCE=R1
MANUALS_BASE=R3_VIGENTES
RELEASE_MODEL=ONE_INTEGRATED_RELEASE

AUTHORITY=MSE_ACTUAL_EQUALS_MSE_2_0
AUTHORIZATION=SOURCE_RELEASE_PREPARATION

### Aceptacion funcional DEV

El PO confirma el cumplimiento del recorrido fisico pendiente:
documentos nuevos confirmados archivados automaticamente en NAS,
eliminacion correspondiente en R2 DEV y visualizacion desde
los modulos existentes, incluida Contabilidad.

ENGINEERING=CLOSED
ENGINEERING_REOPEN=NO
MVP_PHYSICAL_ACCEPTANCE=PASS_PO
PO_ACCEPTANCE=CONFIRMED
INSTITUTIONAL_HANDOFF=ACCEPTED

La presente aceptacion prevalece sobre el estado PENDING
de la accion de correccion focal precedente, sin alterar
su evidencia historica.

Se conserva la nomenclatura documental aprobada, resolucion
del periodo, identidad bancaria, formatos OP admitidos,
regularizacion Factura/RH, reserva durable, postcommit,
integridad, auditoria y visualizacion NAS.

La aceptacion corresponde a declaracion expresa del PO.
No constituye una nueva auditoria independiente SQL/R2/NAS.

### Evidencias tecnicas conservadas

- Build integral DEV anterior: 4/4 PASS.
- Build focal final ms-documentos: PASS.
- Pruebas focales y regresiones: 210 Jest PASS.
- Pruebas Node: 67 PASS.
- Driver PostgreSQL real 3.4.9: READ ONLY PASS, cero DML/DDL.
- Checkpoint final existente: 71/71 hashes PASS.
- Correspondencia checkpoint/SOURCE previa a esta adenda:
  71/71 PASS.
- Migracion 0026 y manifest.sha256: checksum coincidente.
- Revision focal de secretos: nueve coincidencias resueltas;
  siete subjects simulados y dos fixtures sinteticos.
- Manuales R3: integridad 10/10 PASS; consultados 00, 03 y 07.

No se repiten builds, pruebas, migraciones ni operaciones
fisicas para justificar este cierre documental.

### Identidad y composicion SOURCE

SOURCE_PATH=/home/loxi1/projects/apps/documental-platform
SOURCE_BRANCH=main
SOURCE_HEAD_BASE=18d0e1bd53d40da002872471924af41d001dd8bb
SOURCE_ORIGIN_MAIN=18d0e1bd53d40da002872471924af41d001dd8bb
SOURCE_REMOTE_MAIN_LAST_VERIFIED=18d0e1bd53d40da002872471924af41d001dd8bb
SOURCE_DIVERGENCE=0/0

Inventario previo a la presente edicion:

- Tracked modificados: 26.
- Untracked: 46.
- Staged: 0.
- Commits pendientes: 0.

La composicion publicable propuesta incluye el delta funcional
acumulado de SOURCE, sin limitarlo exclusivamente al archivador
NAS ni seleccionar parches aislados.

Commit funcional propuesto: 70 archivos.
Commit documental propuesto: 2 archivos.
Total publicable propuesto: 72 archivos.

FUNCTIONAL_SCOPE_SHA256=141941aec973f7dc198418bb9faa3c1948fdd2c5d2192b3e68a1b03fb1430b22

#### Inventario funcional explicito

- `apps/api-gateway/src/documentos/documentos.archivado-formats.spec.ts`
- `apps/api-gateway/src/documentos/documentos.archivado-read.spec.ts`
- `apps/api-gateway/src/documentos/documentos.controller.ts`
- `apps/ms-documentos/src/documental-v2/documental-v2.module.ts`
- `apps/ms-documentos/src/documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase.ts`
- `apps/ms-documentos/src/documental-v2/use-cases/regularizar-obligacion-op-factura.usecase.ts`
- `apps/ms-documentos/src/documental-v2/use-cases/regularizar-obligacion-op-recibo-honorario.usecase.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-configuracion.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-configuracion.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-core.module.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-core.module.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-documental.service.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-exclusion.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-final-naming.integration.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-formats.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-materializacion.service.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-materializacion.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-move.service.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-nomenclatura-propuesta.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-nomenclatura.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-op-regularizadores.integration.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-physical-correction.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-postcommit.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-postcommit.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-preview-token.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-r2.adapter.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-real-writers.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.service.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-runtime.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-seguridad.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-smb.adapter.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado-writers.spec.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado.controller.ts`
- `apps/ms-documentos/src/documentos/archivado/archivado.repository.ts`
- `apps/ms-documentos/src/documentos/carga-segura/carga-segura-storage.module.ts`
- `apps/ms-documentos/src/documentos/carga-segura/carga-segura.persistence.ts`
- `apps/ms-documentos/src/documentos/carga-segura/carga-segura.storage.ts`
- `apps/ms-documentos/src/documentos/documentos-preview.nas-contract.spec.ts`
- `apps/ms-documentos/src/documentos/documentos-preview.service.ts`
- `apps/ms-documentos/src/documentos/documentos-upload.archivado.spec.ts`
- `apps/ms-documentos/src/documentos/documentos-upload.service.spec.ts`
- `apps/ms-documentos/src/documentos/documentos-upload.service.ts`
- `apps/ms-documentos/src/documentos/documentos.controller.ts`
- `apps/ms-documentos/src/documentos/documentos.module.ts`
- `apps/ms-documentos/src/documentos/documentos.repository.ts`
- `apps/ms-documentos/src/documentos/documentos.service.ts`
- `apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.repository.ts`
- `apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.service.ts`
- `apps/ms-documentos/src/documentos/orden-pago/orden-pago-archivo.repository.ts`
- `apps/ms-documentos/src/documentos/orden-pago/orden-pago-archivo.service.ts`
- `apps/ms-documentos/src/documentos/orden-pago/orden-pago-fecha-emision.ts`
- `apps/ms-documentos/src/documentos/periodo-documental-r2.resolver.ts`
- `apps/ms-documentos/src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.repository.ts`
- `apps/ms-documentos/src/documentos/recibo-honorario-temp/recibo-honorario-temp-materialization.service.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp-semantic-formats.spec.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.service.ts`
- `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx`
- `apps/web-admin/src/components/documentos/ArchivadoResumen.tsx`
- `infra/postgres/migrations/0026_archivados_documentales.sql`
- `infra/postgres/migrations/manifest.sha256`
- `tests/r2-nas/archivado-adapters.test.cjs`
- `tests/r2-nas/archivado-core.test.cjs`
- `tests/r2-nas/archivado-domain.test.cjs`
- `tests/r2-nas/archivado-exclusion.test.cjs`
- `tests/r2-nas/archivado-move.test.cjs`
- `tests/r2-nas/archivado-postgres-readonly.cjs`
- `tests/r2-nas/archivado-preview.test.cjs`
- `tests/r2-nas/archivado-reserved-readonly.cjs`
- `tests/r2-nas/archivado-staging.test.cjs`
- `tests/r2-nas/verify-offline.cjs`

#### Inventario documental explicito

- `docs/31-governance/RELEASE_MANIFEST.md`
- `docs/31-governance/BRANCH_INVENTORY.md`

#### Exclusiones

- `apps/ms-documentos/scripts/recuperar-nas-554-555.cjs`

El script de recuperacion historica se conserva localmente.
No forma parte de la composicion publicable propuesta.

Se excluyen credenciales reales, configuraciones privadas,
archivos de entorno, evidencias externas y artefactos
generados no correspondientes al repositorio.

El checkpoint se conserva intacto como evidencia de la
implementacion aceptada. La presente adenda y la actualizacion
del inventario de ramas son cambios documentales posteriores;
no se exige igualdad del manifest actualizado con su copia
historica del checkpoint.

### Promocion institucional pendiente

Propuesta de commit funcional:

feat(documental): integra archivado documental R2-NAS y continuidad multiarea

Propuesta de commit documental:

docs(governance): registra aceptacion PO y cierre integrado R2-NAS

Ambos commits pertenecen a un unico release integrado.

SOURCE_COMMIT_AUTHORIZATION=PENDING
SOURCE_PUSH_AUTHORIZATION=PENDING
SOURCE_COMMIT_EXECUTED=NO
SOURCE_PUSH_EXECUTED=NO

ENTERPRISE=HOLD
GHCR=HOLD
EC2=HOLD

Se reserva para la preparacion productiva la acreditacion
del destino NAS definitivo, conectividad SMB desde EC2,
credenciales protegidas, diferenciacion R2 DEV/PROD,
ledger real RDS y autorizacion especifica de DELETE productivo.

No trasladar automaticamente los limites de aceptacion DEV
a produccion. No intervenir documentos historicos.

No se acredita un nuevo release publicado ni desplegado.
No se modifica la identidad funcional de releases anteriores.

NEXT_ACTION=MSE_ACTUAL_SOURCE_COMMIT_PUSH_AUTHORIZATION

---

## 2026-11-24 — NAS integrated release: focal SMB runtime packaging R1

- Action: BBTI_NAS_INTEGRATED_RELEASE_ENTERPRISE_PROMOTION_R1.
- Governance: R1 / NORMAL / ONE_INTEGRATED_RELEASE.
- Authority: MSE Actual, conditional focal SOURCE packaging delta authorized.
- Accepted SOURCE base: `79e133ae7c4ccbf78dfc322236f18e096be81144`.
- Packaging functional commit: `f013c786f26d570627ce1067176a2b0068793bb4`.
- Previous NAS engineering and physical DEV acceptance remain CLOSED_PASS / PASS_PO.
- EC2 host NAS production SMB operations remain CLOSED_PASS.
- Finding: the NAS adapter invokes smbclient, but the institutional Nest runtime Dockerfile did not install it.
- Scope: deployment/docker/Dockerfile.nest only.
- Runtime base: node:22-alpine.
- Package: samba-client, installed exclusively for APP_PATH=apps/ms-documentos.
- Build-time verification: command -v smbclient and smbclient --version in the final runtime stage.
- No functional contract, OCR, database, NATS, authentication or document naming changes.
- No additional SMB package installation for ms-auth or api-gateway.
- Local structural validation and Git diff checks: PASS.
- Final image build and SMB dependency accreditation: pending institutional GHCR integral publication.
- DEV functional acceptance is preserved; no repetition required.
- Migration 0026 remains pending production ledger READ_ONLY verification.
- NAS production root: PLATAFORMA_DOCUMENTAL.
- NAS backup and restore: not accredited; Hyper Backup deferred by PO.
- EC2 deployment, production archiver activation and production R2 DELETE remain HOLD.
- Excluded local recovery script preserved and not published.
- No independent image release, auxiliary container or Codex execution.


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
### Imágenes inmutables vigentes

Namespace: `ghcr.io/bbti-sac/documental-platform-bbti-prod/<servicio>`.

| Servicio | OCI index | Ejecutable linux/amd64 |
| --- | --- | --- |
| api-gateway | `sha256:81579a4ce6157cddd67f6dcd5811dd7ffc214e530764e72f76bdeaa64b04dbe9` | `sha256:1dcc1810f61d78318dd9a92b3f4083c2b26ddb7a1da319a93f1ef49dfa984187` |
| ms-auth | `sha256:19529fa7433e81b72c1ddabfb082fc9e26d14a00dce768e00d8ed7bfd120b6f5` | `sha256:0848bd43ccdeabe31866ffa77ae1928d9526cf09ed7f3f62750733535137a829` |
| ms-documentos | `sha256:1eb95530bdfe60961984d0c2add522ac76c05cb49c398a249cf9be460340747b` | `sha256:b72845bd70422941b5e6d65bcb8fb4e9424b950bc2d340b5238ecee210d4c457` |
| web-admin | `sha256:81d22949bd6180fab92a08165936f4f10557cd28cb4cc307405dd38591c869f7` | `sha256:7a4950ca6c1a263a70246db23cfa76d41ae11f17c64ff356669e5a7b91faaf49` |

Evidencias locales existentes: `/home/loxi1/bbti-evidence/nas-preview-csp-r1-45508868647/ghcr-canonical-digests.json` y `final-release-readiness.txt`. Se reutilizan; no consulta GHCR nueva ni reconstrucción.
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
### Contrato documental y nomenclatura vigente

Ruta común definitiva: `documentos/YYYY/MM/EMPRESA/NOMBRE.ext`, sin segmento CLIENTE. Resolver periodo, empresa y nomenclatura una sola vez desde el dominio y PostgreSQL; nunca fecha del servidor como fallback contable. Nuevos documentos materializados en R2 con ruta definitiva antes del commit final cuando su identidad se conoce al confirmar; reserva durable y compensaciones/exclusión existentes. Archivado postcommit recibe la ruta persistida y la conserva en NAS, sin recalcular periodo ni nombre. Históricos conservan su clave R2; regularización histórica masiva diferida. La compatibilidad histórica de nombre NAS no autoriza renombrar R2 ni es el camino ordinario nuevo.

| Variante aprobada | Nombre definitivo |
| --- | --- |
| OC / OS | `OC_NUMERO.pdf` / `OS_NUMERO.pdf` |
| Factura vinculada | `OC_NUMERO__FACTURA_SERIE-NUMERO_RUC.pdf` (principal OS u OP según dominio) |
| Guía OC/OS | `OC_NUMERO__GUIA_SERIE-NUMERO_RUC.pdf` (también OS) |
| NI OC/OS | `OC_NUMERO__NOTA_INGRESO_NUMERO.pdf` (también OS) |
| Orden de pago | `OP_NUMERO.pdf`, `.png` o `.jpg` según MIME admitido |
| RH de OP | `OP_NUMERO__RH_SERIE-NUMERO_RUC.pdf` |
| Sustento de transferencia OC/OS/OP | `OC_NUMERO__TRANSFERENCIA_BANCO_OPERACION.pdf` (también OS/OP) |
| Sustento de detracción OC/OS/OP | `OC_NUMERO__DETRACCION_BANCO_OPERACION.pdf` (también OS/OP) |
| Versiones existentes del dominio | V1 sin sufijo; V2/V3 conservan base autorizada y `__V2.ext` / `__V3.ext`; formatos admitidos PDF/PNG/JPEG según contrato |

Se conservan ceros y validación estricta de segmentos; no inventar variantes ni numeraciones. Banco normalizado y operación del dominio, no nombre original. Autoridad implementada: `apps/ms-documentos/src/documentos/archivado/archivado-nomenclatura.ts`.
Periodo ya vigente: OC/OS por emisión propia; factura OC/OS por factura; Guía/NI/sustento OC/OS por factura vinculada; OP y asociados por emisión OP; versiones conservan periodo original. No rediseñar el resolutor.

Confirmación → reserva/asociación durable → postcommit → copia R2 a staging NAS → publicación sin reemplazo → verificación de identidad/tamaño/SHA256 → disponibilidad NAS y auditoría → selección de proveedor del visor. Lease/CAS no cancela operaciones externas enviadas; preservar exclusión física, reserva permanente y reconciliación. Regularización ordinaria/manual/diaria reutiliza el mismo servicio; no crear otro scheduler. TEMP, OCR persistido, borrador y confirmación mantienen su contrato; recuperar no relanza OCR.
### Seguridad, retención y recuperación

`PRODUCTION_R2_DELETE=DISABLED_BY_DESIGN`; `DEV_ONLY_DELETE_RESTRICTION=PRESERVED`; `PRODUCTION_R2_RETENTION=ACTIVE`. El código exige NODE_ENV=development, destino SYNOLOGY_DEV, autorización exacta y demás controles; cambiar solo una variable no habilita DELETE productivo. La permanencia en R2 de Factura/Guía/NI OC003214 y facturaOS000262 citadas arriba es esperada y no invalida NAS ni visor.

`NAS_BACKUP_RESTORE=NOT_ACCREDITED`. Hyper Backup y Snapshot Replication diferidos a consulta PO. Synology BASIC/BTRFS sin redundancia acreditada; BTRFS no es backup. Cuota técnica compartida de 500 GiB. Usuario SMB `documental_platform_dev` compartido entre DEV/PROD: separación por raíces/destino/configuración, no credenciales independientes.
DEV: `GESTION-DOCUMENTARIA/_DEV_DOCUMENTAL_PLATFORM`; PROD: `GESTION-DOCUMENTARIA/PLATAFORMA_DOCUMENTAL`. VPN/OpenVPN y SMB existentes preservados.

RDS snapshot automático aceptado: `rds:database-1-2026-11-24-08-42`; sin snapshot manual adicional; restore no probado. Respaldo RDS no protege archivos NAS. Cualquier futura eliminación productiva exige autorización independiente, protección NAS, revisión del bloqueo de código, integridad y auditoría; no está autorizada por este cierre.

Rollback de aplicación condicionado a compatibilidad de 0025/0026, authVersion global, JWT contextual, contraseñas actuales y auditoría; no reducir auth_version, no revivir JWT ni restaurar Auth legacy incompatible. No restaurar RDS ni borrar reservas/archivos como rollback automático. Preservar evidencia e imágenes anteriores; si no existe destino acreditado compatible, STOP y decisión PO/roll-forward.
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
### Visor NAS y CSP corregidos

Incidencia histórica `NS_ERROR_CSP_FRAME_ANCESTOR_VIOLATION`: la excepción Gateway anterior solo operaba en development. SOURCE `4776f2e907e64e3eaaacf5d6cff2874a907a3785` corrigió `apps/api-gateway/src/documentos/documentos.controller.ts` y `documentos.archivado-csp.spec.ts`; equivalencia Enterprise 2/2 blobs y modos PASS. Pruebas13/13 y build Gateway PASS_REPORTED, no repetidos.
Solo en preview NAS exitoso `/api/v1/documentos/archivado/preview/:archivoId`, tras validar MIME PDF/PNG/JPEG y con CSP existente, production sustituye exclusivamente `frame-ancestors https://bbtecnologia.com` y retira X-Frame-Options en esa respuesta. Otras directivas/rutas mantienen seguridad. DEV conserva `'self' http://localhost:3005`. No derivar autorización de Origin, Referer ni R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS; sin comodines. Tickets firmados, expiración, autorización contextual y aislamiento preservados.
No se capturaron en esta intervención cabeceras productivas HTTP200; el cierre funcional del navegador es PASS_PO. Un401 sin ticket conserva protecciones y no representa la respuesta autorizada del visor.
### Migraciones cerradas y regla vigente de ejecución

0025 auth_version aplicada y preservada. 0026 `infra/postgres/migrations/0026_archivados_documentales.sql`, SHA256 `609bb06532b8bcc745a0caff695bd60e20eb98079e33436b542c9aae0343aae6`, aplicada DEV/PROD. RDS 24/11: ejecución ENTERPRISE_LOCAL, ledger 0→1, tabla documentos.archivados_documentales, owner document_platform, cuatro índices y dos triggers acreditados; CREATE temporal revocado. `RDS_MIGRATION_0026=CLOSED_PASS`, esquema PASS y seguridad restaurada PASS (evidencia heredada, no SQL nuevo).
Precedencia sobre recetas históricas que mandan ejecutar desde EC2: runner institucional `@documental/database`, DEV exclusivamente desde SOURCE local y PROD exclusivamente desde Enterprise local, con autorización DB_WRITE específica, checksum, transacción, advisory lock y ledger. EC2 no es origen de ejecución de migraciones. No repetir 0025/0026 ni editar SQL aplicado/manifest.sha256/ledger. GIS/gis_db excluidos. La publicación documental no ejecuta migraciones.
### Continuidad institucional y siguiente acción legítima

PO conserva autorización y aceptación. MSE Actual/MSE 2.0: arquitectura, gobierno de release/manuales/Bibliotecario; MSE 3.0: dirección técnica; MSE 3.1: operación DEV y ejecución delegada; Codex ejecutor. Máximo cuatro gates: G1/G2/G3 cerrados; esta actualización pertenece a G4 y no crea G5.
Documentos versionados gobiernan; colección externa permanente `BBTI_MANUALES_2026-11-18_R3`, revisión 25/11/2026, subordinada. Antecedentes19/11/24/11 no son tareas actuales. No reabrir Factura TEMP, custodias de los 48 archivos, SMB/VPN, migración 0026, ingeniería NAS ni aceptación transversal. No extender PASS_PO a otros requerimientos independientes.

Esta revisión es documental local: commit/push SOURCE y Enterprise pendientes de autorización específica. Historial Enterprise propio preservado; no copiar manifest/inventario completo desde SOURCE. Procedencia funcional SOURCE `4776f2e907e64e3eaaacf5d6cff2874a907a3785`; el futuro SHA documental SOURCE se registrará externamente al publicarlo, sin autorreferencias imposibles. EC2 sync=PENDING hasta autorización/acceso y ejecución docs-only fast-forward; sin pull de imágenes ni recreate.
Paquete Bibliotecario y legado en `/home/loxi1/bbti-evidence/nas-institutional-closure-20261125-r1/`; transferencia/indexación=PENDING_MSE_ACTUAL_VALIDATION. No crear R4. Próximo paso: revisión MSE Actual/PO del diff y autorización focal publicación SOURCE→Enterprise→sync documentalEC2. Futuro DELETE productivo y respaldo NAS son decisiones separadas, no ejecutar en este cierre.
### Base de evidencia de esta revisión

Mandato PO/MSE 3.1 `BBTI_NAS_INSTITUTIONAL_DOCUMENTARY_CLOSURE_R1`,25/11/2026; copia sanitizada y validaciones en `/home/loxi1/bbti-evidence/nas-institutional-closure-20261125-r1/`.
ZIPbase `BBTI_BASE_DOCUMENTAL_CIERRE_20261125_R1.zip`, SHA256 `09fd87a4de4fb2035a8184bf75ced9ec2b674bbae799c98c0f264fa570367967`: 19SOURCE+19Enterprise+10manuales+SHA256SUMS,49entradas verificados antes de editar. Hechosproductivos/PO heredados del mandato; identidadeslocales y bytes documentales observados en esta intervención. No nueva auditoría runtime ni prueba funcional.


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
