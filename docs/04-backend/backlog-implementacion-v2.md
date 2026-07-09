# Backlog de Implementación — Modelo Documental V2

## Sprint 1.6A.0 — Backlog técnico del Modelo V2

**Estado:** Propuesto para ejecución  
**Responsable:** Maestro Sucesor I  
**Tipo:** Backlog de ingeniería  
**Alcance:** Ordenar la construcción del Modelo Documental V2  

Este documento no es conceptual. No redefine el dominio. Su finalidad es convertir las decisiones aprobadas del Modelo Documental V2 en una secuencia técnica de implementación.

---

## 1. Principios obligatorios

1. El negocio gobierna al modelo técnico.
2. La documentación desde este punto debe acompañar implementación real.
3. `documentos.*` sigue siendo el motor documental común.
4. El Modelo V2 se implementará sin destruir V1.
5. Compras V2 será el primer módulo operativo implementado.
6. Caja Chica y Rendición quedan preparados conceptualmente, pero no se programan todavía.
7. Legacy Python queda congelado.
8. Legacy Python nunca escribirá sobre V2.
9. Legacy solo podrá consultarse mediante adaptadores.
10. No se implementará Caja Chica ni Rendición dentro de Sprint 1.6A.

---

## 2. Jerarquía funcional de referencia

### Compras

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

### Caja Chica / Rendición

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Transferencia opcional
      -> Rendición
          -> Sustentos documentales múltiples
```

Caja Chica y Rendición reutilizarán el motor documental común, pero tendrán tablas de negocio propias en sprints posteriores.

---

## 3. Roadmap técnico inmediato

```text
Sprint 1.6A — Implementación física del Modelo Documental V2
Sprint 1.6B — Repositories V2
Sprint 1.6C — Services V2
Sprint 1.6D — Endpoints V2
Sprint 1.7  — Frontend V2
```

---

# Sprint 1.6A — Implementación física del Modelo Documental V2

## Objetivo

Crear la estructura física mínima del Modelo Documental V2 para Compras, sin romper el modelo actual.

## Alcance permitido

- Crear migración SQL nueva.
- Crear tablas V2 vacías.
- Crear constraints base.
- Crear índices base.
- Mantener compatibilidad con `documentos.documentos`.
- Mantener compatibilidad con `documentos.documentos_archivos`.
- Mantener compatibilidad con `documentos.expediente_documentos`.
- No modificar comportamiento runtime todavía.

## Alcance prohibido

- No eliminar tablas V1.
- No cambiar carga guiada todavía.
- No cambiar OCR Worker.
- No cambiar Web Admin.
- No crear endpoints todavía.
- No migrar data masiva.
- No escribir desde Legacy Python.

## Tablas candidatas para Sprint 1.6A

> Los nombres exactos deberán validarse antes de ejecutar migración.

### 1. `documentos.contextos_operativos`

Representa la raíz operativa V2.

Debe soportar:

- empresa
- workspace
- centro de costo
- orden de producción
- consorcio / obra
- contexto automático por empresa
- trazabilidad
- estado

### 2. `documentos.documentos_operativos_principales`

Relaciona un contexto operativo con su documento operativo principal.

Debe soportar:

- OC
- OS
- Requerimiento de Compra
- futuros tipos aprobados por negocio
- estado
- principal activo si aplica
- trazabilidad

### 3. `documentos.grupos_factura`

Representa el grupo documental que nace alrededor de una factura.

Debe soportar:

- factura cabecera
- fecha de emisión
- proveedor
- moneda
- monto
- estado de revisión
- completitud documental

### 4. `documentos.grupo_factura_documentos`

Relaciona adjuntos documentales con un grupo de factura.

Debe soportar:

- guías
- notas de ingreso
- transferencias
- detracciones
- otros documentos asociados

---

## Entregables Sprint 1.6A

- [ ] Migración SQL creada.
- [ ] Tablas V2 creadas vacías.
- [ ] Constraints base creadas.
- [ ] Índices base creados.
- [ ] Rollback definido.
- [ ] Validación local con `pnpm` y Docker.
- [ ] Documento de migración actualizado si hubo ajuste real.

## Validaciones mínimas

- [ ] La migración corre en PostgreSQL local.
- [ ] La migración no elimina data V1.
- [ ] La migración no rompe login.
- [ ] La migración no rompe workspace.
- [ ] La migración no rompe compras actual.
- [ ] La migración no rompe OCR actual.
- [ ] La migración no afecta `expediente_documentos`.
- [ ] Rollback probado en entorno local.

---

# Sprint 1.6B — Repositories V2

## Objetivo

Crear capa de acceso a datos para el Modelo V2, sin exponer endpoints todavía.

## Repositories sugeridos

- [ ] `ContextosOperativosRepository`
- [ ] `DocumentosOperativosPrincipalesRepository`
- [ ] `GruposFacturaRepository`
- [ ] `GrupoFacturaDocumentosRepository`

## Reglas

- [ ] No mezclar consultas V2 dentro de repositories V1 sin separación clara.
- [ ] No eliminar repository actual de documentos.
- [ ] Mantener lectura compatible con V1.
- [ ] Preparar métodos idempotentes.
- [ ] Preparar validaciones de duplicidad por documento, hash y clave documental.

## Entregables

- [ ] Repositories creados.
- [ ] Métodos básicos de creación.
- [ ] Métodos básicos de lectura.
- [ ] Métodos de búsqueda por contexto.
- [ ] Métodos de búsqueda por documento principal.
- [ ] Métodos de búsqueda por grupo de factura.
- [ ] Tests unitarios o de integración mínimos.

---

# Sprint 1.6C — Services V2

## Objetivo

Implementar reglas de negocio V2 en servicios, manteniendo el motor documental común.

## Services sugeridos

- [ ] `ContextosOperativosService`
- [ ] `DocumentosOperativosPrincipalesService`
- [ ] `GruposFacturaService`
- [ ] `AdjuntosGrupoFacturaService`
- [ ] `ComprasDocumentalV2Service`

## Reglas funcionales

- [ ] Un Documento Operativo Principal puede existir sin facturas.
- [ ] Una Factura no debe existir sin Documento Operativo Principal, salvo legacy identificado.
- [ ] Una Factura abre un Grupo de Factura.
- [ ] Los adjuntos pertenecen al Grupo de Factura.
- [ ] No tratar varios documentos del mismo tipo como duplicado por sí solo.
- [ ] Duplicado real solo por hash o clave documental específica.
- [ ] Legacy Python no escribe en V2.

## Entregables

- [ ] Services creados.
- [ ] Validaciones funcionales implementadas.
- [ ] Manejo de errores funcionales.
- [ ] Tests mínimos.

---

# Sprint 1.6D — Endpoints V2

## Objetivo

Exponer APIs V2 necesarias para Compras, sin romper endpoints actuales.

## Endpoints candidatos

> La ruta exacta debe validarse durante el sprint.

- [ ] `GET /documentos/v2/contextos-operativos`
- [ ] `GET /documentos/v2/contextos-operativos/:id`
- [ ] `POST /documentos/v2/contextos-operativos`
- [ ] `POST /documentos/v2/contextos-operativos/:id/documentos-principales`
- [ ] `POST /documentos/v2/documentos-principales/:id/grupos-factura`
- [ ] `POST /documentos/v2/grupos-factura/:id/adjuntos`
- [ ] `GET /documentos/v2/contextos-operativos/:id/vista-compras`

## Reglas

- [ ] Endpoints V1 se mantienen.
- [ ] Endpoints V2 no reemplazan automáticamente V1.
- [ ] El gateway debe preservar errores funcionales.
- [ ] No exponer detalles internos innecesarios.
- [ ] Preparar DTOs estables.

## Entregables

- [ ] Controllers V2.
- [ ] DTOs V2.
- [ ] Validaciones de entrada.
- [ ] Contratos de respuesta.
- [ ] Tests básicos.
- [ ] Pruebas manuales con curl/Postman.

---

# Sprint 1.7 — Frontend V2

## Objetivo

Implementar UI V2 consumiendo endpoints reales, no agrupaciones simuladas.

## Alcance inicial

- [ ] Compras detalle V2.
- [ ] Contexto Operativo.
- [ ] Documento Operativo Principal.
- [ ] Grupos de Factura reales.
- [ ] Adjuntos reales por grupo.
- [ ] Documentos pendientes de asociación.

## Reglas

- [ ] No inventar `grupoFacturaId`.
- [ ] No simular entidades inexistentes.
- [ ] Usar datos reales de backend V2.
- [ ] Mantener compatibilidad visual con datos V1 si corresponde.

---

## 4. Caja Chica / Rendición — Preparación futura

No se implementa en Sprint 1.6A.

Debe quedar listo conceptualmente para que en sprints futuros use el motor común:

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Transferencia opcional
      -> Rendición
          -> Sustentos documentales múltiples
```

Reglas ya aprobadas:

- La transferencia puede ser posterior.
- El trabajador puede rendir aunque haya pagado con dinero propio.
- La rendición no debe bloquearse por falta inicial de transferencia.
- Una rendición puede tener muchos documentos del mismo tipo.
- La Rendición constituye la unidad de revisión contable.
- El comprobante individual no es la unidad de revisión contable.

---

## 5. Legacy Python congelado

Regla oficial:

```text
Legacy Python queda congelado.
No recibirá nuevas reglas de negocio.
No evolucionará junto con el Modelo Documental V2.
Su única responsabilidad será servir como histórico consultable mediante adaptadores.
```

Además:

```text
Legacy Python nunca escribirá sobre V2.
Legacy solo podrá consultarse mediante adaptadores.
```

---

## 6. Riesgos de implementación

- [ ] Crear tablas demasiado acopladas a Compras.
- [ ] No dejar espacio para Caja Chica/Rendición.
- [ ] Duplicar motor documental por módulo.
- [ ] Romper compatibilidad con V1.
- [ ] Confundir contexto operativo con expediente actual.
- [ ] Tratar facturas como principales nuevamente.
- [ ] Tratar varios comprobantes de rendición como duplicados por tipo.
- [ ] Permitir que Legacy escriba en V2.
- [ ] Crear endpoints antes de cerrar migración física.
- [ ] Tocar frontend antes de APIs reales.

---

## 7. Definición de listo para iniciar Sprint 1.6A

Sprint 1.6A puede iniciar cuando:

- [ ] Este backlog esté aprobado.
- [ ] Se confirme nombre de migración.
- [ ] Se confirme orden de tablas.
- [ ] Se confirme que no se tocará runtime V1.
- [ ] Se tenga backup local antes de probar migraciones.
- [ ] Se pueda ejecutar y revertir migración en local.

---

## 8. Dictamen Maestro Sucesor I

Sprint 1.6A.0 organiza la transición de definición a construcción.

Con este backlog queda cerrada la producción de documentos conceptuales generales.

A partir de Sprint 1.6A, cada documento deberá acompañar una implementación real:

- migración
- repository
- service
- endpoint
- frontend
- prueba

El siguiente paso recomendado es iniciar Sprint 1.6A con implementación física controlada del Modelo Documental V2.
