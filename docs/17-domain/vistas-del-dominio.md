# Vistas del Dominio

## Propósito

Explicar cómo cada módulo observa el mismo Modelo Documental V2 sin crear modelos distintos por área.

Todos los módulos comparten la misma jerarquía:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

## Principio

No deben existir modelos documentales diferentes por módulo.

Cada módulo observa el mismo dominio desde una responsabilidad distinta.

## Compras

Compras observa:

- Contenedor Operativo
- Documento Operativo Principal
- Documento Operativo Principal

Actualmente puede materializarse como:

- OC
- OS
- Requerimiento de Compra

Esta lista podrá ampliarse mediante decisiones futuras de negocio.
- Facturas recibidas o asociadas

Responsabilidad principal:

- crear o vincular Documento Operativo Principal
- iniciar trazabilidad documental
- asociar facturas al documento operativo cuando corresponda

## Almacén

Almacén observa:

- Documento Operativo Principal
- Grupos de Factura
- Guías
- Notas de ingreso
- entregas parciales
- recepción física o documental

Responsabilidad principal:

- asociar guías y notas de ingreso
- validar recepción
- preparar futura distribución por centro de costo o almacén

## Finanzas

Finanzas observa:

- Grupos de Factura
- pagos
- transferencias
- detracciones
- documentos financieros asociados

Responsabilidad principal:

- adjuntar pagos
- adjuntar detracciones
- completar soporte financiero del grupo

## Contabilidad

Contabilidad observa principalmente:

- Grupo de Factura
- fecha de emisión de Factura
- completitud documental
- observaciones
- estado contable

Responsabilidad principal:

- revisar por grupo
- validar completitud
- filtrar por fecha de emisión de Factura
- observar o cerrar grupos documentales

## Auditoría

Auditoría observa:

- Contenedor Operativo completo
- Documento Operativo Principal
- Grupos de Factura
- Adjuntos
- eventos
- cambios de estado
- usuarios responsables

Responsabilidad principal:

- reconstruir trazabilidad
- identificar cambios
- revisar decisiones y modificaciones

## Regla común

Aunque cada módulo tenga una vista distinta, todos deben referirse al mismo dominio.

No se debe crear una jerarquía especial para Compras, otra para Almacén y otra para Contabilidad.

## Riesgo evitado

Este documento evita que cada módulo invente su propio modelo y luego el backend tenga que reconciliar estructuras incompatibles.
