# Propuesta de contrato — Carga Documental Segura MVP

## Estado

```text
Documento: PROPUESTA
Contrato: PENDIENTE DE VALIDACIÓN
Implementación: NO AUTORIZADA
```

No constituye un contrato aprobado.

## Operación propuesta

```http
POST /api/v1/documentos/carga-guiada
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

La ruta y el DTO deben validarse contra el Gateway existente.

## Entradas conceptuales

| Campo | Condición |
|---|---|
| archivo | requerido |
| expedienteId | sujeto al flujo autorizado |
| tipoEsperado | por validar |
| tipoRelacionSugerida | informativo/por validar |
| canalIngreso | controlado |
| observacion | opcional |

La identidad autenticada no debe aceptarse desde el body.

## Prevalidaciones

Token/workspace, permiso `documentos.subir`, archivo, MIME, tamaño, contexto accesible, SHA-256 en servidor y duplicado según alcance aprobado.

## Respuesta mínima propuesta

```json
{
  "documentoId": 0,
  "archivoId": 0,
  "hashSha256": "...",
  "duplicado": false
}
```

La forma final debe respetar el envelope oficial.

## Decisiones pendientes

- alcance del hash;
- respuesta a duplicado;
- concurrencia e idempotencia;
- compensación R2/PostgreSQL;
- fallo de eventos;
- errores públicos;
- condición exacta de éxito.

## Fuera de contrato

OCR, confirmación OCR, asociación V2, Grupo Factura, revisión contable y alertas.
