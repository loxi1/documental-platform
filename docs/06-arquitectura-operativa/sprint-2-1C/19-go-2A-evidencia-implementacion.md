# GO-2A — Evidencia de implementación

## Identificación

```text
Control: GO-2A
Sprint: 2.1C
Rama: feat/documental-v2-carga-segura-backend-2-1C
Baseline: 143eab88be79a7275c7102c5fb5b7ceda2e720d4
HEAD validado: ba87809aa8452bf4f5b8bee86d7aa9fb661b3141
Estado: IMPLEMENTACIÓN LOCAL COMPLETADA — INTEGRACIÓN DESECHABLE PENDIENTE
```

## Alcance implementado

Se implementó el núcleo backend de carga documental segura dentro de
`apps/ms-documentos`, sin publicar endpoints nuevos y sin modificar Gateway,
Web Admin, RDS, producción ni `main`.

Componentes implementados:

- contratos tipados de entrada y resultado;
- errores y códigos funcionales;
- fingerprint `canonical-json-v1`;
- cálculo SHA-256 del archivo;
- reserva de operación;
- idempotencia por workspace, empresa e idempotency key;
- clasificación de replay, conflicto y duplicado;
- abstracción de storage;
- implementación R2;
- almacenamiento determinístico;
- compensación segura;
- persistencia atómica;
- relación opcional con expediente;
- outbox `archivo.subido`;
- transición de operación a completada;
- servicio orquestador;
- feature flag;
- token explícito de inyección para storage;
- integración interna en `DocumentosModule`.

No se agregó controlador ni endpoint público nuevo.

## Archivos modificados

```text
M apps/ms-documentos/src/app.controller.spec.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.compensation.spec.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.compensation.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.constants.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.errors.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.fingerprint.spec.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.fingerprint.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.persistence.spec.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.persistence.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.repository.spec.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.repository.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.service.spec.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.service.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.storage.spec.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.storage.ts
A apps/ms-documentos/src/documentos/carga-segura/carga-segura.types.ts
M apps/ms-documentos/src/documentos/documentos.module.ts
A docs/06-arquitectura-operativa/sprint-2-1C/18-go-2A-plan-nucleo-backend-carga-segura.md
A docs/06-arquitectura-operativa/sprint-2-1C/19-go-2A-evidencia-implementacion.md
```

Control de alcance ejecutado:

```text
Archivos fuera del perímetro autorizado: NO
FUERA_ALCANCE_FINAL_GO2A_EXIT=1
```

El código `1` corresponde a `grep` sin coincidencias.

## Commits locales

```text
6a61ad1d47172c8cbebeb7d1b77594ca698fd8f1
docs(go-2a): define secure upload backend plan

479056b503087501951e471c9de639416e48ec56
feat(documentos): add secure upload contracts and fingerprint

6f5023e904fc3b406aa5148e20347a22c9bb0570
feat(documentos): add operation repository and idempotency

38245d9320c62783b0d96c41532a28b54c3238dc
feat(documentos): add secure storage and compensation

ee8262c1b78b13f0b51cb368d13ad7222cccd5a1
feat(documentos): add atomic secure upload persistence

cabf8aa7c48cbd842f1d3ce3f5db988896984830
feat(documentos): add secure upload orchestration service

ba87809aa8452bf4f5b8bee86d7aa9fb661b3141
test(ms-documentos): isolate app controller ESM dependencies
```

Todos los objetos commit fueron validados mediante `git cat-file`.

## Build

Comando:

```bash
pnpm --filter @documental/ms-documentos build
```

Resultado:

```text
BUILD_FINAL_GO2A_EXIT=0
```

Build de `ms-documentos`: APROBADO.

## Pruebas unitarias y regresión

Comando:

```bash
pnpm --filter @documental/ms-documentos test --runInBand
```

Resultado final:

```text
Test Suites: 28 passed, 28 total
Tests:       108 passed, 108 total
Snapshots:   0 total

TEST_COMPLETO_FINAL_GO2A_EXIT=0
```

Cobertura funcional comprobada mediante pruebas unitarias:

- feature flag desactivado;
- solicitud inválida;
- fingerprint determinístico;
- reserva de operación;
- replay;
- conflicto de idempotencia;
- duplicado por hash;
- storage creado y preexistente;
- compensación;
- reconciliación;
- persistencia documental;
- relación con expediente;
- bloqueo de segundo principal;
- outbox;
- operación completada;
- rollback simulado mediante mocks;
- servicio orquestador completo;
- regresión general de `ms-documentos`.

La suite histórica `app.controller.spec.ts` fue aislada de dependencias ESM
workspace. El resultado final es:

```text
AppController: 3/3 PASS
```

## PostgreSQL 16 desechable

Estado:

```text
PENDIENTE
```

Todavía debe registrarse una ejecución real contra PostgreSQL 16 desechable que
incluya:

- creación de contenedor o base temporal;
- aplicación controlada de las migraciones 0011–0013;
- validación de constraints e índices;
- reserva concurrente real;
- transacción documental real;
- rollback real;
- outbox real;
- eliminación completa del entorno;
- confirmación de ausencia de conexión a RDS o producción.

Las pruebas actuales de repository y persistence usan dobles de prueba. No
constituyen todavía evidencia de integración PostgreSQL real.

## Concurrencia

Validado unitariamente:

- clasificación de reserva idempotente;
- replay;
- conflicto de idempotencia;
- duplicado por hash;
- bloqueo lógico de segundo principal.

Pendiente de validación real en PostgreSQL desechable:

- dos solicitudes simultáneas con la misma idempotency key;
- dos solicitudes simultáneas con el mismo hash;
- única operación ganadora;
- comportamiento de advisory lock;
- restricciones reales de la base de datos.

## Atomicidad

Validado mediante pruebas unitarias del componente de persistencia:

- inserción de documento;
- inserción de archivo;
- relación opcional;
- creación de outbox;
- transición de operación a completada;
- rechazo de operación no almacenada;
- rechazo de diferencias entre operación y comando;
- bloqueo de segundo principal.

Pendiente:

```text
Rollback transaccional comprobado contra PostgreSQL 16 real desechable.
```

## Compensación

Validado unitariamente:

- eliminación segura de objeto creado por la operación;
- protección de objeto preexistente;
- bloqueo de eliminación cuando existen referencias;
- fallo de eliminación;
- estado de reconciliación;
- fallo de persistencia después del almacenamiento.

Pendiente:

```text
Validación integrada con storage local o simulado y PostgreSQL desechable.
```

## Outbox

Contrato final:

```text
tipoEvento: archivo.subido
eventKey: carga-segura:{cargaOperacionId}:archivo.subido:v1
aggregateType: documento
aggregateId: documentoId convertido a texto
```

La creación del evento forma parte de la misma transacción lógica de
persistencia documental.

Pendiente comprobar su inserción real mediante PostgreSQL desechable.

## Integridad de migraciones

Rutas reales:

```text
infra/postgres/migrations/0011_carga_operaciones.sql
infra/postgres/migrations/0012_documentos_archivos_scope_auditoria.sql
infra/postgres/migrations/0013_documento_eventos_outbox.sql
```

Checksums confirmados:

```text
0011 cd24b2e11002542420d9a1cf2eb40587991f7efb26ae2d797a653fe42ad9a159
0012 df880f1fa87f6e1b83f2bb20cd4f4a594d5461904e24b4a5dd0a9b714e535766
0013 09ba6b26d2528c075de5ef3d983f21652bbe425735f368c1a4368e8c516efc8c
```

Verificaciones:

```text
0011–0013 modificadas por GO-2A: NO
packages/database/src/migrations/manifest.ts modificado: NO
migración 0014 creada: NO
RDS tocado: NO
producción tocada: NO
main modificado: NO
```

La migración 0011 se encontraba tanto en el baseline como en HEAD con la ruta:

```text
infra/postgres/migrations/0011_carga_operaciones.sql
```

## Directorios bloqueados

No se registraron modificaciones GO-2A en:

```text
apps/web-admin/
apps/api-gateway/
apps/ms-auth/
infra/postgres/migrations/
packages/database/src/migrations/
docker/
.github/
packages/shared/
```

La inspección del diff exacto entre baseline y HEAD no mostró cambios en
migraciones ni manifest.

## Feature flag

```text
DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED=false
```

Comportamiento implementado:

- solo el valor exacto `true` habilita la operación;
- cualquier otro valor mantiene el flujo deshabilitado;
- la prueba con flag desactivado fue aprobada;
- el servicio no reserva operaciones cuando el flag está desactivado.

## Limpieza

```text
DIFF_CHECK_FINAL_GO2A_EXIT=0
WORKTREE_LIMPIO_POST_TEST_GO2A_EXIT=0
```

El worktree quedó limpio después de ejecutar pruebas y build.

## Estado de cierre

```text
Implementación local GO-2A: COMPLETADA
Pruebas unitarias: APROBADAS
Regresión ms-documentos: APROBADA
Build ms-documentos: APROBADO
Integridad de migraciones: APROBADA
Control de alcance: APROBADO
PostgreSQL 16 desechable: PENDIENTE
Concurrencia PostgreSQL real: PENDIENTE
Storage integrado desechable: PENDIENTE

GO-2A: PENDIENTE DE VALIDACIÓN DE INTEGRACIÓN DESECHABLE

Push: NO EJECUTADO
PR: NO CREADO
Merge: NO EJECUTADO
RDS / producción / main: INTACTOS
```
