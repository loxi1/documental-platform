# GO-1F-C3 — Apertura segura y UTF-8 estricto

## Estado

Corrección técnica completada localmente sobre:

```text
70b369f3a0f5b6a4a9ff6452dffa8ebcd11ec052
```

No se realizó:

- push;
- pull request;
- merge;
- ejecución sobre RDS;
- modificación de migraciones administradas;
- modificación de `manifest.sha256`;
- cambios en backend, gateway o frontend.

## Objetivo

Cerrar los dos bloqueos finales del dictamen GO-1F-C2:

1. apertura segura del archivo sin seguimiento de symlink;
2. decodificación UTF-8 estricta y reversible.

## Alcance aplicado

La corrección quedó limitada a:

```text
packages/database/src/migrations/verify.ts
packages/database/src/migrations/__tests__/verify.test.ts
```

## Apertura segura

El archivo de migración se abre mediante:

```typescript
await open(
  entry.absolutePath,
  constants.O_RDONLY | constants.O_NOFOLLOW,
);
```

Política de plataforma:

```text
Linux:
OBLIGATORIO

O_NOFOLLOW:
OBLIGATORIO

Degradación silenciosa:
NO PERMITIDA
```

En plataformas distintas de Linux el runner falla cerrado.

## Validación sobre descriptor

Después de abrir el archivo:

```text
open con O_NOFOLLOW
→ handle.stat()
→ validar archivo regular
→ handle.readFile()
→ handle.close() en finally
```

`fstat` y lectura operan sobre el mismo descriptor abierto.

Esto evita que la validación del tipo de archivo dependa de una segunda apertura por ruta.

## Contención de ruta

Antes de abrir:

1. se resuelve `realpath`;
2. se valida que la ruta permanezca dentro del directorio autorizado.

Además, `O_NOFOLLOW` impide seguir un symlink en el componente final.

## Lectura única

Los bytes se obtienen una sola vez mediante:

```typescript
const sqlBytes = await handle.readFile();
```

El mismo `Buffer` se usa para:

```text
SHA-256
decodificación UTF-8
round-trip
sqlText retenido
```

La ejecución posterior continúa usando:

```typescript
await sql.unsafe(entry.sqlText);
```

No existe relectura durante `migrate`.

## UTF-8 estricto

Se incorporó:

```typescript
new TextDecoder('utf-8', {
  fatal: true,
  ignoreBOM: false,
});
```

Política:

```text
UTF-8 inválido:
RECHAZADO

BOM UTF-8:
RECHAZADO

Byte NUL:
RECHAZADO

Round-trip bytes → texto → bytes:
OBLIGATORIO
```

## Round-trip exacto

Después de decodificar:

```typescript
const roundTripBytes =
  Buffer.from(sqlText, 'utf8');

if (!roundTripBytes.equals(sqlBytes)) {
  throw new Error(...);
}
```

Esto garantiza que el texto retenido y ejecutado representa exactamente los bytes aprobados.

## Pruebas

La suite pasó de 30 a 35 pruebas.

Resultado:

```text
tests: 35
pass: 35
fail: 0
```

Pruebas nuevas:

- SQL ASCII válido con round-trip exacto;
- SQL UTF-8 válido con caracteres no ASCII;
- secuencia UTF-8 inválida;
- BOM UTF-8;
- byte NUL.

Se mantienen aprobadas las pruebas de:

- contenido retenido;
- ejecución exacta del SQL verificado;
- symlink rechazado;
- archivo no regular;
- ruta externa;
- checksum divergente;
- ausencia de transacción cuando falla la verificación;
- `BEGIN`, `COMMIT` y `ROLLBACK`;
- drift;
- checksum administrado `NULL`.

## Validaciones ejecutadas

```text
git diff --check                         OK
pnpm --dir packages/database check      OK
pnpm --dir packages/database build      OK
pnpm --dir packages/database test:migrations
                                        35/35 OK
pnpm --dir packages/database db:migrate:verify
                                        OK
```

## Migraciones administradas intactas

Sin cambios en:

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

## Estado Git previo al commit

```text
HEAD base:
70b369f3a0f5b6a4a9ff6452dffa8ebcd11ec052

Archivos modificados:
2

Worktree:
con cambios locales controlados

Push:
no realizado

RDS:
no ejecutado
```

## Commit propuesto

```text
fix(database): harden verified migration file loading
```
