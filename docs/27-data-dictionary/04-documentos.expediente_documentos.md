# Tabla: documentos.expediente_documentos

## Qué representa

Vínculo entre expediente y documento lógico.

## Campos principales

| Campo | Descripción |
|---|---|
| `expediente_id` | Expediente vinculado. |
| `documento_id` | Documento lógico vinculado. |
| `tipo_relacion` | Relación documental. |
| `creado_en` | Fecha de vínculo. |
| `es_principal` | Marca documento principal. |
| `orden` | Orden visual/lógico. |

## Relaciones aprobadas

- `principal_oc`
- `principal_os`
- `principal_factura`
- `adjunto_factura`
- `adjunto_guia`
- `adjunto_nota_ingreso`
- `adjunto_transferencia`
- `adjunto_detraccion`
- `adjunto_recibo_honorario`
- `adjunto_otro`

## Reglas

- No tiene `id` en el modelo actual.
- No usar `RETURNING id`.
- Solo un principal activo por expediente.
- Para quitar en el futuro, preferir marcar vínculo removido antes que borrar físicamente.

## SQL correcto para insertar y retornar

```sql
RETURNING expediente_id, documento_id, tipo_relacion, es_principal, orden
```
