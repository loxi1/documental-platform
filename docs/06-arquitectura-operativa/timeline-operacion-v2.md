# Timeline de Operación V2

**Documento auxiliar:** `docs/06-arquitectura-operativa/timeline-operacion-v2.md`
**Fuente normativa:** [`MODELO_DOCUMENTAL_V2_OFICIAL.md`](../00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md)
**Sprint:** 2.0D.0 — Consolidación Operacional V2
**Estado:** diseño futuro, no implementado
**Runtime:** congelado

---

## 1. Propósito

Este documento define lineamientos para un Timeline Documental futuro.

No afirma que el Timeline exista. No define una fuente definitiva. No autoriza implementación.

Estado actual:

```text
Timeline Documental visual: Roadmap, Nivel D.
```

---

## 2. Alcance futuro esperado

Un Timeline Documental podría mostrar cronológicamente:

- Documento Operativo Principal asociado;
- Grupo de Factura creado;
- Guía asociada;
- Nota de ingreso asociada;
- Transferencia asociada;
- Detracción asociada;
- futuras operaciones autorizadas.

Esto es diseño futuro. No existe UI vigente.

---

## 3. Fuentes candidatas

No se ha elegido fuente definitiva.

| Fuente candidata | Estado | Nivel | Observación |
| ---------------- | ------ | ----: | ----------- |
| Auditoría existente | Candidata | D | Útil para operaciones V2, pero no necesariamente modela eventos funcionales completos. |
| `documento_eventos` | Candidata | D | Requiere validar modelo real y cobertura. |
| Operaciones V2 persistidas | Candidata | D | Puede reconstruir parte del historial operativo. |
| Proyección combinada | Candidata | D | Requiere diseño específico. |

Decisión pendiente:

```text
No está definido si el Timeline se construirá desde auditoría,
documento_eventos o una proyección combinada.
```

---

## 4. Contrato futuro sugerido

Contrato orientativo, no aprobado:

```text
GET /api/v1/documental-v2/timeline/expedientes-v1/:id
```

Posibles filtros:

- tipo de operación;
- fecha desde/hasta;
- entidad;
- documento;
- grupoFacturaId;
- usuario.

Esta sección no autoriza implementación.

---

## 5. Modelo visual futuro

Cada entrada del Timeline podría mostrar:

| Campo visual | Fuente posible | Estado |
| ------------ | -------------- | ------ |
| Fecha/hora | auditoría o evento | Pendiente |
| Operación | `tipoOperacion` o tipo evento | Pendiente |
| Usuario | contexto autenticado | Pendiente |
| Entidad afectada | metadata o evento | Pendiente |
| Documento relacionado | proyección | Pendiente |
| Resultado | auditoría / operación | Pendiente |
| `requestId` | auditoría | Pendiente |
| `correlationId` | auditoría | Pendiente |

---

## 6. Reglas UX futuras

| Regla | Estado | Nivel |
| ----- | ------ | ----: |
| El Timeline debe ser lectura, no operación. | Propuesto | C |
| Debe distinguir evento funcional de auditoría técnica. | Propuesto | C |
| Debe mostrar estados vacíos sin error falso. | Propuesto | C |
| Debe respetar permisos de visibilidad. | Pendiente | D |
| No debe permitir revertir operaciones desde el Timeline. | Propuesto | C |
| No debe reconstruirse desde React con inferencias. | Propuesto | C |

---

## 7. Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Confundir auditoría técnica con timeline funcional. | Definir contrato y fuente antes de implementar. |
| Mostrar eventos incompletos. | Validar cobertura de fuente. |
| Duplicar eventos por idempotencia. | Diseñar deduplicación backend. |
| Exponer datos sensibles sin permisos. | Definir matriz de permisos. |
| Recalcular timeline en React. | Mantener proyección en backend/Gateway. |

---

## 8. Decisiones pendientes

Antes de abrir un sprint de Timeline se debe decidir:

1. fuente oficial;
2. contrato Gateway;
3. campos mínimos;
4. paginación;
5. filtros;
6. permisos;
7. deduplicación de idempotencias;
8. relación con Auditoría Visual;
9. relación con eventos documentales;
10. criterio de performance.

---

## 9. Prohibiciones actuales

No se debe:

- crear UI de Timeline en 2.0D.0;
- crear endpoint de Timeline en 2.0D.0;
- declarar auditoría como fuente definitiva;
- declarar `documento_eventos` como fuente definitiva;
- reconstruir Timeline desde React;
- usar Timeline como base de permisos;
- modificar runtime.
