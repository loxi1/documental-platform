# Sprint 2.1C — Corrección de invariantes GO-1C

## Alcance

Paquete preparado exclusivamente para reemplazar los cuatro archivos autorizados:

- `infra/postgres/migrations/0011_carga_operaciones.sql`
- `infra/postgres/migrations/0012_documentos_archivos_scope_auditoria.sql`
- `infra/postgres/migrations/0013_documento_eventos_outbox.sql`
- `infra/postgres/migrations/manifest.sha256`

No contiene runner, backend, Gateway, Web Admin ni ejecución SQL.

## Correcciones incorporadas

### 0011

- Conserva `uq_carga_operaciones_scope_hash_bloqueante`.
- Exige orden temporal coherente entre `iniciada_en`, `almacenada_en`, `completada_en`, `fallida_en` y `actualizado_en`.
- Exige `almacenada_en` para `completada` y `requiere_reconciliacion`.
- Mantiene incompatibilidad entre finalización exitosa y fallida.
- Postvalida `USAGE=true`, `CREATE=false`, `DELETE=false`, `TRUNCATE=false` y ausencia de grants a `PUBLIC`.

### 0012

- Postvalida tipo y nulabilidad de todas las columnas de auditoría.
- Postvalida definiciones de FK y acciones `ON DELETE` mediante `pg_get_constraintdef(...)`.
- Postvalida el check de anulación.
- Postvalida definiciones y predicados parciales de índices.
- Postvalida privilegios positivos y negativos, y ausencia de grants a `PUBLIC`.

### 0013

- Rechaza strings vacíos en `tipo_evento`, `aggregate_type`, `aggregate_id`, `idempotency_key` y `locked_by` cuando exista.
- Exige `ultimo_error` no vacío para `fallido_permanente`.
- Documenta que `proximo_intento_en` solo gobierna la selección operativa en estado `pendiente`.
- Postvalida las nuevas definiciones y privilegios negativos.

## Checksums

```text
cd24b2e11002542420d9a1cf2eb40587991f7efb26ae2d797a653fe42ad9a159  0011_carga_operaciones.sql
a5341255f5052123b7db9d651e917ae072c82ffd089b5f3f3122ac3a8fe9b6cf  0012_documentos_archivos_scope_auditoria.sql
09ba6b26d2528c075de5ef3d983f21652bbe425735f368c1a4368e8c516efc8c  0013_documento_eventos_outbox.sql
```

SHA-256 de `manifest.sha256`:

```text
68a18059b948eab0e5fe8e71060f1a369ba285d7a7943d8e3bead92763a8b8d7
```

## Aplicación local autorizada

Copiar archivo por archivo sobre la ruta canónica. No usar `rsync --delete` ni reemplazar el directorio completo.

```bash
cp infra/postgres/migrations/0011_carga_operaciones.sql \
  ~/projects/apps/documental-platform-carga-segura-2-1C/infra/postgres/migrations/
cp infra/postgres/migrations/0012_documentos_archivos_scope_auditoria.sql \
  ~/projects/apps/documental-platform-carga-segura-2-1C/infra/postgres/migrations/
cp infra/postgres/migrations/0013_documento_eventos_outbox.sql \
  ~/projects/apps/documental-platform-carga-segura-2-1C/infra/postgres/migrations/
cp infra/postgres/migrations/manifest.sha256 \
  ~/projects/apps/documental-platform-carga-segura-2-1C/infra/postgres/migrations/
```

Después validar, sin ejecutar SQL:

```bash
cd ~/projects/apps/documental-platform-carga-segura-2-1C/infra/postgres/migrations
sha256sum -c manifest.sha256
cd ../../..
git diff --check
git status --short
```

## Restricciones

- No ejecutar `0011`, `0012` ni `0013`.
- No registrar versiones en `core.schema_migrations`.
- No ejecutar pruebas PostgreSQL.
- No hacer `push`.
