# Sprint 1.5C — Diseño de Implementación Backend V2 por Fases

## Estado

Documento de diseño técnico. No implementa código, no crea migraciones y no modifica runtime.

## Objetivo

Definir cómo implementar el Modelo Documental Operativo V2 por fases, sin romper el modelo actual y manteniendo `documentos.*` como motor documental común.

La prioridad del Sprint 1.5C es decidir qué se implementa primero, qué se conserva, qué se deja preparado y qué queda fuera de alcance.

## Principios rectores

1. El negocio gobierna al modelo técnico.
2. `documentos.*` sigue siendo el motor documental común.
3. El Modelo V2 se agrega como capa evolutiva, no como reemplazo destructivo.
4. V1/V1.3H debe seguir funcionando durante la transición.
5. La primera implementación funcional V2 será Compras.
6. Caja Chica y Rendición no se programan todavía.
7. Caja Chica y Rendición deben quedar contempladas por el modelo, pero serán módulos posteriores.
8. Legacy Python queda como histórico/consulta.

## Jerarquías funcionales consideradas

### Compras V2

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

Donde el Documento Operativo Principal actualmente puede materializarse como:

- OC
- OS
- Requerimiento de Compra

La lista podrá ampliarse por decisión futura de negocio.

### Caja Chica / Rendición futura

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Transferencia opcional
      -> Rendición
          -> Sustentos documentales múltiples
```

Una rendición puede tener muchos documentos del mismo tipo. Varias facturas, boletas, recibos o comprobantes no son duplicado por sí mismos. Solo se consideran duplicados si coinciden por hash de archivo o por una clave documental específica del comprobante.

## Alcance de Sprint 1.5C

Este sprint define una estrategia de implementación backend por fases.

Incluye:

- capa V2 sobre el motor documental actual
- secuencia de implementación
- compatibilidad V1/V2
- primer bloque implementable para Compras
- migración mínima segura
- riesgos y rollback conceptual

No incluye:

- SQL ejecutable
- migraciones reales
- endpoints implementados
- cambios en repositories
- cambios frontend
- programación de Caja Chica
- programación de Rendición
- integración Legacy

## Bloque 1 — Mantener `documentos.*` como motor común

El motor común conserva:

- `documentos.documentos`
- `documentos.documentos_archivos`
- `documentos.ocr_resultados`
- `documentos.documento_eventos`
- `documentos.documento_alertas`
- `documentos.documento_relaciones`, si existe
- almacenamiento R2/S3/local según configuración
- prevalidación por hash
- clave documental
- auditoría/eventos documentales

Este motor no pertenece exclusivamente a Compras. Debe poder ser reutilizado por:

- Compras
- Caja Chica
- Rendición de Requerimientos
- módulos futuros

## Bloque 2 — Crear capa V2 sin destruir V1

La capa V2 debe convivir con el modelo actual.

El modelo actual se conserva como compatibilidad:

- `documentos.expedientes`
- `documentos.expediente_documentos`
- relaciones actuales de carga guiada
- flujos V1/V1.3H que ya funcionan

La capa V2 debe agregarse con tablas nuevas o relaciones nuevas sin eliminar el modelo anterior.

Entidades candidatas para V2:

1. Contenedor Operativo
2. Documento Operativo Principal
3. Grupo de Factura
4. Documento del Grupo de Factura
5. Contexto Operativo futuro para Caja Chica/Rendición

## Bloque 3 — Implementar primero Compras V2

La primera implementación debe enfocarse solo en Compras.

Flujo objetivo:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

### Funcionalidades mínimas de Compras V2

1. Crear o seleccionar Contenedor Operativo.
2. Asociar Documento Operativo Principal.
3. Crear Grupo de Factura a partir de una factura.
4. Adjuntar documentos al Grupo de Factura.
5. Consultar vista documental agrupada.
6. Mantener trazabilidad y eventos.
7. Mantener prevalidación por hash y clave documental.

### Qué no debe resolver Compras V2 al inicio

- distribución por almacén
- Caja Chica
- Rendición
- reemplazo complejo de principal
- migración completa de histórico
- Event Sourcing
- CQRS

## Bloque 4 — Caja Chica/Rendición quedan como módulos futuros

Caja Chica y Rendición no deben implementarse en este bloque.

Sin embargo, el modelo debe evitar cerrarse de manera que impida soportarlas después.

Caja Chica y Rendición tendrán tablas de negocio propias, pero reutilizarán el motor documental común:

- documentos
- archivos
- OCR
- eventos
- alertas
- relaciones documentales
- prevalidación
- almacenamiento

La diferencia está en la jerarquía funcional:

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Transferencia opcional
      -> Rendición
          -> Sustentos documentales múltiples
```

## Bloque 5 — Migración mínima segura

La migración mínima no debe transformar todo el histórico.

Debe permitir que nuevas operaciones escriban en V2 y que lo existente siga consultable.

### Fase 0 — Preparación

- aprobar documentación
- validar nombres conceptuales
- revisar impacto con Maestro Intermedio y Maestro Sucesor II

### Fase 1 — Tablas V2 vacías

- crear tablas nuevas para V2
- no migrar data masiva
- no eliminar tablas actuales
- no alterar flujos existentes

### Fase 2 — Escritura dual controlada o puente de compatibilidad

Para nuevas cargas de Compras:

- mantener escritura en motor común `documentos.*`
- escribir relación V2
- mantener `expediente_documentos` si se necesita compatibilidad temporal

### Fase 3 — Lectura V2 para Compras

- vistas o consultas backend leen jerarquía V2
- V1 queda como fallback o compatibilidad

### Fase 4 — Migración selectiva

Solo migrar datos útiles para demo o continuidad operativa.

No migrar Legacy Python masivo.

### Fase 5 — Deprecación controlada

Solo después de validación funcional, decidir qué relaciones V1 quedan como lectura histórica o compatibilidad.

## Diseño de compatibilidad V1 + V2

### `documentos.expedientes`

Puede seguir representando el contenedor actual mientras se valida el nombre funcional final del Contenedor Operativo.

No debe renombrarse ni eliminarse todavía.

### `documentos.expediente_documentos`

Debe conservarse como compatibilidad y puente.

No debe ser el centro definitivo de la jerarquía V2.

En V2, las relaciones principales se expresan por:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

### `documentos.documentos`

Sigue siendo la tabla común de documentos.

No se duplica documento en tablas de negocio. Las tablas V2 deben referenciar `documentos.documentos`.

## Reglas funcionales para Compras V2

1. La factura no es Documento Operativo Principal.
2. La factura abre Grupo de Factura.
3. Los adjuntos pertenecen a un Grupo de Factura.
4. El Documento Operativo Principal no debe modelarse como lista cerrada.
5. Puede materializarse actualmente como OC, OS o Requerimiento de Compra.
6. Un Documento Operativo Principal puede tener varios Grupos de Factura.
7. Cada Grupo de Factura debe tener una factura cabecera.
8. La revisión contable debe poder operar por Grupo de Factura.
9. El filtro contable debe poder usar fecha de emisión de factura.
10. La prevalidación debe seguir protegiendo duplicados por hash y clave documental.

## Reglas futuras para Caja Chica/Rendición

1. Caja Chica no usa OC/OS/Requerimiento de Compra.
2. Caja Chica inicia con Requerimiento de Fondo.
3. La transferencia es opcional al inicio.
4. Si el trabajador paga con dinero propio, la rendición no debe bloquearse.
5. La transferencia puede regularizarse después.
6. La Rendición puede tener múltiples sustentos del mismo tipo.
7. Múltiples facturas o boletas en una rendición no son duplicado por sí mismas.
8. La duplicidad se determina por hash o clave documental específica.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Romper flujos V1 existentes | Alto | Crear V2 como capa adicional |
| Diseñar tablas antes de validar UX | Alto | Coordinar con Sprint 1.4B |
| Forzar Caja Chica dentro del modelo de Compras | Alto | Separar jerarquías por módulo, compartir motor documental |
| Duplicar documentos en tablas de negocio | Alto | Referenciar siempre `documentos.documentos` |
| Migrar histórico innecesario | Alto | Migración selectiva, Legacy solo consulta |
| Confundir Factura con principal | Medio | Grupo de Factura como entidad explícita |
| Lista rígida de tipos principales | Medio | Documento Operativo Principal extensible |
| Consultas complejas V1/V2 | Medio | Diseñar vistas de lectura o servicios de composición |

## Orden recomendado de implementación posterior

### Sprint 1.5D — SQL draft no aplicado

Diseñar migraciones SQL revisables, sin ejecutarlas.

### Sprint 1.6A — Migraciones V2 mínimas

Crear tablas V2 vacías.

### Sprint 1.6B — Backend escritura V2 para Compras

Actualizar ms-documentos para nuevas cargas de Compras V2.

### Sprint 1.6C — Lectura V2 para Compras

Endpoints de consulta jerárquica.

### Sprint 1.7 — Web Admin Compras V2

UX conectada a backend V2.

### Sprint 2.x — Caja Chica/Rendición

Implementar módulos futuros reutilizando motor documental común.

## Qué NO implementar todavía

- Caja Chica
- Rendición
- distribución por almacén
- migración de Legacy Python
- eliminación de `expediente_documentos`
- reemplazo definitivo del concepto Expediente
- Event Sourcing
- CQRS
- endpoints productivos V2
- migraciones reales sin aprobación

## Dictamen Maestro Sucesor I

La implementación debe iniciar por Compras V2 y no por Caja Chica/Rendición.

La estrategia recomendada es:

```text
1. Mantener documentos.* como motor común.
2. Crear capa V2 sin destruir V1.
3. Implementar primero Compras V2.
4. Dejar Caja Chica/Rendición como módulos futuros compatibles.
5. Aplicar una migración mínima segura y gradual.
```

Este enfoque permite evolucionar el ERP documental sin romper lo ya validado, manteniendo una sola base documental común y permitiendo que los módulos futuros reutilicen OCR, archivos, eventos, alertas y trazabilidad.