# Inventario SOURCE y Enterprise

## Continuidad Git reconciliada — 11/11/2026

Acción `MSI_CODEX_GIT_MANIFEST_CONTINUITY_RECONCILIATION_R4`. Fecha del cliente America/Lima. Esta sección prevalece sobre las instantáneas inferiores; sus textos se conservan como antecedentes. Inventario de lectura y edición documental local exclusivamente: sin commits, stage, push, cambios de ramas, integraciones ni promoción.

### Referencias actuales y protección

| Identidad | Estado acreditado |
| --- | --- |
| SOURCE main local y remoto consultado | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5`, COMMITTED_AND_PUSHED |
| SOURCE checkout principal | `fix/bbti-finanzas-op-periodo-documental-r1`, HEAD `034a1abc7af9b4fe1a107dbe72ad3893e1f47992`; 40 unstaged + 8 untracked, índice vacío |
| Respaldo SOURCE local y remoto | `backup/source-pending-p3-release-20261103` → `034a1abc7af9b4fe1a107dbe72ad3893e1f47992`, preservado |
| Enterprise main local/remoto y checkout principal | `f80d05e80b522c18ab20751a7e18a9e6f626984c`, limpio antes de estas tres ediciones documentales |
| Base de edición SOURCE existente | `/home/loxi1/projects/apps/documental-platform-almacen-filter-r1`, rama `fix/almacen-bandeja-double-filter-r1`, HEAD igual a main; limpio antes de estas tres ediciones; no se cambió de rama |
| Ancestro SOURCE activo / SOURCE main | `d7c89d53be79a423ee51507b968a462d675b8def`; 7 commits exclusivos de respaldo, sin reintegración automática |
| Ancestro común acreditado SOURCE main / Enterprise main | `9e166aa69a268c6aec0deb64d2cc89e456ae2c9e`; incorporación de producto por contenido, no igualdad de commits |

Los 54 worktrees registrados se identificaron por metadatos y existencia; se leyeron HEAD/estado de todos los presentes. Los registros ausentes marcados prunable **no se eliminaron** y no acreditan conservación de sus antiguos cambios sin commit. No son checkouts activos desconocidos. Todo registro y referencia queda protegido.

De las 48 entradas del SOURCE principal: 41 contenidos no secretos coinciden con main; 4 son versiones anteriores de archivos actualizados por el producto validado; dos son .bak excluidos y una es configuración privada inspeccionada solo por metadatos. Esto no permite borrar el dirty ni tratar los siete commits de respaldo como siete cambios nuevos de producto. Comparación por historia y por contenido son controles distintos.

Archivos de la captura antigua que difieren del producto main actual:

- `apps/ms-documentos/src/documentos/tmp/tmp.service.ts`
- `apps/ms-documentos/src/expedientes/expedientes.controller.ts`
- `apps/ms-documentos/src/expedientes/expedientes.repository.ts`
- `apps/ms-documentos/src/expedientes/expedientes.service.ts`

### UX Compras OC/OS y Subir Facturas — integración acreditada

Complemento `MSI_CODEX_R4_UX_DOCUMENTATION_COMPLETION_R1`, autorizado por PO. La verificación focal `CODEX_R4_UX_CONTINUITY_REPORT` acreditó estos cambios en código; no existe trabajo funcional pendiente de reintegración para este alcance:

| Integración | Commit |
| --- | --- |
| SOURCE producto, ya incluido en main | `1ebdbf4f82ec3cae84b6a6caafc979353af2172a` |
| Enterprise producto, ya incluido en main | `7323e1b0ae62584c08714d06ab5bbf6bbd036292` |

Archivos: `apps/web-admin/src/components/compras/NuevoExpedienteWizard.tsx`, `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx` y `apps/web-admin/src/components/ocr/OcrValidationModal.tsx`. La revisión R3 comprobó igualdad byte a byte entre candidato, SOURCE main y Enterprise para estos tres componentes. No se repitió esa revisión funcional ni se ejecutaron pruebas en este complemento documental.

Alcance integrado: terminología visible de carga OC/OS y simplificación de acciones del modal de Compras para OC, OS y FACTURA. `accionesComprasSimplificadas` oculta Rechazar OCR y Guardar cambios en ese contexto. Cancelar y X son cierres visuales; Guardar y confirmar es la acción de persistencia/confirmación. Ocultar creación manual solo contrae ese formulario, no un modal OCR. Comportamiento y excepciones de modo: [Manual operativo](../29-operations-manual/README.md).

Esta integración UX no es Mi Perfil ni G2-B, que conservan sus estados independientes. El código integra el producto de 26 archivos publicado mediante GHCR #34 y registrado en el manifest Enterprise `f80d05e8`; la publicación de imágenes no acredita un despliegue productivo posterior al MVP aceptado. No se modifica ese manifest histórico ni se añaden cambios posteriores a sus digests.

### Estados que no deben confundirse

- **ACCEPTED / DEPLOYED histórico:** MVP aceptado por PO el 05/11/2026, SOURCE funcional `88edc03136a446308d8b18fa778bdccf6c002be3`, Enterprise funcional `a57c328cbf62de39aa91ed541ae32b449927a5b6`. Aceptación documental SOURCE `aef47ca8c307449d2d985128196c297102e80a4d` / Enterprise `dcf14470e80519d3a6f1114180a4652a27de4017`. No se revalidó EC2 en R4; es el último despliegue aceptado acreditado localmente.
- **BUILT_NOT_DEPLOYED:** release Enterprise manifest `f80d05e80b522c18ab20751a7e18a9e6f626984c`, producto SOURCE `1ebdbf4f82ec3cae84b6a6caafc979353af2172a` → Enterprise `7323e1b0ae62584c08714d06ab5bbf6bbd036292`, build `2ed7dd0f2e73b58d6d595606af56b8477e9496e8`. Actions#34/run42401171156: SUCCESS, comprobado por API de lectura en R4, fecha 07/11/2026. No prueba despliegue.
- **POST_RELEASE_SOURCE_CHANGES:** `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` del 09/11/2026, Almacén, único commit main posterior a la referencia SOURCE `5efcb743...` vigente al publicar GHCR. Enterprise no tiene commits posteriores a f80d05e8. No añadir 89cd4c6e a los digests existentes.
- **IMPLEMENTED_NOT_INTEGRATED:** Mi Perfil UX en el candidato local; G2-B en una exportación sin .git. No forman parte del release GHCR.
- **PARTIAL_HOLD:** P3/R3, PRE_PUT todavía no cerrado funcionalmente.

### Commits posteriores al cierre de aceptación del MVP

El rango se fija en los commits documentales de aceptación del 05/11; no confundir los commits de preflight previos con cambios posteriores al despliegue.

SOURCE `aef47ca8..main`:

```text
65492bb0a6f2b70bf62b28b54677ba0ad273592d docs: update post-MVP successor continuity for NAS preparation
1ebdbf4f82ec3cae84b6a6caafc979353af2172a fix: integrate LAB-validated OCR supplier and Compras Almacen periods
ae478918e4ae7241a2944c2c776a9e486d807648 feat(dev): isolate Auth NATS namespace with unchanged auth default
5efcb743245f38662cb3e4960ee91ad6a7ab2232 docs: record LAB3005 product integration and separate DEV support
89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5 fix(almacen): remove redundant frontend search filtering
```

Enterprise `dcf14470..main`:

```text
44340e491f9b68952978320c30bf2227000fb6bc docs: update post-MVP successor continuity for NAS preparation
7323e1b0ae62584c08714d06ab5bbf6bbd036292 fix: integrate SOURCE LAB-validated OCR and Compras Almacen product
562387e042ee9e7a3d824dd9ecfe0ec079520296 docs: record selective SOURCE product integration into Enterprise
2ed7dd0f2e73b58d6d595606af56b8477e9496e8 ci: prepare selective Documentos Web publication and preflight manifest
f80d05e80b522c18ab20751a7e18a9e6f626984c docs: bind verified Documentos Web GHCR digests and production preflight
```

Siete commits exclusivos de la rama protegida, respecto de SOURCE main:

```text
cdf11b3f88c5ecec88c4023c1905334a02a49751 backup(p3): preserve secure upload recovery and fencing work
3ffb528bd20b90a5f128c1f8f3a4831f6905cca8 backup(temp): preserve invoice RH and document recovery work
3071cfe622e49734bce5c0c7ee2ef1e7030a3105 backup(periodos): preserve documental period and warehouse work
b818fe58e52ac38d6531abc1aba2bafa56496ce5 backup(compras): preserve temporary upload and recovery work
33ef483d0feb728b0794e6454cffce4875bdece1 backup(finanzas): preserve payment support and recovery work
d1454ac11323dd98236e5fdd8b9db4f01ddbae3f backup(core): preserve transversal documental contracts and tests
034a1abc7af9b4fe1a107dbe72ad3893e1f47992 backup(aux): preserve infrastructure and R2 diagnostic utilities
```

### Ramas: historia, publicación y conservación

`exclusivos` es el número de commits fuera de main por ascendencia, no una afirmación de cambios funcionales faltantes. `no publicados` cuenta commits no alcanzables desde ninguna rama anunciada por el servidor. COMMITTED_AND_PUSHED puede significar publicado mediante main u otra rama; no implica que la rama local del mismo nombre exista en el servidor. El estado origin/* local no se actualizó mediante fetch.

#### SOURCE

| Rama | HEAD | Exclusivos main | Merge-base main | No publicados | Publicación | Upstream local |
| --- | --- | ---: | --- | ---: | --- | --- |
| `backup/pre-2-1C-178cf9db` | `178cf9db6bb1c337c8cc6551c648b1d5cd107e50` | 0 | `178cf9db6bb1c337c8cc6551c648b1d5cd107e50` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `backup/regularizacion-2-1C-0f5117fc` | `0f5117fcaf27de77d1cfb14ff71fef1c40f4da88` | 3 | `4217af700419692f6ffd01d6ff72beae6b5da623` | 3 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `backup/source-pending-p3-release-20261103` | `034a1abc7af9b4fe1a107dbe72ad3893e1f47992` | 7 | `d7c89d53be79a423ee51507b968a462d675b8def` | 0 | COMMITTED_AND_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `origin/backup/source-pending-p3-release-20261103` |
| `chore/documental-v2-preparacion-activacion-2-1C` | `303b8afded8c5634dbd1f0d1a58b93893b2fc295` | 0 | `303b8afded8c5634dbd1f0d1a58b93893b2fc295` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `chore/estabiliza-docker-puertos-post-mvp` | `6cb2ae5131d3a24966f38e6184795c56e51c5455` | 0 | `6cb2ae5131d3a24966f38e6184795c56e51c5455` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/chore/estabiliza-docker-puertos-post-mvp` |
| `chore/tech-workspace-resolution-diagnostico-2-1C` | `303b8afded8c5634dbd1f0d1a58b93893b2fc295` | 0 | `303b8afded8c5634dbd1f0d1a58b93893b2fc295` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `demo/frontend-final-2-1C` | `48e2335305ea5978e75246ee96649a0e79c57d2c` | 0 | `48e2335305ea5978e75246ee96649a0e79c57d2c` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/demo/frontend-final-2-1C` |
| `demo/local-flujo-documental-2-1C` | `d8297bac0dcec49ea0758c1d10b8e1e99a8bb923` | 0 | `d8297bac0dcec49ea0758c1d10b8e1e99a8bb923` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `docs/continuidad-mvp-upload-erp` | `87392d29793f7d7031d0804a7d19af09f7da3dc7` | 1 | `9e166aa69a268c6aec0deb64d2cc89e456ae2c9e` | 0 | COMMITTED_AND_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `origin/docs/continuidad-mvp-upload-erp` |
| `docs/source-development-release-standard-r1` | `189f22ff8e51791584bcf421c83c4db7ac950132` | 0 | `189f22ff8e51791584bcf421c83c4db7ac950132` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `docs/sprint-2-1B-contrato-tecnico` | `15b00c5c48352db36b671faab474d4469f33f81b` | 1 | `ffc6ca62b66e391f0e175e0d72a146ff6a30e2f2` | 0 | COMMITTED_AND_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `origin/docs/sprint-2-1B-contrato-tecnico` |
| `docs/sprint-2-1C-contrato-carga-documental-segura` | `c7c4eb80a521515c7cb45f32c060c9062ba27027` | 0 | `c7c4eb80a521515c7cb45f32c060c9062ba27027` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/docs/sprint-2-1C-contrato-carga-documental-segura` |
| `docs/standard-minimal-patch-g2-r1` | `88305c864df33368c47e770e45a05c29355735c7` | 0 | `88305c864df33368c47e770e45a05c29355735c7` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `docs/technical-manuals-institutional-alignment-r1` | `88305c864df33368c47e770e45a05c29355735c7` | 0 | `88305c864df33368c47e770e45a05c29355735c7` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `entregable/mvp-multiarea-ui` | `d00a9e76da6d6caaa9a52896e451be1b0bdae408` | 3 | `99d6f6959298a889eed69b594f6c29f638265268` | 3 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `feat/auth-users-standard-g2-r1` | `a393932aea98c5e1b0736694b980997ebd4b0f98` | 0 | `a393932aea98c5e1b0736694b980997ebd4b0f98` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `feat/documental-v2-adaptador-gateway-carga-segura-2-1C` | `c389031a62d080689fe3e590a92e9a2a8fd875be` | 2 | `5e338276ac14c5d8829890a7e72237f1a488455b` | 0 | COMMITTED_AND_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `origin/feat/documental-v2-adaptador-gateway-carga-segura-2-1C` |
| `feat/documental-v2-auditoria-visual-2-0D2` | `8df67eb35341dd78d765e19960d91c3f677369e9` | 0 | `8df67eb35341dd78d765e19960d91c3f677369e9` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-auditoria-visual-2-0D2` |
| `feat/documental-v2-carga-segura-2-1C` | `a04f3278e94b3d56edadb5178e75fe8b2df494d0` | 0 | `a04f3278e94b3d56edadb5178e75fe8b2df494d0` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-carga-segura-2-1C` |
| `feat/documental-v2-carga-segura-backend-2-1C` | `ce0fe4fbe8d73752d86d5e5edbc4585299fba591` | 0 | `ce0fe4fbe8d73752d86d5e5edbc4585299fba591` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-carga-segura-backend-2-1C` |
| `feat/documental-v2-consolidacion-2-0D0` | `0f42defaed7fd42a1ae1e3d97130cb61bc04b23d` | 0 | `0f42defaed7fd42a1ae1e3d97130cb61bc04b23d` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-consolidacion-2-0D0` |
| `feat/documental-v2-exposicion-interna-carga-segura-2-1C` | `4c05f596fe6a3af600f9b571bd0c75bd1f3dd746` | 2 | `5e338276ac14c5d8829890a7e72237f1a488455b` | 2 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `feat/documental-v2-gateway-carga-segura-2-1C` | `4c05f596fe6a3af600f9b571bd0c75bd1f3dd746` | 2 | `5e338276ac14c5d8829890a7e72237f1a488455b` | 2 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `feat/documental-v2-model` | `83dd09de1e0eb1906729a7e55d1254dad4852656` | 0 | `83dd09de1e0eb1906729a7e55d1254dad4852656` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-model` |
| `feat/documental-v2-operacion-2-0A` | `6d27671e0f6c606f4700e410767adf99b72077b1` | 0 | `6d27671e0f6c606f4700e410767adf99b72077b1` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `feat/documental-v2-operacion-2-0B` | `7c1afe7ea18f376a84527e38e8bd08d068e76db4` | 0 | `7c1afe7ea18f376a84527e38e8bd08d068e76db4` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-operacion-2-0B` |
| `feat/documental-v2-operacion-2-0C` | `8e7457cc78983233988c5c5599053db8aeced009` | 0 | `8e7457cc78983233988c5c5599053db8aeced009` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-operacion-2-0C` |
| `feat/documental-v2-operacion-2-1B` | `303b8afded8c5634dbd1f0d1a58b93893b2fc295` | 0 | `303b8afded8c5634dbd1f0d1a58b93893b2fc295` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-operacion-2-1B` |
| `feat/documental-v2-trazabilidad-2-0D1` | `070d24177d545a9816252c3dcbca86146bc9a556` | 0 | `070d24177d545a9816252c3dcbca86146bc9a556` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-trazabilidad-2-0D1` |
| `feat/documental-v2-trazabilidad-consulta-2-0D1B` | `baef72d5d2393421a7aefd0f87efbd2f015c3ca5` | 0 | `baef72d5d2393421a7aefd0f87efbd2f015c3ca5` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/feat/documental-v2-trazabilidad-consulta-2-0D1B` |
| `feat/documental-v2-ux-carga-segura-2-1C` | `40ca51fb209711ea5c727a8044d1f4f20f5eef68` | 8 | `5e338276ac14c5d8829890a7e72237f1a488455b` | 8 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `feat/g2b-auth-version-r1` | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` | 0 | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `feat/op-regularization-feedback-ux` | `96e9d8d9064acd0cb5c8f2c9938ff8bf7cc9fc32` | 0 | `96e9d8d9064acd0cb5c8f2c9938ff8bf7cc9fc32` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `feat/test-failures-finanzas-filter` | `d7c89d53be79a423ee51507b968a462d675b8def` | 0 | `d7c89d53be79a423ee51507b968a462d675b8def` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `feature/r7-revision-contable-proveedores-op` | `081dbbc3547ecf2a3f2877177eb4e5c3cc6d0d17` | 0 | `081dbbc3547ecf2a3f2877177eb4e5c3cc6d0d17` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `fix/almacen-bandeja-double-filter-r1` | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` | 0 | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `fix/almacen-propagacion-contexto-v2` | `dc31e962da6732866358ae6d667047bc6974b874` | 4 | `99d6f6959298a889eed69b594f6c29f638265268` | 4 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `fix/api-gateway-workspace-resolution-2-1C` | `b66b1ba2343b12f13606c59e45664167162a37ac` | 0 | `b66b1ba2343b12f13606c59e45664167162a37ac` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/fix/api-gateway-workspace-resolution-2-1C` |
| `fix/bbti-finanzas-op-periodo-documental-r1` | `034a1abc7af9b4fe1a107dbe72ad3893e1f47992` | 7 | `d7c89d53be79a423ee51507b968a462d675b8def` | 0 | COMMITTED_AND_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `fix/compras-recuperacion-validacion-pendiente` | `91f14d7dc6ed51bfbf023e92baa354492ccdbd99` | 0 | `91f14d7dc6ed51bfbf023e92baa354492ccdbd99` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/fix/compras-recuperacion-validacion-pendiente` |
| `fix/demo-frontend-adjuntos-ocr` | `48e2335305ea5978e75246ee96649a0e79c57d2c` | 0 | `48e2335305ea5978e75246ee96649a0e79c57d2c` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/demo/frontend-final-2-1C` |
| `fix/mvp-aislamiento-visual-compras` | `d67a70267d64cd127412985fb745c4d072f2c7ce` | 3 | `99d6f6959298a889eed69b594f6c29f638265268` | 3 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `fix/ocr-temp-r2-filename-compat` | `5ef5c03e06c2c600103b71b41dc55551641dab38` | 0 | `5ef5c03e06c2c600103b71b41dc55551641dab38` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/fix/ocr-temp-r2-filename-compat` |
| `fix/proveedor-ruc-fallback-api` | `d8aeb9eb976d3c0aa98cdb7b7c96f2c03da0b21c` | 0 | `d8aeb9eb976d3c0aa98cdb7b7c96f2c03da0b21c` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `integracion/mvp-multiarea-cardinalidad` | `02f7a9f9d8abfe0192d86d19df77bccf7705692e` | 0 | `02f7a9f9d8abfe0192d86d19df77bccf7705692e` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/integracion/mvp-multiarea-cardinalidad` |
| `main` | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` | 0 | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/main` |
| `preserve/p8-ocr-infra-20261006` | `e3f0b39486a6e6d9204f8b6f44ebe1cfc3119efb` | 18 | `f5bf8ee5bdbc2630514b5e2126db3c3125665b4a` | 0 | COMMITTED_AND_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `origin/preserve/p8-ocr-infra-20261006` |
| `release/demo-v1` | `52c4b52f23575db6e08a39da8f8a9cb402217976` | 0 | `52c4b52f23575db6e08a39da8f8a9cb402217976` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `release/mvp-almacen-finanzas-20260909` | `0ff8fd55cfb0672f7fa57e3700f5750c10f15b68` | 15 | `f5bf8ee5bdbc2630514b5e2126db3c3125665b4a` | 0 | COMMITTED_AND_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `origin/release/mvp-almacen-finanzas-20260909` |
| `release/mvp-presentacion-2026-08` | `2003111159d339627f22bd7e50cf4d89714202cf` | 0 | `2003111159d339627f22bd7e50cf4d89714202cf` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/release/mvp-presentacion-2026-08` |
| `release/mvp-presentacion-2026-08-bbtec` | `8134dc335814db486ae3e917aa1b56c36dc11e8b` | 0 | `8134dc335814db486ae3e917aa1b56c36dc11e8b` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `release/v2-foundation` | `2bee587753b97b46bd180949027697d08e19fb3e` | 0 | `2bee587753b97b46bd180949027697d08e19fb3e` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `respaldo/integracion-documental-1557945c` | `a6d9185bdf3643d7286e500d75839f719cb6158c` | 0 | `a6d9185bdf3643d7286e500d75839f719cb6158c` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `respaldo/legado-sprint-2-1c-c7c4eb8` | `c7c4eb80a521515c7cb45f32c060c9062ba27027` | 0 | `c7c4eb80a521515c7cb45f32c060c9062ba27027` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `revision/fix-p0-aislamiento-principal-integracion` | `d3de32d779dd18e27f7ea9621e37267098e4f258` | 2 | `cf2bc3728630a993f2744042d44c36f0a361b6e3` | 2 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `revision/mvp-multiarea-consolidacion-preflight` | `d67a70267d64cd127412985fb745c4d072f2c7ce` | 3 | `99d6f6959298a889eed69b594f6c29f638265268` | 3 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `revision/mvp-ui-candidato-limpio` | `d00a9e76da6d6caaa9a52896e451be1b0bdae408` | 3 | `99d6f6959298a889eed69b594f6c29f638265268` | 3 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `show-current` | `034a1abc7af9b4fe1a107dbe72ad3893e1f47992` | 7 | `d7c89d53be79a423ee51507b968a462d675b8def` | 0 | COMMITTED_AND_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `test/fase3-validacion-integrada` | `759d19e44fb87b9bd85612fa64af936794b45770` | 2 | `cf2bc3728630a993f2744042d44c36f0a361b6e3` | 2 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `test/integracion-exposicion-carga-segura-2-1C` | `8d41aba1b2ee89d3448acb644b59e705c7f2fe6b` | 0 | `8d41aba1b2ee89d3448acb644b59e705c7f2fe6b` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `ux/bbtec-mvp` | `8b882690720cd685447843c466475cb9bec99f05` | 0 | `8b882690720cd685447843c466475cb9bec99f05` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `ux/bbti-demo-almacen-cleanup` | `d43ba6068733b393484e1e8d0aec9959345c9881` | 0 | `d43ba6068733b393484e1e8d0aec9959345c9881` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/ux/bbti-demo-almacen-cleanup` |
| `ux/bbti-presentacion-cleanup` | `8b882690720cd685447843c466475cb9bec99f05` | 0 | `8b882690720cd685447843c466475cb9bec99f05` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/ux/bbti-presentacion-cleanup` |
| `ux/compras-bandeja-ocos` | `3620822ded183d405d2dcbf055fc4ddb0d4d0fed` | 0 | `3620822ded183d405d2dcbf055fc4ddb0d4d0fed` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `ux/op-02-adjuntar-pago` | `5a67559088af2e7d9336c42b05a835a20b49569b` | 2 | `0c2c8a1367ddac0b7d4f2ba4bd22f4a0e4ba8332` | 2 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `ux/refinamiento-operativo-mvp` | `02f7a9f9d8abfe0192d86d19df77bccf7705692e` | 0 | `02f7a9f9d8abfe0192d86d19df77bccf7705692e` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `ux/refinamiento-operativo-mvp-final` | `8c1d65b7379f800a62755f4d9db4ff0ef7990916` | 0 | `8c1d65b7379f800a62755f4d9db4ff0ef7990916` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/ux/refinamiento-operativo-mvp-arch` |
#### Enterprise

| Rama | HEAD | Exclusivos main | Merge-base main | No publicados | Publicación | Upstream local |
| --- | --- | ---: | --- | ---: | --- | --- |
| `backup/enterprise-pre-promotion-r2-20260930` | `980f4baefd67ab796290471f014fb93f4788f923` | 0 | `980f4baefd67ab796290471f014fb93f4788f923` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `chore/c1-manual-ghcr-workflow` | `cd8232035e39a3e9f7ece385973b5e6b13767b2f` | 0 | `cd8232035e39a3e9f7ece385973b5e6b13767b2f` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `hotfix/prod-ocr-temp-filename-20261006` | `afab7f19b5344f297d960e861e6bf35b2457af43` | 1 | `22d2319b9c000bdffa817553a56ffdb6927ed74d` | 1 | COMMITTED_NOT_PUSHED; NOT_INTEGRATED_BY_ANCESTRY | `—` |
| `integration/enterprise-r2-po-20261023` | `e1f099faeb4dfdc9f2b49b9984fe211935875ff3` | 0 | `e1f099faeb4dfdc9f2b49b9984fe211935875ff3` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `—` |
| `main` | `f80d05e80b522c18ab20751a7e18a9e6f626984c` | 0 | `f80d05e80b522c18ab20751a7e18a9e6f626984c` | 0 | COMMITTED_AND_PUSHED; INTEGRATED | `origin/main` |

La rama remota SOURCE `review/c1-minimal-publishable-r1`, SHA `95bba524391bbe46ba3a3d601407b55356455f9d`, está anunciada en el servidor y su objeto existe localmente; no tiene ref origin/* local. Se registra sin fetch ni creación de referencias.

### Worktrees: observación previa y cambios documentales R4

Counts previos con índices staged/unstaged separados; `untracked` usa la agrupación normal de Git. No se inspeccionaron secretos ni se limpió ningún árbol. Las únicas modificaciones R4 previstas se indican expresamente.

| Repositorio | Ruta registrada | HEAD | Rama | Estado |
| --- | --- | --- | --- | --- |
| SOURCE | `/home/loxi1/projects/apps/documental-platform` | `034a1abc7af9b4fe1a107dbe72ad3893e1f47992` | `fix/bbti-finanzas-op-periodo-documental-r1` | 0 staged; 40 unstaged; 8 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-adaptador-gateway-carga-segura-2-1C` | `8d41aba1b2ee89d3448acb644b59e705c7f2fe6b` | `test/integracion-exposicion-carga-segura-2-1C` | 0 staged; 7 unstaged; 1 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-almacen-filter-r1` | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` | `fix/almacen-bandeja-double-filter-r1` | 0 staged; 0 unstaged; 0 untracked + 3 documentos R4 sin stage |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-carga-segura-2-1C` | `a04f3278e94b3d56edadb5178e75fe8b2df494d0` | `feat/documental-v2-carga-segura-2-1C` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-carga-segura-backend-2-1C` | `ce0fe4fbe8d73752d86d5e5edbc4585299fba591` | `feat/documental-v2-carga-segura-backend-2-1C` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-diag-scope-r2` | `ac2241fbff4892128d5c56f95c737f08abd373df` | `DETACHED` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-diag-scope-r2-ac2241fb` | `ac2241fbff4892128d5c56f95c737f08abd373df` | `DETACHED` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-exposicion-interna-2-1C` | `4c05f596fe6a3af600f9b571bd0c75bd1f3dd746` | `feat/documental-v2-exposicion-interna-carga-segura-2-1C` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-fase3-runtime` | `759d19e44fb87b9bd85612fa64af936794b45770` | `test/fase3-validacion-integrada` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-g2b-auth-version-r1` | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` | `feat/g2b-auth-version-r1` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-gateway-carga-segura-2-1C` | `4c05f596fe6a3af600f9b571bd0c75bd1f3dd746` | `feat/documental-v2-gateway-carga-segura-2-1C` | 0 staged; 1 unstaged; 1 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-main-integration` | `28be9e2af6ab0ea0df17eabd44fb9eb1d8c3e35d` | `DETACHED` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-mvp-candidate-f5bf8ee5` | `b78b1c8393e336271be8097d787a8991ca458b3a` | `DETACHED` | 0 staged; 1 unstaged; 1 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-mvp-candidate-r6` | `6af54aff62f1a1d5520b112f903501f9b0317955` | `DETACHED` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-op02-ux` | `5a67559088af2e7d9336c42b05a835a20b49569b` | `ux/op-02-adjuntar-pago` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-source-r2-isolated` | `dfc81aaa99567e9744fab93baccd71d24e29e30a` | `DETACHED` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-test-compras-carga-segura` | `a6d9185bdf3643d7286e500d75839f719cb6158c` | `respaldo/integracion-documental-1557945c` | 0 staged; 8 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-test-failures-finanzas-filter` | `d7c89d53be79a423ee51507b968a462d675b8def` | `feat/test-failures-finanzas-filter` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/documental-platform-ux-carga-segura-2-1C` | `40ca51fb209711ea5c727a8044d1f4f20f5eef68` | `feat/documental-v2-ux-carga-segura-2-1C` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-almacen-escritura-v2` | `dc31e962da6732866358ae6d667047bc6974b874` | `fix/almacen-propagacion-contexto-v2` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-bbtec-mvp` | `8b882690720cd685447843c466475cb9bec99f05` | `ux/bbtec-mvp` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-bbtec-mvp-desde-bbti` | `8134dc335814db486ae3e917aa1b56c36dc11e8b` | `release/mvp-presentacion-2026-08-bbtec` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-bbti-demo-almacen-cleanup` | `d43ba6068733b393484e1e8d0aec9959345c9881` | `ux/bbti-demo-almacen-cleanup` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-bbti-presentacion-cleanup` | `8b882690720cd685447843c466475cb9bec99f05` | `ux/bbti-presentacion-cleanup` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-compras-bandeja-ocos` | `2003111159d339627f22bd7e50cf4d89714202cf` | `release/mvp-presentacion-2026-08` | 0 staged; 1 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-fix-p0-integracion` | `d3de32d779dd18e27f7ea9621e37267098e4f258` | `revision/fix-p0-aislamiento-principal-integracion` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-fix-proveedor-ruc` | `d8aeb9eb976d3c0aa98cdb7b7c96f2c03da0b21c` | `fix/proveedor-ruc-fallback-api` | 0 staged; 2 unstaged; 1 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-mvp-consolidacion-preflight` | `d67a70267d64cd127412985fb745c4d072f2c7ce` | `revision/mvp-multiarea-consolidacion-preflight` | 0 staged; 2 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-mvp-ui-candidato-limpio` | `d00a9e76da6d6caaa9a52896e451be1b0bdae408` | `revision/mvp-ui-candidato-limpio` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-mvp-ui-entregable` | `d00a9e76da6d6caaa9a52896e451be1b0bdae408` | `entregable/mvp-multiarea-ui` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-release-mvp-2026-08` | `3620822ded183d405d2dcbf055fc4ddb0d4d0fed` | `DETACHED` | 0 staged; 0 unstaged; 1 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-ux-operativa` | `02f7a9f9d8abfe0192d86d19df77bccf7705692e` | `ux/refinamiento-operativo-mvp` | 0 staged; 3 unstaged; 0 untracked |
| SOURCE | `/home/loxi1/projects/apps/paquetes_revision/documental-platform-ux-operativa-final` | `8c1d65b7379f800a62755f4d9db4ff0ef7990916` | `ux/refinamiento-operativo-mvp-final` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/tmp/bbti-controlled-release-r1/source-main` | `89cd4c6e8b33c029bcce50b5d5fefaa4d84979e5` | `main` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/bbti-op-ux-g2-worktree` | `96e9d8d9064acd0cb5c8f2c9938ff8bf7cc9fc32` | `feat/op-regularization-feedback-ux` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/bbti-source-development-release-standard-r1` | `189f22ff8e51791584bcf421c83c4db7ac950132` | `docs/source-development-release-standard-r1` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/bbti-source-main-integration-20261107` | `5efcb743245f38662cb3e4960ee91ad6a7ab2232` | `DETACHED` | 0 staged; 0 unstaged; 0 untracked |
| SOURCE | `/tmp/bbti-standard-minimal-patch-g2-r1` | `88305c864df33368c47e770e45a05c29355735c7` | `docs/standard-minimal-patch-g2-r1` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/bbti-technical-manuals-institutional-alignment-r1` | `88305c864df33368c47e770e45a05c29355735c7` | `docs/technical-manuals-institutional-alignment-r1` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/documental-functional-recovery-r13` | `f5bf8ee5bdbc2630514b5e2126db3c3125665b4a` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/documental-g2-r10-index-validation` | `f65ae4b72213b862cd04da7ae9f5c031af0f0b20` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/documental-platform-p11-main-replay` | `d0b0f8eacc9494661aec7f18262b7e9aa9dfaa90` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/documental-platform-p8-preservation` | `e3f0b39486a6e6d9204f8b6f44ebe1cfc3119efb` | `preserve/p8-ocr-infra-20261006` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/r28-p6-isolated` | `6655edc139fe1d4dfd6cbb5d0aa299368811091a` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/r3-p11-source-main-integration` | `1a0bd9cae68246ef95fb349fb5be337fd434eb2b` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/r4_p2_source_final_integration` | `5ef5c03e06c2c600103b71b41dc55551641dab38` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/r4_p2_source_final_integration_r4` | `5ef5c03e06c2c600103b71b41dc55551641dab38` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| SOURCE | `/tmp/r4_p2_source_integration_r1` | `5ef5c03e06c2c600103b71b41dc55551641dab38` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| Enterprise | `/home/loxi1/projects/apps/documental-platform-bbti-prod` | `f80d05e80b522c18ab20751a7e18a9e6f626984c` | `main` | 0 staged; 0 unstaged; 0 untracked + 3 documentos R4 sin stage |
| Enterprise | `/home/loxi1/projects/apps/documental-platform-enterprise-mvp-candidate-r2` | `51ad3f7204149b5fe012c46d048f1f9af9b0c5a4` | `DETACHED` | 0 staged; 11 unstaged; 0 untracked |
| Enterprise | `/tmp/c1-enterprise-workflow-minimal-patch-r1` | `cd8232035e39a3e9f7ece385973b5e6b13767b2f` | `chore/c1-manual-ghcr-workflow` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| Enterprise | `/tmp/documental-enterprise-ocr-r19` | `7a5eb9909aca14bcc473af6a5303cd9a46f20566` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| Enterprise | `/tmp/documental-enterprise-r3-paso2-YbrI6V` | `655eb17a3eecd2e810a55787095de4f0f3525a6a` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |
| Enterprise | `/tmp/documental-release-promotion-rehearsal-r1` | `96cb7b929b34dd681876401d1b0181112b91c178` | `DETACHED` | ABSENT_PRUNABLE_METADATA_ONLY; contenido anterior NOT_VERIFIED |

### Organización futura propuesta; ninguna limpieza ejecutada

1. Mantener el checkout SOURCE dirty y las ramas backup como archivos de trabajo protegidos, sin reset, stash, restore ni selección masiva.
2. Para trabajo futuro autorizado, partir de main limpio en una rama/worktree de propósito único; no crearlos ahora. Mi Perfil, G2-B y P3 conservan alcance y aceptación separados.
3. Las ramas INTEGRATED con worktree limpio son candidatas únicamente a revisión posterior de cierre. Esa clasificación no autoriza borrar ramas ni worktrees.
4. Las ramas con commits exclusivos o cambios locales y todos los detached dirty requieren conservación. Los registros prunable requieren autorización y reconciliación de evidencia anterior antes de cualquier limpieza.
5. Esta actualización permanece sin commit en los dos worktrees identificados. SOURCE main y Enterprise main no se actualizan por editar docs.

### Manifests y publicación

- `RELEASE_MANIFEST.md`: historial de release; el Enterprise f80d05e8 y los manifests SOURCE/Enterprise conservan bytes e identidades. No se añadieron Almacén 89, Mi Perfil ni G2-B al release publicado.
- `BRANCH_INVENTORY.md`: inventario de continuidad Git actualizado por R4, sin representar un nuevo release.
- `MANIFEST_RECONCILIATION.md`: cierre histórico Actions#28 del16/10, no inventario Git vigente; conservado sin modificación.
- YAML operativos Docker/infraestructura: no editados.
- `infra/postgres/migrations/manifest.sha256`: manifest de migraciones, SHA256 `ff291e6e99b28edbb9ea9ca743083a06f77d704460142fb42a23f91153533d5b`; 12 entradas comprobadas contra SQL local en SOURCE/Enterprise, sin ejecución SQL. No contiene 0025 ni fue modificado. Integridad de archivos no acredita ledger ni aplicación en una base.

Estados por frente, evidencias, límites y próximos gates: [Operations Manual](../29-operations-manual/README.md#continuidad-vigente--11112026). Esta reconciliación documental no habilita integración funcional, migración, build ni despliegue.

---


## Estado vigente de continuidad — 05/11/2026

Acción `POST_MVP_SUCCESSOR_CONTINUITY_UPDATE_R1`. Esta sección prevalece sobre las instantáneas históricas inferiores y sus pendientes ya superados. No se repite el inventario general ni se reabre la reconciliación del release.

- SOURCE funcional: `88edc03136a446308d8b18fa778bdccf6c002be3`.
- Enterprise funcional / origen de imágenes: `a57c328cbf62de39aa91ed541ae32b449927a5b6`.
- Aceptación documental SOURCE: `aef47ca8c307449d2d985128196c297102e80a4d`.
- Aceptación documental Enterprise: `dcf14470e80519d3a6f1114180a4652a27de4017`.
- Inventario funcional: 101 archivos, sin cambios. EC2 mantiene el runtime del despliegue aceptado; esta actualización de continuidad no se sincroniza a EC2.

SOURCE main se mantiene en el worktree limpio y aislado `/tmp/bbti-controlled-release-r1/source-main`; Enterprise main en `/home/loxi1/projects/apps/documental-platform-bbti-prod`. Los SHA anteriores identifican el cierre de aceptación, no pretenden ser el HEAD posterior a esta edición. El commit documental que introduce esta sección se identifica por su acción en Git; su publicación SOURCE → Enterprise se registra en la evidencia externa `successor-continuity-update.json` del directorio canónico de release. No crea candidato ni otra promoción funcional.

El checkout SOURCE de trabajo `/home/loxi1/projects/apps/documental-platform` permanece en `fix/bbti-finanzas-op-periodo-documental-r1`, HEAD `034a1abc7af9b4fe1a107dbe72ad3893e1f47992`, con sus 48 entradas dirty protegidas. No limpiar, restaurar ni incorporar automáticamente ese contenido a otro release. Las otras ramas/worktrees de las instantáneas inferiores son antecedentes, no candidatos o asignaciones actuales.

MVP_STATUS=ACCEPTED_WITH_OBSERVATIONS; PO_ACCEPTANCE=APPROVED; DOCUMENTARY_CLOSURE=PASS; RELEASE_RECONCILIATION=NOT_REQUIRED. Próximo frente NAS_PREPARATION: MSI, supervisión MSII y autoridad PO, aislado del MVP y sin sustitución presunta de R2. Véanse el [Operations Manual](../29-operations-manual/README.md#continuidad-vigente--05112026) y el [manifest rector](RELEASE_MANIFEST.md) para aceptación y observaciones abiertas. Esta edición no modifica el manifest ni se sincroniza a EC2.

---

## Instantánea histórica — 26/10/2026

Acción: `BBTI_POST_DEPLOY_CONTINUITY_AND_NEXT_BRANCH_R1`. Observación: `2026-10-26T22:52:56.914616+00:00`. Esta sección prevalece sobre las instantáneas inferiores; no requiere reconciliación histórica.

| Repositorio | Rama | HEAD | Árbol | Remoto main / estado previo |
|---|---|---|---|---|
| SOURCE | main | `a393932aea98c5e1b0736694b980997ebd4b0f98` | `34fd8c0ad68bf8a404224d95c7d4065e3e45d959` | Igualdad remota consultada; limpio antes de esta edición |
| Enterprise | main | `d60b6af89a99e6a4bdb2a48e7d6891d7ee4b59ac` | `2ae8d7af78d889a9c247f7c6285f26ce2af78425` | Igualdad remota consultada; limpio |

EC2 coincide con Enterprise, main limpio. Identidad de runtime y límites en el [manifiesto canónico](RELEASE_MANIFEST.md); continuidad en [Operations Manual](../29-operations-manual/README.md#continuidad-vigente--26102026).

Rama histórica `feat/auth-users-standard-g2-r1` conservada. Nueva rama `feat/test-failures-finanzas-filter`, base `a393932aea98c5e1b0736694b980997ebd4b0f98`, worktree `/home/loxi1/projects/apps/documental-platform-test-failures-finanzas-filter`: preparación local autorizada, sin cambios funcionales ni push. Se creó desde main limpio antes de estas ediciones documentales; no contiene este cierre aún sin commit. Integrar el cierre documental mediante autorización específica antes del desarrollo; después comprobar compatibilidad y actualizar esa rama sin descartar cambios.

Inventario completo observado de refs locales y worktrees: `/home/loxi1/evidencias/documental-platform/post-deploy-continuity-r1/git-observation.json`. Incluye registros históricos y prunable; no se inspeccionaron ni limpiaron sus árboles. No borrar ramas, worktrees ni respaldos C04/C06.

Pendiente actual: únicamente los cinco documentos de este cierre, sin stage/commit/push. La evidencia externa no es contenido pendiente de integración Git. No hubo cambios documentales previos al cierre en los dos main inspeccionados.

---

## Nota de uso — estándar R1, 26/10/2026

Consultar el [estándar canónico R1](../23-standards/11-source-development-and-release.md), aprobado por PO, ratificado por MI e integrado en SOURCE. El inventario inferior es una instantánea histórica del 23/10, no un bloqueo vigente. PO acredita reconciliación cerrada; el inicio de esta orden verificó main limpio en `c56250a0095ad3af8250952291087561a8ac30e0`, igual a origin/main local y remoto consultado. Se conserva íntegro el inventario como antecedente, sin repetirlo ni reabrir sus expedientes.


Observación directa local: 2026-10-23T22:38:18.421118-05:00. Acción BBTI_R2_DOCUMENTATION_AND_BRANCH_INVENTORY_UPDATE_R1. Sin fetch: las ramas remotas son refs locales; frescura respecto del servidor no acreditada. Inventario anterior a las ediciones documentales de esta orden.

## SOURCE

Ruta: `/home/loxi1/projects/apps/documental-platform`. HEAD: `c7478f6b771eee4725ee048f545c9b65baa8f648`.

Divergencia main...origin/main (local exclusivo / remoto exclusivo): `1	1`; merge-base: `707f32e5af5b37fc1b1295227ba340a79c4beff9`.

### Ramas locales, upstreams y worktrees asociados

```text
  backup/pre-2-1C-178cf9db                                178cf9db docs(documental-v2): add Sprint 2.1B bloque 2 validation notes
  backup/regularizacion-2-1C-0f5117fc                     0f5117fc test(documentos): validar headers de auditoria en controlador OCR
  chore/documental-v2-preparacion-activacion-2-1C         303b8afd feat(api-gateway): add secure document upload adapter
  chore/estabiliza-docker-puertos-post-mvp                6cb2ae51 [origin/chore/estabiliza-docker-puertos-post-mvp] chore(deploy): documenta urls internas de servicios
  chore/tech-workspace-resolution-diagnostico-2-1C        303b8afd feat(api-gateway): add secure document upload adapter
  demo/frontend-final-2-1C                                48e23353 [origin/demo/frontend-final-2-1C] fix(web): distinguish unknown secure upload errors
  demo/local-flujo-documental-2-1C                        d8297bac fix(ms-documentos): permitir adjuntos con advertencia OCR
  docs/continuidad-mvp-upload-erp                         87392d29 [origin/docs/continuidad-mvp-upload-erp] docs: documenta continuidad MVP y plan post-MVP
  docs/sprint-2-1B-contrato-tecnico                       15b00c5c [origin/docs/sprint-2-1B-contrato-tecnico] docs: finalize Sprint 2.1B technical contract
  docs/sprint-2-1C-contrato-carga-documental-segura       c7c4eb80 [origin/docs/sprint-2-1C-contrato-carga-documental-segura] docs(documental-v2): add Sprint 2.1C GO-0 baseline package
+ entregable/mvp-multiarea-ui                             d00a9e76 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-mvp-ui-entregable) fix(web): isolate purchase attachments by selected principal
  feat/documental-v2-adaptador-gateway-carga-segura-2-1C  c389031a [origin/feat/documental-v2-adaptador-gateway-carga-segura-2-1C] fix(api-gateway): clean secure upload controller diagnostics
  feat/documental-v2-auditoria-visual-2-0D2               8df67eb3 [origin/feat/documental-v2-auditoria-visual-2-0D2] test(web): add visual evidence for Documental V2 activity history
+ feat/documental-v2-carga-segura-2-1C                    a04f3278 (/home/loxi1/projects/apps/documental-platform-carga-segura-2-1C) [origin/feat/documental-v2-carga-segura-2-1C] fix(database): harden verified migration file loading
+ feat/documental-v2-carga-segura-backend-2-1C            ce0fe4fb (/home/loxi1/projects/apps/documental-platform-carga-segura-backend-2-1C) [origin/feat/documental-v2-carga-segura-backend-2-1C] test(documentos): type secure upload compensation factory
  feat/documental-v2-consolidacion-2-0D0                  0f42defa [origin/feat/documental-v2-consolidacion-2-0D0] docs: consolidate Documental V2 operational architecture
+ feat/documental-v2-exposicion-interna-carga-segura-2-1C 4c05f596 (/home/loxi1/projects/apps/documental-platform-exposicion-interna-2-1C) feat(ms-documentos): expose secure document upload endpoint
+ feat/documental-v2-gateway-carga-segura-2-1C            4c05f596 (/home/loxi1/projects/apps/documental-platform-gateway-carga-segura-2-1C) feat(ms-documentos): expose secure document upload endpoint
  feat/documental-v2-model                                83dd09de [origin/feat/documental-v2-model] test(web): update Workspace V2 validation evidence
  feat/documental-v2-operacion-2-0A                       6d27671e fix(web): update Workspace V2 operational label
  feat/documental-v2-operacion-2-0B                       7c1afe7e [origin/feat/documental-v2-operacion-2-0B] feat(web): add Workspace V2 invoice group creation UI
  feat/documental-v2-operacion-2-0C                       8e7457cc [origin/feat/documental-v2-operacion-2-0C] feat(web): add Workspace V2 invoice group document association UI
  feat/documental-v2-operacion-2-1B                       303b8afd [origin/feat/documental-v2-operacion-2-1B: behind 1] feat(api-gateway): add secure document upload adapter
  feat/documental-v2-trazabilidad-2-0D1                   070d2417 [origin/feat/documental-v2-trazabilidad-2-0D1] docs: document operational V2 audit instrumentation
  feat/documental-v2-trazabilidad-consulta-2-0D1B         baef72d5 [origin/feat/documental-v2-trazabilidad-consulta-2-0D1B] docs(documental-v2): clarify canonical traceability query
+ feat/documental-v2-ux-carga-segura-2-1C                 40ca51fb (/home/loxi1/projects/apps/documental-platform-ux-carga-segura-2-1C) fix(web): distinguish unknown secure upload errors
+ feat/op-regularization-feedback-ux                      96e9d8d9 (/tmp/bbti-op-ux-g2-worktree) docs(release): consolida manifiestos y runbooks MVP Actions 28
  feature/r7-revision-contable-proveedores-op             081dbbc3 feat(finanzas): unifica detalle de orden de pago
+ fix/almacen-propagacion-contexto-v2                     dc31e962 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-almacen-escritura-v2) fix(web): propagate V2 group context in almacen and finanzas
  fix/api-gateway-workspace-resolution-2-1C               b66b1ba2 [origin/fix/api-gateway-workspace-resolution-2-1C] fix(workspace): make Nest builds and Jest tests resolve workspace packages
  fix/compras-recuperacion-validacion-pendiente           91f14d7d [origin/fix/compras-recuperacion-validacion-pendiente] perf: elimina lectura QR automatica del worker OCR
  fix/demo-frontend-adjuntos-ocr                          48e23353 [origin/demo/frontend-final-2-1C] fix(web): distinguish unknown secure upload errors
  fix/mvp-aislamiento-visual-compras                      d67a7026 fix(web): isolate compras attachments by principal document
  fix/ocr-temp-r2-filename-compat                         5ef5c03e [origin/fix/ocr-temp-r2-filename-compat] fix(documental): corrige persistencia TEMP de Factura y RH
+ fix/proveedor-ruc-fallback-api                          d8aeb9eb (/home/loxi1/projects/apps/paquetes_revision/documental-platform-fix-proveedor-ruc) feat(documental): integrate V2 confirmation orchestration and multiprincipal flow
  integracion/mvp-multiarea-cardinalidad                  02f7a9f9 [origin/integracion/mvp-multiarea-cardinalidad: behind 36] fix(documentos): resolve providers by RUC and stabilize confirmation
* main                                                    c7478f6b [origin/main: ahead 1, behind 1] fix(gateway): propaga contexto en consultas contables
+ preserve/p8-ocr-infra-20261006                          e3f0b394 (/tmp/documental-platform-p8-preservation) [origin/preserve/p8-ocr-infra-20261006] chore(ocr): preserva bootstrap OCR de host
  release/demo-v1                                         52c4b52f docs: define phased backend implementation strategy for documental V2
  release/mvp-almacen-finanzas-20260909                   0ff8fd55 [origin/release/mvp-almacen-finanzas-20260909] test(documentos): alinea contratos de confirmacion
+ release/mvp-presentacion-2026-08                        20031111 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-compras-bandeja-ocos) [origin/release/mvp-presentacion-2026-08] feat(documental): vincula proveedor operativo y valida facturas
+ release/mvp-presentacion-2026-08-bbtec                  8134dc33 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-bbtec-mvp-desde-bbti) test(ms-documentos): actualizar specs post estabilizacion MVP
  release/v2-foundation                                   2bee5877 feat(documentos): expose documental V2 endpoints
+ respaldo/integracion-documental-1557945c                a6d9185b (/home/loxi1/projects/apps/documental-platform-test-compras-carga-segura) fix(api-gateway): expose contenedores operativos contracts
  respaldo/legado-sprint-2-1c-c7c4eb8                     c7c4eb80 docs(documental-v2): add Sprint 2.1C GO-0 baseline package
+ revision/fix-p0-aislamiento-principal-integracion       d3de32d7 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-fix-p0-integracion) fix(documental-v2): isolate invoice groups by explicit principal
+ revision/mvp-multiarea-consolidacion-preflight          d67a7026 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-mvp-consolidacion-preflight) fix(web): isolate compras attachments by principal document
+ revision/mvp-ui-candidato-limpio                        d00a9e76 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-mvp-ui-candidato-limpio) fix(web): isolate purchase attachments by selected principal
+ test/fase3-validacion-integrada                         759d19e4 (/home/loxi1/projects/apps/documental-platform-fase3-runtime) fix(documental-v2): isolate invoice groups by explicit principal
+ test/integracion-exposicion-carga-segura-2-1C           8d41aba1 (/home/loxi1/projects/apps/documental-platform-adaptador-gateway-carga-segura-2-1C) feat(api-gateway): expose Modelo A reversal endpoints
+ ux/bbtec-mvp                                            8b882690 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-bbtec-mvp) feat(web): refine invoice-centric accounting finance and warehouse workflows
+ ux/bbti-demo-almacen-cleanup                            d43ba606 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-bbti-demo-almacen-cleanup) [origin/ux/bbti-demo-almacen-cleanup] refine warehouse presentation workflow
+ ux/bbti-presentacion-cleanup                            8b882690 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-bbti-presentacion-cleanup) [origin/ux/bbti-presentacion-cleanup] feat(web): refine invoice-centric accounting finance and warehouse workflows
  ux/compras-bandeja-ocos                                 3620822d fix transfer OCR provider extraction
+ ux/op-02-adjuntar-pago                                  5a675590 (/home/loxi1/projects/apps/documental-platform-op02-ux) chore: limpia formato de vista de pagos OP
+ ux/refinamiento-operativo-mvp                           02f7a9f9 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-ux-operativa) fix(documentos): resolve providers by RUC and stabilize confirmation
+ ux/refinamiento-operativo-mvp-final                     8c1d65b7 (/home/loxi1/projects/apps/paquetes_revision/documental-platform-ux-operativa-final) [origin/ux/refinamiento-operativo-mvp-arch] feat(web): complete finance payment validation workflow
```

### Ramas locales y refs remotas conocidas

```text
  backup/pre-2-1C-178cf9db
  backup/regularizacion-2-1C-0f5117fc
  chore/documental-v2-preparacion-activacion-2-1C
  chore/estabiliza-docker-puertos-post-mvp
  chore/tech-workspace-resolution-diagnostico-2-1C
  demo/frontend-final-2-1C
  demo/local-flujo-documental-2-1C
  docs/continuidad-mvp-upload-erp
  docs/sprint-2-1B-contrato-tecnico
  docs/sprint-2-1C-contrato-carga-documental-segura
+ entregable/mvp-multiarea-ui
  feat/documental-v2-adaptador-gateway-carga-segura-2-1C
  feat/documental-v2-auditoria-visual-2-0D2
+ feat/documental-v2-carga-segura-2-1C
+ feat/documental-v2-carga-segura-backend-2-1C
  feat/documental-v2-consolidacion-2-0D0
+ feat/documental-v2-exposicion-interna-carga-segura-2-1C
+ feat/documental-v2-gateway-carga-segura-2-1C
  feat/documental-v2-model
  feat/documental-v2-operacion-2-0A
  feat/documental-v2-operacion-2-0B
  feat/documental-v2-operacion-2-0C
  feat/documental-v2-operacion-2-1B
  feat/documental-v2-trazabilidad-2-0D1
  feat/documental-v2-trazabilidad-consulta-2-0D1B
+ feat/documental-v2-ux-carga-segura-2-1C
+ feat/op-regularization-feedback-ux
  feature/r7-revision-contable-proveedores-op
+ fix/almacen-propagacion-contexto-v2
  fix/api-gateway-workspace-resolution-2-1C
  fix/compras-recuperacion-validacion-pendiente
  fix/demo-frontend-adjuntos-ocr
  fix/mvp-aislamiento-visual-compras
  fix/ocr-temp-r2-filename-compat
+ fix/proveedor-ruc-fallback-api
  integracion/mvp-multiarea-cardinalidad
* main
+ preserve/p8-ocr-infra-20261006
  release/demo-v1
  release/mvp-almacen-finanzas-20260909
+ release/mvp-presentacion-2026-08
+ release/mvp-presentacion-2026-08-bbtec
  release/v2-foundation
+ respaldo/integracion-documental-1557945c
  respaldo/legado-sprint-2-1c-c7c4eb8
+ revision/fix-p0-aislamiento-principal-integracion
+ revision/mvp-multiarea-consolidacion-preflight
+ revision/mvp-ui-candidato-limpio
+ test/fase3-validacion-integrada
+ test/integracion-exposicion-carga-segura-2-1C
+ ux/bbtec-mvp
+ ux/bbti-demo-almacen-cleanup
+ ux/bbti-presentacion-cleanup
  ux/compras-bandeja-ocos
+ ux/op-02-adjuntar-pago
+ ux/refinamiento-operativo-mvp
+ ux/refinamiento-operativo-mvp-final
  remotes/origin/chore/estabiliza-docker-puertos-post-mvp
  remotes/origin/demo/frontend-final-2-1C
  remotes/origin/docs/continuidad-mvp-upload-erp
  remotes/origin/docs/sprint-2-1B-contrato-tecnico
  remotes/origin/docs/sprint-2-1C-contrato-carga-documental-segura
  remotes/origin/feat/documental-v2-adaptador-gateway-carga-segura-2-1C
  remotes/origin/feat/documental-v2-auditoria-visual-2-0D2
  remotes/origin/feat/documental-v2-carga-segura-2-1C
  remotes/origin/feat/documental-v2-carga-segura-backend-2-1C
  remotes/origin/feat/documental-v2-consolidacion-2-0D0
  remotes/origin/feat/documental-v2-model
  remotes/origin/feat/documental-v2-operacion-2-0A
  remotes/origin/feat/documental-v2-operacion-2-0B
  remotes/origin/feat/documental-v2-operacion-2-0C
  remotes/origin/feat/documental-v2-operacion-2-1B
  remotes/origin/feat/documental-v2-trazabilidad-2-0D1
  remotes/origin/feat/documental-v2-trazabilidad-consulta-2-0D1B
  remotes/origin/fix/api-gateway-workspace-resolution-2-1C
  remotes/origin/fix/compras-recuperacion-validacion-pendiente
  remotes/origin/fix/ocr-temp-r2-filename-compat
  remotes/origin/integracion/mvp-multiarea-cardinalidad
  remotes/origin/main
  remotes/origin/preserve/p8-ocr-infra-20261006
  remotes/origin/release/demo-v1
  remotes/origin/release/mvp-almacen-finanzas-20260909
  remotes/origin/release/mvp-presentacion-2026-08
  remotes/origin/release/v2-foundation
  remotes/origin/test/integracion-exposicion-carga-segura-2-1C
  remotes/origin/ux/bbti-demo-almacen-cleanup
  remotes/origin/ux/bbti-presentacion-cleanup
  remotes/origin/ux/refinamiento-operativo-mvp-arch
  remotes/test-multiarea/backup/pre-2-1C-178cf9db
  remotes/test-multiarea/backup/regularizacion-2-1C-0f5117fc
  remotes/test-multiarea/chore/documental-v2-preparacion-activacion-2-1C
  remotes/test-multiarea/chore/tech-workspace-resolution-diagnostico-2-1C
  remotes/test-multiarea/demo/frontend-final-2-1C
  remotes/test-multiarea/demo/local-flujo-documental-2-1C
  remotes/test-multiarea/docs/sprint-2-1B-contrato-tecnico
  remotes/test-multiarea/docs/sprint-2-1C-contrato-carga-documental-segura
  remotes/test-multiarea/feat/documental-v2-adaptador-gateway-carga-segura-2-1C
  remotes/test-multiarea/feat/documental-v2-auditoria-visual-2-0D2
  remotes/test-multiarea/feat/documental-v2-carga-segura-2-1C
  remotes/test-multiarea/feat/documental-v2-carga-segura-backend-2-1C
  remotes/test-multiarea/feat/documental-v2-consolidacion-2-0D0
  remotes/test-multiarea/feat/documental-v2-exposicion-interna-carga-segura-2-1C
  remotes/test-multiarea/feat/documental-v2-gateway-carga-segura-2-1C
  remotes/test-multiarea/feat/documental-v2-model
  remotes/test-multiarea/feat/documental-v2-operacion-2-0A
  remotes/test-multiarea/feat/documental-v2-operacion-2-0B
  remotes/test-multiarea/feat/documental-v2-operacion-2-0C
  remotes/test-multiarea/feat/documental-v2-operacion-2-1B
  remotes/test-multiarea/feat/documental-v2-trazabilidad-2-0D1
  remotes/test-multiarea/feat/documental-v2-trazabilidad-consulta-2-0D1B
  remotes/test-multiarea/feat/documental-v2-ux-carga-segura-2-1C
  remotes/test-multiarea/fix/api-gateway-workspace-resolution-2-1C
  remotes/test-multiarea/fix/demo-frontend-adjuntos-ocr
  remotes/test-multiarea/main
  remotes/test-multiarea/release/demo-v1
  remotes/test-multiarea/release/v2-foundation
  remotes/test-multiarea/respaldo/integracion-documental-1557945c
  remotes/test-multiarea/respaldo/legado-sprint-2-1c-c7c4eb8
  remotes/test-multiarea/test/integracion-exposicion-carga-segura-2-1C
```

### Remotos (sin credenciales)

```text
origin	git@github.com:loxi1/documental-platform.git (fetch)
origin	git@github.com:loxi1/documental-platform.git (push)
test-multiarea	/home/loxi1/projects/apps/documental-platform-test-compras-carga-segura (fetch)
test-multiarea	/home/loxi1/projects/apps/documental-platform-test-compras-carga-segura (push)
```

### Últimos commits

```text
c7478f6b fix(gateway): propaga contexto en consultas contables
707f32e5 docs(database): aclara estado de migraciones
d85f989c test(documental-v2): completa cobertura OP principal
96e9d8d9 docs(release): consolida manifiestos y runbooks MVP Actions 28
ca49e734 fix(mvp): reconcilia flujos validados de contabilidad y compras
e542d0ff fix(contabilidad): restaura contexto de bandeja OP
444d4071 fix(finanzas): corrige parser de periodo al editar OP
5554422a docs(deploy): close R4-P2 deployment documentation gap
```

### Commits exclusivos frente a origin/main local

```text
> 95bba524 fix(op): recover promoted regularization with verified persisted identity
< c7478f6b fix(gateway): propaga contexto en consultas contables
```

### Worktrees registrados, no inspeccionados individualmente

```text
worktree /home/loxi1/projects/apps/documental-platform
HEAD c7478f6b771eee4725ee048f545c9b65baa8f648
branch refs/heads/main

worktree /home/loxi1/projects/apps/documental-platform-adaptador-gateway-carga-segura-2-1C
HEAD 8d41aba1b2ee89d3448acb644b59e705c7f2fe6b
branch refs/heads/test/integracion-exposicion-carga-segura-2-1C

worktree /home/loxi1/projects/apps/documental-platform-carga-segura-2-1C
HEAD a04f3278e94b3d56edadb5178e75fe8b2df494d0
branch refs/heads/feat/documental-v2-carga-segura-2-1C

worktree /home/loxi1/projects/apps/documental-platform-carga-segura-backend-2-1C
HEAD ce0fe4fbe8d73752d86d5e5edbc4585299fba591
branch refs/heads/feat/documental-v2-carga-segura-backend-2-1C

worktree /home/loxi1/projects/apps/documental-platform-diag-scope-r2
HEAD ac2241fbff4892128d5c56f95c737f08abd373df
detached

worktree /home/loxi1/projects/apps/documental-platform-diag-scope-r2-ac2241fb
HEAD ac2241fbff4892128d5c56f95c737f08abd373df
detached

worktree /home/loxi1/projects/apps/documental-platform-exposicion-interna-2-1C
HEAD 4c05f596fe6a3af600f9b571bd0c75bd1f3dd746
branch refs/heads/feat/documental-v2-exposicion-interna-carga-segura-2-1C

worktree /home/loxi1/projects/apps/documental-platform-fase3-runtime
HEAD 759d19e44fb87b9bd85612fa64af936794b45770
branch refs/heads/test/fase3-validacion-integrada

worktree /home/loxi1/projects/apps/documental-platform-gateway-carga-segura-2-1C
HEAD 4c05f596fe6a3af600f9b571bd0c75bd1f3dd746
branch refs/heads/feat/documental-v2-gateway-carga-segura-2-1C

worktree /home/loxi1/projects/apps/documental-platform-main-integration
HEAD 28be9e2af6ab0ea0df17eabd44fb9eb1d8c3e35d
detached

worktree /home/loxi1/projects/apps/documental-platform-mvp-candidate-f5bf8ee5
HEAD b78b1c8393e336271be8097d787a8991ca458b3a
detached

worktree /home/loxi1/projects/apps/documental-platform-mvp-candidate-r6
HEAD 6af54aff62f1a1d5520b112f903501f9b0317955
detached

worktree /home/loxi1/projects/apps/documental-platform-op02-ux
HEAD 5a67559088af2e7d9336c42b05a835a20b49569b
branch refs/heads/ux/op-02-adjuntar-pago

worktree /home/loxi1/projects/apps/documental-platform-source-r2-isolated
HEAD dfc81aaa99567e9744fab93baccd71d24e29e30a
detached

worktree /home/loxi1/projects/apps/documental-platform-test-compras-carga-segura
HEAD a6d9185bdf3643d7286e500d75839f719cb6158c
branch refs/heads/respaldo/integracion-documental-1557945c

worktree /home/loxi1/projects/apps/documental-platform-ux-carga-segura-2-1C
HEAD 40ca51fb209711ea5c727a8044d1f4f20f5eef68
branch refs/heads/feat/documental-v2-ux-carga-segura-2-1C

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-almacen-escritura-v2
HEAD dc31e962da6732866358ae6d667047bc6974b874
branch refs/heads/fix/almacen-propagacion-contexto-v2

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-bbtec-mvp
HEAD 8b882690720cd685447843c466475cb9bec99f05
branch refs/heads/ux/bbtec-mvp

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-bbtec-mvp-desde-bbti
HEAD 8134dc335814db486ae3e917aa1b56c36dc11e8b
branch refs/heads/release/mvp-presentacion-2026-08-bbtec

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-bbti-demo-almacen-cleanup
HEAD d43ba6068733b393484e1e8d0aec9959345c9881
branch refs/heads/ux/bbti-demo-almacen-cleanup

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-bbti-presentacion-cleanup
HEAD 8b882690720cd685447843c466475cb9bec99f05
branch refs/heads/ux/bbti-presentacion-cleanup

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-compras-bandeja-ocos
HEAD 2003111159d339627f22bd7e50cf4d89714202cf
branch refs/heads/release/mvp-presentacion-2026-08

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-fix-p0-integracion
HEAD d3de32d779dd18e27f7ea9621e37267098e4f258
branch refs/heads/revision/fix-p0-aislamiento-principal-integracion

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-fix-proveedor-ruc
HEAD d8aeb9eb976d3c0aa98cdb7b7c96f2c03da0b21c
branch refs/heads/fix/proveedor-ruc-fallback-api

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-mvp-consolidacion-preflight
HEAD d67a70267d64cd127412985fb745c4d072f2c7ce
branch refs/heads/revision/mvp-multiarea-consolidacion-preflight

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-mvp-ui-candidato-limpio
HEAD d00a9e76da6d6caaa9a52896e451be1b0bdae408
branch refs/heads/revision/mvp-ui-candidato-limpio

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-mvp-ui-entregable
HEAD d00a9e76da6d6caaa9a52896e451be1b0bdae408
branch refs/heads/entregable/mvp-multiarea-ui

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-release-mvp-2026-08
HEAD 3620822ded183d405d2dcbf055fc4ddb0d4d0fed
detached

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-ux-operativa
HEAD 02f7a9f9d8abfe0192d86d19df77bccf7705692e
branch refs/heads/ux/refinamiento-operativo-mvp

worktree /home/loxi1/projects/apps/paquetes_revision/documental-platform-ux-operativa-final
HEAD 8c1d65b7379f800a62755f4d9db4ff0ef7990916
branch refs/heads/ux/refinamiento-operativo-mvp-final

worktree /tmp/bbti-op-ux-g2-worktree
HEAD 96e9d8d9064acd0cb5c8f2c9938ff8bf7cc9fc32
branch refs/heads/feat/op-regularization-feedback-ux
prunable gitdir file points to non-existent location

worktree /tmp/documental-functional-recovery-r13
HEAD f5bf8ee5bdbc2630514b5e2126db3c3125665b4a
detached
prunable gitdir file points to non-existent location

worktree /tmp/documental-g2-r10-index-validation
HEAD f65ae4b72213b862cd04da7ae9f5c031af0f0b20
detached
prunable gitdir file points to non-existent location

worktree /tmp/documental-platform-p11-main-replay
HEAD d0b0f8eacc9494661aec7f18262b7e9aa9dfaa90
detached
prunable gitdir file points to non-existent location

worktree /tmp/documental-platform-p8-preservation
HEAD e3f0b39486a6e6d9204f8b6f44ebe1cfc3119efb
branch refs/heads/preserve/p8-ocr-infra-20261006
prunable gitdir file points to non-existent location

worktree /tmp/r28-p6-isolated
HEAD 6655edc139fe1d4dfd6cbb5d0aa299368811091a
detached
prunable gitdir file points to non-existent location

worktree /tmp/r3-p11-source-main-integration
HEAD 1a0bd9cae68246ef95fb349fb5be337fd434eb2b
detached
prunable gitdir file points to non-existent location

worktree /tmp/r4_p2_source_final_integration
HEAD 5ef5c03e06c2c600103b71b41dc55551641dab38
detached
prunable gitdir file points to non-existent location

worktree /tmp/r4_p2_source_final_integration_r4
HEAD 5ef5c03e06c2c600103b71b41dc55551641dab38
detached
prunable gitdir file points to non-existent location

worktree /tmp/r4_p2_source_integration_r1
HEAD 5ef5c03e06c2c600103b71b41dc55551641dab38
detached
prunable gitdir file points to non-existent location

```

### Estado previo de archivos

```text
 M apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.spec.ts
 M apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.ts
 M apps/api-gateway/src/documentos/documentos.controller.ts
 M apps/ms-documentos/src/documental-v2/finanzas/grupo-financiero.dto.ts
 M apps/ms-documentos/src/documental-v2/finanzas/grupo-financiero.spec.ts
 M apps/ms-documentos/src/documental-v2/finanzas/orden-pago.controller.ts
 M apps/ms-documentos/src/documental-v2/finanzas/orden-pago.service.spec.ts
 M apps/ms-documentos/src/documental-v2/finanzas/orden-pago.service.ts
 M apps/ms-documentos/src/documental-v2/finanzas/orden-pago.upload-pendiente.spec.ts
 M apps/ms-documentos/src/documental-v2/grupo-factura-documento.repository.ts
 M apps/ms-documentos/src/documental-v2/grupo-factura.service.ts
 M apps/ms-documentos/src/documental-v2/use-cases/asociar-documento-grupo-factura-v2.finanzas.spec.ts
 M apps/ms-documentos/src/documental-v2/use-cases/asociar-documento-grupo-factura-v2.usecase.ts
 M apps/ms-documentos/src/documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase.ts
 M apps/ms-documentos/src/documental-v2/use-cases/orquestar-confirmacion-documental-v2.validacion-pendiente-pago.spec.ts
 M apps/ms-documentos/src/documentos/carga-segura/http/carga-segura-http.filter.ts
 M apps/ms-documentos/src/documentos/documentos.repository.ts
 M apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.repository.spec.ts
 M apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.repository.ts
 M apps/ms-documentos/src/documentos/tmp/tmp.repository.ts
 M apps/ms-documentos/src/documentos/tmp/tmp.service.spec.ts
 M apps/ms-documentos/src/documentos/tmp/tmp.service.ts
 M apps/web-admin/src/app/finanzas/ordenes-pago/[ordenPagoId]/adjuntar-pago/page.tsx
 M apps/web-admin/src/app/finanzas/ordenes-pago/[ordenPagoId]/ver/page.tsx
 M apps/web-admin/src/components/finanzas/FinanzasExpedienteEditor.tsx
 M apps/web-admin/src/components/finanzas/FinanzasGrupoFacturaPagoPanel.tsx
 M apps/web-admin/src/components/finanzas/FinanzasPaymentPanel.tsx
 M apps/web-admin/src/components/finanzas/OrdenPagoAdjuntarPagoView.tsx
 M apps/web-admin/src/components/finanzas/OrdenPagoAdjuntarPagoView.upload-pendiente.test.cjs
 M apps/web-admin/src/components/finanzas/OrdenPagoVerView.contract.test.cjs
 M apps/web-admin/src/components/finanzas/OrdenPagoVerView.tsx
 M apps/web-admin/src/components/finanzas/RegularizarOrdenPagoModal.tsx
 M apps/web-admin/src/components/ocr/OcrValidationModal.tsx
 M apps/web-admin/src/services/finanzas.ts
 M deployment/docker/docker-compose.lab.yml
 M docs/31-governance/07-release-process.md
?? apps/ms-documentos/src/documental-v2/finanzas/orden-pago.observar-confirmado.spec.ts
?? apps/ms-documentos/src/documentos/documentos.op-observacion.spec.ts
?? apps/ms-documentos/src/documentos/tmp/tmp.replacement-g2.spec.ts
?? apps/web-admin/src/components/finanzas/FinanzasPagoOcr.persistencia.test.cjs
?? apps/web-admin/src/components/finanzas/OrdenPagoAdjuntarPagoView.documentary-parity.test.cjs
?? apps/web-admin/src/components/finanzas/OrdenPagoAdjuntarPagoView.ocr-consulta.test.cjs
?? apps/web-admin/src/components/finanzas/OrdenPagoAdjuntarPagoView.payment-support.test.cjs
?? apps/web-admin/src/components/finanzas/RegularizarOrdenPagoModal.temp-recovery.test.cjs
?? apps/web-admin/src/components/ocr/OcrValidationModal.initial-upload.test.cjs
```

### Diferencial rastreado previo

```text
M	apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.spec.ts
M	apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.ts
M	apps/api-gateway/src/documentos/documentos.controller.ts
M	apps/ms-documentos/src/documental-v2/finanzas/grupo-financiero.dto.ts
M	apps/ms-documentos/src/documental-v2/finanzas/grupo-financiero.spec.ts
M	apps/ms-documentos/src/documental-v2/finanzas/orden-pago.controller.ts
M	apps/ms-documentos/src/documental-v2/finanzas/orden-pago.service.spec.ts
M	apps/ms-documentos/src/documental-v2/finanzas/orden-pago.service.ts
M	apps/ms-documentos/src/documental-v2/finanzas/orden-pago.upload-pendiente.spec.ts
M	apps/ms-documentos/src/documental-v2/grupo-factura-documento.repository.ts
M	apps/ms-documentos/src/documental-v2/grupo-factura.service.ts
M	apps/ms-documentos/src/documental-v2/use-cases/asociar-documento-grupo-factura-v2.finanzas.spec.ts
M	apps/ms-documentos/src/documental-v2/use-cases/asociar-documento-grupo-factura-v2.usecase.ts
M	apps/ms-documentos/src/documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase.ts
M	apps/ms-documentos/src/documental-v2/use-cases/orquestar-confirmacion-documental-v2.validacion-pendiente-pago.spec.ts
M	apps/ms-documentos/src/documentos/carga-segura/http/carga-segura-http.filter.ts
M	apps/ms-documentos/src/documentos/documentos.repository.ts
M	apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.repository.spec.ts
M	apps/ms-documentos/src/documentos/factura-temp/factura-temp-materialization.repository.ts
M	apps/ms-documentos/src/documentos/tmp/tmp.repository.ts
M	apps/ms-documentos/src/documentos/tmp/tmp.service.spec.ts
M	apps/ms-documentos/src/documentos/tmp/tmp.service.ts
M	apps/web-admin/src/app/finanzas/ordenes-pago/[ordenPagoId]/adjuntar-pago/page.tsx
M	apps/web-admin/src/app/finanzas/ordenes-pago/[ordenPagoId]/ver/page.tsx
M	apps/web-admin/src/components/finanzas/FinanzasExpedienteEditor.tsx
M	apps/web-admin/src/components/finanzas/FinanzasGrupoFacturaPagoPanel.tsx
M	apps/web-admin/src/components/finanzas/FinanzasPaymentPanel.tsx
M	apps/web-admin/src/components/finanzas/OrdenPagoAdjuntarPagoView.tsx
M	apps/web-admin/src/components/finanzas/OrdenPagoAdjuntarPagoView.upload-pendiente.test.cjs
M	apps/web-admin/src/components/finanzas/OrdenPagoVerView.contract.test.cjs
M	apps/web-admin/src/components/finanzas/OrdenPagoVerView.tsx
M	apps/web-admin/src/components/finanzas/RegularizarOrdenPagoModal.tsx
M	apps/web-admin/src/components/ocr/OcrValidationModal.tsx
M	apps/web-admin/src/services/finanzas.ts
M	deployment/docker/docker-compose.lab.yml
M	docs/31-governance/07-release-process.md
```

### Índice preparado previo

```text
(vacío)
```

## Enterprise

Ruta: `/home/loxi1/projects/apps/documental-platform-bbti-prod`. HEAD: `e1f099faeb4dfdc9f2b49b9984fe211935875ff3`.

Divergencia main...origin/main (local exclusivo / remoto exclusivo): `0	0`; merge-base: `e1f099faeb4dfdc9f2b49b9984fe211935875ff3`.

### Ramas locales, upstreams y worktrees asociados

```text
  backup/enterprise-pre-promotion-r2-20260930 980f4bae chore: agrega validacion de auditoria de cargas
+ chore/c1-manual-ghcr-workflow               cd823203 (/tmp/c1-enterprise-workflow-minimal-patch-r1) chore(ci): require manual GHCR image publishing
  hotfix/prod-ocr-temp-filename-20261006      afab7f19 fix(ocr): preserve temp original filename for extraction
* integration/enterprise-r2-po-20261023       e1f099fa integrate(enterprise): promote PO-accepted R2 candidate with observations
  main                                        e1f099fa [origin/main] integrate(enterprise): promote PO-accepted R2 candidate with observations
```

### Ramas locales y refs remotas conocidas

```text
  backup/enterprise-pre-promotion-r2-20260930
+ chore/c1-manual-ghcr-workflow
  hotfix/prod-ocr-temp-filename-20261006
* integration/enterprise-r2-po-20261023
  main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
  remotes/personal/chore/estabiliza-docker-puertos-post-mvp
  remotes/personal/demo/frontend-final-2-1C
  remotes/personal/docs/continuidad-mvp-upload-erp
  remotes/personal/docs/sprint-2-1B-contrato-tecnico
  remotes/personal/docs/sprint-2-1C-contrato-carga-documental-segura
  remotes/personal/feat/documental-v2-adaptador-gateway-carga-segura-2-1C
  remotes/personal/feat/documental-v2-auditoria-visual-2-0D2
  remotes/personal/feat/documental-v2-carga-segura-2-1C
  remotes/personal/feat/documental-v2-carga-segura-backend-2-1C
  remotes/personal/feat/documental-v2-consolidacion-2-0D0
  remotes/personal/feat/documental-v2-model
  remotes/personal/feat/documental-v2-operacion-2-0A
  remotes/personal/feat/documental-v2-operacion-2-0B
  remotes/personal/feat/documental-v2-operacion-2-0C
  remotes/personal/feat/documental-v2-operacion-2-1B
  remotes/personal/feat/documental-v2-trazabilidad-2-0D1
  remotes/personal/feat/documental-v2-trazabilidad-consulta-2-0D1B
  remotes/personal/fix/api-gateway-workspace-resolution-2-1C
  remotes/personal/fix/compras-recuperacion-validacion-pendiente
  remotes/personal/integracion/mvp-multiarea-cardinalidad
  remotes/personal/main
  remotes/personal/release/demo-v1
  remotes/personal/release/mvp-almacen-finanzas-20260909
  remotes/personal/release/mvp-presentacion-2026-08
  remotes/personal/release/v2-foundation
  remotes/personal/test/integracion-exposicion-carga-segura-2-1C
  remotes/personal/ux/bbti-demo-almacen-cleanup
  remotes/personal/ux/bbti-presentacion-cleanup
  remotes/personal/ux/refinamiento-operativo-mvp-arch
```

### Remotos (sin credenciales)

```text
origin	https://github.com/BBTI-SAC/documental-platform-bbti-prod.git (fetch)
origin	https://github.com/BBTI-SAC/documental-platform-bbti-prod.git (push)
personal	https://github.com/loxi1/documental-platform.git (fetch)
personal	https://github.com/loxi1/documental-platform.git (push)
```

### Últimos commits

```text
e1f099fa integrate(enterprise): promote PO-accepted R2 candidate with observations
cd823203 chore(ci): require manual GHCR image publishing
21ed7df4 fix(op): promote minimal C1 recovery closure
874bad75 docs(release): consolida manifiestos y runbooks MVP Actions 28
6a615514 fix(mvp): promueve reconciliacion funcional de SOURCE
32b0a2b9 fix(contabilidad): restaura contexto de bandeja OP
de64a1b8 fix(finanzas): recupera calendario OP y parser de periodo
1aafaa0b docs(deploy): sync R4-P2 deployment documentation
```

### Commits exclusivos frente a origin/main local

```text
(vacío)
```

### Worktrees registrados, no inspeccionados individualmente

```text
worktree /home/loxi1/projects/apps/documental-platform-bbti-prod
HEAD e1f099faeb4dfdc9f2b49b9984fe211935875ff3
branch refs/heads/integration/enterprise-r2-po-20261023

worktree /home/loxi1/projects/apps/documental-platform-enterprise-mvp-candidate-r2
HEAD 51ad3f7204149b5fe012c46d048f1f9af9b0c5a4
detached

worktree /tmp/c1-enterprise-workflow-minimal-patch-r1
HEAD cd8232035e39a3e9f7ece385973b5e6b13767b2f
branch refs/heads/chore/c1-manual-ghcr-workflow
prunable gitdir file points to non-existent location

worktree /tmp/documental-enterprise-ocr-r19
HEAD 7a5eb9909aca14bcc473af6a5303cd9a46f20566
detached
prunable gitdir file points to non-existent location

worktree /tmp/documental-enterprise-r3-paso2-YbrI6V
HEAD 655eb17a3eecd2e810a55787095de4f0f3525a6a
detached
prunable gitdir file points to non-existent location

worktree /tmp/documental-release-promotion-rehearsal-r1
HEAD 96cb7b929b34dd681876401d1b0181112b91c178
detached
prunable gitdir file points to non-existent location

```

### Estado previo de archivos

```text
(vacío)
```

### Diferencial rastreado previo

```text
(vacío)
```

### Índice preparado previo

```text
(vacío)
```

## Respaldo externo y límites

Ruta: `/home/loxi1/Documentos/DocumentalPlatformBBTI/respaldos/SOURCE_MAIN_DIRTY_WORKTREE_EXTERNAL_BACKUP_R1_20261021T214504Z_439989`. Inventario de 45 rutas: 45/45 copias coinciden con SHA-256 del manifest; 41/45 archivos actuales coinciden con ese respaldo antes de editar documentación. No se generó ni alteró respaldo externo. Esta comparación no acredita equivalencia funcional de los commits divergentes.

SOURCE mantiene 36 modificados y nueve nuevos preexistentes, índice vacío. Enterprise estaba limpio; su rama activa integration/enterprise-r2-po-20261023, main y origin/main local están en R2. No se escribirá Enterprise durante esta orden. Los demás worktrees listados son ubicaciones registradas, no candidatos autorizados ni runtime acreditado.

## Decisiones pendientes

Conservar cambios SOURCE y separar por contrato/hunk en expediente posterior. La historia divergente no se reconcilió. No se eligió merge/rebase/cherry-pick ni se ejecutó staging. El documento 07-release-process.md ya modificado permanece protegido. Producción reportada R2: [manifest](RELEASE_MANIFEST.md); [estándar Git](../23-standards/07-git.md). Las adiciones documentales de esta orden permanecen sin stage.


## Cierre documental y observación posterior — 11/11/2026

Acción: MSE_UNIFIED_MANIFEST_CONTINUITY_G2B_APPLY_R1.

Sin repetir el inventario: publicación R4 SOURCE `d343a1bfb9ecc4f933ea425486de892fe74009b1` / Enterprise `85b6486ecbf7ae2c652cafd84f2217b0e43590a2`. Las instantáneas anteriores de ediciones sin commit y HEAD previos se conservan como antecedentes.

Checkout EC2 observado: `f80d05e80b522c18ab20751a7e18a9e6f626984c`, limpio. No confundirlo con los commits documentales R4 posteriores. Documentos/Web GHCR#34: RUNNING_OBSERVED; aceptación posterior NOT_VERIFIED. Digests y límites: adenda unificada del RELEASE_MANIFEST.

G2-B: backend E2E y revocación global PASS, nueve archivos candidatos, delta final NOT_ESTABLISHED, ampliable por interceptor/UX. Integración SOURCE/Enterprise y UX3005 pendientes; producción G2-B NOT_EXECUTED; trazabilidad versionada auth_version pendiente. No anticipar commits ni ampliar este inventario al contenido funcional de otros frentes.

Evidencias durables: `/home/loxi1/bbti-evidence/unified-manifest-continuity-g2b-r2/{ec2-ghcr-identity.json,g2b-backend-e2e.json,g2b-candidate-inventory.json}`.


## Referencias focales pendientes — 11/11/2026

- **Almacén — modal OCR Guía/NI:** implementación focal únicamente local en el worktree `documental-platform-almacen-filter-r1`; 31 pruebas focales PASS. Sin commit funcional, integración Enterprise, publicación GHCR ni despliegue acreditados. Aceptación UX no acreditada. Independiente del doble filtro integrado en SOURCE mediante `89cd4c6e`.
- **Factura TEMP334:** incidencia independiente; último estado reportado `RESERVED_INCOMPLETE`. Recuperación diseñada, no implementada ni ejecutada. Reparación productiva no autorizada. No forma parte del release ni constituye funcionalidad cerrada.
