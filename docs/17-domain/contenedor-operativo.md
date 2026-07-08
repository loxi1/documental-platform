# Contenedor Operativo

**Documento arquitectónico raíz del Modelo Documental V2**

## Estado

Aprobado conceptualmente para guiar los siguientes sprints del Modelo Documental V2.

Este documento define el concepto de **Contenedor Operativo** como raíz conceptual del dominio documental operativo. No define implementación, tablas, endpoints ni migraciones.

## Frase rectora

> La regla de negocio gobierna al modelo de datos. Las tablas deberán adaptarse al dominio y no al revés.

La dirección correcta de diseño es:

```text
Negocio
  -> Modelo de Dominio
      -> Modelo Relacional
          -> Backend
              -> Frontend
```

Nunca:

```text
Tabla PostgreSQL
  -> Backend
      -> Negocio
```

## Definición

El **Contenedor Operativo** es un concepto de dominio utilizado para representar la operación documental superior.

No constituye necesariamente el nombre visible para el usuario final.

Durante la validación funcional podrá representarse como:

- Expediente
- Centro de costo
- Orden de Producción
- Proyecto
- PR
- u otra entidad de negocio equivalente

El nombre visible será definido por negocio.

El modelo interno utiliza el término **Contenedor Operativo** para evitar acoplar el diseño a una denominación específica antes de cerrar la validación funcional.

## Problema

Después de la demo gerencial se identificó que el término “Expediente” no necesariamente representaba la raíz esperada por el negocio. Para algunas áreas, la operación puede entenderse como centro de costo, orden de producción, proyecto o PR.

Antes de iniciar implementación backend o modelo relacional definitivo, debe definirse qué identifica una operación documental.

La pregunta central es:

```text
¿Qué identifica una operación documental?
```

En la operación real pueden aparecer como posibles raíces:

- Expediente
- Centro de costo
- Orden de Producción
- Proyecto
- Requerimiento de Compra
- OC
- Proveedor
- Factura

Sin embargo, no todas estas entidades deben gobernar el dominio.

## Jerarquía funcional propuesta

La jerarquía funcional propuesta para el Modelo Documental V2 es:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

Donde:

```text
Documento Operativo Principal = concepto estable del dominio que actualmente puede materializarse como OC, OS o Requerimiento de Compra. Esta lista podrá ampliarse mediante decisiones futuras de negocio.
```

Y:

```text
Grupo de Factura = Factura + documentos asociados
```

Los adjuntos no cuelgan directamente del contenedor, salvo excepciones controladas. En el flujo formal, los adjuntos pertenecen a un Grupo de Factura.

## Principio de estabilidad del dominio

El Modelo Documental V2 representa el negocio y no la implementación técnica.

Las tablas, endpoints, repositorios o componentes podrán evolucionar con el tiempo.

Sin embargo, la jerarquía funcional del dominio debe permanecer estable y ser el punto de referencia para toda decisión técnica.

Primero se define el negocio.

Luego se adapta el modelo relacional.

Finalmente se implementa el código.

El sistema no debe asumir que, porque una tabla actual funciona de determinada manera, el negocio debe adaptarse a esa estructura.

La regla correcta es la inversa:

```text
La estructura técnica debe adaptarse al dominio validado.
```

## Principio de independencia

El Modelo Documental V2 no depende del modelo histórico.

El proyecto Legacy Python conserva valor como repositorio histórico y de consulta, pero no gobierna las reglas del dominio operativo.

El Modelo V2 debe poder evolucionar independientemente de la estructura utilizada por el proceso masivo de clasificación documental.

Principio oficial:

```text
El histórico se consulta.
El Modelo Documental V2 gobierna.
```

Toda integración con Legacy deberá realizarse mediante adaptadores o servicios de consulta.

El dominio V2 nunca deberá depender funcionalmente del modelo Legacy.

## Alternativas de raíz

### A. Expediente como raíz operativa

Representa un contenedor documental general donde se agrupan documentos relacionados a una operación.

**Ventajas**

- Compatible con el modelo actual.
- Ya existe en el sistema.
- Facilita trazabilidad y auditoría documental.
- Puede agrupar documentos diversos.

**Desventajas**

- Puede sonar más documental que operativo.
- Negocio puede no reconocerlo como raíz real.
- En la demo se esperaba ver OP, PR o centro de costo.

**Impacto**

- Compras: puede buscar expediente y vincular OC/OS/RC.
- Almacén: puede recibir documentos vinculados, pero distribución real podría requerir otro nivel.
- Finanzas: puede asociar pagos a facturas dentro del expediente.
- Contabilidad: puede revisar por expediente, pero necesita bajar a grupo de factura.
- Legacy: compatible parcialmente, sin depender de legacy.
- Riesgo: medio; fácil técnicamente, pero puede consolidar una palabra no validada por negocio.

### B. Centro de costo como raíz operativa

Representa el destino económico o presupuestal de una operación.

**Ventajas**

- Relevante para contabilidad.
- Útil para control de costos.
- Familiar para áreas administrativas.

**Desventajas**

- No siempre identifica una operación completa.
- Una OC puede distribuirse a varios centros de costo.
- Almacén puede redefinir distribución posteriormente.

**Impacto**

- Compras: no siempre conoce distribución final.
- Almacén: puede necesitar redistribuir.
- Finanzas: útil para imputación, no necesariamente para trazabilidad documental.
- Contabilidad: alto valor contable, pero no siempre buena raíz documental.
- Legacy: puede coincidir con nombres históricos, pero no debe fusionarse.
- Riesgo: alto si se usa como raíz única.

### C. Orden de Producción / PR como raíz operativa

Representa la necesidad operativa que origina compras, servicios o abastecimiento.

**Ventajas**

- Más cercana al lenguaje operativo.
- Puede representar el origen real de la necesidad.
- Permite conectar compras con producción.

**Desventajas**

- No siempre existirá OP o PR formal.
- Puede haber compras administrativas sin OP.
- Falta validar si PR y OP son equivalentes o entidades distintas.

**Impacto**

- Compras: puede asociar OC/OS/RC a la necesidad.
- Almacén: puede distribuir entregas según OP/PR.
- Finanzas: pagos quedan vinculados a operación clara.
- Contabilidad: puede revisar costos por OP/PR, filtrando por fecha de factura.
- Legacy: no necesariamente compatible.
- Riesgo: medio-alto; fuerte funcionalmente, pero requiere validación.

### D. Documento Operativo Principal como raíz operativa

Representa el documento operativo principal que origina o soporta grupos de factura y adjuntos. Actualmente puede materializarse como OC, OS o Requerimiento de Compra, sin cerrar la lista a futuro.

**Ventajas**

- Muy concreto.
- Facilita grupos de factura.
- Claro para Compras.

**Desventajas**

- Una operación puede tener varias OC/OS/RC.
- Pierde nivel superior de agrupación.
- Puede complicar auditoría global.

**Impacto**

- Compras: muy favorable.
- Almacén: útil para recepción, limitado para distribución entre centros de costo.
- Finanzas: pagos se asocian fácilmente por factura/OC.
- Contabilidad: útil para revisar factura por OC, limitado para visión global.
- Legacy: no debe depender de legacy.
- Riesgo: medio; tentador, pero podría dejar corto el modelo.

### E. Factura como raíz operativa

Representa el documento tributario/comercial que activa revisión contable y pagos.

**Ventajas**

- Contabilidad revisa mucho por factura.
- Tiene fecha de emisión, proveedor, serie, número y monto.

**Desventajas**

- La nueva regla indica que la Factura ya no es documento principal formal.
- Debe estar debajo de OC, OS o RC.
- Usarla como raíz hace informal el modelo.
- No representa la operación previa.

**Impacto**

- Compras: deficiente, porque Compras trabaja antes de factura.
- Almacén: deficiente, porque guías pueden llegar antes o después.
- Finanzas: útil para pagos, pero no como raíz.
- Contabilidad: útil como unidad de revisión, no como contenedor raíz.
- Legacy: puede haber casos históricos, pero no gobiernan V2.
- Riesgo: alto; contradice regla nueva.

### F. Contenedor Operativo neutral como raíz

Representa la entidad superior que agrupa la necesidad, operación o destino documental, sin fijar todavía si su nombre final será Expediente, Centro de costo, OP, PR, Proyecto u otra entidad.

**Ventajas**

- Evita amarrar el modelo prematuramente.
- Compatible con distintas realidades del negocio.
- Puede mapearse a varios nombres funcionales.
- Protege backend y modelo conceptual de cambios de denominación.
- Facilita evolución futura.

**Desventajas**

- Puede sonar abstracto para usuarios.
- UX debe traducirlo a un nombre validado por negocio.
- Requiere documentación clara para evitar confusión.

**Impacto**

- Compras: puede trabajar sobre el contenedor y vincular OC/OS/RC.
- Almacén: permite recepción y distribución posterior sin depender de una interpretación inicial.
- Finanzas: permite pagos agrupados bajo una misma trazabilidad.
- Contabilidad: revisa por Grupo de Factura y mantiene trazabilidad al contenedor.
- Legacy: permite consulta histórica sin fusionar modelos.
- Riesgo: medio-bajo si se documenta bien.

## Recomendación

Se recomienda utilizar **Contenedor Operativo neutral** como raíz conceptual del dominio V2.

No necesariamente como nombre visible definitivo para el usuario, sino como concepto técnico-funcional.

El nombre final en UI podrá ser validado con negocio:

- Expediente
- Centro de costo
- Orden de Producción
- PR
- Proyecto
- u otro nombre funcional

La razón principal es que la demo evidenció que “Expediente” no necesariamente representa la raíz esperada por negocio.

## Regla oficial propuesta

La operación documental se identifica por un **Contenedor Operativo**, que agrupa documentos operativos principales, grupos de factura y adjuntos bajo una misma trazabilidad.

El Contenedor Operativo representa la entidad superior de negocio que concentra la necesidad, operación o destino documental, pero su nombre funcional definitivo debe ser validado con negocio.

## Impacto sobre la jerarquía

La jerarquía V2 se expresa así:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

El **Documento Operativo Principal** es el concepto estable.

Actualmente puede materializarse como:

- OC
- OS
- Requerimiento de Compra

Esta lista no debe tratarse como cerrada. Podrá ampliarse mediante decisiones futuras de negocio, por ejemplo: Contrato, Convenio, Orden de Servicio Externa, Acta de Inicio u otros documentos operativos equivalentes.

El Grupo de Factura contiene la Factura y sus documentos asociados.

La Factura no es raíz ni principal formal.

## Decisiones pendientes

Antes de iniciar implementación definitiva deben resolverse:

- ¿Cuál será el nombre funcional visible del Contenedor Operativo?
- ¿Puede un Contenedor Operativo tener varios Documentos Operativos Principales?
- ¿Cómo se tratarán los casos legacy donde una Factura actuaba como principal?
- ¿Cómo se relacionará la futura distribución de Almacén con el Contenedor Operativo?
- ¿Cómo se tratarán documentos sin OC/OS/RC?
- ¿Cómo se manejará reemplazo de Documento Operativo Principal?

## Alcance

Este documento define únicamente el modelo conceptual del dominio.

No define:

- tablas
- endpoints
- contratos API
- migraciones
- implementación backend
- implementación frontend

Esos elementos se desarrollarán en documentos específicos, manteniendo como referencia obligatoria este modelo conceptual.

Cualquier decisión técnica futura deberá validar primero su coherencia con el Contenedor Operativo y la jerarquía funcional del Modelo Documental V2.

Este documento debe permanecer libre de detalles de implementación para conservar su función como documento arquitectónico raíz del Modelo Documental V2.
