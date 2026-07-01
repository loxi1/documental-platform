# Duplicados Documentales

## Qué representa

Un duplicado ocurre cuando el sistema detecta otro documento lógico con la misma clave documental.

## Regla

No debe devolver 500.

Debe devolver 409 con sugerencia de acción.

## Respuesta esperada

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENTO_DUPLICADO",
    "message": "Ya existe un documento con la misma clave documental.",
    "details": {
      "suggestedAction": "AGREGAR_VERSION",
      "documentoExistenteId": 3756,
      "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000163"
    }
  }
}
```

## Casos

- Misma guía escaneada nuevamente.
- Misma factura subida desde Compras y luego desde Almacén.
- Mismo pago adjuntado dos veces.

## Acción recomendada

Agregar el archivo como nueva versión del documento lógico existente.
