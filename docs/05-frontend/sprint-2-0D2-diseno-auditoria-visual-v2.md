# Sprint 2.0D.2 — Diseño UX/UI Auditoría Visual V2

**Documento:** `docs/05-frontend/sprint-2-0D2-diseno-auditoria-visual-v2.md`
**Tipo:** Diseño UX/UI frontend
**Estado:** Implementación React realizada; pendiente de validación visual y cierre formal.
**Rama sugerida:** `feat/documental-v2-auditoria-visual-2-0D2`
**Nota de rama:** crear únicamente cuando el Maestro Intermedio abra formalmente el Sprint 2.0D.2
**Base funcional:** `v2-rc4.2`
**Contrato canónico:** `GET /api/v1/documental-v2/trazabilidad/contenedores/:contenedorOperativoId`
**React:** autorizado e implementado en la rama feat/documental-v2-auditoria-visual-2-0D2.
**Backend/Gateway:** sin cambios en este documento
**Runtime:** sin cambios

---

## 1. Objetivo

Diseñar la primera representación visual de la trazabilidad del Modelo Documental V2 dentro del Workspace Documental V2.

La vista debe permitir que un usuario operativo responda rápidamente:

- qué ocurrió;
- quién realizó la operación;
- cuándo ocurrió;
- sobre qué entidad ocurrió;
- cuál fue el resultado;
- si existe alguna limitación de cobertura.

Este documento no define reglas del dominio ni modifica el contrato backend. La fuente normativa continúa siendo:

```text
docs/00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md
```

La fuente técnica del contrato continúa siendo:

```text
docs/04-backend/trazabilidad-consulta-v2.md
```

---

## 2. Principios UX

La Auditoría Visual V2 debe seguir estos principios:

| Principio | Aplicación UX |
|---|---|
| La UI representa operaciones del dominio, no tablas técnicas. | Mostrar hechos operativos como “Grupo de factura creado”, no nombres de tablas. |
| La UI consume únicamente la API canónica. | Usar solo `GET /api/v1/documental-v2/trazabilidad/contenedores/:contenedorOperativoId`. |
| La UI no interpreta JSON interno. | No leer `antes`, `despues`, JSONB ni metadata cruda. |
| La UI no reconstruye historial. | El backend entrega `items[]` ya normalizado y ordenado. |
| La UI no calcula estados derivados del dominio. | Solo representa campos normalizados del contrato. |
| La UI no infiere categoría ni tipo. | `categoria` y `tipo` vienen del endpoint. |
| La UI no interrumpe el flujo operativo. | El historial debe ser una sección de lectura, no una operación principal. |
| La UI separa lectura operativa de diagnóstico técnico. | `requestId` y `correlationId` no son visibles por defecto. |

---

## 3. Ubicación dentro del Workspace Documental V2

La sección debe integrarse dentro del Workspace Documental V2 como bloque de lectura.

Ubicación sugerida:

```text
Workspace Documental V2
  → Contexto Operativo
  → Documento Operativo Principal
  → Grupo Factura
  → Historial de actividad
```

Nombre visible recomendado:

```text
Historial de actividad
```

Nombre técnico del sprint:

```text
Auditoría Visual V2
```

Justificación:

- “Historial de actividad” es más comprensible para el usuario operativo.
- “Auditoría Visual V2” se conserva como nombre técnico del sprint.
- La sección no debe ocupar el centro del Workspace ni desplazar la operación documental principal.
- No debe presentarse todavía como Timeline interactivo.

---

## 4. Componentes React propuestos

> Esta sección es diseño técnico. No autoriza implementación React.

Componentes sugeridos para una futura implementación:

```text
HistorialActividadV2
HistorialActividadItem
HistorialActividadAdvertencias
HistorialActividadEstadoVacio
HistorialActividadSkeleton
```

Responsabilidad de cada componente:

| Componente | Responsabilidad |
|---|---|
| `HistorialActividadV2` | Contenedor principal de la sección de historial. |
| `HistorialActividadItem` | Render visual de un evento normalizado. |
| `HistorialActividadAdvertencias` | Muestra avisos de cobertura de forma discreta. |
| `HistorialActividadEstadoVacio` | Presenta estados sin actividad o sin trazabilidad visible. |
| `HistorialActividadSkeleton` | Representa el estado de carga. |

Hook o función de lectura sugerida:

```text
useTrazabilidadContenedor(contenedorOperativoId)
```

Reglas:

- El hook debe consumir únicamente API Gateway.
- No debe existir consulta directa a `core.auditoria_eventos`.
- No debe existir consulta directa a `documentos.documento_eventos`.
- No debe existir lectura de JSONB interno.
- No debe crearse store global para esta primera versión.
- No debe agregarse lógica de ordenamiento, ya que el backend entrega `items[]` por fecha descendente.

---

## 5. Flujo visual

### Diagrama de navegación

```text
Workspace Documental V2
  ↓
Historial de actividad
  ↓
Lista cronológica de eventos
  ↓
Detalle técnico futuro
```

Este flujo no habilita Timeline interactivo ni detalle técnico en la primera versión. Solo documenta la evolución visual esperada.

La vista debe organizar la información en tres niveles.

### Nivel 1 — Información principal

Siempre visible.

Debe responder en lectura rápida:

```text
¿Qué ocurrió?
¿Cuándo ocurrió?
¿Cuál fue el resultado?
```

Campos:

- tipo de operación convertido a etiqueta humana;
- descripción normalizada;
- fecha y hora;
- resultado convertido a etiqueta humana.

Ejemplo conceptual:

```text
Documento principal asociado
Hoy 10:25
Registrado correctamente
Documento Principal asociado correctamente
```

---

### Nivel 2 — Contexto

Visible de forma secundaria o expandible.

Debe responder:

```text
¿Quién lo hizo?
¿Sobre qué entidad ocurrió?
¿Qué categoría representa?
```

Campos posibles:

- actor, preferentemente `actor.email`;
- categoría traducida;
- entidad con etiqueta funcional si aplica;
- identificador funcional si el contrato lo ofrece en el futuro.

No mostrar `entidad.id` técnico en la vista operativa inicial. Un valor como `5` no es útil para el usuario operativo y debe reservarse para un modo diagnóstico o detalle técnico futuro.

No debe sobrecargar la vista principal.

---

### Nivel 3 — Diagnóstico

Reservado para modo técnico futuro o detalle expandible.

Campos:

- requestId;
- correlationId;
- cobertura;
- advertencias como códigos;
- origen.

En esta primera versión, estos datos no deben ocupar protagonismo visual.

---

## 6. Contrato consumido

Endpoint autorizado:

```http
GET /api/v1/documental-v2/trazabilidad/contenedores/:contenedorOperativoId
```

Estructura relevante:

```json
{
  "version": 1,
  "contenedorOperativoId": 2,
  "items": [
    {
      "id": "auditoria:348",
      "fecha": "2026-07-15T02:23:43.735Z",
      "categoria": "AUDITORIA",
      "tipo": "DOCUMENTO_GRUPO_FACTURA_ASOCIADO",
      "descripcion": "Documento asociado al Grupo de Factura desde operación V2.",
      "actor": {
        "usuarioId": 1,
        "email": "admin@documental.local"
      },
      "entidad": {
        "tipo": "grupo_factura_documento",
        "id": "5"
      },
      "resultado": "CREADO",
      "origen": "api-gateway",
      "requestId": "...",
      "correlationId": "..."
    }
  ],
  "cobertura": {
    "auditoria": true,
    "documentoEventos": false,
    "parcial": true
  },
  "advertencias": [
    "TRAZABILIDAD_PARCIAL",
    "SIN_EVENTOS_DOCUMENTALES"
  ]
}
```

Reglas frontend:

- `items[]` se recibe ya ordenado por fecha descendente.
- `version` debe conservarse para compatibilidad futura.
- `cobertura` se usa para decidir avisos informativos, no para inferir reglas de negocio.
- `advertencias[]` se traduce a mensajes UX.
- La UI no debe asumir campos adicionales fuera del contrato.

---

## 7. Mapeo de categorías

| Código | Etiqueta UX | Observación |
|---|---|---|
| `AUDITORIA` | Operación | Representa una operación auditada del dominio. |

Categorías futuras previstas por arquitectura, no necesariamente implementadas en UI inicial:

```text
DOCUMENTO
OCR
WORKFLOW
SISTEMA
```

La UI no debe inferir categoría desde `tipo`, `entidad` o `origen`.

---

## 8. Mapeo de tipos

| Tipo | Etiqueta UX | Descripción visual sugerida |
|---|---|---|
| `ASOCIAR_DOCUMENTO_PRINCIPAL` | Documento principal asociado | Se asoció un documento operativo principal al contexto. |
| `GRUPO_FACTURA_CREADO` | Grupo de factura creado | Se creó un grupo de factura desde una factura existente. |
| `DOCUMENTO_GRUPO_FACTURA_ASOCIADO` | Documento asociado al grupo de factura | Se asoció un documento al grupo de factura. |

Fallback:

```text
Operación registrada
```

Uso del fallback:

- cuando `tipo` venga vacío;
- cuando `tipo` no esté mapeado;
- cuando se agregue un tipo nuevo antes de actualizar el frontend.

---

## 9. Mapeo de resultados

| Resultado | Etiqueta UX | Observación |
|---|---|---|
| `CREADO` | Registrado correctamente | Resultado esperado para creación real. |
| `IDEMPOTENTE` | Sin cambios | Si en el futuro se expone como item de lectura. |
| `RECHAZADO` | Rechazado | Solo si el contrato lo expone en el futuro. |
| `PENDIENTE_REVISION` | Pendiente de revisión | Usar solo si llega como resultado normalizado. |
| `ACTIVO` | Activo | Usar solo si llega como resultado normalizado. |

Fallback:

```text
Resultado no especificado
```

No se debe inferir resultado desde descripción, entidad o metadata.

---

## 10. Tratamiento de advertencias

Advertencias conocidas:

| Código | Mensaje UX | Prioridad visual |
|---|---|---|
| `TRAZABILIDAD_PARCIAL` | La trazabilidad disponible es parcial para este contexto. | Informativa |
| `SIN_EVENTOS_DOCUMENTALES` | No hay eventos documentales complementarios disponibles para este contexto. | Preventiva |

Prioridades visuales:

| Prioridad | Uso | Tratamiento visual |
|---|---|---|
| Informativa | Cobertura parcial o dato complementario no disponible. | Aviso discreto. |
| Preventiva | Fuente complementaria ausente o cobertura limitada. | Aviso visible, sin bloquear. |
| Crítica | Respuesta inconsistente o error del contrato. | Estado de error real, no advertencia de cobertura. |

Reglas:

- Las advertencias de cobertura no deben mostrarse como errores críticos.
- No usar rojo salvo error real de carga, autorización o contrato inconsistente.
- No bloquear la lectura del historial por advertencias informativas.
- No mostrar códigos crudos al usuario operativo por defecto.

---

## 11. Estados visuales

| Estado | Condición | Mensaje UX sugerido |
|---|---|---|
| Cargando | Solicitud en progreso. | Cargando historial de actividad... |
| Historial disponible | `items.length > 0`. | Mostrar lista cronológica. |
| Sin trazabilidad operativa | `items.length === 0` y sin advertencias relevantes. | Aún no hay actividad registrada para este contexto. |
| Trazabilidad parcial | `cobertura.parcial === true` o advertencias de cobertura. | La trazabilidad disponible es parcial para este contexto. |
| Sesión vencida / no autenticado | 401. | Tu sesión venció o no estás autenticado. |
| Sin permisos | 403. | No tienes autorización para ver el historial de actividad. |
| Contexto no encontrado | 404. | No se encontró el contexto operativo solicitado. |
| Error de red o carga | Error no controlado. | No se pudo cargar el historial de actividad. |

Regla especial:

```text
items=[] + advertencias
```

no debe mostrarse igual que:

```text
items=[] sin advertencias
```

El primer caso puede significar trazabilidad parcial. El segundo puede significar ausencia real de actividad registrada.

---

## 12. Empty states

### 12.1 Sin actividad registrada

Usar cuando:

- `items=[]`;
- no hay advertencias;
- la cobertura no indica parcialidad.

Mensaje:

```text
Aún no hay actividad registrada para este contexto.
```

### 12.2 Trazabilidad parcial sin items

Usar cuando:

- `items=[]`;
- `cobertura.parcial=true` o existen advertencias.

Mensaje:

```text
No hay actividad visible con la cobertura actual.
La trazabilidad disponible es parcial para este contexto.
```

### 12.3 Actor no especificado

Si `actor` o `actor.email` viene nulo:

```text
Usuario no especificado
```

### 12.4 Descripción ausente

Si `descripcion` viene nula o vacía:

- usar etiqueta derivada de `tipo`;
- si `tipo` tampoco está mapeado, usar:

```text
Operación registrada
```

---

## 13. Accesibilidad

Recomendaciones mínimas:

- El historial debe poder leerse sin depender únicamente de iconos.
- Los iconos deben tener texto visible o `aria-label` si aplica.
- Las advertencias deben tener texto claro, no solo color.
- Fecha y hora deben presentarse en formato legible.
- La lista debe mantener orden lógico de lectura.
- Los estados de carga deben ser perceptibles.
- Los errores deben tener mensajes textuales accionables.

Formato de fecha sugerido:

```text
Hoy 10:25
Ayer 18:40
15/07/2026 02:23
```

El formato final debe respetar la configuración general del frontend si ya existe una utilidad compartida.

---

## 14. Restricciones

No incluido en esta primera versión:

- Timeline interactivo;
- filtros complejos;
- búsqueda;
- agrupación por fechas;
- auditoría comparativa;
- diff visual;
- reconstrucción temporal;
- reproducción de estados;
- escritura de comentarios;
- acciones sobre eventos;
- cambios en auditoría;
- cambios backend;
- cambios Gateway;
- migraciones;
- OCR;
- NATS;
- alertas.

Prohibido para React:

- consultar `core.auditoria_eventos`;
- consultar `documentos.documento_eventos`;
- consumir JSONB interno;
- consumir `antes`;
- consumir `despues`;
- consumir metadata técnica;
- inferir reglas de negocio;
- recalcular orden cronológico;
- reconstruir historial desde otras fuentes.

---

## 15. Criterios de aceptación UX

La primera versión será aceptable si:

1. Consume únicamente `GET /api/v1/documental-v2/trazabilidad/contenedores/:contenedorOperativoId`.
2. Se integra dentro del Workspace Documental V2 sin interrumpir el flujo operativo.
3. Muestra los eventos en el orden entregado por backend.
4. Muestra tipo de operación con etiqueta humana.
5. Muestra fecha/hora.
6. Muestra actor cuando exista email.
7. Muestra resultado con etiqueta humana.
8. Muestra advertencias de cobertura de forma discreta.
9. Maneja loading, empty, parcialidad y errores.
10. No muestra `requestId` ni `correlationId` por defecto.
11. No expone nombres de tablas ni JSONB interno.
12. No introduce nuevas operaciones.
13. No modifica backend, Gateway ni runtime.
14. La implementación no debe modificar el orden entregado por backend.

---

## 16. Evolución futura fuera de alcance

Ruta natural de evolución:

```text
Auditoría Visual
        ↓
Timeline enriquecido
        ↓
Filtros
        ↓
Agrupación temporal
        ↓
Diagnóstico avanzado
```

Fuera de esta primera versión:

- Timeline interactivo;
- agrupación por día;
- filtros;
- búsqueda;
- diff visual;
- replay de estados;
- comparación de versiones;
- panel de diagnóstico;
- modo técnico completo;
- exportación de auditoría;
- alertas basadas en trazabilidad.

Estas capacidades requieren apertura de sprint específico y no deben implementarse como parte inicial de Auditoría Visual V2.

---

## 17. Nota final

Este documento preparó el diseño UX/UI de Auditoría Visual V2 y sirvió como base para la implementación React autorizada del Sprint 2.0D.2.

Este documento constituyó la base UX/UI de la implementación React del Sprint 2.0D.2. La implementación queda sujeta a validación visual, build y cierre formal.
