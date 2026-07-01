# Guías de Producto

## Propósito

Este documento define los principios de producto para **Documental Platform** desde el punto de vista de experiencia de usuario. Su objetivo es que cualquier pantalla nueva mantenga una experiencia coherente, segura y comprensible para usuarios no técnicos.

La plataforma administra documentos privados de negocio: facturas, órdenes de compra, guías, notas de ingreso, pagos, detracciones, evidencias PDF/imagen, expedientes y resultados OCR. Por eso el producto debe priorizar claridad, trazabilidad y seguridad.

## Principios de producto

### 1. Seguridad visible y seguridad real

El usuario debe entender en qué contexto está trabajando:

```text
Empresa
Sistema
Perfil
Workspace activo
```

Ejemplo:

```text
BBTI
Gestión Documental
Contabilidad
```

La interfaz puede ocultar opciones, pero la autorización real siempre corresponde al backend. El frontend no debe asumir que ocultar un botón es suficiente.

### 2. Lenguaje cercano al usuario

Evitar siglas técnicas cuando no aporten claridad.

Preferir:

```text
Documentos pendientes de revisión
Evidencia del documento
Revisión contable
Expediente documental
```

Evitar como texto principal:

```text
OCR
ALR
EXP
JWT
R2
```

Las siglas pueden aparecer en detalles técnicos o etiquetas secundarias, nunca como lenguaje principal del flujo.

### 3. Contexto antes que datos sueltos

Cada pantalla debe dejar claro:

```text
qué estoy viendo
para qué empresa
qué periodo/filtro aplica
qué acción puedo ejecutar
qué falta para completar el proceso
```

Ejemplo en Revisión Contable:

```text
Revisión contable · BBTI · Enero 2026
Expedientes con factura confirmada en el periodo
```

### 4. Menos ruido, más decisión

Las pantallas deben ayudar a decidir. Evitar mostrar demasiada metadata cruda en la primera vista. La información técnica debe estar disponible, pero organizada por niveles:

```text
Nivel 1: resumen y estado
Nivel 2: datos principales
Nivel 3: detalle técnico / metadata / auditoría
```

### 5. Consistencia visual

Los mismos estados deben verse igual en todos los módulos.

Ejemplo:

```text
confirmado = badge verde
pendiente_validacion = badge amarillo
rechazado = badge rojo
procesando = badge azul/neutro
```

La fuente de verdad debe estar centralizada en:

```text
src/constants/status.ts
```

### 6. Acciones sensibles deben ser explícitas

Acciones como confirmar OCR, rechazar OCR, generar preview, resolver alertas o cambiar de workspace deben tener textos claros y confirmación cuando corresponda.

Ejemplo:

```text
Confirmar resultado OCR
Resolver alerta
Generar vista previa del documento
Cambiar espacio de trabajo
```

## Roles de usuario esperados

### Administrador

Puede acceder a la mayoría de módulos y acciones. Debe ver el producto completo, pero sin interfaces técnicas innecesarias.

### Contabilidad

Prioriza revisión documental, alertas, evidencia y estados. No debe ver acciones de OCR si no tiene permiso.

### Compras

Prioriza carga/consulta de documentos relacionados con OC, facturas y expedientes.

### Almacén

Prioriza guías, notas de ingreso y evidencia operativa.

### Finanzas

Prioriza pagos, detracciones, transferencias y alertas asociadas.

## Criterios de aceptación de producto

Una pantalla se considera lista cuando cumple:

```text
1. Muestra claramente el workspace activo.
2. Respeta permisos del usuario.
3. Usa componentes comunes.
4. Tiene estados loading, empty y error.
5. Usa lenguaje de negocio, no lenguaje técnico innecesario.
6. Mantiene contraste y navegación básica por teclado.
7. No requiere conocer la base de datos para entenderla.
```

## Fuera de alcance para Producto/UX

Este handbook no define:

```text
reglas internas OCR
migraciones
contratos backend
versionado funcional
duplicados
clave documental
permisos backend
```

Si una pantalla necesita un nuevo dato del backend, debe documentarse como requerimiento para el equipo backend, no implementarse desde frontend con supuestos.
