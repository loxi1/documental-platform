# Cookbook Preview

## Obtener signed URL

```bash
curl "http://localhost:3000/api/v1/documentos/archivos/3840/preview-url"
```

## Uso

La URL se usa en visor PDF/imagen.

## Reglas

- No persistir signed URL como dato permanente.
- No compartir fuera del tiempo de expiración.
- No hacer público el bucket.
