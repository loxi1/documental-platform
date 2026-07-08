# Jerarquía Documental V2

## Propósito

Este documento describe la jerarquía funcional propuesta para el Modelo Documental V2, tomando como referencia obligatoria el documento arquitectónico raíz:

```text
docs/17-domain/contenedor-operativo.md
```

## Principio rector

El dominio gobierna la implementación.

La jerarquía funcional no debe derivarse de las tablas existentes, sino de cómo trabaja el negocio.

## Jerarquía propuesta

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

## Nivel 1: Contenedor Operativo

Representa la entidad superior que identifica una operación documental.

No es necesariamente el nombre visible final. Puede materializarse funcionalmente como:

- Expediente
- Centro de costo
- Orden de Producción
- Proyecto
- PR
- otra entidad equivalente

Su responsabilidad es agrupar bajo una misma trazabilidad los documentos operativos, grupos de factura, adjuntos, eventos y auditoría.

## Nivel 2: Documento Operativo Principal

Representa el documento que abre o soporta la operación documental dentro del contenedor.

**Documento Operativo Principal** es el concepto estable del dominio.

Actualmente puede materializarse como:

- OC
- OS
- Requerimiento de Compra

Esta lista podrá ampliarse mediante decisiones futuras de negocio, por ejemplo: Contrato, Convenio, Orden de Servicio Externa, Acta de Inicio u otros documentos operativos equivalentes.

La Factura deja de ser documento principal formal.

## Nivel 3: Grupo de Factura

La Factura no vive sola. Cada Factura abre un grupo documental.

Un Documento Operativo Principal puede tener uno o varios Grupos de Factura.

Cada Grupo de Factura contiene:

- Factura
- documentos de recepción
- documentos de pago
- documentos tributarios relacionados
- eventos y validaciones propias

## Nivel 4: Adjuntos

Los adjuntos son documentos derivados o complementarios asociados a una Factura específica.

Ejemplos:

- Guía
- Nota de ingreso
- Transferencia
- Detracción
- Recibo
- Otros documentos relacionados

## Reglas base

1. La Factura no es raíz del dominio.
2. La Factura no es documento principal formal.
3. La Factura abre un Grupo de Factura.
4. Los adjuntos pertenecen al Grupo de Factura.
5. Contabilidad revisa principalmente por Grupo de Factura.
6. El filtro contable debe poder usar fecha de emisión de Factura.
7. Legacy Python no gobierna esta jerarquía.

## Casos especiales

Quedan pendientes de análisis:

- documentos sin Documento Operativo Principal formal
- facturas recibidas antes de la OC formal
- guías recibidas antes de la factura
- múltiples documentos principales dentro de un mismo contenedor
- reemplazo de principal
- distribución posterior por almacén

## Relación con otros documentos

Este documento depende conceptualmente de:

```text
docs/17-domain/contenedor-operativo.md
```

Y sirve como base para:

- grupos-factura.md
- requerimiento-compra.md
- modelo-relacional-documental-v2.md
- futuras definiciones UX y backend
