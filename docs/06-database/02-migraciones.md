# Estrategia de Migraciones

## Principios

- SQL versionado.
- Sin ORM Sync en producción.
- Orden: Schemas → Tablas → Índices → Constraints → Datos Maestros → Vistas → Funciones → Seeds.
- Registro en `core.schema_migrations(version, descripcion, checksum, ejecutado_en, ejecutado_por)`.
- Validar siempre en LAB/Staging antes de Producción.
- Una migración productiva requiere autorización propia de `DB_WRITE`.
- El deploy de aplicación no autoriza por sí mismo una migración.

## Unidad administrada de migración

Toda migración administrada está formada por:

1. el archivo SQL versionado en `infra/postgres/migrations/`;
2. su checksum SHA-256 exacto registrado en `infra/postgres/migrations/manifest.sha256`.

Por tanto:

`MIGRATION_UNIT = SQL + MANIFEST_SHA256_ENTRY`

Agregar únicamente el archivo `.sql` no completa una migración administrada.

El SHA-256 se calcula sobre los bytes exactos del SQL definitivo. Si cambia el archivo, cambia su identidad y debe volver a validarse.

## Validación antes de integración

Desde la raíz del repositorio deben acreditarse como mínimo:

    (
      cd infra/postgres/migrations &&
      sha256sum -c manifest.sha256
    )
    pnpm --dir packages/database db:migrate:verify

Además:

1. validar la migración en LAB/Staging;
2. ejecutar las pruebas del runner correspondientes;
3. comprobar idempotencia cuando el diseño la requiera;
4. no modificar una migración ya aplicada en producción.

El runner administrado es la autoridad de ejecución. No se sustituye por ejecución SQL manual cuando el runner puede ejecutar la migración.

## Ruta de publicación

La identidad de una migración sigue la ruta controlada:

`development branch → SOURCE main → Enterprise main → checkout productivo EC2 → RDS PROD`

Antes de integrar a SOURCE:

1. cerrar el SQL;
2. registrar su SHA-256 en `manifest.sha256`;
3. validar `sha256sum -c`;
4. validar `db:migrate:verify`;
5. validar LAB/Staging;
6. ejecutar tests requeridos.

Después:

1. integrar, validar y publicar SOURCE main;
2. materializar únicamente el cambio autorizado en Enterprise;
3. verificar en Enterprise la misma identidad del SQL y del manifest;
4. realizar commit/push propio de Enterprise main;
5. actualizar el checkout productivo exclusivamente desde Enterprise main;
6. volver a acreditar en EC2 commit, SQL y checksum antes de cualquier escritura en RDS.

No se ejecuta una migración productiva desde SOURCE, un development branch, un worktree, un index ni desde un SQL que no haya atravesado Enterprise.

## Gate productivo

Antes de `DB_WRITE` deben acreditarse:

1. checkout productivo = `EXPECTED_ENTERPRISE_COMMIT`;
2. SQL productivo = SQL autorizado;
3. entrada de `manifest.sha256` = checksum autorizado;
4. `db:migrate:verify = PASS`;
5. `db:migrate:status = PASS`;
6. migración objetivo = `pending`;
7. ausencia de drift o estado bloqueante;
8. autorización explícita de `DB_WRITE`.

Sólo entonces se ejecuta la migración objetivo mediante el runner administrado:

    migrate --target NNNN

Después de la ejecución deben acreditarse:

- retorno exitoso del runner;
- `db:migrate:status` posterior;
- versión objetivo = `applied`;
- registro correspondiente en `core.schema_migrations`;
- ausencia de drift o estados bloqueantes;
- postcondiciones funcionales o de permisos aplicables.

`MIGRATION_EXECUTED != MIGRATION_CLOSED`

La migración sólo puede cerrarse después del witness posterior.

## Separación respecto del deploy

`APPLICATION_RELEASE != DB_MIGRATION_AUTHORIZATION`

Una release puede contener simultáneamente cambios de aplicación y un `migration set`, pero conservan gates independientes.

Docker/GHCR no ejecuta ni revierte automáticamente migraciones de RDS.

`APPLICATION_ROLLBACK != DB_ROLLBACK != RDS_RESTORE`

El orden entre migración y actualización de aplicación debe definirse para cada release según su compatibilidad. No debe inferirse automáticamente.

## Fronteras

- PostgreSQL productivo vive en AWS RDS.
- El baseline sirve para reconstrucción limpia y no sustituye migraciones incrementales sobre una base productiva existente.
- Seeds no equivalen a migraciones estructurales.
- GIS permanece fuera del alcance salvo autorización explícita.
- OCR productivo mantiene una frontera operativa separada.

## Referencias

- `../18-runbooks/deploy-produccion.md`
- `../29-operations-manual/06-actualizar-version.md`
- `../31-governance/07-release-process.md`

### Regla de compatibilidad y orden por release

La publicación del SQL y de su entrada SHA-256 en el manifest, la ejecución de la migración y la actualización de la aplicación son actos distintos.

Antes de ejecutar una migración en producción, el SQL y el manifest autorizados deben haber atravesado la ruta de publicación indicada en este documento y su identidad debe estar acreditada en el checkout productivo. Esta publicación no ejecuta ni autoriza por sí sola la migración.

El orden entre la ejecución autorizada de la migración y la actualización de la aplicación debe definirse para cada release según la compatibilidad de esquema, las dependencias funcionales, el estado del ledger y las autorizaciones correspondientes. No existe una secuencia universal «migración → aplicación» o «aplicación → migración».

La ejecución productiva de migraciones mantiene su autorización independiente de DB_WRITE y sus verificaciones previas y posteriores.

Si el release no contiene migración:

`DB_MIGRATION=NOT_APPLICABLE`

No se ejecutan migraciones pendientes por efecto automático del deploy.
