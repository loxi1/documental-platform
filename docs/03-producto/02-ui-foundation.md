# UI Foundation

## Objetivo

Definir la base visual reutilizable de Documental Platform. Antes de pulir pantallas individuales, el frontend debe centralizar estados, formatos y componentes comunes.

Regla aprobada:

```text
Primero componentes comunes.
Después pantallas.
No al revés.
```

## Estructura recomendada

```text
apps/web-admin/src/
├── components/
│   └── common/
│       ├── WorkspaceBadge.tsx
│       ├── ModuleHeader.tsx
│       ├── MetricCard.tsx
│       ├── LoadingState.tsx
│       ├── EmptyState.tsx
│       ├── DocumentStatusBadge.tsx
│       └── DocumentCard.tsx
├── constants/
│   └── status.ts
└── lib/
    └── format.ts
```

## Estados centralizados

Archivo sugerido:

```text
src/constants/status.ts
```

Estados MVP:

```text
pendiente
procesando
pendiente_validacion
confirmado
rechazado
error
subido
activo
```

Cada estado debe definir:

```text
label
variant/clase visual
icono
texto de ayuda opcional
```

Ejemplo conceptual:

```ts
export const DOCUMENT_STATUS = {
  confirmado: {
    label: 'Confirmado',
    tone: 'success',
    description: 'Documento validado y listo para revisión.'
  },
  pendiente_validacion: {
    label: 'Pendiente de validación',
    tone: 'warning',
    description: 'Requiere revisión del usuario.'
  },
  rechazado: {
    label: 'Rechazado',
    tone: 'danger',
    description: 'Documento observado o no aceptado.'
  }
};
```

## Helpers de formato

Archivo sugerido:

```text
src/lib/format.ts
```

Funciones mínimas:

```text
formatDate
formatDateTime
formatCurrency
formatPeriod
formatDocumentNumber
formatPersonName
formatFileSize
```

Criterios:

```text
- Usar formato es-PE.
- No repetir Intl.DateTimeFormat en cada pantalla.
- No formatear moneda manualmente con strings.
- Manejar null/undefined con guiones o texto neutral.
```

## Componentes comunes

### WorkspaceBadge

Muestra contexto activo:

```text
Empresa
Sistema
Perfil
```

Debe usarse en header, Mi Perfil y pantallas sensibles.

### ModuleHeader

Cabecera estándar de módulo.

Debe incluir:

```text
título
descripción
workspace/contexto opcional
acciones principales opcionales
```

### MetricCard

Tarjeta de métrica para dashboards o resúmenes.

Debe incluir:

```text
label
value
helper text
icono opcional
estado opcional
```

### LoadingState

Estado de carga reutilizable.

Variantes:

```text
page
section
card
list
```

### EmptyState

Estado vacío reutilizable.

Debe incluir:

```text
título
mensaje
acción opcional
icono opcional
```

Ejemplo:

```text
No hay documentos para revisar
Cuando existan documentos del periodo, aparecerán aquí.
```

### DocumentStatusBadge

Badge estándar para estados de documento/OCR/archivo.

Debe consumir `src/constants/status.ts`.

### DocumentCard

Tarjeta estándar para documentos adjuntos.

Debe mostrar:

```text
tipo documental
serie/número
emisor
fecha
monto
estado
acción de ver evidencia si existe archivo
```

No debe implementar lógica OCR ni validación; solo presentación.

## Tokens visuales

Para mantener consistencia:

```text
bordes: rounded-xl / rounded-2xl
espaciado: generoso en desktop, compacto en mobile
cards: fondo blanco/dark compatible
badges: tonos semánticos
acciones primarias: pocas y claras
acciones secundarias: dropdown o botones discretos
```

## Accesibilidad mínima

Todo componente debe considerar:

```text
focus visible
contraste suficiente
labels claros
botones con texto o aria-label
no depender solo del color para comunicar estado
```

## Orden de adopción

Aplicar esta base en este orden:

```text
1. Revisión Contable
2. Expediente 360
3. Mi Perfil
4. Compras
5. Almacén
6. Finanzas
```
