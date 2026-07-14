# Roadmap Operacional V2

**Documento auxiliar:** `docs/06-arquitectura-operativa/roadmap-operacion-v2.md`
**Fuente normativa:** [`MODELO_DOCUMENTAL_V2_OFICIAL.md`](../00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md)
**Sprint:** 2.0D.0 — Consolidación Operacional V2
**Estado:** documento auxiliar de planificación
**Runtime:** congelado

---

## 1. Propósito

Este documento ordena los bloques posteriores a `v2-rc4` sin convertirlos en compromisos ya aprobados.

La autoridad normativa del Modelo Documental V2 está en:

```text
docs/00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md
```

Este documento no redefine jerarquía, cardinalidades, invariantes ni operaciones vigentes.

---

## 2. Criterio de clasificación

Toda capacidad se clasifica como:

| Categoría | Significado |
| --------- | ----------- |
| Implementado | Existe, fue probado y validado funcionalmente. |
| Propuesto | Tiene sentido arquitectónico, pero requiere sprint y contrato. |
| Pendiente de decisión | Requiere decisión funcional o técnica antes de diseñarse. |
| Roadmap | Idea futura, no debe usarse como base de implementación inmediata. |

---

## 3. Estado base cerrado en v2-rc4

El cierre de `v2-rc4` deja operativo el flujo base de Compras:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Factura fundadora
          -> Guía
          -> Nota de ingreso
          -> Transferencia
          -> Detracción
```

Esta jerarquía no se redefine aquí. La referencia oficial es `MODELO_DOCUMENTAL_V2_OFICIAL.md`.

---

## 4. Roadmap recomendado

| Bloque | Categoría | Dependencia | Observación |
| ------ | --------- | ----------- | ----------- |
| Timeline Documental | Roadmap | Definir fuente de datos | No existe implementación visual vigente. |
| Auditoría Visual | Roadmap | Definir contrato de consulta | No existe UI vigente. |
| Permisos operativos por rol | Propuesto / pendiente de decisión | Matriz funcional | Actualmente las pruebas fueron con perfil `admin`. |
| Reemplazo de principal | Propuesto | Decisión funcional + contrato | Reconocido como necesidad futura; no autorizado para implementación. |
| Movimiento de documentos entre grupos | Propuesto | Reglas de conflicto, auditoría y reversibilidad | No autorizado actualmente. |
| Eliminación / desasociación | Pendiente de decisión | Políticas de auditoría y reversibilidad | No autorizado actualmente. |
| Caja Chica | Propuesto | Modelo propio de negocio | No usa Grupo de Factura como unidad principal. |
| Rendiciones | Propuesto | Modelo propio de negocio | Una rendición contiene múltiples sustentos. |
| OCR integrado al flujo V2 operativo | Roadmap | Definir integración con motor documental | Fuera del flujo operativo V2 actual. |
| Alertas automáticas | Roadmap | Definir disparadores y responsables | No implementado. |
| NATS para operaciones V2 | Roadmap | Definir eventos y consumidores | Fuera de alcance actual. |

---

## 5. Secuencia sugerida posterior

```text
2.0D.1  Timeline Documental
2.0D.2  Auditoría Visual
2.0D.3  Permisos operativos por rol
2.0E    Movimiento de documentos entre grupos
2.0F    Reemplazo de Documento Principal
2.1     Caja Chica
2.2     Rendiciones
3.0     OCR integrado
```

Esta secuencia es recomendación, no autorización de implementación.

---

## 6. Reglas de avance

Antes de abrir cualquier sprint funcional posterior debe existir:

1. decisión funcional formal;
2. contrato Gateway/backend;
3. criterio de auditoría;
4. criterio de idempotencia cuando aplique;
5. regla de permisos;
6. validación runtime antes de declarar Nivel A;
7. actualización de `MODELO_DOCUMENTAL_V2_OFICIAL.md` si cambia el modelo.

---

## 7. Prohibiciones de roadmap

No se debe usar este roadmap para justificar implementación directa de:

- Timeline visual;
- Auditoría Visual;
- permisos avanzados;
- OCR integrado;
- reemplazo de principal;
- movimiento de documentos;
- eliminación de asociaciones;
- operaciones sobre grupos V1 adaptados.

Toda implementación requiere sprint específico.
