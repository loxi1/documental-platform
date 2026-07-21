# GO-2A — Evidencia de implementación

## Identificación

```text
Control: GO-2A
Sprint: 2.1C
Rama: feat/documental-v2-carga-segura-backend-2-1C
Baseline: 143eab88be79a7275c7102c5fb5b7ceda2e720d4
HEAD validado: a5fa3e0c7daa48811c8a61a916da74693235d0af
Estado: IMPLEMENTACIÓN LOCAL E INTEGRACIÓN DESECHABLE COMPLETADAS
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

5b24de4c49e386a9ac452c29afecf850f79c58fd
docs(go-2a): record secure upload implementation evidence

77938d03c8ff0eb5182045c4f71f815506fd90f2
fix(documentos): normalize secure upload bigint fields

a5fa3e0c7daa48811c8a61a916da74693235d0af
docs(go-2a): record disposable integration evidence
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
Tests:       109 passed, 109 total
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
- normalización runtime de columnas PostgreSQL `bigint`;
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
APROBADO
```

Se creó un laboratorio local y aislado con PostgreSQL 16:

```text
Contenedor: dp_postgres_go2a8
Base: documental_go2a8
Puerto local: 127.0.0.1:55432
Network: dp_go2a8_net
Volume: dp_postgres_go2a8_data
```

El laboratorio usó únicamente datos sintéticos identificados como GO2A8. No se
realizaron conexiones ni cambios sobre RDS o producción.

Se aplicaron controladamente las migraciones:

```text
0011_carga_operaciones.sql
0012_documentos_archivos_scope_auditoria.sql
0013_documento_eventos_outbox.sql
```

Resultados comprobados:

- primera ejecución: migraciones 0011–0013 aplicadas;
- segunda ejecución: ninguna migración reaplicada;
- checksums coincidentes con los archivos oficiales;
- constraints e índices presentes;
- privilegios destructivos de `platform_app`: cero;
- migraciones y manifest del repositorio sin modificaciones;
- PostgreSQL reportado como saludable durante las pruebas.

Checksums validados:

```text
0011 cd24b2e11002542420d9a1cf2eb40587991f7efb26ae2d797a653fe42ad9a159
0012 df880f1fa87f6e1b83f2bb20cd4f4a594d5461904e24b4a5dd0a9b714e535766
0013 09ba6b26d2528c075de5ef3d983f21652bbe425735f368c1a4368e8c516efc8c
```

El laboratorio continúa preservado temporalmente para trazabilidad y auditoría.
Su eliminación todavía no se declara.

## Concurrencia

Validación real contra PostgreSQL 16: APROBADA.

### Misma clave de idempotencia

Se ejecutaron ocho solicitudes concurrentes con la misma clave y el mismo
fingerprint.

Resultado:

```text
RESERVED: 1
REPLAYED: 7
Operaciones persistidas: 1
```

La operación ganadora fue única y las demás solicitudes fueron clasificadas
como replay.

### Mismo hash con claves diferentes

Se ejecutaron ocho solicitudes concurrentes con diferentes claves de
idempotencia y el mismo hash SHA-256.

Resultado:

```text
RESERVED: 1
DUPLICATE: 7
Operaciones persistidas: 1
```

La deduplicación por hash produjo una única operación ganadora.

### Validaciones secuenciales

También se comprobaron:

- reserva inicial;
- replay exacto;
- conflicto por misma clave y fingerprint distinto;
- duplicado por hash;
- nueva reserva con hash diferente.

Los saltos de secuencia observados son compatibles con
`INSERT ... ON CONFLICT DO NOTHING`; no representan filas duplicadas ni pérdida
de atomicidad.

## Atomicidad

Validación PostgreSQL real: APROBADA.

La operación sintética 22 completó en una sola transacción:

- documento;
- archivo documental;
- relación principal con expediente;
- evento outbox;
- actualización de operación a `completada`.

Resultado inicial:

```text
documento_id: 1
archivo_id: 1
event_key: carga-segura:22:archivo.subido:v1
```

Se validó además:

- transición `iniciada` → `almacenada` → `completada`;
- coherencia entre operación y comando;
- bloqueo mediante `FOR UPDATE`;
- advisory lock por expediente;
- rollback real;
- rechazo de un segundo documento principal.

La operación 23 intentó crear un segundo principal y fue rechazada con:

```text
CARGA_SEGURA_PERSISTENCE_FAILED
El expediente ya tiene un documento principal
```

Después del rechazo permanecieron exactamente un documento, un archivo, una
relación y un evento outbox. No se creó ninguna fila parcial.

## Compensación

Validación integrada con storage desechable y PostgreSQL: APROBADA.

Casos ejecutados:

1. Operación 24:
   - `putObject` exitoso;
   - persistencia exitosa;
   - operación `completada`;
   - objeto físico conservado;
   - documento, archivo, relación y outbox creados.

2. Operación 25:
   - `putObject` exitoso;
   - persistencia forzada a fallar;
   - `deleteObject` exitoso;
   - operación `fallida`;
   - objeto físico eliminado;
   - sin documento, archivo ni outbox.

3. Operación 26:
   - `putObject` exitoso;
   - persistencia forzada a fallar;
   - `deleteObject` fallido;
   - operación `requiere_reconciliacion`;
   - código `ARCHIVO_REQUIERE_RECONCILIACION`;
   - objeto físico preservado;
   - sin documento, archivo ni outbox.

Storage desechable:

```text
/tmp/go2a8-disposable-storage
```

Objetos preservados:

```text
24__go2a8-storage-success.pdf
26__go2a8-compensate-delete-fail.pdf
```

El primer objeto tiene referencia documental activa. El segundo se conserva
para reconciliación.

## Outbox

Contrato validado:

```text
tipoEvento: archivo.subido
eventKey: carga-segura:{cargaOperacionId}:archivo.subido:v1
aggregateType: documento
aggregateId: documentoId convertido a texto
estado inicial: pendiente
```

La creación del evento se comprobó dentro de la misma transacción de
persistencia documental.

Resultados del laboratorio:

```text
operación 22 → outbox 1
operación 24 → outbox 2
operación 25 → sin outbox
operación 26 → sin outbox
```

Las operaciones compensadas o pendientes de reconciliación no generaron eventos
parciales.

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
DIFF_CHECK_POST_DISPOSABLE_STORAGE_GO2A8_EXIT=0
WORKTREE_LIMPIO_PRE_EVIDENCE_UPDATE_EXIT=0
```

El repositorio quedó limpio después de build, pruebas e integración.

El laboratorio PostgreSQL y el storage desechable continúan preservados
temporalmente para trazabilidad y auditoría. No debe interpretarse como falta de
aislamiento: ambos recursos son locales y no tienen conexión con RDS ni
producción.

## Estado de cierre

```text
Implementación local GO-2A: COMPLETADA
Pruebas unitarias: APROBADAS
Regresión ms-documentos: APROBADA — 28 suites / 109 tests
Build ms-documentos: APROBADO
Integridad de migraciones: APROBADA
Control de alcance: APROBADO
PostgreSQL 16 desechable: APROBADO
Concurrencia PostgreSQL real: APROBADA
Persistencia y outbox atómicos: APROBADOS
Rollback PostgreSQL real: APROBADO
Bloqueo de segundo principal: APROBADO
Normalización bigint runtime: APROBADA
Storage integrado desechable: APROBADO
Compensación: APROBADA
Reconciliación: APROBADA

GO-2A: VALIDACIÓN LOCAL E INTEGRACIÓN DESECHABLE COMPLETADAS

Push: NO EJECUTADO
PR: NO CREADO
Merge: NO EJECUTADO
RDS / producción / main: INTACTOS
```

El cierre corresponde únicamente a GO-2A local. La publicación y los controles
posteriores GO-2B, GO-2C, GO-2D y GO-2E permanecen sujetos a autorización
independiente.
