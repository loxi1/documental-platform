# Sprint 2.1C — Corrección GO-1D de la migración 0012

## Antecedente

Durante la validación transaccional controlada GO-1D sobre PostgreSQL local aislado, la migración `0011` terminó correctamente dentro de la transacción, pero `0012_documentos_archivos_scope_auditoria.sql` se detuvo antes del DDL con el error:

```text
0012: postvalidación fallida; definición de FK o acción ON DELETE incompatible
```

La sesión finalizó con código distinto de cero y PostgreSQL revirtió automáticamente toda la transacción. Se verificó después:

- `documentos.carga_operaciones`: ausente;
- `documentos.documento_eventos_outbox`: ausente;
- columnas agregadas por 0012: 0;
- `core.schema_migrations`: 3 registros, sin cambios.

## Causa raíz

Dos validaciones basadas en `pg_get_constraintdef(...)` estaban ubicadas dentro de `DO $prevalidation$`:

1. definición y acción `ON DELETE` de las seis claves foráneas;
2. definición del check `documentos_archivos_anulacion_coherente_ck`.

La propia prevalidación exigía antes que esas constraints todavía no existieran. Por ello, las validaciones posteriores dentro del mismo bloque siempre fallaban antes de ejecutar el DDL.

## Corrección aplicada

Se movieron sin modificar su semántica los dos bloques anteriores desde la prevalidación hacia `DO $postvalidation$`, inmediatamente después de verificar la existencia nominal de las constraints y antes de validar los índices.

La prevalidación queda limitada a comprobar:

- schemas y dependencias requeridas presentes;
- columnas nuevas ausentes;
- constraints nuevas ausentes;
- índices nuevos ausentes.

La postvalidación comprueba:

- constraints presentes;
- definición exacta de las FK;
- acciones `ON DELETE` esperadas;
- definición coherente del check de anulación;
- índices y predicados;
- permisos positivos y negativos.

## Alcance

Archivos modificados:

- `infra/postgres/migrations/0012_documentos_archivos_scope_auditoria.sql`;
- `infra/postgres/migrations/manifest.sha256`.

No se modifican:

- `0011_carga_operaciones.sql`;
- `0013_documento_eventos_outbox.sql`;
- backend, runner, Gateway o Web Admin;
- `core.schema_migrations`.

## Checksum resultante

```text
df880f1fa87f6e1b83f2bb20cd4f4a594d5461904e24b4a5dd0a9b714e535766  0012_documentos_archivos_scope_auditoria.sql
```

## Restricciones

- no ejecutar en producción ni RDS;
- no registrar versiones;
- no hacer push;
- repetir GO-1D únicamente después de revisión estática acotada;
- usar una transacción exterior y finalizar con `ROLLBACK`.
