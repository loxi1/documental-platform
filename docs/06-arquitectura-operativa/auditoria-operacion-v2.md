# Auditoría de Operación V2

**Documento auxiliar:** `docs/06-arquitectura-operativa/auditoria-operacion-v2.md`
**Fuente normativa:** [`MODELO_DOCUMENTAL_V2_OFICIAL.md`](../00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md)
**Sprint:** 2.0D.0 — Consolidación Operacional V2
**Estado:** documentación de auditoría vigente y limitaciones
**Runtime:** congelado

---

## 1. Propósito

Este documento desarrolla el tratamiento de auditoría de operaciones V2 hasta `v2-rc4`.

No define Auditoría Visual. La Auditoría Visual es roadmap y no existe como UI vigente.

---

## 2. Principios de auditoría

| Principio | Estado | Nivel |
| --------- | ------ | ----: |
| La auditoría nace del contexto autenticado. | Implementado | A |
| El frontend no envía usuario, empresa, workspace ni cliente destino para auditoría. | Implementado | A |
| El backend registra operación, entidad, contexto y metadata cuando aplica. | Implementado | A |
| La idempotencia no debe duplicar auditoría funcional de creación. | Implementado / pendiente detalle global | B |
| La Auditoría Visual no está implementada. | Roadmap | D |

---

## 3. Operaciones de auditoría existentes

| Operación | Estado | Nivel | Observación |
| --------- | ------ | ----: | ----------- |
| `ASOCIAR_DOCUMENTO_PRINCIPAL` | Implementada, pendiente de validación metadata runtime exacta | B | Nombre exacto identificado; no elevar a A sin evidencia final. |
| `GRUPO_FACTURA_CREADO` | Implementada y validada | A | Validada en Sprint 2.0B. |
| `DOCUMENTO_GRUPO_FACTURA_ASOCIADO` | Implementada y validada | A | Validada en Sprint 2.0C. |

---

## 4. Datos mínimos observados

La auditoría de operaciones V2 debe considerar como datos mínimos:

| Dato | Origen | Estado | Nivel |
| ---- | ------ | ------ | ----: |
| `tipoOperacion` | Backend | Implementado | A |
| `entidadTipo` | Backend | Implementado | A |
| `entidadId` | Backend | Implementado | A |
| `usuarioId` | Contexto autenticado / metadata observada | Implementado para operaciones V2 validadas | A |
| `usuarioEmail` | Contexto autenticado / metadata observada | Implementado para operaciones V2 validadas | A |
| `workspaceId` | Contexto autenticado | Implementado | A |
| `empresaCodigo` | Contexto autenticado | Implementado | A |
| `clienteDestinoId` | Contexto autenticado | Implementado | A |
| `requestId` | Request context | Implementado | A |
| `correlationId` | Request context | Implementado | A |
| `origen` | Gateway/backend | Implementado | A |
| `resultadoOperacion` | Backend | Implementado / operación específica | B |

Nota: los nombres `usuarioId` y `usuarioEmail` corresponden a la metadata observada actualmente. Cualquier representación agrupada como `usuario.id` o `usuario.email` es conceptual y no constituye contrato físico. Los campos que no estén presentes de manera uniforme en las operaciones V2 deben permanecer en Nivel B hasta nueva verificación runtime.

---

## 5. Idempotencia y auditoría

Regla vigente:

```text
Una operación idempotente no debe crear múltiples auditorías funcionales equivalentes
como si fueran nuevas creaciones.
```

Clasificación:

| Regla | Estado | Nivel |
| ----- | ------ | ----: |
| Idempotencia en asociación de principal | Implementado | A |
| Idempotencia en creación de grupo factura | Implementado | A |
| Idempotencia en asociación de documentos al grupo | Implementado | A |
| No duplicación de auditoría funcional en todos los casos | Pendiente de verificación global | B |

---

## 6. Auditoría vs evento documental

No confundir:

| Concepto | Propósito | Estado | Nivel |
| -------- | --------- | ------ | ----: |
| Auditoría | Registrar quién hizo qué, cuándo, desde dónde y con qué contexto. | Implementado para operaciones V2 específicas. | A/B según operación |
| Evento documental / `documento_eventos` | Representar hechos del ciclo documental para timeline, alertas o proyecciones. La infraestructura `documentos.documento_eventos` existe en el sistema. | Infraestructura existente; cobertura V2 pendiente de verificar. | A para existencia de infraestructura; B para cobertura V2; D para fuente oficial de Timeline |
| Timeline | Vista cronológica de hechos u operaciones. | Roadmap. | D |
| Auditoría Visual | UI para consultar auditoría. | Roadmap. | D |

La infraestructura `documentos.documento_eventos` existe en el sistema. No está validado que cubra las operaciones V2 consolidadas hasta `v2-rc4`, ni se ha decidido que sea la fuente oficial del Timeline. Su idoneidad como fuente del Timeline permanece pendiente de decisión.

---

## 6.1 Separación obligatoria de conceptos

```text
Auditoría ≠ Documento Evento ≠ Timeline Visual
```

| Concepto | Qué es | Qué no es | Estado | Nivel |
| -------- | ------ | --------- | ------ | ----: |
| Auditoría | Evidencia técnica/operativa de una acción ejecutada con contexto autenticado. | No es por sí sola una vista cronológica funcional. | Implementado para operaciones V2 específicas | A/B según operación |
| Documento Evento | Hecho documental potencialmente útil para timeline, alertas o proyecciones. La infraestructura `documentos.documento_eventos` existe. | No debe asumirse como fuente definitiva de Timeline sin sprint específico. | Infraestructura existente; cobertura V2 pendiente de verificar | A para existencia de infraestructura; B para cobertura V2; D para fuente oficial de Timeline |
| Timeline Visual | Representación UX cronológica de hechos u operaciones. | No existe actualmente como funcionalidad implementada. | Roadmap | D |

Ningún documento auxiliar debe presentar Auditoría Visual o Timeline Visual como implementados.

---

## 7. Limitaciones actuales

| Limitación | Estado | Nivel |
| ---------- | ------ | ----: |
| No existe pantalla de Auditoría Visual. | Roadmap | D |
| No existe contrato definitivo de consulta de auditoría para UI. | Pendiente | D |
| No está decidido si Timeline usará auditoría, eventos o proyección combinada. | Pendiente de decisión | D |
| No hay matriz completa de auditoría por permisos de rol. | Pendiente | D |

---

## 8. Reglas para Auditoría Visual futura

Antes de implementar Auditoría Visual se debe definir:

1. endpoint de consulta;
2. filtros mínimos;
3. paginación;
4. visibilidad por rol;
5. relación con Workspace;
6. representación de `requestId` y `correlationId`;
7. tratamiento de idempotencias;
8. diferencia entre auditoría técnica y evento funcional;
9. estados vacíos;
10. mensajes de error.

---

## 9. Prohibiciones

No afirmar que existe:

- pantalla de Auditoría Visual;
- timeline auditado;
- endpoint final de auditoría visual;
- permisos avanzados por rol;
- proyección de eventos;
- auditoría global Nivel A para toda operación futura.
