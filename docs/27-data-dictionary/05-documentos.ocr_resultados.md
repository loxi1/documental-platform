# Tabla: documentos.ocr_resultados

## Qué representa

Resultado de OCR asociado a archivo/documento.

## Campos principales

| Campo | Descripción |
|---|---|
| `id` | Identificador del resultado OCR. |
| `archivo_id` | Archivo procesado. |
| `documento_id` | Documento temporal u oficial. |
| `tipo_propuesto` | Tipo detectado/propuesto. |
| `estado` | Estado OCR: pendiente_validacion, confirmado, rechazado, etc. |
| `confidence` | Confianza del OCR. |
| `clave_documental` | Clave cuando ya puede generarse o fue confirmada. |
| `metadata` | JSONB con datos OCR, texto, auditoría y metadata final. |
| `creado_en` | Fecha de creación. |
| `validado_en` | Fecha de validación. |
| `validado_por` | Usuario validador si aplica. |
| `expediente_id` | Expediente asociado al confirmar. |

## Reglas

- Debe conservar OCR original.
- Debe conservar metadata editada/confirmada.
- Debe registrar auditoría.
- No perder texto OCR.

## Estados relevantes

- `pendiente_validacion`
- `confirmado`
- `confirmado_como_version`
- `rechazado`
