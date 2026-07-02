# Document Actions Template

## Objetivo

Estandarizar acciones sobre documentos.

## Acciones comunes

| Acción | Componente |
|---|---|
| Ver documento | VerDocumento |
| Adjuntar documento | AdjuntarDocumento |
| Vista previa | PreviewDocumento |
| Agregar versión | AdjuntarDocumento + flujo versionado |
| Confirmar | ConfirmDialog |
| Rechazar | ConfirmDialog |
| Quitar vínculo | ConfirmDialog |

## Patrón recomendado

```text
DocumentCard
  ├── Estado
  ├── Metadata resumida
  ├── Ver documento
  ├── Adjuntar / reemplazar
  └── Acciones permitidas
```

## Reglas

- Mostrar solo acciones permitidas por permisos.
- Acciones sensibles requieren confirmación.
- Si falta evidencia, mostrar EmptyState contextual.
- Si hay archivo, mostrar PreviewDocumento.
- Si hay duplicado, mostrar acción sugerida por backend.
