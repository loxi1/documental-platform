# Final Freeze Plan — Handbook v1.0

## Fase 1 — Limpieza

- Mover duplicados a `99-archive`.
- Confirmar numeración final en Business Flows.
- Confirmar numeración final en API Cookbook.
- Eliminar o completar documentos vacíos.

## Fase 2 — Normalización

- Agregar metadata a documentos principales.
- Agregar referencias cruzadas.
- Confirmar Source of Truth.

## Fase 3 — Publicación

- Validar `mkdocs.yml`.
- Ejecutar `mkdocs build --strict`.
- Corregir rutas faltantes.
- Publicar sitio.

## Fase 4 — Freeze

- Actualizar `CHANGELOG.md`.
- Marcar `docs/RELEASE-1.0.md` como Approved.
- Crear tag `handbook-v1.0`.

## Criterio de cierre

El Handbook v1.0 queda aprobado cuando MkDocs compila y los documentos principales tienen Source of Truth definido.
