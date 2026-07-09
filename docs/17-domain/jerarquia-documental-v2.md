# Jerarquía Documental V2

## Propósito

Este documento define la jerarquía funcional propuesta para el Modelo Documental V2 considerando el nuevo contexto operativo validado por negocio.

## Jerarquía base

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```


## Jerarquías por módulo

El Modelo Documental V2 mantiene un motor documental común, pero reconoce que no todos los módulos tienen la misma jerarquía funcional.

### Compras

Compras se organiza así:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

Donde el Documento Operativo Principal actualmente puede materializarse como OC, OS o Requerimiento de Compra, sin cerrar la lista para futuras decisiones de negocio.

### Caja Chica y Rendición de Requerimientos

Caja Chica y Rendición se organizan así:

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Transferencia opcional
      -> Rendición
          -> Sustentos documentales múltiples
```

En estos módulos no debe exigirse OC, OS ni Requerimiento de Compra.

El Requerimiento de Fondo abre el contexto de control. La transferencia bancaria es opcional al inicio y puede regularizarse posteriormente.

La Rendición agrupa los sustentos documentales. Una rendición puede contener varios documentos del mismo tipo: facturas, boletas, recibos, comprobantes, tickets u otros.

Estos documentos no se consideran duplicados por compartir tipo documental. Solo se consideran duplicados cuando coinciden por hash de archivo o por clave documental específica del comprobante.

## Contenedor Operativo

El Contenedor Operativo representa la entidad superior que identifica una operación documental.

Puede materializarse de forma distinta según empresa, módulo y contexto:

- Para BBTI y BB Tecnología: Centro de costo + OP.
- Para consorcios y obras: Consorcio/Obra como Centro de costo automático.
- Para Caja Chica: Requerimiento de Fondo o contexto equivalente.
- Para Rendición de Requerimientos: Requerimiento de Fondo o documento equivalente.

El nombre visible puede variar, pero el concepto común debe conservarse.

## Documento Operativo Principal

El Documento Operativo Principal es el documento que abre o gobierna la operación documental dentro de Compras.

Actualmente puede materializarse como:

- OC.
- OS.
- Requerimiento de Compra.

Esta lista podrá ampliarse mediante decisiones futuras de negocio.

La Factura no es Documento Operativo Principal formal en V2.

## Grupo de Factura

El Grupo de Factura es el conjunto documental que nace alrededor de una Factura.

Incluye la Factura y sus documentos asociados.

La Factura no cuelga sola como documento aislado; abre un grupo documental.

## Adjuntos

Los Adjuntos pertenecen al Grupo de Factura.

Pueden incluir:

- Guía.
- Nota de ingreso.
- Transferencia.
- Detracción.
- Recibo.
- Otros documentos relacionados.

## Caja Chica y Rendición de Requerimientos

Caja Chica y Rendición de Requerimientos no siguen necesariamente el patrón OC/OS/RC.

Pueden iniciar con Requerimiento de Fondo.

Deben compartir el motor documental común, aunque tengan tablas de negocio propias.

La ausencia temporal de transferencia no debe bloquear una rendición cuando el trabajador haya pagado con dinero propio o cuando la transferencia esté pendiente de regularización.

## Motor documental común

Compras, Caja Chica y Rendición de Requerimientos deben compartir:

- documentos.
- archivos.
- OCR.
- eventos.
- alertas.
- relaciones.
- revisión contable.

No deben existir motores documentales distintos por módulo.

## Pendientes

Quedan pendientes:

- Definir nombre visible final del Contenedor Operativo por módulo.
- Definir si un Contenedor Operativo admite uno o varios Documentos Operativos Principales.
- Definir flujo excepcional para documentos sin Documento Operativo Principal.
- Definir la distribución posterior de Almacén por centro de costo.
