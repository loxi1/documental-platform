# Grupos de Factura

## Propósito

Definir formalmente el concepto de **Grupo de Factura** dentro del Modelo Documental V2.

## Definición

Un Grupo de Factura es el conjunto documental que se organiza alrededor de una Factura.

No representa solo el archivo Factura. Representa la unidad de revisión, control y trazabilidad que contiene la Factura y todos sus documentos asociados.

## Ubicación en la jerarquía

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

## Regla principal

La Factura deja de ser Documento Operativo Principal.

La Factura abre un Grupo de Factura.

## Documentos que pueden pertenecer al grupo

Un Grupo de Factura puede contener:

- Factura
- Guía
- Nota de ingreso
- Transferencia
- Detracción
- Recibo
- otros documentos asociados

## Múltiples facturas

Un Documento Operativo Principal puede tener varias facturas.

Ejemplo:

```text
OC 007950
  -> Grupo Factura F001-100
  -> Grupo Factura F001-101
  -> Grupo Factura F001-102
```

Cada Grupo de Factura mantiene su propia trazabilidad.

## Entregas parciales

Una factura puede estar relacionada con una o varias guías.

Una guía podría cubrir parte de una entrega.

El modelo debe permitir documentar entregas parciales sin asumir que siempre existe una relación uno a uno entre Factura y Guía.

## Pagos parciales

Una factura puede tener:

- un pago total
- varios pagos parciales
- transferencia y detracción separadas
- documentos de pago pendientes

El Grupo de Factura debe permitir múltiples documentos financieros asociados.

## Múltiples detracciones

Puede existir más de una detracción asociada a una operación o factura, según el caso.

La regla no debe asumir una única detracción por factura hasta que negocio lo valide.

## Revisión contable

Contabilidad debe revisar el Grupo de Factura como unidad.

La revisión debe poder responder:

- ¿La factura existe?
- ¿La guía está asociada?
- ¿Existe nota de ingreso?
- ¿Existe pago?
- ¿Existe detracción si aplica?
- ¿Qué documentos faltan?
- ¿Cuál es el estado del grupo?

## Filtro por fecha de emisión

Contabilidad debe poder filtrar por fecha de emisión de Factura.

Este punto justifica que la Factura abra grupo documental, aunque no sea Documento Operativo Principal.

## Estados posibles sugeridos

Solo a nivel conceptual, un Grupo de Factura podría pasar por estados como:

- incompleto
- pendiente revisión
- observado
- validado
- cerrado

Estos estados no son implementación definitiva.

## Riesgos

- Facturas sin guía.
- Guías antes que factura.
- Pagos antes de validación completa.
- Detracciones asociadas a varias facturas.
- Facturas duplicadas por clave documental.
- Archivos duplicados por hash.
- OCR incompleto.

## Pendientes

- Definir obligatoriedad de cada adjunto por tipo de operación.
- Definir reglas para pagos parciales.
- Definir estado oficial del Grupo de Factura.
- Definir cómo se relacionará con distribución de Almacén.
