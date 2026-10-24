# Inventario SOURCE y Enterprise — R2

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
