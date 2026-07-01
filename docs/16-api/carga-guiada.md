# POST /api/v1/documentos/carga-guiada

## Qué representa

Carga un archivo desde módulos como Compras, Almacén o Finanzas y lo registra en R2 y base de datos.

## Reglas

- Almacena archivo en Cloudflare R2.
- Crea registro en `documentos.documentos_archivos`.
- Puede crear documento temporal en `documentos.documentos`.
- No confirma documento.
- No ejecuta OCR por sí solo.

## Request conceptual

- archivo multipart.
- `clienteAbreviatura`
- `areaOrigen`
- `tipoEsperado`
- `expedienteId`
- `tipoRelacionSugerida`
- `canalIngreso`

## Response ejemplo

```json
{
  "success": true,
  "data": {
    "archivoId": 3840,
    "documentoId": 3779,
    "filename": "pago_detraccion_1_bbti_sac.pdf",
    "storageProvider": "r2",
    "storageBucket": "data-prod",
    "storageKey": "documentos/2026/06/BBTI/...pdf",
    "estado": "subido",
    "duplicadoAdvertencia": false,
    "duplicados": []
  }
}
```
