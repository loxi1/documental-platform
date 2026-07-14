# Permisos de Operación V2

**Documento auxiliar:** `docs/06-arquitectura-operativa/permisos-operacion-v2.md`
**Fuente normativa:** [`MODELO_DOCUMENTAL_V2_OFICIAL.md`](../00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md)
**Sprint:** 2.0D.0 — Consolidación Operacional V2
**Estado:** separación entre permisos validados, propuestos y pendientes
**Runtime:** congelado

---

## 1. Propósito

Este documento diferencia:

```text
permisos realmente validados
permisos propuestos
permisos pendientes de decisión
```

No presenta permisos avanzados como existentes.

---

## 2. Estado actual

| Regla | Estado | Nivel | Observación |
| ----- | ------ | ----: | ----------- |
| Operaciones V2 hasta `v2-rc4` validadas con perfil `admin`. | Implementado y validado | A | Validación en sandbox/workspace de pruebas. |
| Operaciones vía Gateway con contexto autenticado. | Implementado | A | El backend valida contexto. |
| Matriz completa por Compras, Almacén, Finanzas y Contabilidad. | No implementada | D | Pendiente de decisión y validación. |
| Permisos avanzados por operación. | No implementado como política completa | D | Roadmap. |

---

## 2.1 Regla crítica: visibilidad no equivale a autorización

| Regla | Estado | Nivel | Observación |
| ----- | ------ | ----: | ----------- |
| Ocultar un botón no equivale a autorización. | Implementado como regla UX/arquitectónica | A | La ausencia o presencia visual de una acción no reemplaza la validación backend/Gateway. |
| La autorización real pertenece al backend/Gateway. | Implementado | A | React no decide permisos operativos ni alcance por rol. |
| El frontend solo refleja capacidades autorizadas por contrato. | Implementado | A | La UI puede ocultar, deshabilitar o mostrar mensajes, pero no concede autorización. |
| Una acción visible siempre debe fallar de forma segura si backend/Gateway la rechaza. | Propuesto | C | Requiere manejo UX consistente por operación y error funcional. |

Regla normativa resumida:

```text
Frontend refleja capacidades.
Backend/Gateway autoriza operaciones.
Ocultar o mostrar una acción no constituye autorización funcional.
```

---

## 3. Permisos validados

Hasta `v2-rc4`, las operaciones se han validado funcionalmente con perfil `admin`.

| Operación | Perfil validado | Estado | Nivel |
| --------- | --------------- | ------ | ----: |
| Consultar Workspace V2 | `admin` | Validado | A |
| Asociar Documento Operativo Principal | `admin` | Validado | A |
| Crear Grupo de Factura | `admin` | Validado | A |
| Asociar Guía | `admin` | Validado | A |
| Asociar Nota de ingreso | `admin` | Validado | A |
| Asociar Transferencia | `admin` | Validado | A |
| Asociar Detracción | `admin` | Validado | A |

---

## 4. Roles propuestos

Estos roles pertenecen al diseño funcional del ERP, pero no constituyen matriz operativa completa validada.

| Rol | Posible responsabilidad futura | Estado | Nivel |
| --- | ------------------------------ | ------ | ----: |
| Compras | Documento operativo principal, OC/OS/Requerimiento, factura. | Propuesto | C |
| Almacén | Guías y notas de ingreso. | Propuesto | C |
| Finanzas | Transferencias y detracciones. | Propuesto | C |
| Contabilidad | Revisión documental, control de completitud, auditoría visual. | Propuesto | C |
| Admin | Operaciones V2 implementadas hasta `v2-rc4`, validadas en sandbox y pruebas. | Implementado para validación | A |

---

## 5. Matriz futura no aprobada

Borrador conceptual, no operativo:

| Operación | Compras | Almacén | Finanzas | Contabilidad | Admin | Estado |
| --------- | ------- | ------- | -------- | ------------ | ----- | ------ |
| Consultar Workspace | Propuesto | Propuesto | Propuesto | Propuesto | Validado | Pendiente |
| Asociar principal | Propuesto | No definido | No definido | No definido | Validado | Pendiente |
| Crear Grupo Factura | Propuesto | No definido | No definido | No definido | Validado | Pendiente |
| Asociar Guía | No definido | Propuesto | No definido | Consulta | Validado | Pendiente |
| Asociar Nota de ingreso | No definido | Propuesto | No definido | Consulta | Validado | Pendiente |
| Asociar Transferencia | No definido | No definido | Propuesto | Consulta | Validado | Pendiente |
| Asociar Detracción | No definido | No definido | Propuesto | Consulta | Validado | Pendiente |
| Ver Auditoría Visual | No definido | No definido | No definido | Propuesto | Propuesto | Roadmap |
| Ver Timeline | Propuesto | Propuesto | Propuesto | Propuesto | Propuesto | Roadmap |

Esta tabla no debe implementarse sin sprint específico.

---

## 6. Reglas de frontend

| Regla | Estado | Nivel |
| ----- | ------ | ----: |
| React no determina autorizaciones. | Implementado | A |
| React solo refleja capacidades entregadas por contrato. | Implementado | A |
| React puede ocultar o deshabilitar acciones, pero eso no equivale a autorización. | Implementado como regla UX/arquitectónica | A |
| La autorización final siempre se verifica en backend/Gateway. | Implementado | A |
| React no habilita acciones por rol inferido localmente. | Implementado | A |
| Acciones operativas requieren entidad persistida. | Implementado | A |
| Mensajes de acceso denegado deben venir de contrato o error funcional. | Propuesto | C |

---

## 7. Reglas de backend/Gateway

| Regla | Estado | Nivel |
| ----- | ------ | ----: |
| Gateway propaga contexto autenticado. | Implementado | A |
| Backend valida contexto operacional. | Implementado | A |
| Payload de React no contiene permisos ni identidad. | Implementado | A |
| Matriz granular de permisos por rol no está consolidada. | Roadmap | D |

---

## 8. Decisiones pendientes

Antes de implementar permisos avanzados se debe definir:

1. catálogo de permisos;
2. relación perfil -> permiso;
3. permisos por sistema y workspace;
4. permisos por empresa/cliente destino;
5. permisos por operación V2;
6. permisos por estado;
7. permisos sobre lectura de auditoría;
8. permisos sobre Timeline;
9. mensajes funcionales de denegación;
10. pruebas runtime por rol.

---

## 9. Prohibiciones actuales

No se debe:

- presentar permisos por rol como ya operativos;
- habilitar acciones por inferencia local React;
- enviar permisos en payload desde frontend;
- implementar permisos avanzados en 2.0D.0;
- modificar runtime;
- asumir que Compras, Almacén, Finanzas o Contabilidad ya tienen cobertura completa.
