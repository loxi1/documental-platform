# GO-1F-C2 — Corrección de integridad entre verificación y ejecución

## Estado

Corrección técnica completada localmente.

No se realizó:

- push;
- pull request;
- merge;
- ejecución sobre RDS;
- modificación de migraciones administradas;
- modificación de `manifest.sha256`.

## Commit base

```text
ab1cdd771c8ef5fa1186019185fb7da354159140
```

## Hallazgo corregido

El runner verificaba el checksum leyendo el archivo de migración y posteriormente volvía a leer la misma ruta durante la ejecución.

Esto permitía una ventana TOCTOU:

```text
verificar archivo A
→ reemplazar archivo
→ ejecutar archivo B
→ registrar checksum A
```

## Estrategia implementada

La verificación ahora realiza:

1. `lstat` sobre la ruta declarada.
2. Rechazo explícito de enlaces simbólicos.
3. Validación de archivo regular.
4. Resolución mediante `realpath`.
5. Verificación de permanencia dentro del directorio autorizado.
6. Una única lectura del archivo como `Buffer`.
7. Cálculo SHA-256 sobre ese mismo `Buffer`.
8. Conversión del mismo contenido a `sqlText`.
9. Conservación del SQL dentro de `VerifiedMigration`.
10. Ejecución posterior de `sqlText` sin reabrir el archivo.

Flujo resultante:

```text
readFile → Buffer
          ├─ SHA-256
          └─ sqlText retenido
                    ↓
             ejecución transaccional
```

## Contrato incorporado

```ts
export interface VerifiedMigration extends ManifestEntry {
  sqlText: string;
}
```

`ManifestValidationResult.entries`, los estados, el plan y la ejecución usan ahora `VerifiedMigration`.

## Protección de rutas

Se incorporaron las siguientes validaciones:

- el archivo declarado debe existir;
- no puede ser enlace simbólico;
- debe ser un archivo regular;
- su ruta real se obtiene mediante `realpath`;
- la ruta real debe permanecer dentro del directorio de migraciones.

## Eliminación de la relectura

`execute.ts` ya no importa ni utiliza:

```text
readFile
calculateFileSha256
readMigrationSql
```

La ejecución usa exclusivamente:

```ts
await sql.unsafe(entry.sqlText);
```

## Pruebas

Se ejecutaron 30 pruebas:

```text
tests: 30
pass: 30
fail: 0
```

Cobertura relevante:

- checksum calculado sobre bytes exactos;
- contenido verificado retenido aunque el archivo cambie;
- bytes ejecutados iguales a los bytes verificados;
- symlink rechazado;
- archivo no regular rechazado;
- ruta externa rechazada;
- checksum divergente bloqueado;
- migración vacía rechazada;
- ausencia de `BEGIN` cuando falla la verificación;
- `BEGIN`, SQL, registro y `COMMIT` sobre conexión reservada;
- `ROLLBACK` cuando falla el SQL;
- drift bloqueado;
- checksum administrado `NULL` bloqueado.

## Validaciones ejecutadas

```text
git diff --check                         OK
pnpm --dir packages/database check      OK
pnpm --dir packages/database build      OK
pnpm --dir packages/database test:migrations
                                        30/30 OK
pnpm --dir packages/database db:migrate:verify
                                        OK
```

## Migraciones administradas intactas

No se modificaron:

```text
infra/postgres/migrations/0011_carga_operaciones.sql
infra/postgres/migrations/0012_documentos_archivos_scope_auditoria.sql
infra/postgres/migrations/0013_documento_eventos_outbox.sql
infra/postgres/migrations/manifest.sha256
```

Checksums verificados:

```text
0011 cd24b2e11002542420d9a1cf2eb40587991f7efb26ae2d797a653fe42ad9a159
0012 df880f1fa87f6e1b83f2bb20cd4f4a594d5461904e24b4a5dd0a9b714e535766
0013 09ba6b26d2528c075de5ef3d983f21652bbe425735f368c1a4368e8c516efc8c
```

## Alcance de archivos

La corrección se limita a:

```text
packages/database/src/migrations/
packages/database/src/migrations/__tests__/
docs/06-arquitectura-operativa/sprint-2-1C/
```

## Commit propuesto

```text
fix(database): bind migration execution to verified bytes
```
