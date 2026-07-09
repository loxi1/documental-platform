# Sprint 1.5B — Plan de Migración Documental V2

## 1. Propósito

Este documento define el plan técnico de migración hacia el Modelo Documental Operativo V2 de Documental Platform.

El objetivo es convertir el modelo conceptual aprobado en Sprint 1.4A y refinado en Sprint 1.5A en un plan SQL seguro, revisable y reversible, sin aplicar todavía migraciones reales.

Este documento no implementa cambios. No crea tablas, no modifica runtime, no altera backend, no modifica frontend y no ejecuta SQL.

La finalidad es dejar preparado el camino para una futura migración controlada.

## 2. Principios rectores

### 2.1 El negocio gobierna

La regla de negocio gobierna al modelo de datos. Las tablas deberán adaptarse al dominio y no al revés.

La dirección correcta de diseño es:

```text
Negocio
  -> Modelo de Dominio
      -> Modelo Relacional
          -> Backend
              -> Frontend
```

Nunca debe diseñarse desde:

```text
Tabla PostgreSQL
  -> Backend
      -> Negocio
```

### 2.2 Modelo V2 común

No se crearán motores documentales distintos para Compras, Caja Chica y Rendición de Requerimientos.

Debe existir un único motor documental común para:

- documentos
- documentos_archivos
- OCR
- eventos documentales
- alertas documentales
- relaciones documentales
- trazabilidad
- auditoría documental

Cada módulo puede tener tablas de negocio propias, pero debe compartir el motor documental.

### 2.3 Compatibilidad gradual

La migración no debe ser destructiva.

El modelo actual V1 / V1.3H debe convivir con V2 durante una etapa de transición.

La migración debe permitir:

- seguir usando documentos actuales
- conservar expedientes existentes
- mantener carga guiada actual mientras se implementa V2
- evitar pérdida de trazabilidad
- no romper OCR existente
- no romper prevalidación
- no romper R2
- permitir rollback

### 2.4 Legacy separado

El histórico se consulta; el Modelo Documental V2 gobierna.

Legacy Python corresponde al proyecto de clasificación y renombrado histórico de documentos locales. Ese histórico conserva valor como consulta, pero no debe gobernar la arquitectura V2.

No se debe subir masivamente el histórico legacy a R2 como parte de esta migración.

No se debe adaptar el modelo V2 para imitar el histórico.

## 3. Jerarquía documental objetivo

La jerarquía funcional propuesta para V2 es:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

Donde:

- Contenedor Operativo representa la entidad superior de operación documental.
- Documento Operativo Principal actualmente puede materializarse como OC, OS o Requerimiento de Compra, y podrá ampliarse por decisión futura de negocio.
- Grupo de Factura representa la factura y todos sus documentos asociados.
- Adjuntos son documentos relacionados al grupo de factura, como guía, nota de ingreso, transferencia, detracción u otros.

## 4. Contexto operativo por empresa o módulo

### 4.1 BBTI y BB Tecnología

Para estas empresas, al crear OC, OS o Requerimiento de Compra, el usuario deberá asociar:

```text
Centro de costo + Orden de Producción
```

Ambos elementos forman parte del contexto operativo.

### 4.2 Consorcios / Obras

Para consorcios u obras como Consorcio CIMA, Huancavelica, Kimbiri u otros, el centro de costo es el propio consorcio u obra.

El usuario no deberá seleccionar centro de costo manualmente.

El sistema lo asignará automáticamente según empresa, workspace o contexto.

### 4.3 Caja Chica

Caja Chica no inicia con OC, OS ni Requerimiento de Compra.

Su documento inicial será:

```text
Requerimiento de Fondo
```

Posteriormente puede adjuntarse transferencia bancaria.

Si el trabajador pagó con dinero propio y la transferencia aún no existe, la rendición no debe bloquearse. Debe permitirse continuar con estado pendiente de regularización.

### 4.4 Rendición de Requerimientos

Rendición de Requerimientos seguirá un patrón similar a Caja Chica.

Puede iniciar con Requerimiento de Fondo u otro documento equivalente.

La transferencia puede incorporarse posteriormente.

## 5. Tablas actuales y compatibilidad

### 5.1 documentos.documentos

Rol actual:

Tabla principal de documentos reconocidos por el sistema.

Rol futuro:

Se conserva como núcleo documental común.

No debe reemplazarse.

V2 debe seguir referenciando documentos.documentos para representar OC, OS, Requerimiento de Compra, Requerimiento de Fondo, Factura, Guía, Nota de ingreso, Transferencia, Detracción y otros documentos.

### 5.2 documentos.documentos_archivos

Rol actual:

Archivos físicos asociados a documentos, incluyendo storage provider, key, hash y metadata.

Rol futuro:

Se conserva.

Debe seguir siendo la fuente común para archivos cargados desde Web Admin, R2 u otros proveedores.

### 5.3 documentos.ocr_resultados

Rol actual:

Resultados OCR asociados a archivo/documento.

Rol futuro:

Se conserva.

El OCR no debe depender del modelo legacy. V2 debe poder consumir OCR desde las tablas comunes del proyecto.

### 5.4 documentos.expedientes

Rol actual:

Contenedor documental usado en V1 / V1.3H.

Rol futuro:

Debe conservarse por compatibilidad.

Puede actuar como base inicial o puente para Contenedor Operativo, pero no debe asumirse todavía que expediente es el nombre funcional definitivo del dominio.

Opciones de compatibilidad:

- Opción A: reutilizar documentos.expedientes como implementación inicial del Contenedor Operativo.
- Opción B: crear tabla V2 de contenedores_operativos y mapear expedientes existentes.
- Opción C: mantener expedientes como vista de compatibilidad y mover V2 a una nueva tabla.

La decisión definitiva debe validarse antes de la migración real.

### 5.5 documentos.expediente_documentos

Rol actual:

Relación entre expediente y documentos.

Rol futuro:

Debe conservarse como compatibilidad durante transición.

No debe ser el único mecanismo de jerarquía V2.

V2 necesita representar relaciones más ricas:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

expediente_documentos puede seguir sirviendo para vistas rápidas, compatibilidad o relación general, pero no debe gobernar por sí sola la jerarquía V2.

### 5.6 documentos.documento_eventos

Rol actual:

Eventos de trazabilidad documental.

Rol futuro:

Se conserva.

Debe ampliarse conceptualmente para registrar eventos relacionados con contenedor, documento operativo principal, grupo de factura y adjuntos.

### 5.7 documentos.documento_alertas

Rol actual:

Alertas documentales.

Rol futuro:

Se conserva como componente común del motor documental.

Debe poder asociarse al nivel adecuado: documento, grupo de factura, documento operativo principal o contenedor.

### 5.8 documentos.documento_relaciones

Si existe, puede servir como relación documental genérica.

Debe evaluarse si se reutiliza como soporte flexible o si se mantiene como relación auxiliar.

No debe reemplazar la necesidad de entidades explícitas para V2 si el dominio requiere claridad.

### 5.9 documentos.grupos_documentales

Si existe, debe analizarse si puede evolucionar para grupos de factura o si queda como tabla legacy/compatibilidad.

No asumir reutilización automática sin revisar semántica.

## 6. Tablas candidatas V2

Este documento propone tablas candidatas. No son SQL definitivo.

### 6.1 documentos.contenedores_operativos

Propósito:

Representar la raíz V2 de una operación documental.

Posible uso:

Puede abstraer expediente, centro de costo, OP, proyecto, PR u otra entidad superior.

Columnas candidatas:

- id
- empresa_codigo
- cliente_destino_id
- tipo_contenedor
- codigo
- descripcion
- centro_costo_id o centro_costo_codigo
- orden_produccion_id o orden_produccion_codigo
- proyecto_id o proyecto_codigo
- expediente_id_origen, si se decide mapear desde documentos.expedientes
- estado
- metadata
- creado_por
- creado_en
- actualizado_por
- actualizado_en
- anulado_por
- anulado_en
- motivo_anulacion

Relaciones candidatas:

- puede mapear a documentos.expedientes
- puede relacionarse con documentos_operativos_principales
- puede recibir eventos y alertas

Constraints conceptuales:

- empresa_codigo + tipo_contenedor + codigo debería ser único, si el negocio lo aprueba.
- estado debe controlar activo/anulado/cerrado.
- para BBTI/BB Tecnología, centro de costo + OP deben ser obligatorios al crear documentos operativos.
- para consorcios/obras, centro de costo puede asignarse automáticamente.

Índices sugeridos:

- empresa_codigo
- cliente_destino_id
- tipo_contenedor
- codigo
- centro_costo_codigo
- orden_produccion_codigo
- estado

Estado recomendado:

Pendiente de aprobación técnica. No crear todavía.

### 6.2 documentos.documentos_operativos_principales

Propósito:

Representar la relación entre Contenedor Operativo y Documento Operativo Principal.

El Documento Operativo Principal actualmente puede materializarse como:

- OC
- OS
- Requerimiento de Compra
- Requerimiento de Fondo para Caja Chica/Rendición, si se valida como variante operativa

La lista no debe quedar cerrada.

Columnas candidatas:

- id
- contenedor_operativo_id
- documento_id
- tipo_operativo
- es_principal_activo
- estado
- origen_modulo
- metadata
- creado_por
- creado_en
- actualizado_por
- actualizado_en
- anulado_por
- anulado_en
- motivo_anulacion

Relaciones candidatas:

- contenedor_operativo_id -> contenedores_operativos.id
- documento_id -> documentos.documentos.id
- puede tener muchos grupos_factura

Constraints conceptuales:

- un mismo documento no debe repetirse como operativo principal en el mismo contenedor.
- si negocio decide principal único, debe existir máximo un es_principal_activo por contenedor.
- si negocio permite varios documentos operativos principales, el modelo debe soportarlo con reglas explícitas.
- no inferir principal activo por tipo documental.

Índices sugeridos:

- contenedor_operativo_id
- documento_id
- tipo_operativo
- estado
- es_principal_activo

Estado recomendado:

Candidata central V2. No crear todavía.

### 6.3 documentos.grupos_factura

Propósito:

Representar el grupo documental abierto por una factura.

El grupo de factura es la unidad de revisión contable.

Columnas candidatas:

- id
- documento_operativo_principal_id
- factura_documento_id
- proveedor_ruc
- proveedor_nombre
- fecha_emision_factura
- serie
- numero
- moneda
- monto_total
- estado_revision
- estado_completitud
- metadata
- creado_por
- creado_en
- actualizado_por
- actualizado_en
- anulado_por
- anulado_en
- motivo_anulacion

Relaciones candidatas:

- documento_operativo_principal_id -> documentos_operativos_principales.id
- factura_documento_id -> documentos.documentos.id
- tiene muchos grupo_factura_documentos

Constraints conceptuales:

- factura_documento_id no debe repetirse dentro del mismo documento operativo principal.
- clave documental de factura debe ayudar a prevenir duplicidad.
- fecha_emision_factura debe indexarse para revisión contable.

Índices sugeridos:

- documento_operativo_principal_id
- factura_documento_id
- proveedor_ruc
- fecha_emision_factura
- estado_revision
- estado_completitud
- serie + numero

Estado recomendado:

Candidata central V2. No crear todavía.

### 6.4 documentos.grupo_factura_documentos

Propósito:

Relacionar documentos adjuntos con un grupo de factura.

Columnas candidatas:

- id
- grupo_factura_id
- documento_id
- tipo_relacion
- es_obligatorio
- estado_validacion
- orden
- metadata
- creado_por
- creado_en
- actualizado_por
- actualizado_en

Tipos de relación candidatos:

- adjunto_guia
- adjunto_nota_ingreso
- adjunto_transferencia
- adjunto_detraccion
- adjunto_recibo
- adjunto_otro

Relaciones candidatas:

- grupo_factura_id -> grupos_factura.id
- documento_id -> documentos.documentos.id

Constraints conceptuales:

- evitar duplicidad del mismo documento dentro del mismo grupo.
- evaluar si un documento adjunto puede pertenecer a más de un grupo. Por defecto, no debería permitirse salvo decisión formal.
- preservar orden para UI y trazabilidad.

Índices sugeridos:

- grupo_factura_id
- documento_id
- tipo_relacion
- estado_validacion

Estado recomendado:

Candidata central V2. No crear todavía.

### 6.5 documentos.contextos_operativos

Propósito:

Representar reglas de contexto por empresa, workspace o módulo.

Esta tabla es candidata solo si las reglas por empresa no se resuelven con configuración existente.

Columnas candidatas:

- id
- empresa_codigo
- cliente_destino_id
- sistema_codigo
- modulo_codigo
- requiere_centro_costo
- requiere_orden_produccion
- centro_costo_automatico
- permite_transferencia_posterior
- documento_inicial_codigo
- metadata
- estado

Uso posible:

- BBTI/BB Tecnología requieren centro de costo + OP.
- Consorcios/Obras asignan centro de costo automático.
- Caja Chica inicia con Requerimiento de Fondo y permite transferencia posterior.
- Rendición de Requerimientos sigue patrón similar.

Estado recomendado:

Candidata opcional. Debe validarse antes de crear.

## 7. Compatibilidad V1 + V2

### 7.1 Objetivo de convivencia

La convivencia debe permitir que el sistema siga operando mientras V2 se introduce gradualmente.

V1 conserva:

- expedientes
- expediente_documentos
- OCR actual
- prevalidación actual
- carga guiada actual
- documentos existentes

V2 introduce:

- contenedor operativo
- documento operativo principal
- grupo de factura
- adjuntos por grupo
- contexto operativo por empresa/módulo

### 7.2 Estrategia de lectura

Durante transición, backend puede leer:

- V2 si existe estructura V2 para el documento/contenedor.
- V1 si no existe estructura V2.

La UI deberá distinguir posteriormente si una operación está en modo V1 o V2, pero no en este sprint.

### 7.3 Estrategia de escritura

La escritura V2 debe activarse solo cuando existan tablas y endpoints aprobados.

Mientras tanto, no se modifica runtime.

Cuando se implemente:

- nuevas cargas deberían escribir en V2.
- opcionalmente pueden mantener sombra en expediente_documentos para compatibilidad.
- la compatibilidad debe ser explícita, no accidental.

### 7.4 Estrategia para expediente_documentos

No eliminar expediente_documentos.

Usarlo como:

- compatibilidad
- vista rápida de documentos por expediente
- puente temporal
- soporte para pantallas V1

Pero no como única fuente jerárquica V2.

## 8. Qué se migra y qué queda legacy

### 8.1 Se migra gradualmente

Solo datos operativos útiles y validados del sistema actual, por ejemplo:

- expedientes activos relevantes
- documentos cargados por Web Admin
- relaciones confirmadas y limpias
- OCR asociado a documentos operativos actuales
- archivos en R2 ya usados por la plataforma

### 8.2 No se migra masivamente

No migrar masivamente:

- histórico Python local
- archivos renombrados antiguos solo locales
- documentos sin trazabilidad operativa validada
- clasificaciones legacy que no correspondan al dominio V2

### 8.3 Legacy queda como consulta

El histórico legacy debe quedar separado.

Puede exponerse mediante:

- módulo de consulta histórica
- adaptador de lectura
- vistas de solo lectura
- búsqueda por empresa/mes/nombre renombrado/ruta local

Pero no debe alimentar reglas operativas V2.

## 9. Orden de migraciones propuesto

No ejecutar todavía.

Orden conceptual recomendado:

### Migración 0006 — Tablas base V2

Crear tablas candidatas centrales:

- contenedores_operativos
- documentos_operativos_principales
- grupos_factura
- grupo_factura_documentos

Solo si el modelo es aprobado.

### Migración 0007 — Constraints e índices V2

Agregar constraints e índices revisados.

No mezclar creación de tablas con reglas complejas si hay riesgo de bloqueo.

### Migración 0008 — Configuración de contexto operativo

Crear o poblar configuración para:

- BBTI
- BB Tecnología
- Consorcios/Obras
- Caja Chica
- Rendición de Requerimientos

Solo si se aprueba tabla de contextos_operativos o equivalente.

### Migración 0009 — Puentes de compatibilidad V1/V2

Crear vistas, columnas auxiliares o relaciones de puente si se aprueban.

No destruir V1.

### Migración 0010 — Backfill selectivo

Migrar datos operativos útiles, no legacy masivo.

Debe hacerse con scripts reversibles y auditables.

## 10. Rollback conceptual

Cada migración futura debe tener rollback claro.

Estrategias:

- crear tablas V2 sin tocar V1 permite rollback simple.
- no eliminar columnas V1.
- no renombrar tablas críticas en primera fase.
- no mover datos destructivamente.
- usar backfill copiado, no traslado.
- mantener scripts de limpieza de datos V2 si se necesita revertir.

Rollback por fase:

### Fase creación de tablas

Eliminar tablas V2 si están vacías o si la migración no llegó a producción con datos reales.

### Fase escritura dual

Desactivar escritura V2 por feature flag o configuración.

### Fase backfill

Usar tablas de control para identificar registros migrados y revertir solo esos registros.

### Fase lectura V2

Volver a lectura V1 si V2 falla.

## 11. Riesgos

### 11.1 Raíz incorrecta

Riesgo:

Elegir mal la implementación del Contenedor Operativo.

Mitigación:

Mantener abstracción y no amarrar el nombre funcional a una tabla sin validación.

### 11.2 Varios documentos operativos principales

Riesgo:

No saber si un contenedor tendrá uno o varios documentos operativos principales.

Mitigación:

Modelo debe soportar análisis sin forzar decisión irreversible.

### 11.3 Facturas sin principal

Riesgo:

Llegan facturas antes de OC/OS/RC.

Mitigación:

Definir estado pendiente de vinculación o bandeja de regularización, no bloquear captura documental.

### 11.4 Adjuntos sin factura

Riesgo:

Guías o pagos llegan antes que factura.

Mitigación:

Permitir estado pendiente de agrupación, pero no considerarlo grupo contable completo.

### 11.5 Caja Chica y transferencia posterior

Riesgo:

Bloquear rendición por falta de transferencia.

Mitigación:

Permitir estado pendiente de regularización.

### 11.6 Performance

Riesgo:

Multiplicar relaciones V1/V2 y hacer consultas complejas.

Mitigación:

Índices por contenedor, principal, grupo, factura, empresa y fecha de emisión.

### 11.7 Legacy contaminando V2

Riesgo:

Adaptar V2 a histórico Python.

Mitigación:

Separar consulta histórica mediante adaptadores.

### 11.8 Distribución por Almacén

Riesgo:

Intentar resolver distribución en esta migración.

Mitigación:

Diferir a Sprint 2.x.

## 12. Qué NO implementar todavía

No crear migraciones reales todavía.

No crear SQL ejecutable todavía.

No modificar repositories.

No implementar endpoints.

No crear DTOs.

No modificar api-gateway.

No modificar ms-documentos.

No modificar Web Admin.

No modificar OCR Worker.

No crear eventos NATS.

No introducir Event Sourcing.

No introducir CQRS.

No migrar legacy.

No subir histórico a R2.

No resolver distribución por Almacén.

## 13. Plan gradual sugerido

### Fase 0 — Aprobación documental

Aprobar este documento.

### Fase 1 — Diseño SQL revisable

Crear borrador SQL no aplicado.

### Fase 2 — Migración base V2

Crear tablas V2 vacías.

### Fase 3 — Backend de escritura V2

Nuevas cargas escriben en V2.

### Fase 4 — Lectura compatible V1/V2

Pantallas leen V2 cuando exista; si no, V1.

### Fase 5 — Backfill selectivo

Migrar solo datos operativos útiles.

### Fase 6 — Consolidación

Deprecar uso funcional de relaciones V1 si negocio aprueba.

## 14. Dictamen Maestro Sucesor I

El Modelo Documental V2 puede implementarse de forma gradual sin destruir el modelo actual.

La estrategia recomendada es:

1. conservar documentos.documentos, documentos_archivos y OCR como motor documental común.
2. no reemplazar documentos.expedientes de forma abrupta.
3. introducir tablas V2 para Contenedor Operativo, Documento Operativo Principal, Grupo de Factura y Adjuntos de grupo.
4. mantener expediente_documentos como compatibilidad durante transición.
5. no migrar legacy masivo.
6. permitir que Caja Chica y Rendición usen el motor común con documentos iniciales propios.
7. validar el diseño SQL antes de ejecutar migraciones.

Próximo paso recomendado:

Sprint 1.5C — Borrador SQL revisable de migración V2.

No aplicar migración hasta aprobación explícita.


## Consideración adicional: Caja Chica y Rendición

La migración V2 no debe asumir que todos los módulos usarán la jerarquía de Compras.

Compras seguirá el patrón:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

Caja Chica y Rendición seguirán el patrón:

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Transferencia opcional
      -> Rendición
          -> Sustentos documentales múltiples
```

El plan de migración debe preservar un motor documental común y permitir que cada módulo cree sus propias tablas de negocio sin duplicar documentos, archivos, OCR, eventos ni alertas.

### Regla de duplicidad en rendiciones

No debe crearse una restricción que impida varios documentos del mismo tipo dentro de una rendición.

Una rendición puede contener varias facturas, boletas, recibos o comprobantes.

La duplicidad solo debe detectarse por:

- hash de archivo; o
- clave documental específica del comprobante, si existe.

Este punto debe considerarse antes de diseñar constraints para futuras tablas de Caja Chica o Rendición.
