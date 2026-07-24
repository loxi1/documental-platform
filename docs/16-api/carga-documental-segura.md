# Carga Documental Segura

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
