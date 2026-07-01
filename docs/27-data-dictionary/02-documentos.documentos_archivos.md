# Tabla: documentos.documentos_archivos

## Qué representa

Archivo físico asociado a un documento lógico.

## Campos principales

| Campo | Descripción |
|---|---|
| `id` | Identificador del archivo. |
| `documento_id` | Documento lógico asociado. |
| `nombre_archivo` | Nombre original o lógico del archivo. |
| `storage_provider` | Proveedor de almacenamiento, actualmente R2. |
| `storage_bucket` | Bucket usado. |
| `storage_key` | Key/path en R2. |
| `content_type` | MIME type. |
| `hash_sha256` | Hash para control de duplicados físicos. |
| `estado` | Estado del archivo. |
| `tipo_version` | original, escaneado, firmado, corregido, etc. |
| `version` | Número de versión. |
| `es_version_actual` | Indica versión actual. |

## Reglas

- No sobrescribir archivo físico.
- Un documento lógico puede tener varios archivos.
- Solo una versión actual por documento.
- Signed URL se genera desde `storage_key`.

## APIs relacionadas

- Carga guiada.
- Preview URL.
- Agregar versión.
- Historial de versiones.
