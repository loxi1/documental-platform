# Requerimiento de Compra

## Propósito

Definir el rol conceptual del Requerimiento de Compra dentro del Modelo Documental V2.

## Cambio de regla

En el modelo anterior se consideró que el documento principal podía ser:

- OC
- OS
- Factura

En el Modelo Documental V2, la Factura deja de ser documento principal formal.

El Requerimiento de Compra entra como una de las materializaciones actuales del concepto **Documento Operativo Principal**.

## Documento Operativo Principal

Los tipos formales propuestos son:

- OC
- OS
- Requerimiento de Compra

## Rol del Requerimiento de Compra

El Requerimiento de Compra representa una solicitud o necesidad de adquisición que puede originar documentos posteriores.

Puede funcionar como documento de apertura cuando todavía no existe OC u OS, o cuando el flujo de negocio parte de una necesidad interna formal.

## Caminos posibles

### Caso A: RC abre OC/OS

```text
Requerimiento de Compra
  -> OC / OS
      -> Grupo de Factura
          -> Adjuntos
```

Este caso aplica cuando el RC es una solicitud previa y luego se formaliza mediante OC u OS.

### Caso B: RC abre facturas directamente

```text
Requerimiento de Compra
  -> Grupo de Factura
      -> Adjuntos
```

Este caso debe quedar como posibilidad pendiente de validación funcional.

No debe asumirse todavía que solo existe un camino.

## Relación con Factura

La Factura no reemplaza al Requerimiento de Compra.

La Factura queda debajo del RC, OC u OS mediante un Grupo de Factura.

## Ventajas del RC como Documento Operativo Principal

- Evita usar Factura como origen informal.
- Permite representar necesidades antes de OC/OS.
- Mejora trazabilidad de Compras.
- Da una alternativa formal cuando no existe OC u OS al inicio.

## Riesgos

- No todos los procesos pueden tener RC.
- Falta validar si RC, PR y OP son entidades distintas o equivalentes según negocio.
- Puede duplicarse semánticamente con OC/OS si no se definen reglas claras.

## Preguntas pendientes

- ¿RC puede existir sin OC/OS?
- ¿RC puede tener facturas directamente?
- ¿RC equivale a PR o son conceptos distintos?
- ¿RC puede estar asociado a varios centros de costo?
- ¿RC puede convertirse luego en OC/OS?
- ¿Cómo se maneja anulación o reemplazo de RC?

## Regla provisional

El Requerimiento de Compra debe considerarse una materialización actual del Documento Operativo Principal, reemplazando a la Factura dentro de ese rol. La lista de materializaciones no queda cerrada y podrá ampliarse mediante decisiones futuras de negocio.

La decisión exacta de sus caminos operativos queda pendiente de validación de negocio.
