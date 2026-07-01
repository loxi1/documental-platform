# GET /api/v1/expedientes/:id/documentos

## Qué representa

Consulta todos los documentos vinculados a un expediente.

## Reglas

- Devuelve documento principal y adjuntos.
- Incluye metadata documental.
- Incluye archivo actual.
- Se usa por Compras, Almacén, Finanzas y Revisión Contable.

## Response conceptual

```json
{
  "success": true,
  "data": [
    {
      "expediente_id": "41",
      "documento_id": 3754,
      "tipo_relacion": "principal_oc",
      "tipo_documental": "OC",
      "numero": "007950",
      "estado": "confirmado",
      "archivo_id": 3815,
      "nombre_archivo": "OC_007950.pdf"
    }
  ]
}
```
