# OCR

## Qué representa

Proceso de lectura y clasificación documental que propone metadata para validación humana.

## Estados relevantes

- `pendiente_ocr`
- `pendiente_validacion`
- `confirmado`
- `confirmado_como_version`
- `rechazado`

## Reglas

- El OCR no confirma documentos por sí solo.
- Si faltan campos mínimos, la respuesta debe indicar revisión manual.
- El usuario corrige en `OcrValidationModal`.
- El backend confirma usando la metadata final.

## Campos estándar

- `metadata`
- `metadataSource`
- `confidence`
- `camposDetectados`
- `camposFaltantes`
- `texto.preview`
- `archivo`

## Casos

- Factura digital: puede extraer RUC, serie, número, fecha y monto.
- Detracción escaneada: puede requerir completar número, monto o moneda manualmente.
