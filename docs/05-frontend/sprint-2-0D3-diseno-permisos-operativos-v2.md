# Sprint 2.0D.3 — Diseño Funcional / UX de Permisos Operativos V2

**Documento:** `docs/05-frontend/sprint-2-0D3-diseno-permisos-operativos-v2.md`
**Tipo:** Diseño funcional / UX frontend
**Estado:** Diseño autorizado; implementación React no autorizada
**Base funcional:** `v2-rc4.3`
**Autoridad normativa:** `docs/00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md`
**Fuentes auxiliares:**

- `docs/06-arquitectura-operativa/permisos-operacion-v2.md`
- `docs/06-arquitectura-operativa/reglas-operacion-v2.md`
- `docs/06-arquitectura-operativa/roadmap-operacion-v2.md`
- `docs/06-arquitectura-operativa/estados-documentales-v2.md`
- `docs/06-arquitectura-operativa/auditoria-operacion-v2.md`
- `docs/06-arquitectura-operativa/timeline-operacion-v2.md`

**Runtime:** congelado
**React:** sin implementación nueva en esta fase
**Backend/Gateway/JWT/PostgreSQL:** sin cambios

---

## 0. Resumen ejecutivo

El Sprint 2.0D.3 define el comportamiento visual de los permisos operativos en Workspace Documental V2 sin implementar runtime nuevo.

El objetivo no es crear una matriz de permisos ni autorizar operaciones desde React. El objetivo es documentar cómo debe representarse visualmente una acción cuando el contrato existente permita, bloquee, no informe o rechace una operación.

Regla principal:

```text
React representa capacidades.
Backend/Gateway autoriza operaciones.
Workspace contextualiza la operación.
JWT identifica el contexto autenticado.
```


## Estado del sprint

```text
Fase autorizada:
DISEÑO FUNCIONAL / UX

Implementación React:
NO AUTORIZADA

Backend:
CONGELADO

Gateway:
CONGELADO

JWT:
CONGELADO

Workspace:
CONGELADO

Runtime:
CONGELADO
```

---

## 1. Objetivo

Definir el comportamiento UX/UI de las acciones operativas existentes en Workspace Documental V2 a partir de las fuentes actuales de autorización y contexto.

El diseño debe cubrir:

- cuándo una acción se muestra habilitada;
- cuándo una acción se muestra deshabilitada;
- cuándo una acción se oculta;
- cuándo una acción se bloquea con explicación;
- cómo debe reaccionar la UI ante ausencia de permisos, permisos desconocidos, cambio de Workspace y respuestas 403 del Gateway.

Este documento no autoriza implementación React. La implementación requerirá dictamen posterior del Maestro Intermedio.

---

## 1.1 Fuera de alcance

Quedan fuera de este sprint:

- crear matriz nueva de permisos;
- definir permisos por Compras, Almacén, Finanzas o Contabilidad como operativos;
- modificar JWT;
- modificar Workspace;
- modificar Gateway;
- modificar backend;
- modificar PostgreSQL;
- crear migraciones;
- crear componentes React;
- crear hooks;
- crear servicios;
- crear rutas;
- hardcodear perfiles;
- inferir permisos desde el nombre del perfil;
- agregar lógica productiva de autorización en frontend.

---

## 2. Niveles de madurez usados

Este documento mantiene la metodología oficial del Modelo Documental V2.

| Nivel | Significado | Uso en este documento |
| ----- | ----------- | --------------------- |
| A | Implementado, probado y validado | Puede usarse como regla vigente. |
| B | Implementado, pendiente de validación completa | Puede referenciarse con cautela. |
| C | Aprobado arquitectónicamente, pendiente de implementación | Puede diseñarse, no programarse. |
| D | Roadmap / idea futura | No debe usarse como base funcional. |

Una acción visible no se convierte en Nivel A por aparecer en React. Debe existir contrato, implementación, validación y autorización backend/Gateway.

---

## 3. Fuentes de permisos y contexto

Las únicas fuentes admisibles son las existentes en el modelo actual.

| Fuente | Uso permitido en React | Estado | Nivel | Observación |
| ------ | ---------------------- | ------ | ----: | ----------- |
| JWT autenticado | Identifica sesión y contexto autenticado de manera indirecta vía cliente/API. | Existente | A | React no debe construir identidad ni enviarla en payload operativo. |
| Workspace seleccionado | Contextualiza empresa, sistema, perfil, cliente destino y alcance operativo. | Existente | A | React consume el Workspace ya seleccionado; no redefine el Workspace. |
| Permisos/acciones entregadas por Gateway/Auth | Reflejar capacidades cuando estén explícitas en contrato. | Existente como fuente general | B | No hay matriz granular V2 completa por operación/perfil validada. |
| Contratos Gateway Documental V2 | Indican disponibilidad de operaciones y errores funcionales. | Existente | A | React consume solo API Gateway. |
| Respuesta 403 de Gateway/backend | Bloqueo funcional posterior a intento operativo. | Existente | A | La UI debe mostrar mensaje no técnico. |
| Entidad persistida entregada por Workspace | Condición visual para mostrar acciones sobre entidades V2 reales. | Existente | A | No equivale a autorización; solo evita operar sobre adaptadores V1. |

---

## 3.1 Permiso existente vs permiso futuro

### Permiso existente

Se considera permiso existente únicamente cuando viene de una fuente actual y validada:

- sesión autenticada;
- Workspace seleccionado;
- perfil actual entregado por el sistema de autenticación;
- acciones/permisos entregados explícitamente por Gateway/Auth;
- respuesta funcional del Gateway/backend;
- entidad persistida requerida por contrato.

### Permiso futuro

Se considera permiso futuro todo aquello que aún no está consolidado:

- matriz completa Compras / Almacén / Finanzas / Contabilidad;
- permisos granulares por operación V2;
- permisos por estado documental;
- permisos por cliente destino;
- permisos sobre lectura de auditoría por perfil;
- permisos sobre Timeline;
- permisos de reemplazo, movimiento o eliminación;
- reglas de visibilidad por perfil no validadas.

Los permisos futuros deben permanecer como Nivel C o D según corresponda. No deben implementarse ni usarse para habilitar botones.

---

## 4. Principios obligatorios

| Principio | Nivel | Implicancia UX/UI |
| --------- | ----: | ----------------- |
| React no autoriza. | A | React no decide si una operación es permitida. |
| React representa. | A | La UI muestra, oculta o deshabilita según contrato recibido. |
| Backend decide. | A | Las reglas de negocio y autorización final pertenecen al backend. |
| Gateway propaga. | A | El Gateway transporta contexto autenticado y respuestas funcionales. |
| Workspace contextualiza. | A | La UI opera dentro del Workspace seleccionado, no fuera de él. |
| Entidad persistida habilita posibilidad visual, no autorización final. | A | `persistido.id` permite mostrar acción; Gateway/backend todavía pueden rechazar. |
| Sin permiso explícito, fallback seguro. | C | La UI no debe habilitar acción operativa cuando falta permiso explícito y la acción depende de permiso granular. |

---

## 5. Visibilidad vs autorización

Estos conceptos no son equivalentes.

| Concepto | Significado | Quién lo decide | Ejemplo visual |
| -------- | ----------- | --------------- | -------------- |
| Visible | El usuario puede ver la acción. | React a partir del contrato. | Botón presente. |
| Visible pero deshabilitado | La acción se muestra, pero no puede ejecutarse. | React a partir de condición visual/contrato. | Botón gris con ayuda. |
| Oculto | La acción no aparece. | React a partir de contrato o falta de capacidad. | No se muestra botón. |
| Bloqueada con explicación | La acción no procede y se informa motivo funcional. | React representa motivo del contrato o error. | Mensaje inline o toast funcional. |
| Autorizado | La operación es aceptada por backend/Gateway. | Backend/Gateway. | Respuesta exitosa de operación. |

Regla:

```text
Una acción visible no implica autorización.
Una acción oculta no demuestra falta de autorización backend.
La autorización final se valida al ejecutar la operación contra Gateway/backend.
```

---

## 6. Criterio general de estados visuales

Para acciones operativas existentes, la UI debe aplicar esta escala:

| Estado visual | Uso permitido | Mensaje recomendado |
| ------------- | ------------- | ------------------- |
| Visible + habilitada | Existe entidad persistida, contrato permite acción y no hay bloqueo visual conocido. | Sin mensaje adicional. |
| Visible + deshabilitada | La acción existe, pero falta precondición funcional visible. | `Esta acción no está disponible para este contexto.` |
| Oculta | La acción no aplica al contexto o no existe capacidad entregada. | Sin ruido visual. |
| Bloqueada con explicación | El Gateway/backend rechaza o el contrato indica falta de permiso. | Mensaje funcional, no técnico. |

---

## 7. Acciones actuales hasta v2-rc4.3

Solo se analizan acciones existentes hasta `v2-rc4.3`.

| Acción visual | Operación relacionada | Estado funcional | Nivel | Observación |
| ------------- | --------------------- | ---------------- | ----: | ----------- |
| Ver Workspace Documental V2 | Consulta Workspace V2 | Implementado y validado | A | Solo lectura; base de todas las acciones. |
| Asociar Documento Principal | `ASOCIAR_DOCUMENTO_PRINCIPAL` | Implementado y validado con admin | A | No reemplaza ni desasocia principal. |
| Crear Grupo Factura | `GRUPO_FACTURA_CREADO` | Implementado y validado con admin | A | Requiere Documento Operativo Principal persistido y activo. |
| Agregar Documento al Grupo Factura | `DOCUMENTO_GRUPO_FACTURA_ASOCIADO` | Implementado y validado con admin | A | Incluye Guía, Nota de ingreso, Transferencia y Detracción. |
| Ver Historial de actividad | Consulta canónica de trazabilidad | Implementado y validado visualmente | A | Desde `v2-rc4.3`; lectura de trazabilidad por Gateway. |

Importante: el hecho de que estas acciones estén validadas con perfil `admin` no crea una matriz por perfil para otros roles.

---

## 8. Diseño UX por acción actual

### 8.1 Asociar Documento Principal

| Estado | Condición visual admisible | Comportamiento UX |
| ------ | -------------------------- | ----------------- |
| Visible + habilitada | Contexto operativo V2 disponible y contrato/Workspace expone capacidad suficiente. | Mostrar acción principal de asociación. |
| Visible + deshabilitada | Falta contexto válido o faltan datos mínimos para buscar candidatos. | Botón deshabilitado con explicación corta. |
| Oculta | Workspace no corresponde a contexto operativo aplicable o no existe capacidad. | No mostrar acción. |
| Bloqueada con explicación | Gateway/backend responde 403 o error funcional. | Mostrar mensaje no técnico: `No tienes permisos para asociar un documento principal en este contexto.` |

Restricciones:

- React no decide principalidad.
- React no reemplaza principal.
- React no desasocia principal.
- React no envía identidad, empresa ni auditoría.

Nivel de permiso granular por perfil:

```text
Admin validado: Nivel A
Matriz por otros perfiles: Nivel D
```

---

### 8.2 Crear Grupo Factura

| Estado | Condición visual admisible | Comportamiento UX |
| ------ | -------------------------- | ----------------- |
| Visible + habilitada | Existe Documento Operativo Principal persistido y activo, y contrato permite operación. | Mostrar acción para asociar factura existente. |
| Visible + deshabilitada | No existe principal persistido/activo o la entidad es adaptada V1. | Explicar que se requiere Documento Operativo Principal V2 persistido. |
| Oculta | No existe capacidad de creación de Grupo Factura para el contexto. | No mostrar acción. |
| Bloqueada con explicación | Gateway/backend responde 403 o conflicto funcional. | Mostrar mensaje funcional sin exponer códigos técnicos. |

Restricciones:

- Factura no se convierte en principal.
- React no crea grupos vacíos.
- React no valida unicidad de factura; backend decide.
- React no infiere reglas desde metadata OCR.

Nivel de permiso granular por perfil:

```text
Admin validado: Nivel A
Matriz por Compras/Contabilidad: Nivel D
```

---

### 8.3 Agregar Documento al Grupo Factura

| Estado | Condición visual admisible | Comportamiento UX |
| ------ | -------------------------- | ----------------- |
| Visible + habilitada | Grupo Factura V2 persistido y activo; contrato entrega candidatos con `tipoRelacion`. | Mostrar acción `Agregar documento`. |
| Visible + deshabilitada | Grupo adaptado V1, grupo sin `persistido.id` o estado no operativo. | Explicar que solo grupos V2 persistidos admiten operación. |
| Oculta | No hay capacidad operativa de agregar documentos para el grupo. | No mostrar acción. |
| Bloqueada con explicación | Gateway/backend responde 403, conflicto o documento no permitido. | Mostrar mensaje funcional del extractor profundo. |

Restricciones:

- React no infiere `tipoRelacion`.
- React usa `candidato.tipoRelacion` entregado por Gateway.
- React no mueve documentos entre grupos.
- React no cambia relaciones.
- React no elimina asociaciones.

Nivel de permiso granular por perfil:

```text
Admin validado: Nivel A
Guía / Nota de ingreso por Almacén: Nivel D
Transferencia / Detracción por Finanzas: Nivel D
Consulta por Contabilidad: Nivel D
```

---

### 8.4 Ver Historial de actividad

| Estado | Condición visual admisible | Comportamiento UX |
| ------ | -------------------------- | ----------------- |
| Visible + habilitada | Workspace tiene identificador de contenedor operativo consultable y sesión autorizada. | Mostrar bloque `Historial de actividad`. |
| Visible + deshabilitada | No existe identificador consultable o no se puede resolver contexto. | Mostrar empty state o mensaje contextual no bloqueante. |
| Oculta | El contrato futuro indicara que el usuario no tiene capacidad de lectura. | No mostrar bloque o mostrar mensaje mínimo según decisión posterior. |
| Bloqueada con explicación | Endpoint de trazabilidad responde 401, 403, 404 o error de red. | Mostrar error dentro del bloque, sin destruir Workspace. |

Restricciones:

- React no consume `core.auditoria_eventos`.
- React no consume `documentos.documento_eventos`.
- React no muestra `requestId`, `correlationId`, `entidad.id` ni JSON interno.
- React no reordena eventos.
- React no convierte auditoría en autorización.

Nivel de permiso granular por perfil:

```text
Lectura visual validada en Workspace: Nivel A
Matriz granular de lectura por perfil: Nivel D
```

---

## 9. Acciones futuras fuera de alcance

Estas acciones permanecen fuera del Sprint 2.0D.3.

| Acción futura | Estado | Nivel | Motivo |
| ------------- | ------ | ----: | ------ |
| Reemplazar Documento Principal | No autorizado | C | Requiere reglas funcionales, contrato y auditoría. |
| Desasociar Documento Principal | No autorizado | C | Requiere política de reversibilidad. |
| Mover documentos entre grupos | No autorizado | C | Requiere reglas de conflicto y trazabilidad. |
| Eliminar asociaciones | No autorizado | C | Requiere auditoría y política de recuperación. |
| Cambiar `tipoRelacion` | No autorizado | C | Backend debe decidir reglas. |
| Timeline avanzado | Roadmap | D | Fuente oficial aún no decidida. |
| Auditoría comparativa | Roadmap | D | No existe contrato visual vigente. |
| Caja Chica | Fuera de este Workspace | D | Tendrá jerarquía propia; no usa Grupo Factura. |
| Rendiciones | Fuera de este Workspace | D | Sistema/frontend separado, comparte esquema documentos. |

---

## 10. Restricciones técnicas absolutas

Durante esta fase:

```text
Sin React runtime nuevo
Sin componentes nuevos
Sin hooks nuevos
Sin servicios nuevos
Sin backend
Sin Gateway
Sin JWT
Sin PostgreSQL
Sin migraciones
Sin permisos inventados
Sin matrices propias
Sin hardcode de perfiles
Sin consumo directo de ms-documentos
Sin lectura de tablas internas
Sin inferencia desde metadata OCR
```

---

## 11. Criterios UX ante escenarios de permiso

### 11.1 Falta un permiso explícito

Cuando una acción depende de permiso explícito y este no llega:

- no habilitar acción por inferencia;
- preferir ocultar o deshabilitar según el contrato visual disponible;
- no mostrar mensajes alarmistas;
- no bloquear la lectura general del Workspace.

Mensaje recomendado si la acción se muestra deshabilitada:

```text
Esta acción no está disponible para tu perfil en este contexto.
```

Nivel:

```text
C — criterio de diseño pendiente de implementación.
```

---

### 11.2 Permiso desconocido

Si llega una acción/capacidad no reconocida por esta versión de frontend:

- no habilitar controles nuevos;
- no mostrar acción desconocida al usuario;
- registrar solo mediante mecanismos existentes si el sistema ya los tiene;
- mantener Workspace operativo.

Mensaje visible:

```text
No mostrar mensaje al usuario final, salvo que el contrato indique bloqueo funcional.
```

Nivel:

```text
C — criterio de diseño pendiente de implementación.
```

---

### 11.3 Backend/Gateway no envía permisos

Si el Gateway no envía permisos granulares:

- mantener lectura del Workspace;
- mantener acciones ya regidas por condiciones existentes solo si el contrato vigente las soporta;
- no inventar habilitación por perfil;
- en implementación futura, adoptar fallback seguro para acciones que dependan de permisos nuevos.

Nivel:

```text
B/C — depende de contrato real disponible en implementación futura.
```

---

### 11.4 Gateway responde 403

Cuando una operación responde 403:

- el error se muestra dentro del flujo donde ocurrió;
- no destruir Workspace;
- no mostrar stack trace;
- no mostrar requestId/correlationId en modo operativo;
- permitir continuar navegando.

Mensaje recomendado:

```text
No tienes permisos para realizar esta acción en este contexto.
```

Nivel:

```text
A para existencia de 403 como rechazo funcional.
C para estandarización visual completa por operación.
```

---

### 11.5 Workspace cambia

Cuando el usuario cambia de Workspace:

- la UI debe recalcular visibilidad desde el nuevo contrato;
- no conservar acciones habilitadas del Workspace anterior;
- limpiar selección temporal de candidatos o paneles abiertos;
- refrescar datos desde Gateway;
- no reutilizar permisos en memoria de otro contexto.

Nivel:

```text
C — diseño UX; implementación posterior.
```

---

## 12. Riesgos identificados

| Riesgo | Impacto | Mitigación de diseño |
| ------ | ------- | -------------------- |
| Permisos insuficientemente granulares | Acciones podrían depender solo de admin durante más tiempo. | No inventar matriz; clasificar como Nivel D. |
| Diferencia entre perfil y acción | Un perfil puede no mapear directamente a una acción. | Diseñar por capacidad/acción, no por nombre de perfil. |
| Inconsistencia entre Workspace y JWT | La UI podría mostrar contexto distinto al token real. | Backend/Gateway debe decidir; React refresca Workspace. |
| Ausencia de permisos explícitos futuros | Botones podrían quedar sin criterio fino. | Fallback seguro: no habilitar por inferencia. |
| Acciones visibles rechazadas por backend | UX puede parecer inconsistente. | Manejar 403 y errores funcionales dentro del flujo. |
| Grupos V1 adaptados confundidos con V2 persistidos | Operación sobre entidad no válida. | Acciones operativas solo sobre `persistido.id`. |
| Hardcode de perfiles | Rompe modelo multiempresa/sistema/perfil. | Prohibido; usar contrato de permisos/capacidades. |

---

## 13. Matriz de madurez por capacidad

| Capacidad | Nivel | Estado permitido |
| --------- | ----: | ---------------- |
| Workspace V2 consultable | A | Usar como base visual. |
| Operaciones V2 con perfil admin | A | Reconocer como validadas. |
| React refleja capacidades entregadas por contrato | A | Mantener como principio. |
| Backend/Gateway autoriza | A | Mantener como regla. |
| Mensaje UX estándar por 403 operativo | C | Diseñar, no implementar aún. |
| Matriz por Compras/Almacén/Finanzas/Contabilidad | D | No implementar. |
| Permisos avanzados por operación/estado | D | No implementar. |
| Permiso granular para Ver Historial por perfil | D | No implementar. |
| Permisos de reemplazo/mover/eliminar | C/D | Requieren sprint propio. |

---

## 14. Criterios de aceptación del diseño

Este documento será aceptable si:

- no propone cambios de backend;
- no propone cambios de Gateway;
- no redefine JWT;
- no redefine Workspace;
- no crea matriz paralela de permisos;
- no documenta como existente un permiso futuro;
- no hardcodea perfiles;
- distingue visibilidad y autorización;
- clasifica permisos por Nivel A/B/C/D;
- mantiene `MODELO_DOCUMENTAL_V2_OFICIAL.md` como autoridad normativa;
- limita acciones actuales a las existentes hasta `v2-rc4.3`;
- mantiene Caja Chica/Rendiciones fuera del Workspace de Grupo Factura;
- no abre Timeline avanzado.

---

## 15. Entregable de esta fase

Único archivo autorizado:

```text
docs/05-frontend/sprint-2-0D3-diseno-permisos-operativos-v2.md
```

No se deben crear ramas de implementación, componentes, hooks, servicios ni pruebas runtime en esta fase.

---

## 16. Conclusión

El diseño de Permisos Operativos V2 debe ordenar la representación visual de acciones sin convertir React en autoridad de permisos.

El siguiente paso, si el Maestro Intermedio aprueba este documento, será decidir si existe contrato suficiente para abrir una fase de implementación limitada.

Hasta entonces:

```text
React no autoriza.
React no inventa permisos.
React no infiere perfiles.
React solo representa capacidades entregadas por contrato.
Backend/Gateway mantienen la autorización real.
```
