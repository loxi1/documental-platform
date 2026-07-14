# Estados Documentales V2

**Documento auxiliar:** `docs/06-arquitectura-operativa/estados-documentales-v2.md`
**Fuente normativa:** [`MODELO_DOCUMENTAL_V2_OFICIAL.md`](../00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md)
**Sprint:** 2.0D.0 — Consolidación Operacional V2
**Estado:** separación de estados persistentes, derivados y visuales
**Runtime:** congelado

---

## 1. Propósito

Este documento evita mezclar:

```text
estado persistente
estado derivado backend
etiqueta visual UX
estado del motor documentos/OCR compartido
```

La autoridad normativa sigue siendo `MODELO_DOCUMENTAL_V2_OFICIAL.md`.

---

## 2. Principio rector

Un valor no debe tratarse como estado operativo V2 solo porque aparece en documentos, OCR, metadata histórica o UI.

Para que un estado sea propio del Modelo Documental V2 operativo debe verificarse en código, base de datos o contrato correspondiente.

---

## 2.1 Separación obligatoria

```text
estado persistente ≠ estado derivado backend ≠ etiqueta visual UX ≠ estado OCR/documental compartido
```

| Categoría | Quién la define | Uso permitido | Riesgo a evitar |
| --------- | --------------- | ------------- | --------------- |
| Estado persistente | Base de datos / backend | Control operativo real. | Convertir labels en estados físicos inexistentes. |
| Estado derivado backend | Backend / Gateway | Condición calculada para Workspace o agregados. | Persistir condiciones que solo son lectura. |
| Etiqueta visual UX | Frontend desde campos normalizados `vista` o contrato | Presentación comprensible para usuario. | Usarla como regla de negocio. |
| Estado OCR/documental compartido | Motor documental/OCR | Flujo propio de documento base u OCR. | Mezclarlo con Grupo de Factura o operación V2. |

---

## 3. Estado persistente

Estado almacenado en entidades operativas V2.

| Estado | Ámbito observado | Estado de regla | Nivel | Observación |
| ------ | ---------------- | --------------- | ----: | ----------- |
| `activo` | Entidades V2 persistidas | Implementado | A | Usado para entidades operativas persistidas. |
| `pendiente_revision` | Grupo de Factura / revisión | Implementado | A | Validado en operaciones de Grupo de Factura. |
| `anulado` | Entidades operativas | Implementado, pendiente de verificación por entidad | B | No elevar globalmente a A sin confirmar uso físico específico. |

---

## 4. Estado del documento base compartido

Estos estados pertenecen al motor documental/base compartida. No son automáticamente estados propios de Grupo de Factura, Documento Operativo Principal o asociación V2.

| Estado | Ámbito | Estado de regla | Nivel | Observación |
| ------ | ------ | --------------- | ----: | ----------- |
| `confirmado` | Documento base / motor documental | Implementado | B | Observado en documentos, pero no declarar como estado operativo V2 universal. |
| `pendiente_validacion` | OCR / validación documental | Compartido | B | No mezclar con estado de Grupo de Factura. |
| `pendiente_ocr` | OCR | Compartido | B | No pertenece por defecto al flujo operativo V2. |
| `confirmado_como_version` | Versionado / motor documental | Compartido | B | Documentar en su propio contexto cuando aplique. |

---

## 5. Estado derivado backend

Estado o condición calculada a partir del Workspace o de agregados backend.

| Estado derivado | Estado de regla | Nivel | Observación |
| --------------- | --------------- | ----: | ----------- |
| Sin documento operativo principal | Implementado | A | Condición de Workspace. |
| Sin facturas asociadas | Implementado / posible | B | Confirmar uso visual y contrato antes de elevar globalmente a A. |
| Con múltiples facturas | Implementado / posible | B | Condición posible por cardinalidad, confirmar reglas visuales. |
| Grupo V1 adaptado sin operación | Implementado | A | Se representa como consulta, no como error. |
| Grupo V2 persistido operativo | Implementado | A | Habilita acciones si existe `persistido.id`. |

---

## 6. Etiqueta visual UX

Label mostrado al usuario. No necesariamente coincide con estado persistente.

| Etiqueta UX | Estado de regla | Nivel | Observación |
| ----------- | --------------- | ----: | ----------- |
| Pendiente de revisión | Implementado | A | Label visible asociado a revisión. |
| Sin documentos asociados todavía | Implementado | A | Empty state funcional. |
| Operación controlada | Implementado | A | Label visual del Workspace V2. |
| Pendiente de documento operativo | Implementado / posible | B | Confirmar uso real antes de elevar a A. |

---

## 7. Reglas para UI

| Regla | Estado | Nivel |
| ----- | ------ | ----: |
| La UI no debe mostrar estados técnicos como si fueran decisiones funcionales. | Implementado | A |
| La UI debe separar estado operativo de etiqueta visual. | Implementado | A |
| Empty states no son errores. | Implementado | A |
| Los grupos V1 adaptados se muestran como consulta, no como fallas. | Implementado | A |
| Las acciones visibles dependen de `persistido.id`, no de labels. | Implementado | A |

---

## 7.1 Criterio UX/Workspace obligatorio

Un empty state, una etiqueta de ayuda, una advertencia visual o una ausencia de documentos no debe convertirse en estado persistente sin decisión funcional, migración/contrato y validación runtime. La UI debe representar esas condiciones con lenguaje funcional, sin exponer términos técnicos internos al usuario final.

---

## 8. Reglas para futuros estados

Antes de agregar un nuevo estado operativo V2 se debe definir:

1. entidad a la que pertenece;
2. valor exacto persistido;
3. transición que lo produce;
4. operación o evento que lo cambia;
5. efecto visual;
6. efecto sobre permisos;
7. auditoría esperada;
8. nivel de autoridad.

---

## 9. Prohibiciones

No documentar como estado operativo V2:

- cualquier label visual sin respaldo persistente;
- cualquier estado OCR sin contexto;
- cualquier metadata histórica;
- cualquier condición inferida por React;
- cualquier término funcional no validado en código o runtime.
