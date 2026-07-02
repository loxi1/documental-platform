# Cleanup Policy

## Objetivo

Definir cómo limpiar duplicados sin perder trazabilidad.

## Reglas

- No borrar documentos históricos directamente.
- Mover duplicados a `99-archive/`.
- Mantener un único documento oficial por tema.
- Actualizar Source of Truth.
- Actualizar MkDocs nav si el documento aparece en navegación.
- Registrar en CHANGELOG.

## Criterio

Un documento se considera duplicado si:

- repite la misma regla;
- tiene numeración contradictoria;
- fue reemplazado por una versión más nueva;
- tiene contenido parcial frente a un documento consolidado.
