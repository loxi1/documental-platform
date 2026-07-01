# Flujo: OCR

## Flujo

```text
Archivo físico
↓
OCR Worker
↓
Texto extraído
↓
Extractor por tipo
↓
metadata propuesta
↓
ocr_resultados
```

## Reglas

- El OCR nunca es cierre definitivo.
- Si faltan datos, se marca `pendiente_validacion`.
- El usuario puede corregir manualmente.
- El OCR original debe conservarse.
