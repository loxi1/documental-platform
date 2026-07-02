# Implementación UI Foundation

## Objetivo

Definir cómo el frontend debe implementar componentes reutilizables.

## Ubicación sugerida

```text
apps/web-admin/src/components/common/
apps/web-admin/src/components/documentos/
apps/web-admin/src/components/layout/
apps/web-admin/src/components/states/
apps/web-admin/src/lib/
apps/web-admin/src/constants/
```

## Estructura sugerida

```text
components/
  common/
    ModuleHeader.tsx
    MetricCard.tsx
    ConfirmDialog.tsx
  states/
    LoadingState.tsx
    EmptyState.tsx
    ErrorState.tsx
  workspace/
    WorkspaceBadge.tsx
  documentos/
    DocumentCard.tsx
    DocumentStatusBadge.tsx
    VerDocumento.tsx
    AdjuntarDocumento.tsx
    PreviewDocumento.tsx
    UploadDropzone.tsx
    EvidenceViewer.tsx
lib/
  format.ts
constants/
  status.ts
  document-types.ts
```

## Reglas

- Ningún módulo debe crear su propio badge si ya existe uno común.
- Ningún módulo debe crear su propio visor de documento.
- Ningún módulo debe calcular rutas privadas de archivos.
- Todo preview debe pasar por backend.
- Los componentes comunes no contienen reglas de negocio.

## Contrato visual mínimo

Toda pantalla debe responder:

1. ¿Dónde estoy?
2. ¿Con qué Workspace trabajo?
3. ¿Qué debo revisar?
4. ¿Qué puedo hacer?
5. ¿Qué está pendiente o bloqueado?
