# Confirmación Documental

## Qué representa

La confirmación convierte una propuesta OCR en documento oficial vinculado a expediente.

## Endpoint principal

`POST /api/v1/documentos/ocr-resultados/:id/confirmar-con-expediente`

## Reglas

- Recalcular clave documental.
- Persistir metadata final confirmada.
- Actualizar `documentos.documentos`.
- Actualizar `documentos.ocr_resultados`.
- Vincular con `documentos.expediente_documentos`.
- Si el documento es principal, desmarcar principales anteriores.
- Para factura, persistir `fecha_emision` oficial confirmada.

## Factura

La fecha confirmada de la factura debe quedar en `documentos.documentos.fecha_emision` porque define el período contable.

## Mismatch de cliente

Si el OCR detecta RUC comprador distinto al expediente, el sistema debe bloquear la confirmación o exigir corrección supervisada.
