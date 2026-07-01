# Métricas OCR

## Qué representa

Las métricas OCR permiten medir calidad del procesamiento documental.

## Métricas recomendadas

- `confidence` global.
- Campos detectados.
- Campos faltantes.
- Campos corregidos manualmente.
- Campos provenientes de OCR.
- Campos provenientes de catálogo.
- Campos provenientes de edición manual.
- Documentos que requirieron validación.
- Tiempo de procesamiento OCR.

## Uso

Estas métricas no bloquean el flujo operativo. Sirven para mejorar extractores y priorizar documentos problemáticos.

## Ubicación

Actualmente pueden persistirse en `ocr_resultados.metadata`, `metadataSource`, `camposDetectados`, `camposFaltantes` y auditoría.

## Caso real

Una detracción puede tener `confidence = 0` pero ser confirmada manualmente si el usuario completa número, monto, moneda y RUC proveedor.
