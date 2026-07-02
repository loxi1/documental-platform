# Frontend Handbook

## Propósito

Documentar las reglas de implementación frontend de Documental Platform.

## Alcance

Este handbook cubre:

- UI Foundation.
- Componentes reutilizables.
- Workspace visual.
- Layouts.
- Estados visuales.
- Accesibilidad.
- Responsive.
- Patrones de interacción.

No cubre:

- reglas documentales;
- OCR;
- base de datos;
- infraestructura;
- lógica de negocio backend.

## Regla principal

```text
Primero componente común.
Luego pantalla.
No duplicar UI por módulo.
```

## Componentes reutilizables oficiales

- WorkspaceBadge
- ModuleHeader
- MetricCard
- LoadingState
- EmptyState
- DocumentStatusBadge
- DocumentCard
- VerDocumento
- AdjuntarDocumento
- PreviewDocumento
- UploadDropzone
- EvidenceViewer
- ConfirmDialog
- TableToolbar

## Lenguaje funcional oficial

Usar:

- Workspace
- Expediente
- Documento principal
- Documento adjunto
- Evidencia
- Revisión contable
- Alerta
- Vista previa

Evitar como lenguaje de usuario:

- JWT
- R2
- storageKey
- archivoId
- ocrResultadoId
- ALR
- EXP

## Toda pantalla debe responder

1. ¿Dónde estoy?
2. ¿Con qué Workspace trabajo?
3. ¿Qué información debo revisar?
4. ¿Qué acción está permitida?
5. ¿Qué está pendiente o bloqueado?

## Referencias

- `../03-producto/01-product-guidelines.md`
- `../03-producto/02-ui-foundation.md`
- `../03-producto/06-componentes-reutilizables.md`
- `../24-product-architecture/README.md`
- `../25-design-tokens/README.md`
- `../42-component-catalog/README.md`
