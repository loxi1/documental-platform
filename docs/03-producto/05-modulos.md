# Módulos de Producto

## Objetivo

Documentar el propósito de cada módulo desde la experiencia de usuario. Este documento no define reglas backend ni migraciones; describe cómo debe sentirse y operar cada módulo en el frontend.

## Workspace

### Propósito

Definir el contexto de trabajo del usuario.

Workspace significa:

```text
Usuario + Empresa + Sistema + Perfil
```

Ejemplo:

```text
admin@documental.local + BBTI + DOCUMENTAL + Contabilidad
```

### Experiencia esperada

El usuario debe poder:

```text
ver su workspace activo
cambiar workspace sin cerrar sesión
entender qué perfil tiene
entender qué empresa está usando
```

### No hacer

```text
No cambiar JWT desde frontend manualmente.
No permitir empresa libre por filtro.
No mostrar workspaces no devueltos por backend.
```

## Mi Perfil

### Propósito

Mostrar identidad y contexto actual del usuario.

Debe incluir:

```text
nombre
correo
workspace actual
empresa
sistema
perfil
último acceso
cambiar workspace
cambiar contraseña placeholder
```

No debe administrar usuarios ni permisos en el MVP.

## Documentos

### Propósito

Permitir consultar documentos y evidencias asociadas.

Debe priorizar:

```text
tipo documental
serie/número
emisor
fecha
monto
estado
evidencia
```

### Estados visuales

Usar siempre `DocumentStatusBadge`.

### Acciones visibles según permisos

```text
documentos.ver → consultar
documentos.subir → subir/carga guiada
ocr.procesar → procesar OCR
otros permisos OCR → acciones de validación
```

## Revisión Contable

### Propósito

Pantalla de revisión y aprobación documental por periodo contable.

Debe responder:

```text
qué expedientes deben revisarse
qué documentos tiene cada expediente
qué alertas existen
qué evidencia respalda cada documento
```

### Experiencia

Debe sentirse como una bandeja de revisión, no como una pantalla de carga.

Permitido:

```text
ver expediente
ver evidencia
crear alerta si tiene permiso
resolver alerta si tiene permiso
```

No permitido en esta vista:

```text
subir documentos
editar OCR
confirmar OCR
cambiar empresa manualmente
```

## Expediente 360

### Propósito

Dar una vista completa de un expediente documental.

Debe mostrar:

```text
cabecera del expediente
estado documental
documento principal
documentos adjuntos
timeline
alertas
evidencia
```

### Criterio de éxito

El usuario debe poder entender en menos de un minuto:

```text
qué es el expediente
qué documentos existen
qué falta
qué está observado
qué evidencia existe
```

## Compras

### Propósito

Gestionar documentos relacionados con compras, principalmente OC/facturas y vínculos a expediente.

### UX esperada

```text
bandeja clara
filtros por periodo/estado
empresa bloqueada por workspace
acciones visibles según permisos
```

No debe mostrar acciones de áreas ajenas si el perfil no corresponde.

## Almacén

### Propósito

Gestionar guías y notas de ingreso relacionadas con expedientes.

### UX esperada

```text
identificar rápidamente documentos logísticos
ver evidencia
ver relación con expediente
```

No debe mezclar validación contable con carga logística.

## Finanzas

### Propósito

Gestionar evidencias de pago, transferencias y detracciones.

### UX esperada

```text
ver documentos financieros asociados
identificar monto, fecha y evidencia
navegar al expediente relacionado
```

## Alertas

### Propósito

Permitir observaciones y seguimiento de incidencias documentales.

### Acciones MVP

```text
alertas.crear
alertas.resolver
```

### UX esperada

Las alertas deben ser visibles dentro del contexto del documento o expediente. No deben sentirse como un módulo aislado salvo que se implemente una bandeja central en fase posterior.

## OCR Validation

### Propósito

Permitir revisar resultados OCR cuando el perfil tenga permisos.

### Acciones diferenciadas

```text
ocr.procesar
ocr.editar
ocr.confirmar
ocr.rechazar
```

### Regla UX

No mostrar acciones OCR a perfiles sin permisos, aunque puedan ver el documento.

## Prioridad de mejora visual

Orden aprobado para el Maestro Sucesor II:

```text
1. Revisión Contable
2. Expediente 360
3. Mi Perfil
4. Compras
5. Almacén
6. Finanzas
```

Antes de modificar pantallas, deben existir los componentes comunes definidos en `02-ui-foundation.md`.

## Fuera de alcance

No corresponde a este documento definir:

```text
motor OCR
migraciones
versionado funcional
duplicados
clave documental
contratos backend nuevos
permisos backend
```
