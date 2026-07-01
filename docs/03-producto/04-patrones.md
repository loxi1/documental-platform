# Patrones de UX

## Objetivo

Definir patrones de interacción repetibles para evitar que cada módulo resuelva los mismos problemas de forma distinta.

## Patrón: Workspace activo

Toda pantalla sensible debe usar el workspace activo como contexto.

Mostrar:

```text
Empresa
Sistema
Perfil
```

No permitir cambiar empresa desde filtros internos del módulo. Para cambiar empresa/perfil, usar:

```text
Cambiar espacio de trabajo
```

## Patrón: Acceso denegado

Cuando el usuario intenta acceder a una ruta no permitida:

```text
No tienes permiso para acceder a este módulo.
```

Debe incluir:

```text
módulo solicitado
perfil actual
botón Ir a mi módulo
botón Cambiar espacio de trabajo
```

No mostrar detalles técnicos del token.

## Patrón: Empresa bloqueada

En filtros de módulo, la empresa debe mostrarse como campo bloqueado:

```text
Empresa: BBTI · BBTI S.A.C.
Bloqueado por workspace
```

No usar selector si el usuario solo tiene una empresa activa en el workspace.

## Patrón: Vista previa de evidencia

La vista previa debe abrirse dentro de la plataforma, no enviar al usuario directamente a una URL técnica.

Flujo:

```text
Usuario hace clic en Ver evidencia
Backend valida workspace/empresa/permisos
Backend genera signed URL corta
Frontend muestra PDF/imagen en modal
```

La signed URL debe tratarse como dato sensible.

## Patrón: Estados de documentos

Usar siempre `DocumentStatusBadge`.

No crear badges locales por pantalla.

Estados mínimos:

```text
pendiente
procesando
pendiente_validacion
confirmado
rechazado
error
```

## Patrón: Acciones sensibles

Acciones sensibles deben ser claras y, cuando corresponda, confirmar intención.

Ejemplos:

```text
Confirmar OCR
Rechazar OCR
Resolver alerta
Cambiar workspace
Generar nueva versión
```

Debe evitarse lenguaje ambiguo como:

```text
OK
Procesar
Enviar
Aplicar
```

sin contexto.

## Patrón: Empty State

Una pantalla vacía no debe verse como error.

Debe explicar:

```text
qué falta
por qué está vacío
qué puede hacer el usuario
```

Ejemplo:

```text
No hay expedientes para revisar
No se encontraron facturas confirmadas para este periodo.
```

## Patrón: Loading State

Usar skeletons o estados de carga consistentes.

No mostrar pantallas en blanco durante llamadas a API.

Aplicar en:

```text
Compras
Almacén
Finanzas
Revisión Contable
Expedientes
Documentos
```

## Patrón: Error de API

Mostrar mensajes humanos.

Ejemplo:

```text
No pudimos cargar los documentos.
Intenta nuevamente o cambia de periodo.
```

No mostrar al usuario final:

```text
INTERNAL_SERVER_ERROR
stack trace
JSON completo del backend
```

El detalle técnico puede quedar en consola o auditoría.

## Patrón: Filtros

Los filtros deben seguir este orden:

```text
Empresa/contexto bloqueado
Periodo
Estado
Tipo documental
Búsqueda libre
```

No repetir filtros que ya están definidos por workspace.

## Patrón: Navegación entre módulos

Desde una bandeja, el usuario debe poder ir a:

```text
Detalle de expediente
Evidencia del documento
Alertas relacionadas
```

Evitar saltos inesperados a pantallas de edición si el perfil es de revisión.

## Patrón: Texto técnico progresivo

Datos técnicos como `clave_documental`, `storageKey`, `archivoId` o `ocrResultadoId` deben estar disponibles solo en secciones de detalle o modo técnico, no como información principal.

## Patrón: Reintento

Cuando una operación falla por red o API:

```text
Mostrar error claro
Permitir reintentar
No perder filtros activos
No cambiar workspace automáticamente
```
