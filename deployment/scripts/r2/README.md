# Migración R2 desarrollo → producción

Ejecutar desde la raíz del repositorio con el entorno Python del worker:

```bash
workers/ocr-worker/.venv/bin/python deployment/scripts/r2/migrate.py --report /tmp/r2-inventory.json
workers/ocr-worker/.venv/bin/python deployment/scripts/r2/migrate.py --report /tmp/r2-copy.json --apply --workers 8
workers/ocr-worker/.venv/bin/python deployment/scripts/r2/test_migrate.py
```

Origen: `apps/ms-documentos/.env`, cuenta de desarrollo, bucket `data-prod`.
Destino: `deployment/env/.env.production`, cuenta de producción, bucket `proyectos-prod`.
Las cuentas y buckets se validan antes de operar. El prefijo predeterminado es
`documentos/`. No se modifican ni borran objetos del origen. Los objetos existentes
en destino se comparan y nunca se sobrescriben. Una diferencia detiene la ejecución
con un error; otras transferencias en curso pueden terminar. El informe registra
los estados individuales y SHA-256 verificados. Se puede repetir la ejecución.

La copia conserva las claves y metadatos S3 habituales. No modifica base de datos,
no copia registros de negocio, no reinicia servicios y no publica cambios de aplicación.
Los objetos cambiados durante la transferencia provocan un error. El límite de
PutObject simple aplica; para esta migración los objetos caben en dicho límite.

Para inspeccionar las referencias de la base configurada en producción:

```bash
node deployment/scripts/r2/inspect-db.cjs
```

Esta consulta es de solo lectura y requiere el inventario
`/tmp/r2-migration-copy.json`. No actualizar `storage_bucket` de forma global:
actualizar solamente referencias a claves verificadas y revisar también
`destino_storage_bucket` y las URL públicas que correspondan. Si no hay coincidencias,
identificar primero la base que contiene los documentos. Las credenciales S3 son
Access Key ID y Secret Access Key; un token REST de Cloudflare es distinto.
