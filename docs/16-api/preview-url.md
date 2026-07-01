# GET /api/v1/documentos/archivos/:archivoId/preview-url

## Qué representa

Genera una URL firmada temporal para visualizar un archivo privado en R2.

## Reglas

- No exponer bucket público.
- URL temporal.
- Usar `response-content-disposition=inline` cuando corresponda.

## Response ejemplo

```json
{
  "success": true,
  "data": {
    "archivoId": 3840,
    "filename": "pago_detraccion_1_bbti_sac.pdf",
    "contentType": "application/pdf",
    "storageProvider": "r2",
    "storageBucket": "data-prod",
    "storageKey": "documentos/2026/06/BBTI/...pdf",
    "signedUrl": "https://...",
    "expiresIn": 300,
    "expiresAt": "2026-06-26T23:20:00.000Z"
  }
}
```
