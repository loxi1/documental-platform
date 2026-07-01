# Duplicados

## Qué representa

Documento con clave documental ya existente.

## Regla

El duplicado no es error fatal. Es una oportunidad de versionado.

## Respuesta esperada

- HTTP `409`.
- `suggestedAction = AGREGAR_VERSION`.
- Identificación del documento existente.

## No hacer

- No crear documento lógico duplicado.
- No devolver 500.
- No sobrescribir archivo anterior.
