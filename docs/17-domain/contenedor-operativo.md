# Contenedor Operativo — Documento Arquitectónico Raíz del Modelo Documental V2

## Definición

El Contenedor Operativo es un concepto de dominio utilizado para representar la operación documental superior.

No constituye necesariamente el nombre visible para el usuario final.

Durante la validación funcional podrá representarse como:

- Expediente.
- Centro de costo.
- Orden de Producción.
- Proyecto.
- PR.
- Consorcio.
- Obra.
- Requerimiento de Fondo.
- Otra entidad de negocio equivalente.

El nombre visible será definido por negocio.

El modelo interno utiliza el término **Contenedor Operativo** para evitar acoplar el diseño a una denominación específica antes de cerrar la validación funcional.

## Principio de estabilidad del dominio

El Modelo Documental V2 representa el negocio y no la implementación técnica.

Las tablas, endpoints, repositorios o componentes podrán evolucionar con el tiempo.

Sin embargo, la jerarquía funcional del dominio debe permanecer estable y ser el punto de referencia para toda decisión técnica.

La dirección correcta es:

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

La estructura técnica debe adaptarse al dominio validado.

## Jerarquía funcional propuesta

La jerarquía funcional propuesta para el Modelo Documental V2 es:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

El Documento Operativo Principal actualmente puede materializarse como:

- OC.
- OS.
- Requerimiento de Compra.

Esta lista podrá ampliarse mediante decisiones futuras de negocio.

## Nueva información de contexto operativo

Se confirmó que el Contenedor Operativo puede tomar formas distintas según empresa, workspace y módulo.

### BBTI y BB Tecnología

Para estas empresas, en Compras, el contexto operativo requiere:

```text
Centro de costo + Orden de Producción
```

Cuando se cree una OC, OS o Requerimiento de Compra, el usuario deberá asociarlo a Centro de costo + OP.

### Consorcios y Obras

Para consorcios y obras, el Centro de costo será el mismo consorcio u obra.

En esos casos el usuario no debe seleccionar Centro de costo manualmente.

El sistema debe asignarlo automáticamente desde el workspace, empresa, consorcio u obra activa.

### Caja Chica y Rendición de Requerimientos

Caja Chica y Rendición de Requerimientos no inician con OC, OS ni Requerimiento de Compra.

Su documento de apertura será Requerimiento de Fondo o documento equivalente.

La transferencia bancaria puede adjuntarse posteriormente.

Si el trabajador paga con dinero propio, la rendición no debe bloquearse.

## Principio de motor documental común

No deben existir motores documentales distintos para Compras, Caja Chica y Rendición de Requerimientos.

Cada módulo puede tener tablas de negocio propias, pero deben compartir:

- documentos.
- documentos_archivos.
- OCR.
- eventos documentales.
- alertas documentales.
- relaciones documentales.
- trazabilidad.
- revisión documental contable.

## Principio de independencia del Legacy

El histórico se consulta; el Modelo Documental V2 gobierna.

Toda integración con Legacy deberá realizarse mediante adaptadores o servicios de consulta.

El dominio V2 nunca deberá depender funcionalmente del modelo Legacy.

## Decisiones pendientes

Antes de implementar el modelo relacional definitivo deberán resolverse:

- Nombre visible final del Contenedor Operativo por módulo.
- Si un Contenedor Operativo puede tener uno o varios Documentos Operativos Principales.
- Cómo se tratarán casos legacy donde una Factura actuaba como principal.
- Cómo se relacionará la distribución futura de Almacén con el Contenedor Operativo.
- Cómo se materializará el contexto Centro de costo + OP para BBTI y BB Tecnología.
- Cómo se materializará el contexto automático para consorcios y obras.
- Cómo se integrarán Caja Chica y Rendición de Requerimientos sin crear motores documentales paralelos.


## Alcance por tipo de módulo

El Contenedor Operativo gobierna principalmente la jerarquía de Compras:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

Caja Chica y Rendición de Requerimientos usan el mismo motor documental, pero su jerarquía funcional se expresa desde el Contexto Operativo:

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Transferencia opcional
      -> Rendición
          -> Sustentos documentales múltiples
```

Esta diferencia no implica crear motores documentales distintos.

Compras, Caja Chica y Rendición comparten documentos, archivos, OCR, eventos, alertas y relaciones documentales.

La diferencia está en la regla de negocio que organiza esos documentos dentro de cada módulo.

En Caja Chica y Rendición, una rendición puede contener muchos documentos del mismo tipo. Esta situación es normal y no representa duplicidad salvo coincidencia por hash de archivo o por una clave documental específica del comprobante.

## Alcance

Este documento define únicamente el modelo conceptual del dominio.

No define:

- tablas.
- endpoints.
- contratos API.
- migraciones.
- implementación backend.
- implementación frontend.

Esos elementos se desarrollarán en documentos específicos, manteniendo como referencia obligatoria este modelo conceptual.

Cualquier decisión técnica futura deberá validar primero su coherencia con el Contenedor Operativo y la jerarquía funcional del Modelo Documental V2.

Este documento debe permanecer libre de detalles de implementación para conservar su función como documento arquitectónico raíz del Modelo Documental V2.
