# Contexto de continuidad — Maestro Sucesor II

Este documento resume el estado validado de Documental Platform para que un nuevo chat del **Maestro Sucesor II** pueda continuar sin perder contexto.

---

## División de responsabilidades

### Maestro Sucesor I

Trabaja en otro chat y es responsable de:

- Motor Documental.
- Backend documental.
- OCR Worker.
- Extractores.
- Versionado documental.
- Duplicados.
- Clave documental.
- APIs documentales.
- Enriquecimiento por RUC.
- Calidad OCR.
- Migraciones relacionadas al motor documental.

### Maestro Sucesor II

Este rol es responsable exclusivamente de:

- Frontend.
- Workspace visual.
- Experiencia de usuario.
- Sidebar / Header.
- Mi Perfil.
- Componentes reutilizables.
- Estados visuales.
- Revisión Contable UI.
- Expediente 360 UI.
- Loading / Empty / Skeleton states.
- Accesibilidad.
- Refactor visual.

---

## Estado funcional ya validado

No romper estos flujos:

```text
Login
Identity Token
Listado de Workspaces
Selección de Workspace
Access Token contextual
Mi Perfil
Cambio de Workspace sin cerrar sesión
Sidebar dinámico por permisos
Empresa bloqueada por Workspace en frontend
Route guard frontend
Protección backend por Workspace
Protección backend por empresa
Protección backend por permisos.actions
Compras
Almacén
Finanzas
Revisión Contable
Expediente 360
OCR Validation
Preview PDF/R2
```

---

## Workspace y seguridad visual

Modelo aprobado:

```text
Workspace = Usuario + Empresa + Sistema + Perfil
```

Ejemplo de token contextual:

```json
{
  "workspaceId": 2,
  "empresa": "BBTI",
  "clienteDestinoId": 2,
  "sistema": "DOCUMENTAL",
  "perfilId": 5,
  "perfil": "contabilidad",
  "permissionVersion": 1,
  "sessionContextId": "uuid",
  "permisos": {
    "menus": ["documentos", "revision_contable"],
    "actions": ["alertas.crear", "alertas.resolver"]
  }
}
```

Con ese perfil, el frontend debe mostrar solo:

```text
Documentos
Revisión Contable
Mi Perfil
```

No mostrar Compras, Almacén, Finanzas, Alertas ni Dashboard si no están autorizados por `permisos.menus`.

---

## Seguridad backend ya validada

El backend ya autoriza en 4 capas:

```text
1. Token válido
2. Workspace activo
3. Empresa del recurso coincide con empresa del token
4. Acción solicitada existe en permisos.actions
```

Pruebas validadas:

```text
Contabilidad + BBTI puede ver Revisión Contable.
Contabilidad + BBTI NO puede procesar OCR.
Admin + BBTI SÍ puede procesar OCR.
Token BBTI + empresa CIMA devuelve 403.
Preview URL de R2 se entrega solo después de validar Workspace/empresa.
```

El frontend no debe confiar en ocultar botones como única seguridad. El backend es la autoridad.

---

## Permisos MVP aprobados

Para el MVP se mantienen permisos en JSON dentro del Workspace/JWT.

Catálogo recomendado:

```text
documentos.ver
documentos.subir
documentos.versionar

ocr.procesar
ocr.editar
ocr.confirmar
ocr.rechazar

expedientes.ver
expedientes.crear
expedientes.editar

compras.ver
almacen.ver
finanzas.ver
revision_contable.ver

alertas.crear
alertas.resolver
```

Alias temporales aceptados por compatibilidad:

```text
documentos.validar       -> ocr.procesar
documentos.editar_ocr    -> ocr.editar
documentos.confirmar_ocr -> ocr.confirmar
documentos.rechazar_ocr  -> ocr.rechazar
```

No normalizar todavía a `auth.perfil_permisos` ni `auth.usuario_workspace_permisos_override`.

---

## Decisiones de producto/UX ya aprobadas

### Login

Ya fue mejorado:

- Mejor contraste.
- Textos menos técnicos.
- Se retiraron abreviaturas tipo `OCR / ALR / EXP`.
- Se comunicó mejor que después del login el usuario elige empresa/perfil.

### Sidebar

Ya fue ajustado para:

- Respetar `permisos.menus`.
- Mostrar perfil legible (`Administrador`, `Contabilidad`, etc.).
- Mantener `Mi Perfil` visible.
- Ocultar módulos no autorizados.

### Empresa por Workspace

En Compras, Almacén, Finanzas y Revisión Contable la empresa ya no debe ser un selector libre.

Debe mostrarse como empresa activa bloqueada por Workspace:

```text
BBTI - BBTI S.A.C.
```

### Route Guard

Si el usuario escribe una ruta manual no autorizada, debe ver pantalla de acceso restringido, no un error técnico.

Se aplicó hotfix para evitar el error de Next/Turbopack:

```text
Router action dispatched before initialization
```

---

## Sprint actual — Frontend UI Foundation

No agregar nuevos módulos.
No crear nuevas reglas de negocio.
No modificar contratos backend.

Primero crear:

```text
src/constants/status.ts
src/lib/format.ts
src/components/common/WorkspaceBadge.tsx
src/components/common/ModuleHeader.tsx
src/components/common/MetricCard.tsx
src/components/common/LoadingState.tsx
src/components/common/EmptyState.tsx
src/components/common/DocumentStatusBadge.tsx
src/components/common/DocumentCard.tsx
```

Luego aplicar progresivamente a:

```text
1. Revisión Contable
2. Expediente 360
3. Mi Perfil
4. Compras
5. Almacén
6. Finanzas
```

---

## Componentes esperados

### WorkspaceBadge

Debe mostrar:

```text
Empresa
Sistema
Perfil
```

Ejemplo:

```text
BBTI
DOCUMENTAL
Contabilidad
```

Debe tener acción visible:

```text
Cambiar espacio de trabajo
```

sin cerrar sesión.

### ModuleHeader

Cabecera estándar por módulo:

- Título.
- Descripción corta.
- Workspace activo opcional.
- Acciones primarias.

### MetricCard

Tarjeta estándar para indicadores.

### LoadingState / EmptyState

Estados estándar, no textos técnicos.

### DocumentStatusBadge

Debe usar `constants/status.ts`.

### DocumentCard

Tarjeta reutilizable para mostrar documentos en Revisión Contable y Expediente 360.

---

## Estados visuales a centralizar

En `src/constants/status.ts`:

```text
pendiente
procesando
pendiente_validacion
confirmado
rechazado
error
```

Cada estado debe definir:

- texto visible.
- color visual.
- icono.
- variante de badge.

---

## Helpers a centralizar

En `src/lib/format.ts`:

```text
formatDate
formatDateTime
formatCurrency
formatNumber
formatPercent
formatDocumentNumber
```

Evitar duplicación en cada pantalla.

---

## Revisión Contable — alcance UX

Debe sentirse como pantalla de aprobación documental.

Mejorar solo UI:

- tarjetas.
- indicadores.
- badges.
- layout.
- navegación.
- modal de evidencia.
- empty/loading states.

No agregar OCR, carga, edición ni reglas backend.

---

## Expediente 360 — alcance UX

Mejorar presentación:

- cabecera.
- indicadores.
- timeline.
- documentos.
- versiones visuales si el backend las expone.
- preview documental.

No modificar lógica del motor documental.

---

## Necesidades detectadas para coordinar con Maestro Sucesor I

Si se requieren cambios backend, documentar y coordinar. No implementar desde Sucesor II.

Puntos ya identificados:

1. Mantener contrato de preview-url:

```json
{
  "archivoId": 3816,
  "filename": "factura.pdf",
  "contentType": "application/pdf",
  "storageProvider": "r2",
  "storageBucket": "data-prod",
  "storageKey": "...",
  "signedUrl": "...",
  "expiresIn": 300,
  "expiresAt": "..."
}
```

2. Evitar cambiar contratos de:

```text
GET /expedientes/:id
GET /expedientes/:id/resumen
GET /expedientes/:id/documentos
GET /expedientes/:id/timeline
GET /documentos/:id
GET /documentos/:id/archivos
GET /documentos/archivos/:archivoId/preview-url
GET /documentos/ocr-resultados/:id
```

3. Si aparece doble envoltura del gateway:

```json
{
  "success": true,
  "data": {
    "success": true,
    "data": {}
  }
}
```

Documentarlo como deuda técnica. No resolverlo desde UI si requiere backend.

---

## Criterio de éxito

La plataforma debe sentirse:

```text
consistente
profesional
rápida
clara
moderna
segura visualmente
menos técnica para usuario final
```

Sin romper:

```text
Login
Workspace
Permisos
Empresa bloqueada
Sidebar dinámico
Route guard
Preview PDF
OCR validation
Revisión Contable
Expediente 360
```
