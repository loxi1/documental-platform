# ESTADO: EJECUTADO Y CERRADO

> Este bloque ya fue aplicado. No debe ejecutarse nuevamente.
>
> Resultado versionado en:
>
> ```text
> 1f63e41e fix(documental-v2): align secure upload contract
> ```
>
> Se conserva únicamente como evidencia histórica y guía de trazabilidad.

---

# Bloque controlado C-01 + C-02 + C-03

## Sprint 2.1C — Alineamiento final del contrato de Carga Segura

**Rama objetivo:** `test/integracion-exposicion-carga-segura-2-1C`

Este archivo contiene el bloque de implementación que debe ejecutarse desde la raíz del repositorio.

> Importante: el bloque no activa el feature flag, no aplica migraciones y no toca Carga Guiada legacy.

---

## 1. Aplicar cambios

```bash
cd "$HOME/projects/apps/documental-platform-adaptador-gateway-carga-segura-2-1C"

python3 <<'PY'
from pathlib import Path

def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")

    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {path}: se esperaba 1 coincidencia y se encontraron {count}"
        )

    file.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"ACTUALIZADO: {path}")


# C-01 — aceptar únicamente el campo multipart `archivo`

replace_once(
    "apps/ms-documentos/src/documentos/carga-segura/http/carga-segura-http.constants.ts",
    "export const CARGA_SEGURA_HTTP_FILE_FIELDS = ['archivo', 'file'] as const;",
    "export const CARGA_SEGURA_HTTP_FILE_FIELDS = ['archivo'] as const;",
)

replace_once(
    "apps/ms-documentos/src/documentos/carga-segura/http/carga-segura-multer.ts",
    """export const CARGA_SEGURA_MULTER_FIELDS = [
  {
    name: 'archivo',
    maxCount: 1,
  },
  {
    name: 'file',
    maxCount: 1,
  },
] as const;""",
    """export const CARGA_SEGURA_MULTER_FIELDS = [
  {
    name: 'archivo',
    maxCount: 1,
  },
] as const;""",
)

replace_once(
    "apps/ms-documentos/src/documentos/carga-segura/http/carga-segura.controller.ts",
    "Record<'archivo' | 'file', CargaSeguraUploadedFile[]>",
    "Record<'archivo', CargaSeguraUploadedFile[]>",
)

replace_once(
    "apps/ms-documentos/src/documentos/carga-segura/http/carga-segura.controller.ts",
    """  const archivo = files?.archivo?.[0];
  const alias = files?.file?.[0];

  if (archivo && alias) {
    throw validationError('No se puede enviar archivo y file simultáneamente');
  }

  const resolved = archivo ?? alias;

  if (!resolved) {
    throw validationError('La solicitud debe contener exactamente un archivo');
  }

  if (
    !Buffer.isBuffer(resolved.buffer) ||
    resolved.size <= 0 ||
    resolved.size !== resolved.buffer.length
  ) {
    throw validationError('El archivo multipart es inválido');
  }

  return resolved;""",
    """  const archivo = files?.archivo?.[0];

  if (!archivo) {
    throw validationError('La solicitud debe contener exactamente un archivo');
  }

  if (
    !Buffer.isBuffer(archivo.buffer) ||
    archivo.size <= 0 ||
    archivo.size !== archivo.buffer.length
  ) {
    throw validationError('El archivo multipart es inválido');
  }

  return archivo;""",
)


# C-02 — ampliar claves canónicas reservadas de metadata

constants_path = Path(
    "apps/ms-documentos/src/documentos/carga-segura/http/"
    "carga-segura-http.constants.ts"
)
constants_text = constants_path.read_text(encoding="utf-8")

start = constants_text.index(
    "export const CARGA_SEGURA_HTTP_RESERVED_METADATA_KEYS = new Set(["
)
end_marker = "]);"
end = constants_text.index(end_marker, start) + len(end_marker)

reserved_block = """export const CARGA_SEGURA_HTTP_RESERVED_METADATA_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'workspaceId',
  'empresaCodigo',
  'clienteDestinoId',
  'expedienteId',
  'actorId',
  'usuarioId',
  'idempotencyKey',
  'requestId',
  'correlationId',
  'cargaOperacionId',
  'canalIngreso',
  'tipoDocumental',
  'tipoRelacion',
  'esPrincipal',
  'nombreArchivo',
  'contentType',
  'tamanoBytes',
  'hashSha256',
  'storageProvider',
  'storageBucket',
  'storageKey',
  'origen',
]);"""

constants_path.write_text(
    constants_text[:start] + reserved_block + constants_text[end:],
    encoding="utf-8",
)
print(f"ACTUALIZADO: {constants_path}")


# C-03 — corregir mensaje fallback del Gateway

old_message = "No se pudo confirmar el resultado de la carga documental segura"
new_message = "No se pudo completar la carga del documento."

for path in [
    "apps/api-gateway/src/documentos/carga-segura.mapper.ts",
    "apps/api-gateway/src/documentos/carga-segura.mapper.spec.ts",
    "apps/api-gateway/src/documentos/documentos.carga-segura.controller.spec.ts",
]:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    count = text.count(old_message)

    if count == 0:
        raise SystemExit(f"ERROR: no se encontró el mensaje anterior en {path}")

    file.write_text(text.replace(old_message, new_message), encoding="utf-8")
    print(f"ACTUALIZADO: {path} ({count} coincidencia(s))")


# Crear documentación del endpoint

endpoint_doc = Path("docs/16-api/carga-documental-segura.md")

if endpoint_doc.exists():
    raise SystemExit(
        "ERROR: docs/16-api/carga-documental-segura.md ya existe; "
        "revisarlo antes de sobrescribir."
    )

endpoint_doc.write_text(
    """# Carga Documental Segura

## Endpoint

```http
POST /api/v1/documentos/carga-segura
```

## Contrato multipart

El único campo permitido para el binario es:

```text
archivo
```

El alias `file` no forma parte del contrato.

## Campos

```text
archivo          obligatorio
expedienteId     obligatorio
tipoDocumental   obligatorio
tipoRelacion     opcional
esPrincipal      obligatorio
canalIngreso     obligatorio
metadata         opcional
```

## Archivo permitido

- máximo: 15 MiB;
- `application/pdf`;
- `image/jpeg`;
- `image/png`.

## Metadata

`metadata` no puede duplicar, sustituir ni sombrear atributos canónicos.

Claves reservadas:

```text
__proto__
prototype
constructor
workspaceId
empresaCodigo
clienteDestinoId
expedienteId
actorId
usuarioId
idempotencyKey
requestId
correlationId
cargaOperacionId
canalIngreso
tipoDocumental
tipoRelacion
esPrincipal
nombreArchivo
contentType
tamanoBytes
hashSha256
storageProvider
storageBucket
storageKey
origen
```

La validación también se aplica dentro de objetos anidados.

## Feature flag

```text
DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED
```

Solo el valor literal `true` habilita la operación.

## OCR

La finalización de la carga no depende del OCR.

## Mensaje fallback

```text
No se pudo completar la carga del documento.
```
""",
    encoding="utf-8",
)
print(f"CREADO: {endpoint_doc}")


# Añadir adenda al contrato técnico

contract_path = Path(
    "docs/06-arquitectura-operativa/sprint-2-1C/"
    "07-propuesta-contractual-carga-documental-segura.md"
)
contract_text = contract_path.read_text(encoding="utf-8")

heading = "## Adenda contractual — alineamiento final previo a activación"

if heading in contract_text:
    raise SystemExit("ERROR: la adenda contractual ya existe.")

adenda = f"""

---

{heading}

### Campo multipart canónico

El único campo multipart aceptado para el binario de Carga Segura es:

```text
archivo
```

`file` no forma parte del contrato y debe rechazarse.

Esta regla no modifica los endpoints legacy de Carga Guiada.

### Metadata complementaria

`metadata` no puede duplicar, sustituir ni sombrear atributos canónicos.

Claves reservadas:

```text
__proto__
prototype
constructor
workspaceId
empresaCodigo
clienteDestinoId
expedienteId
actorId
usuarioId
idempotencyKey
requestId
correlationId
cargaOperacionId
canalIngreso
tipoDocumental
tipoRelacion
esPrincipal
nombreArchivo
contentType
tamanoBytes
hashSha256
storageProvider
storageBucket
storageKey
origen
```

La restricción se aplica recursivamente a objetos anidados.

No se bloquean claves futuras que todavía no formen parte del contrato canónico.

### Mensaje fallback

```text
No se pudo completar la carga del documento.
```

### Activación

La activación del feature flag solo puede evaluarse después de incorporar y validar este bloque.

Esta adenda no autoriza migraciones, despliegue, push, merge ni rebase.
"""

contract_path.write_text(contract_text.rstrip() + adenda + "\n", encoding="utf-8")
print(f"ACTUALIZADO: {contract_path}")

print("\\nBLOQUE APLICADO. TODAVÍA NO SE HA CREADO COMMIT.")
PY
```

---

## 2. Validar cambios

```bash
printf '%s\n' '=== ESTADO ==='
git status --short

printf '%s\n' '=== DIFF CHECK ==='
git diff --check

printf '%s\n' '=== RESUMEN ==='
git diff --stat

printf '%s\n' '=== ALIAS FILE EN CARGA SEGURA INTERNA ==='
grep -RniE \
  "files\?\.file|name: 'file'|CARGA_SEGURA_HTTP_FILE_FIELDS.*file|acepta file como alias" \
  apps/ms-documentos/src/documentos/carga-segura \
  --include='*.ts' || true

printf '%s\n' '=== MENSAJE ANTERIOR ==='
grep -RniF \
  "No se pudo confirmar el resultado de la carga documental segura" \
  apps/api-gateway/src/documentos \
  --include='*.ts' || true

printf '%s\n' '=== MENSAJE NUEVO ==='
grep -RniF \
  "No se pudo completar la carga del documento." \
  apps/api-gateway/src/documentos \
  docs/16-api \
  docs/06-arquitectura-operativa/sprint-2-1C \
  --include='*.ts' \
  --include='*.md'
```

No crear el commit hasta revisar esta salida.
