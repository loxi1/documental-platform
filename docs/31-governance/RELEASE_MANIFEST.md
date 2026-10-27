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
