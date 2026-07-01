# Layouts

## Objetivo

Definir patrones de layout para que todas las pantallas de Documental Platform mantengan una estructura consistente.

## Layout base de aplicación

La aplicación debe mantener tres zonas principales:

```text
Sidebar
Header / Topbar
Contenido principal
```

### Sidebar

Responsable de navegación principal.

Debe:

```text
- Mostrar solo módulos autorizados por permisos.menus.
- Mantener Mi Perfil visible.
- Mostrar el workspace activo en zona inferior o superior.
- Permitir cambiar espacio de trabajo sin cerrar sesión.
- Evitar opciones técnicas innecesarias.
```

No debe mostrar módulos no autorizados aunque existan rutas directas.

### Header / Topbar

Responsable de contexto inmediato.

Debe mostrar:

```text
usuario
empresa
perfil
sistema
acción de cambiar workspace
```

El contexto debe ser visible especialmente en pantallas sensibles como Revisión Contable, Documentos y Expediente 360.

### Contenido principal

Estructura recomendada:

```text
ModuleHeader
Filtros / contexto
Métricas o resumen
Contenido principal
Estados secundarios / detalles
```

## Layout de módulo operativo

Aplica a:

```text
Compras
Almacén
Finanzas
Documentos
```

Estructura:

```text
1. ModuleHeader
2. Empresa bloqueada por workspace
3. Filtros permitidos
4. Tabla/lista principal
5. Acciones por fila
6. EmptyState / LoadingState
```

La empresa no debe ser selector libre. Debe venir del workspace activo.

## Layout de Revisión Contable

Debe sentirse como pantalla de aprobación documental, no como tabla técnica.

Estructura recomendada:

```text
1. Header del módulo
2. Contexto: empresa, periodo, perfil
3. Métricas: pendientes, completos, observados, alertas
4. Bandeja de expedientes
5. Acciones: ver expediente, ver evidencia, crear/resolver alerta si tiene permiso
```

Reglas:

```text
- No agregar carga de documentos.
- No agregar OCR.
- No editar metadata documental desde esta vista.
- Priorizar lectura, revisión y alertas.
```

## Layout de Expediente 360

Debe mostrar una vista integral del expediente.

Estructura:

```text
1. EntityHeader del expediente
2. Resumen del estado documental
3. Documento principal
4. Documentos adjuntos
5. Timeline
6. Alertas
7. Evidencia / preview cuando aplique
```

El usuario debe entender rápidamente:

```text
qué expediente es
qué documentos tiene
qué falta
qué alertas existen
qué evidencia respalda cada documento
```

## Layout de Mi Perfil

Ruta recomendada:

```text
/mi-perfil
```

También puede existir alias futuro:

```text
/perfil
```

Debe mostrar:

```text
nombre
correo
workspace actual
empresa
sistema
perfil
último acceso
opción cambiar workspace
placeholder cambiar contraseña
```

No administrar usuarios, roles ni permisos desde esta pantalla en el MVP.

## Layout responsive

### Desktop

```text
Sidebar visible
Contenido en cards/tablas amplias
Modales con preview lateral
```

### Tablet

```text
Sidebar colapsable
Cards en dos columnas
Tablas con scroll horizontal controlado
```

### Mobile

```text
Navegación colapsada
Cards en una columna
Acciones principales visibles
Tablas convertidas a listas cuando sea posible
```

## Modales

Para evidencia PDF/imagen:

```text
2/3 preview
1/3 datos principales
```

El modal de evidencia no debe ejecutar acciones destructivas. Su propósito principal es revisar.

## Estados obligatorios por pantalla

Cada pantalla debe tener:

```text
LoadingState
EmptyState
ErrorState o mensaje de error
UnauthorizedState cuando corresponda
```
