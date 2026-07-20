# Sprint 2.1C — Evidencia GO-1E del runner de migraciones

## 1. Identificación

```text
Proyecto:
Documental Platform ERP

Sprint:
2.1C — Carga Documental Segura MVP

Paquete:
GO-1E — Runner local de migraciones PostgreSQL

Rama:
feat/documental-v2-carga-segura-2-1C

Commit base:
d91a457c0721173a1b3f3989dfacb284940e3c65

Commit base resumido:
d91a457c — fix(database): move 0012 checks to postvalidation

Fecha de validación:
2026-07-19
```

## 2. Alcance autorizado

GO-1E implementa un runner local en TypeScript y Node.js para administrar las migraciones declaradas en:

```text
infra/postgres/migrations/manifest.sha256
```

El alcance incluyó:

- lectura y validación del manifest;
- cálculo SHA-256 sobre los bytes exactos de cada archivo;
- detección de archivos faltantes o no declarados;
- control de versiones duplicadas;
- conexión mediante `DATABASE_URL`;
- advisory lock estable de PostgreSQL;
- consulta de `core.schema_migrations`;
- detección de estado `pending`, `applied`, `drift` y checksum `NULL`;
- ejecución del SQL completo sin división por punto y coma;
- transacción atómica por migración;
- registro de versión, descripción, checksum y actor;
- comandos `verify`, `status` y `migrate`;
- pruebas unitarias y pruebas integrales en PostgreSQL desechable.

## 3. Restricciones respetadas

```text
RDS: NO UTILIZADO
Producción: NO UTILIZADA
Base PostgreSQL principal: NO UTILIZADA
Backend: NO MODIFICADO
API Gateway: NO MODIFICADO
Web Admin: NO MODIFICADO
Migraciones SQL 0011–0013: NO MODIFICADAS
Manifest: NO MODIFICADO
Mecanismo --force: NO IMPLEMENTADO
Actualización automática de checksum: NO IMPLEMENTADA
Push: NO EJECUTADO
PR: NO CREADO
```

## 4. Migraciones administradas

| Versión | Archivo | SHA-256 |
|---|---|---|
| 0011 | `0011_carga_operaciones.sql` | `cd24b2e11002542420d9a1cf2eb40587991f7efb26ae2d797a653fe42ad9a159` |
| 0012 | `0012_documentos_archivos_scope_auditoria.sql` | `df880f1fa87f6e1b83f2bb20cd4f4a594d5461904e24b4a5dd0a9b714e535766` |
| 0013 | `0013_documento_eventos_outbox.sql` | `09ba6b26d2528c075de5ef3d983f21652bbe425735f368c1a4368e8c516efc8c` |

Los archivos legacy con versión menor que `0011` permanecen fuera del manifest administrado. Sus registros históricos con checksum `NULL` no bloquean el runner.

## 5. Arquitectura implementada

```text
verificar manifest y checksums
→ cargar DATABASE_URL
→ crear conexión PostgreSQL
→ reservar una conexión física
→ adquirir advisory lock estable
→ consultar core.schema_migrations
→ bloquear drift o checksum NULL administrado
→ ejecutar cada migración pendiente
→ BEGIN
→ SQL completo
→ INSERT en core.schema_migrations
→ COMMIT
→ liberar advisory lock
→ liberar conexión reservada
→ cerrar conexión
```

Clave estable del advisory lock:

```text
7349927134510011
```

Configuración de conexión:

```text
max = 1
prepare = false
connect_timeout = 10
idle_timeout = 5
```

## 6. Comandos disponibles

```bash
pnpm --dir packages/database db:migrate:verify
pnpm --dir packages/database db:migrate:status
pnpm --dir packages/database db:migrate
pnpm --dir packages/database test:migrations
```

`verify` valida archivos, nombres, manifest y checksums antes de crear una conexión.

`status` clasifica las migraciones como `pending`, `applied`, `drift` o `invalid_null_checksum`. Los estados bloqueantes terminan con código distinto de cero.

`migrate` ejecuta únicamente las migraciones pendientes, conserva el orden del manifest y omite las ya aplicadas con checksum coincidente.

## 7. Evidencia de validación estática

```text
git diff --check: EXIT 0
TypeScript check: EXIT 0
Build: EXIT 0
Manifest verify: EXIT 0
Pruebas: 24 ejecutadas, 24 aprobadas, 0 fallidas
```

La suite cubre checksum exacto, CLI, manifest, estados, advisory lock, planificación, transacción exitosa y rollback.

## 8. Entorno integral desechable

```text
Contenedor: dp_postgres_go1e_runner
Imagen: postgres:16
Base: documental_go1e
Exposición: 127.0.0.1:32768
Clasificación: desechable y aislado
```

El baseline fue obtenido mediante `pg_dump --schema-only` desde `dp_postgres_go1d`, que permaneció sin red y sin puertos publicados. No se copiaron datos.

## 9. Aplicación inicial

Estado previo:

```text
0011 pending
0012 pending
0013 pending
```

Resultado:

```text
aplicadas: 0011, 0012, 0013
omitidas: ninguna
código de salida: 0
```

Se verificó la creación de `documentos.carga_operaciones`, las once columnas de `0012`, `documentos.documento_eventos_outbox`, los checksums exactos y cero advisory locks retenidos.

## 10. Idempotencia

La segunda ejecución no aplicó migraciones y omitió `0011–0013`. `core.schema_migrations` no cambió.

```text
SCHEMA_MIGRATIONS_SIN_CAMBIOS=SI
```

## 11. Drift bloqueante

Se alteró temporalmente el checksum de `0012` en la base desechable.

```text
status: EXIT 1
migrate: EXIT 1
mensaje: DRIFT detectado en versión 0012
cambios adicionales: ninguno
advisory locks retenidos: 0
```

El checksum original fue restaurado.

## 12. Checksum NULL administrado

Se estableció temporalmente `0013.checksum = NULL`.

```text
legacy NULL: aceptado
0013 NULL: bloqueado
status: EXIT 1
migrate: EXIT 1
cambios adicionales: ninguno
advisory locks retenidos: 0
```

Mensaje comprobado:

```text
La migración administrada 0013 está registrada con checksum NULL
```

## 13. Rollback real

Se ejecutó una migración sintética `9901` con DDL, DML y una sentencia inválida, seguida de `9902`.

```text
9901: falló de forma controlada
tabla 9901: ausente después del rollback
fila 9901: revertida
registro 9901: ausente
tabla 9902: ausente
registro 9902: ausente
advisory locks retenidos: 0
```

Se confirmó rollback de DDL y DML, ausencia de registro parcial, detención inmediata y liberación del lock.

## 14. Seguridad y gobierno

La revisión final no encontró secretos embebidos, destinos RDS, endpoints productivos, `--force`, ni operaciones `UPDATE`, `DELETE` o `TRUNCATE` sobre `core.schema_migrations`.

Los logs muestran únicamente host, puerto, base, versiones, archivos y checksums; no muestran usuario ni contraseña.

## 15. Archivos implementados

```text
packages/database/src/migrations/
├── checksum.ts
├── cli.ts
├── config.ts
├── database.ts
├── execute.ts
├── lock.ts
├── logger.ts
├── manifest.ts
├── migrate.ts
├── paths.ts
├── state.ts
├── status.ts
├── types.ts
├── verify.ts
└── __tests__/
    ├── checksum.test.ts
    ├── cli.test.ts
    ├── execute.test.ts
    ├── lock.test.ts
    ├── manifest.test.ts
    ├── migrate.test.ts
    └── state.test.ts
```

Además se incorporaron scripts en `packages/database/package.json`.

## 16. Dictamen

```text
Runner local: IMPLEMENTADO
Manifest y SHA-256: VALIDADOS
Advisory lock: VALIDADO
Aplicación inicial: VALIDADA
Idempotencia: VALIDADA
Drift: BLOQUEADO CORRECTAMENTE
Checksum NULL administrado: BLOQUEADO CORRECTAMENTE
Rollback: VALIDADO
Detención tras primer fallo: VALIDADA
Suite: 24/24 APROBADA
Producción/RDS: NO TOCADOS
Push: BLOQUEADO
```

GO-1E queda técnicamente validado para commit local y revisión del Maestro Intermedio. Este documento no autoriza aplicación en RDS, producción, push, merge ni integración.
