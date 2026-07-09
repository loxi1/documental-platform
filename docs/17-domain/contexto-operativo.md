# Contexto Operativo — Modelo Documental V2

## 1. Propósito

Este documento define cómo cambia el contexto operativo del Modelo Documental V2 según la empresa, módulo y tipo de operación.

El objetivo es evitar crear motores documentales distintos para Compras, Caja Chica y Rendición de Requerimientos.

La regla oficial es:

> Cada módulo puede tener tablas de negocio propias, pero todos deben compartir el mismo motor documental.

## 2. Principio rector

El Modelo Documental V2 se apoya en un único motor documental común.

Ese motor común debe servir para:

- Compras.
- Caja Chica.
- Rendición de Requerimientos.
- Revisión documental contable.
- OCR.
- Eventos documentales.
- Alertas documentales.
- Relaciones documentales.

Los módulos pueden diferenciarse en su lógica de negocio, pero no deben duplicar el almacenamiento documental base.

## 3. Empresas BBTI y BB Tecnología

Para BBTI y BB Tecnología, el contexto operativo de Compras requiere:

- Centro de costo.
- Orden de Producción, OP.

Cuando el usuario cree documentos como:

- OC.
- OS.
- Requerimiento de Compra.

el sistema deberá asociarlos a:

```text
Centro de costo + OP
```

### Elementos obligatorios

Para estas empresas, en el flujo de Compras, son obligatorios:

- Empresa/workspace.
- Centro de costo.
- Orden de Producción.
- Documento Operativo Principal.

### Elementos seleccionados por el usuario

El usuario deberá seleccionar o confirmar:

- Centro de costo.
- OP.
- Tipo de Documento Operativo Principal.
- Documento cargado.

### Impacto funcional

El Contenedor Operativo puede materializarse como la combinación funcional:

```text
Empresa + Centro de costo + OP
```

Esta combinación identifica el contexto donde viven OC, OS, Requerimientos de Compra, Grupos de Factura y Adjuntos.

## 4. Consorcios y Obras

Para consorcios u obras, como:

- Consorcio CIMA.
- Huancavelica.
- Kimbiri.
- Otros consorcios u obras.

el Centro de costo será el mismo consorcio u obra.

Por tanto, cuando el usuario cree:

- OC.
- OS.
- Requerimiento de Compra.

no deberá seleccionar manualmente Centro de costo.

El sistema deberá asignarlo automáticamente desde el contexto del workspace, empresa, obra o consorcio.

### Elementos obligatorios

En estos casos son obligatorios:

- Empresa/workspace.
- Consorcio u obra.
- Documento Operativo Principal.

### Elementos automáticos

El sistema podrá asignar automáticamente:

- Centro de costo.
- Contexto operativo base.

### Impacto funcional

El Contenedor Operativo puede materializarse como:

```text
Empresa / Consorcio / Obra
```

El usuario no debe verse obligado a elegir un Centro de costo redundante cuando este ya viene determinado por el workspace o por la empresa/obra activa.

## 5. Caja Chica

Caja Chica no utiliza como documento inicial:

- OC.
- OS.
- Requerimiento de Compra.

Su documento inicial será:

```text
Requerimiento de Fondo
```

Posteriormente pueden agregarse documentos como:

- Transferencia bancaria.
- Comprobantes.
- Sustentos.
- Documentos de rendición.

### Caso funcional: pago con dinero propio

Puede ocurrir que el trabajador pague con dinero propio antes de existir una transferencia bancaria.

En ese caso:

- La rendición no debe bloquearse.
- El sistema debe permitir rendir documentos normalmente.
- La transferencia podrá regularizarse posteriormente cuando exista.

### Implicancia documental

Caja Chica debe usar el mismo motor documental para:

- documentos.
- archivos.
- OCR.
- eventos.
- alertas.
- relaciones documentales.
- revisión contable.

Pero puede tener tablas de negocio propias para:

- solicitud de fondo.
- rendición.
- responsables.
- importes.
- estados de caja.
- liquidación.

## 6. Rendición de Requerimientos

Rendición de Requerimientos seguirá un patrón similar a Caja Chica.

Puede iniciar con:

- Requerimiento de Fondo.
- Documento equivalente de apertura.

Posteriormente puede agregarse:

- Transferencia bancaria.
- Sustentos.
- Comprobantes.
- Documentos de regularización.

Al igual que Caja Chica, la ausencia inicial de transferencia no debe bloquear la rendición cuando el usuario haya pagado con dinero propio o cuando la transferencia aún no haya sido regularizada.

## 7. Regla específica para Caja Chica y Rendición

Caja Chica y Rendición de Requerimientos no siguen la misma jerarquía de Compras.

La jerarquía de Compras se mantiene como:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

Pero Caja Chica y Rendición siguen una jerarquía propia dentro del mismo motor documental común:

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Transferencia opcional
      -> Rendición
          -> Sustentos documentales múltiples
```

Esto significa que Caja Chica y Rendición no requieren OC, OS ni Requerimiento de Compra para iniciar su operación documental.

El documento inicial es el Requerimiento de Fondo o un documento equivalente de apertura.

La transferencia bancaria puede agregarse posteriormente. Su ausencia inicial no debe bloquear la rendición, especialmente cuando el trabajador pagó con dinero propio o cuando la regularización bancaria ocurre después.

### Sustentos múltiples del mismo tipo

Una rendición puede tener muchos documentos del mismo tipo.

Ejemplos válidos:

- varias facturas.
- varias boletas.
- varios recibos.
- varios comprobantes.
- varios tickets.
- varios sustentos internos.

Esto es normal y no debe tratarse como duplicado documental por el solo hecho de compartir tipo documental.

Solo debe considerarse duplicado cuando coincida por:

- hash de archivo; o
- clave documental específica del comprobante, cuando el tipo documental tenga una clave identificable.

Por tanto, en Caja Chica y Rendición, la regla de duplicidad no debe ser “un documento por tipo”, sino “un documento por identidad documental real”.

## 8. Componentes compartidos

Los siguientes componentes deben ser comunes a Compras, Caja Chica y Rendición de Requerimientos:

- `documentos.documentos`.
- `documentos.documentos_archivos`.
- OCR.
- Eventos documentales.
- Alertas documentales.
- Relaciones documentales.
- Trazabilidad documental.
- Auditoría documental.
- Revisión documental contable.
- Prevalidación cuando aplique.
- Control de duplicados por hash o clave documental cuando aplique.

## 9. Componentes propios por módulo

Cada módulo puede tener sus propias tablas de negocio.

### Compras

Puede requerir tablas propias para:

- Contenedor Operativo de Compras.
- Documento Operativo Principal.
- Grupos de Factura.
- Control de OC/OS/RC.

### Caja Chica

Puede requerir tablas propias para:

- Requerimiento de Fondo.
- Caja asignada.
- Responsable.
- Rendición.
- Liquidación.
- Regularización de transferencia.

### Rendición de Requerimientos

Puede requerir tablas propias para:

- Requerimiento de Fondo.
- Responsable.
- Sustentos.
- Rendición.
- Regularización.

## 10. Revisión contable

Contabilidad debe poder revisar la documentación final sin importar el módulo de origen.

Esto significa que los documentos provenientes de:

- Compras.
- Caja Chica.
- Rendición de Requerimientos.

podrán llegar a una bandeja o vista de revisión contable común, respetando el contexto operativo y las reglas específicas de cada módulo.

La revisión contable no debe requerir motores documentales separados.

## 11. Regla oficial

El contexto operativo se determina por empresa, workspace, módulo y tipo de operación.

Para BBTI y BB Tecnología, Compras requiere Centro de costo + OP.

Para consorcios y obras, el Centro de costo puede asignarse automáticamente porque coincide con el consorcio u obra.

Caja Chica y Rendición de Requerimientos no inician con OC/OS/RC, sino con Requerimiento de Fondo o documento equivalente.

Caja Chica y Rendición se estructuran como Contexto Operativo -> Requerimiento de Fondo -> Transferencia opcional -> Rendición -> Sustentos documentales múltiples.

Una rendición puede contener múltiples documentos del mismo tipo y esto no constituye duplicidad salvo coincidencia por hash o clave documental específica.

Todos los módulos comparten el motor documental común.

## 12. Qué no se decide todavía

Este documento no define:

- tablas finales.
- SQL.
- migraciones.
- endpoints.
- contratos API.
- eventos NATS.
- implementación backend.
- implementación frontend.
- estrategia de RDS.
- estrategia definitiva de legacy.

## 13. Dictamen

El Modelo Documental V2 debe reconocer que no todas las operaciones nacen igual.

Compras puede nacer desde Centro de costo + OP, o desde Consorcio/Obra automático.

Caja Chica y Rendición de Requerimientos pueden nacer desde Requerimiento de Fondo.

Pero todos deben compartir el mismo motor documental para evitar duplicidad, deuda técnica y divergencia funcional.
