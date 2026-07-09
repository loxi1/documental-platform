# Modelo Relacional Documental V2 — Implementación Refinada

## 1. Propósito

Este documento traduce el Modelo Documental V2 a un diseño relacional implementable, todavía sin aplicar migraciones ni modificar código.

Esta versión incorpora el nuevo contexto operativo validado por negocio:

- BBTI y BB Tecnología trabajan con Centro de costo + OP.
- Consorcios y obras usan el consorcio/obra como Centro de costo automático.
- Caja Chica inicia con Requerimiento de Fondo.
- Rendición de Requerimientos sigue patrón similar a Caja Chica.
- Todos los módulos comparten un único motor documental.

## 2. Principios

- La regla de negocio gobierna al modelo de datos.
- Las tablas se adaptan al dominio, no al revés.
- El Contenedor Operativo es la raíz conceptual.
- El Contexto Operativo puede variar por empresa y módulo.
- El Documento Operativo Principal no es una lista cerrada.
- La Factura abre Grupo de Factura.
- Los Adjuntos pertenecen al Grupo de Factura.
- Caja Chica y Rendición no deben crear motores documentales paralelos.
- Legacy se consulta; el Modelo V2 gobierna.
- La migración debe ser gradual y no destructiva.

## 3. Tablas actuales a conservar

Se conservan como base del motor documental común:

- documentos.documentos.
- documentos.documentos_archivos.
- documentos.ocr_resultados.
- documentos.documento_eventos.
- documentos.documento_alertas.
- documentos.documento_relaciones, si existe.
- documentos.expedientes, como compatibilidad y posible materialización del Contenedor Operativo.
- documentos.expediente_documentos, como compatibilidad V1/V1.3H.

Estas tablas no deben duplicarse por módulo.

## 4. Entidades nuevas sugeridas conceptualmente

No se genera SQL. No se definen nombres finales.

### 4.1 Contenedor Operativo

Entidad conceptual que identifica la operación documental.

Debe soportar variaciones de contexto:

- BBTI / BB Tecnología: Centro de costo + OP.
- Consorcios / Obras: Centro de costo automático desde consorcio/obra.
- Caja Chica: Requerimiento de Fondo.
- Rendición de Requerimientos: Requerimiento de Fondo o equivalente.

Campos conceptuales posibles:

- identificador.
- empresa/workspace.
- módulo origen.
- tipo de contexto.
- centro de costo, cuando aplique.
- OP, cuando aplique.
- consorcio/obra, cuando aplique.
- documento de apertura, cuando aplique.
- estado.
- auditoría.

### 4.2 Documento Operativo Principal

Entidad conceptual que vincula un Contenedor Operativo con el documento que gobierna una operación de Compras.

Actualmente puede materializarse como OC, OS o Requerimiento de Compra.

Esta lista podrá ampliarse mediante decisiones futuras.

### 4.3 Grupo de Factura

Entidad conceptual que agrupa una Factura y sus documentos asociados.

Debe permitir:

- múltiples facturas por Documento Operativo Principal.
- pagos parciales.
- entregas parciales.
- múltiples guías.
- múltiples notas de ingreso.
- múltiples detracciones.
- revisión contable por fecha de emisión de factura.

### 4.4 Documentos del Grupo de Factura

Entidad conceptual que vincula adjuntos al Grupo de Factura.

Debe permitir clasificar documentos como:

- guía.
- nota de ingreso.
- transferencia.
- detracción.
- recibo.
- otros.

### 4.5 Entidades de negocio por módulo

Cada módulo puede tener tablas propias, pero sin duplicar el motor documental.

#### Compras

Tablas propias posibles para reglas de Compras, OC, OS, Requerimiento de Compra y grupos de factura.

#### Caja Chica

Tablas propias posibles para Requerimiento de Fondo, responsable, rendición, liquidación y regularización de transferencia.

#### Rendición de Requerimientos

Tablas propias posibles para requerimiento, responsable, sustentos, rendición y regularización.

## 5. Compatibilidad con el modelo actual

El modelo V2 debe convivir con:

- documentos actuales.
- carga guiada.
- OCR actual.
- R2 actual.
- prevalidación.
- expediente_documentos.

No se propone migración destructiva.

El modelo actual puede funcionar como capa de compatibilidad hasta que V2 gobierne las nuevas cargas.

## 6. Constraints funcionales sugeridos

A nivel conceptual, el modelo deberá evitar:

- duplicidad de documentos por hash.
- duplicidad de clave documental cuando corresponda.
- duplicidad de Documento Operativo Principal dentro del mismo contexto, según regla aprobada.
- duplicidad de Factura dentro del mismo Documento Operativo Principal.
- duplicidad de Adjuntos dentro del mismo Grupo de Factura.
- bloqueo indebido de rendición cuando no exista transferencia inicial en Caja Chica o Rendición.

## 7. Índices recomendados conceptualmente

Futuros índices deberían considerar:

- empresa/workspace.
- módulo origen.
- centro de costo.
- OP.
- consorcio/obra.
- Documento Operativo Principal.
- Factura.
- fecha de emisión de factura.
- proveedor.
- estado de revisión.
- hash de archivo.
- clave documental.

## 8. Plan gradual sugerido

### Fase 0

Documentación y aprobación de dominio.

### Fase 1

Diseño relacional V2 aprobado sin migrar.

### Fase 2

Creación de tablas V2 vacías.

### Fase 3

Nuevas cargas escriben en V2 y mantienen compatibilidad con V1.

### Fase 4

Lectura dual V1/V2.

### Fase 5

Migración selectiva, no masiva, de datos útiles.

### Fase 6

Deprecación controlada de relaciones antiguas, si corresponde.

## 9. Qué NO implementar todavía

No implementar todavía:

- migraciones.
- SQL final.
- endpoints.
- repositories.
- DTOs.
- eventos NATS.
- CQRS.
- Event Sourcing.
- integración Legacy.
- UI.
- distribución por almacén.

## 10. Dictamen

El modelo relacional V2 debe permitir que diferentes módulos tengan contextos operativos distintos, pero compartan un motor documental común.

Compras, Caja Chica y Rendición de Requerimientos no deben duplicar tablas documentales base.

La diferencia debe vivir en las tablas de negocio propias de cada módulo, mientras que documentos, archivos, OCR, eventos, alertas, relaciones y revisión contable permanecen compartidos.


## Patrón relacional para Caja Chica y Rendición

El diseño relacional V2 debe contemplar que Caja Chica y Rendición no usan la jerarquía de Compras.

Compras se modela como:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

Caja Chica y Rendición se modelan conceptualmente como:

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Transferencia opcional
      -> Rendición
          -> Sustentos documentales múltiples
```

### Implicancia técnica

No se debe crear un segundo motor documental.

Las tablas de negocio de Caja Chica o Rendición podrán ser propias del módulo, pero los documentos físicos y su trazabilidad deberán seguir usando el motor común:

- documentos.documentos.
- documentos.documentos_archivos.
- OCR.
- eventos documentales.
- alertas documentales.
- relaciones documentales.

### Sustentos múltiples

Una rendición puede contener múltiples sustentos del mismo tipo documental.

Por ejemplo:

- varias facturas.
- varias boletas.
- varios recibos.
- varios comprobantes.

Esto no debe bloquearse mediante un constraint de unicidad por tipo documental.

La unicidad debe evaluarse por identidad real del documento:

- hash de archivo; o
- clave documental específica del comprobante, cuando exista.

Por tanto, cualquier tabla futura de relación entre rendición y sustentos no debe tener una restricción única del tipo:

```text
rendicion_id + tipo_documental
```

En cambio, podrá evaluar restricciones como:

```text
rendicion_id + documento_id
hash_archivo
clave_documental
```

según corresponda.
