# Componentes Reutilizables

## Estado

Aprobado como RC.

## Owner

Maestro Sucesor II / Product Architect.

## Regla principal

```text
Primero componente común.
Luego pantalla.
No duplicar UI por módulo.
```

## Componentes base aprobados

| Componente | Propósito |
|---|---|
| WorkspaceBadge | Mostrar Workspace activo |
| ModuleHeader | Cabecera estándar de módulo |
| MetricCard | Métrica resumida |
| LoadingState | Estado de carga |
| EmptyState | Estado vacío |
| DocumentStatusBadge | Estado visual de documento |
| DocumentCard | Tarjeta documental |
| PreviewDocumento | Vista previa de evidencia |
| VerDocumento | Acción estándar para consultar documento |
| AdjuntarDocumento | Acción estándar para adjuntar evidencia |
| UploadDropzone | Carga de archivos |
| EvidenceViewer | Visor de PDF/imagen/evidencia |
| ConfirmDialog | Confirmación de acción sensible |
| TableToolbar | Búsqueda, filtros y acciones de tabla |

## Componentes documentales críticos

### VerDocumento

Debe ser reutilizable por:

- Compras
- Almacén
- Finanzas
- Revisión Contable
- Expediente 360
- Documentos

No crear versiones por módulo como:

```text
VerDocumentoCompras
VerDocumentoFinanzas
VerDocumentoContabilidad
```

### AdjuntarDocumento

Debe cubrir:

- subir archivo
- validar tipo permitido
- mostrar progreso
- informar error
- confirmar adjunto
- actualizar pantalla

No debe decidir reglas documentales. El backend valida relación, tipo y permisos.

### PreviewDocumento

Debe consumir signed URL entregada por backend.

No debe construir rutas de R2 ni exponer storageKey.

### DocumentCard

Debe recibir datos ya normalizados.

No debe calcular reglas de negocio.

## Orden de aplicación

1. Revisión Contable.
2. Expediente 360.
3. Mi Perfil.
4. Compras.
5. Almacén.
6. Finanzas.

## Ver también

- `03-producto/02-ui-foundation.md`
- `24-product-architecture/09-preview-template.md`
- `25-design-tokens/README.md`
- `16-api/preview-url.md`
