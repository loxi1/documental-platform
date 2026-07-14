# Modelo Documental V2 Oficial

**Documento:** `docs/00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md`
**Estado:** referencia normativa vigente
**Base de referencia:** `main` sobre `v2-rc4`
**Sprint de consolidación:** 2.0D.0 — Consolidación Operacional V2
**Runtime:** congelado durante este sprint

---

## 0. Declaración de autoridad normativa

Este documento constituye la referencia normativa vigente del Modelo Documental V2.

Ante contradicciones con documentos históricos, reportes de sprint, prompts, conversaciones o documentación anterior, prevalece este documento.

Las modificaciones futuras requieren decisión funcional formal, actualización de esta referencia y trazabilidad del cambio.

Este documento describe reglas vigentes, reglas implementadas, reglas pendientes y reglas prohibidas. No reemplaza el historial de sprints; lo consolida normativamente.

---

## 1. Niveles de autoridad de reglas

Toda regla documentada debe clasificarse con uno de los siguientes niveles:

| Nivel | Significado | Uso |
| ----: | ----------- | --- |
| A | Implementado y validado en runtime | Puede considerarse operativo. |
| B | Implementado, pendiente de validación funcional | Existe en código, pero no debe tratarse como regla operativa validada. |
| C | Aprobado arquitectónicamente, pendiente de implementación | Puede diseñarse, pero no programarse sin sprint autorizado. |
| D | Idea futura / roadmap | No debe usarse como base funcional ni técnica. |

Una regla no es Nivel A solo porque aparece en código. Para ser Nivel A debe estar implementada, probada y validada funcionalmente o por smoke runtime.

---

## 2. Principios fundamentales del Modelo Documental V2

| Principio | Nivel | Descripción |
| --------- | ----: | ----------- |
| El Workspace representa el dominio, no es la fuente del dominio. | A | El Workspace expone una vista normalizada del modelo documental. No decide reglas de negocio. |
| Backend gobierna las reglas de negocio. | A | Validaciones, cardinalidades, idempotencia, autorización y auditoría pertenecen al backend. |
| API Gateway es el único contrato consumido por clientes. | A | React/Web Admin no consume servicios internos directamente. |
| Toda operación debe ser idempotente cuando aplique. | A | Las operaciones ya implementadas responden con bandera `idempotente` cuando corresponde. |
| La auditoría nace del contexto autenticado. | A | Usuario, empresa, workspace y contexto no vienen del payload React. |
| V1 es compatibilidad; V2 es autoridad operativa. | A | V1 se consulta mediante adaptadores; V2 gobierna operaciones persistidas nuevas. |
| React no ejecuta inferencias funcionales. | A | React no infiere principal, tipoRelacion, permisos ni resúmenes. |
| Las relaciones documentales son explícitas, no deducidas. | A | Los documentos se asocian mediante relaciones persistidas o contratos backend. |
| Los estados técnicos no son necesariamente etiquetas visuales. | A | Estado persistente, estado derivado y label UX deben mantenerse separados. |

---

## 3. Tabla de madurez del modelo

| Componente / capacidad | Estado | Nivel | RC / Sprint | Observación |
| ---------------------- | ------ | ----: | ----------- | ----------- |
| Contexto Operativo | Operativo | A | Introducido: v2-foundation; validado en Workspace: v2-rc1 | Base del Workspace V2. |
| Workspace Documental V2 de consulta | Operativo | A | v2-rc1 | Vista consolidada para expediente V1 adaptado a V2. |
| Documento Operativo Principal | Operativo | A | v2-rc2 / Sprint 2.0A | Asociación operativa validada. |
| Grupo de Factura | Operativo | A | v2-rc3 / Sprint 2.0B | Creación desde factura existente validada. |
| Documentos del Grupo de Factura | Operativo | A | v2-rc4 / Sprint 2.0C | Guía, Nota de ingreso, Transferencia y Detracción validadas. |
| Auditoría `ASOCIAR_DOCUMENTO_PRINCIPAL` | Implementada, pendiente de validación metadata runtime exacta | B | v2-rc2 / Sprint 2.0A | Nombre exacto encontrado en código; falta confirmar metadata runtime. |
| Auditoría `GRUPO_FACTURA_CREADO` | Operativa | A | v2-rc3 / Sprint 2.0B | Validada en metadata/runtime. |
| Auditoría `DOCUMENTO_GRUPO_FACTURA_ASOCIADO` | Operativa | A | v2-rc4 / Sprint 2.0C | Validada en metadata/runtime. |
| Timeline Documental visual | Roadmap | D | — | No existe implementación visual vigente. |
| Auditoría Visual | Roadmap | D | — | No existe UI vigente. |
| Reemplazo de Documento Principal | Pendiente | C | — | Reconocido como necesidad futura; no autorizado para implementación hasta sprint específico. |
| Mover documentos entre grupos | Pendiente | C | — | Operación expresamente no autorizada actualmente. |
| Eliminar asociaciones | Pendiente | C | — | No implementado ni autorizado en UI. |
| OCR integrado al flujo V2 operativo | Roadmap | D | — | Fuera del alcance actual del Modelo Documental V2 operativo. |
| Alertas automáticas | Roadmap | D | — | No implementadas dentro de operaciones V2. |
| Caja Chica / Rendiciones sobre motor documental | Arquitectura futura | C | — | No usa Grupo de Factura como jerarquía principal. |

---

## 4. Jerarquía oficial de Compras

La jerarquía oficial vigente para Compras es:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Factura fundadora
          -> Documentos asociados
```

Nivel: **A** para la jerarquía operativa implementada hasta `v2-rc4`.

### 4.1 Documento Operativo Principal

El Documento Operativo Principal representa el documento de apertura o control operativo del contexto, por ejemplo una Orden de Compra.

Reglas vigentes:

| Regla | Nivel | Observación |
| ----- | ----: | ----------- |
| Puede asociarse un Documento Operativo Principal existente. | A | Validado en Sprint 2.0A. |
| React no determina principalidad por nombre, tipo o metadata. | A | Usa información normalizada por Gateway/Workspace. |
| No se documenta aún unicidad de un solo principal activo por contexto como regla absoluta si el modelo físico no la impone. | C | Debe verificarse funcionalmente antes de elevar a Nivel A. |
| Reemplazar principal no está autorizado actualmente. | C | Operación pendiente de sprint específico. |
| Desasociar principal no está autorizado actualmente. | C | Operación pendiente de sprint específico. |

La Factura no es Documento Operativo Principal formal.

### 4.2 Grupo de Factura

Un Grupo de Factura es una unidad documental operativa asociada a un Documento Operativo Principal.

Reglas vigentes:

| Regla | Nivel | Observación |
| ----- | ----: | ----------- |
| Un Grupo de Factura V2 persistido nace con una Factura fundadora obligatoria. | A | Validado en Sprint 2.0B. |
| Una Factura fundadora solo puede fundar un Grupo de Factura persistido según el constraint físico global vigente sobre `factura_documento_id`. | A | Validado en runtime 2.0B; no describir como constraint por estado activo salvo nueva migración/verificación. |
| Un Grupo de Factura persistido puede recibir documentos asociados permitidos. | A | Validado en Sprint 2.0C. |
| Grupos adaptados desde V1 son de consulta. | A | No admiten operaciones V2. |
| Anular o reabrir grupos desde UI no está autorizado actualmente. | C | No implementado. |
| Eliminar Grupo Factura no está autorizado actualmente. | C | No implementado. |

### 4.3 Documentos asociados al Grupo de Factura

Tipos documentales y relaciones autorizadas hasta `v2-rc4`:

| Tipo documental | Tipo relación | Nivel | Desde | Observación |
| --------------- | ------------- | ----: | ----- | ----------- |
| `GUIA_REMISION` | `adjunto_guia` | A | v2-rc4 | Validado en Sprint 2.0C. |
| `NOTA_INGRESO` | `adjunto_nota_ingreso` | A | v2-rc4 | Validado en Sprint 2.0C. |
| `TRANSFERENCIA` | `adjunto_transferencia` | A | v2-rc4 | Validado en Sprint 2.0C. |
| `DETRACCION` | `adjunto_detraccion` | A | v2-rc4 | Validado en Sprint 2.0C. |

Reglas vigentes:

| Regla | Nivel | Observación |
| ----- | ----: | ----------- |
| Un documento asociado activo solo puede pertenecer a un Grupo de Factura V2. | A | Validado en Sprint 2.0C. |
| La misma terna `grupoFacturaId + documentoId + tipoRelacion` es idempotente. | A | Validado en runtime. |
| Mismo documento y mismo grupo con otra relación responde conflicto. | A | Validado en runtime. |
| Mismo documento en otro grupo activo responde conflicto. | B | Implementado por regla backend/constraint; pendiente smoke runtime específico antes de elevar a Nivel A. |
| React no infiere `tipoRelacion`. | A | Usa `candidato.tipoRelacion` entregado por Gateway. |
| Cambiar `tipoRelacion` no está autorizado actualmente. | C | No implementado. |
| Mover documentos entre grupos no está autorizado actualmente. | C | No implementado. |

---

## 5. Diferencia con Caja Chica y Rendiciones

Caja Chica y Rendiciones no usan Grupo de Factura como unidad principal.

Jerarquía funcional prevista:

```text
Requerimiento de Fondo
  -> Transferencia opcional o pendiente de regularización
  -> Rendición
      -> múltiples sustentos documentales
```

Nivel: **C** para diseño arquitectónico pendiente de implementación funcional completa.

Reglas:

| Regla | Nivel | Observación |
| ----- | ----: | ----------- |
| Una rendición puede contener muchas facturas, boletas, recibos y documentos repetidos por tipo. | C | Aprobado arquitectónicamente. |
| Caja Chica y Rendiciones tendrán tablas de negocio propias. | C | Compartirán el motor `documentos`. |
| No debe adaptarse Caja Chica a la jerarquía de Grupo de Factura. | C | Decisión funcional vigente. |

---

## 6. Cardinalidades vigentes

| Cardinalidad | Nivel | Observación |
| ------------ | ----: | ----------- |
| Un Contexto Operativo puede tener varios Documentos Operativos Principales. | C | No imponer unicidad si el modelo físico no la impone. |
| Un Documento Operativo Principal puede tener varios Grupos de Factura. | A | Compatible con Sprint 2.0B y 2.0C. |
| Un Grupo de Factura nace con una Factura fundadora obligatoria. | A | Validado en v2-rc3. |
| Una Factura solo puede fundar un Grupo de Factura persistido según el constraint físico global vigente sobre `factura_documento_id`. | A | Validado en v2-rc3. |
| Un documento asociado activo solo puede pertenecer a un Grupo de Factura V2. | A | Validado en v2-rc4. |
| Un Grupo adaptado desde V1 no admite operaciones V2. | A | Regla de UI y backend/Gateway. |

---

## 7. Operaciones implementadas hasta v2-rc4

| Operación | Nivel | Desde | Contrato / comportamiento |
| --------- | ----: | ----- | ------------------------- |
| Consultar Workspace V2 consolidado | A | v2-rc1 | `GET /api/v1/documental-v2/workspace/expedientes-v1/:id`. |
| Asociar Documento Operativo Principal | A | v2-rc2 | Operación de escritura vía Gateway. |
| Crear Grupo de Factura desde Factura existente | A | v2-rc3 | Factura fundadora obligatoria. |
| Asociar Guía al Grupo de Factura | A | v2-rc4 | `GUIA_REMISION -> adjunto_guia`. |
| Asociar Nota de ingreso al Grupo de Factura | A | v2-rc4 | `NOTA_INGRESO -> adjunto_nota_ingreso`. |
| Asociar Transferencia al Grupo de Factura | A | v2-rc4 | `TRANSFERENCIA -> adjunto_transferencia`. |
| Asociar Detracción al Grupo de Factura | A | v2-rc4 | `DETRACCION -> adjunto_detraccion`. |

---

## 8. Operaciones no autorizadas actualmente

Las siguientes operaciones están prohibidas actualmente, aunque puedan existir como roadmap o diseño futuro:

| Operación | Nivel | Estado |
| --------- | ----: | ------ |
| Reemplazar Documento Operativo Principal | C | Aprobado como necesidad futura, sin implementación autorizada. |
| Desasociar Documento Operativo Principal | C | Pendiente de diseño y autorización. |
| Eliminar Grupo Factura | C | Pendiente de diseño y autorización. |
| Anular o reabrir Grupo Factura desde UI | C | Pendiente de diseño y autorización. |
| Mover documentos entre grupos | C | Pendiente de diseño y autorización. |
| Cambiar `tipoRelacion` | C | No autorizado. |
| Eliminar asociaciones de documentos | C | Pendiente de diseño. |
| Asociar documentos a grupos V1 adaptados | A como prohibición | Los grupos V1 adaptados son de consulta. |
| `NOTA_CREDITO` y `NOTA_DEBITO` | C | Pendiente definir tratamiento funcional y relación oficial. |
| Tipo `OTRO` | C | Pendiente definir clasificación y presentación. |
| Alertas automáticas | D | Roadmap. |
| Timeline visual | D | Roadmap. |
| Auditoría visual | D | Roadmap. |
| NATS para operaciones V2 | D | Roadmap / fuera de alcance actual. |
| OCR integrado al flujo V2 operativo | D | Roadmap. |
| React consumiendo `ms-documentos` directamente | A como prohibición | Prohibido por arquitectura. |

---

## 9. Regla V1/V2

Principio vigente:

```text
El histórico se consulta.
El Modelo V2 gobierna.
```

Reglas:

| Regla | Nivel | Observación |
| ----- | ----: | ----------- |
| Los adaptadores V1 son de lectura. | A | No crean relaciones V2. |
| Los adaptadores V1 no reciben nuevas reglas de negocio. | A | Conservan compatibilidad. |
| Las entidades V2 persistidas son autoridad operativa. | A | Requieren `persistido.id` para acciones. |
| Si un documento aparece por V1 y V2 persistido, la vista debe evitar duplicidad visual. | A | Validado en Workspace posterior 2.0C. |
| La UI no debe mostrar etiquetas técnicas `legacy`, `adapter`, `persistido`, `no_persistido`. | A | La diferencia se usa internamente para habilitar o bloquear acciones. |

---

## 10. Reglas frontend / Workspace

| Regla | Nivel | Observación |
| ----- | ----: | ----------- |
| React consume únicamente API Gateway. | A | No consume `ms-documentos` directamente. |
| React no lee metadata OCR como fuente visual. | A | Usa campos normalizados `vista`. |
| React no inventa IDs. | A | Usa IDs entregados por Gateway/Workspace. |
| React no calcula resúmenes. | A | Los totales vienen desde backend. |
| React no determina autorizaciones. | A | Solo refleja capacidades entregadas por contrato. |
| React no infiere `tipoRelacion`. | A | Usa `candidato.tipoRelacion`. |
| React utiliza campos normalizados `vista`. | A | `grupoFactura.documentos[].vista` para documentos asociados. |
| Solo entidades con `persistido.id` muestran acciones operativas. | A | Grupos V1 adaptados permanecen en consulta. |
| React no reconstruye Workspace optimistamente. | A | Refresca por endpoint oficial cuando corresponde. |
| Estados vacíos deben ser funcionales, no errores falsos. | A | Ejemplo: grupo sin documentos muestra empty state. |

---

## 11. Backend y Gateway

| Regla | Nivel | Observación |
| ----- | ----: | ----------- |
| Gateway es el único contrato para clientes. | A | Web Admin consume rutas `/api/v1/documental-v2/...`. |
| Backend valida reglas de negocio. | A | React no valida compatibilidad funcional. |
| Backend valida workspace/empresa/contexto. | A | Contexto autenticado propagado por Gateway. |
| Payload React no incluye identidad ni auditoría. | A | Identidad proviene del token/contexto. |
| Las respuestas de escritura incluyen `idempotente` y `workspaceDebeRefrescar` cuando aplica. | A | Validado 2.0A, 2.0B, 2.0C. |
| Los errores funcionales pueden venir anidados. | A | Frontend debe usar extractor profundo. |

---

## 12. Auditoría vigente

Operaciones documentadas hasta `v2-rc4`:

| Operación de auditoría | Nivel | Observación |
| ---------------------- | ----: | ----------- |
| `ASOCIAR_DOCUMENTO_PRINCIPAL` | B | Nombre exacto encontrado en código; pendiente confirmar metadata runtime exacta antes de elevar a Nivel A. |
| `GRUPO_FACTURA_CREADO` | A | Validado en metadata/runtime 2.0B. |
| `DOCUMENTO_GRUPO_FACTURA_ASOCIADO` | A | Validado en metadata/runtime 2.0C. |

> Nota obligatoria: antes del cierre final de 2.0D.0, Maestro Sucesor I debe confirmar nombres exactos usados en código y documentación. No deben normalizarse valores de auditoría desde memoria o conversación.

Reglas de auditoría:

| Regla | Nivel | Observación |
| ----- | ----: | ----------- |
| La identidad se obtiene desde token/contexto autenticado. | A | No desde payload React. |
| `workspaceId`, empresa y cliente destino provienen del contexto autenticado. | A | No desde frontend. |
| `GRUPO_FACTURA_CREADO` registra auditoría backend desde contexto autenticado. | A | Validado en metadata/runtime 2.0B. |
| `DOCUMENTO_GRUPO_FACTURA_ASOCIADO` registra auditoría backend desde contexto autenticado. | A | Validado en metadata/runtime 2.0C. |
| `ASOCIAR_DOCUMENTO_PRINCIPAL` registra metadata/auditoría de asociación principal. | B | Nombre exacto en código identificado; falta confirmar evidencia runtime de metadata exacta. |
| La idempotencia no debe duplicar auditoría funcional de creación. | B | Regla aprobada y observada en contrato; confirmar detalle por operación antes de declarar global Nivel A. |
| Auditoría visual no está implementada. | D | Roadmap. |

---

## 13. Estados: persistentes, derivados y visuales

No se deben mezclar estados persistentes, estados derivados backend y etiquetas visuales UX.

Los estados del motor general de documentos/OCR no se declaran automáticamente como estados propios del Modelo Documental V2 operativo. Estados como `pendiente_validacion`, `pendiente_ocr` o `confirmado_como_version`, si existen en otros módulos, deben documentarse en su propio contexto y no como estados de Grupo de Factura, Documento Operativo Principal o asociación V2 sin verificación específica.

### 13.1 Estados persistentes

Solo deben documentarse como persistentes los valores existentes en código o base de datos.

Estados persistentes propios de entidades operativas V2 observados hasta `v2-rc4`:

| Estado | Nivel | Uso observado |
| ------ | ----: | ------------- |
| `activo` | A | Entidades operativas persistidas. |
| `pendiente_revision` | A | Grupo de Factura / revisión. |
| `anulado` | B | Mencionado como regla; confirmar uso físico por entidad. |

### 13.1.1 Estados del documento base compartido

Estos estados pertenecen al motor documental/base compartida y no se declaran automáticamente como estados propios de todas las entidades operativas V2.

| Estado | Nivel | Uso observado |
| ------ | ----: | ------------- |
| `confirmado` | B | Estado observado en documentos del motor documental; no se declara como estado propio de todas las entidades operativas V2. |

### 13.2 Estados derivados backend

Ejemplos de estados derivados o condiciones calculadas:

| Estado derivado | Nivel | Observación |
| --------------- | ----: | ----------- |
| Sin documento operativo principal | A | Advertencia/condición detectada en Workspace. |
| Sin facturas asociadas | B | Condición posible; confirmar implementación visual actual. |
| Con múltiples facturas | B | Condición posible; confirmar implementación visual actual. |

### 13.3 Etiquetas visuales UX

Ejemplos de labels visibles:

| Etiqueta UX | Nivel | Observación |
| ----------- | ----: | ----------- |
| Pendiente de revisión | A | Label visible de grupo/documento. |
| Sin documentos asociados todavía | A | Empty state de documentos del grupo. |
| Operación controlada | A | Label visual del Workspace V2. |
| Pendiente de documento operativo | B | Confirmar uso real antes de elevar a A. |

---

## 14. Timeline Documental

Estado: **Roadmap, Nivel D**.

El Timeline Documental no existe todavía como funcionalidad visual implementada.

Fuentes candidatas futuras:

- auditoría existente;
- eventos documentales;
- operaciones V2;
- una proyección combinada.

Decisión pendiente:

```text
No está definido si el Timeline se construirá desde auditoría,
documento_eventos o una proyección combinada.
```

No debe declararse una fuente definitiva hasta validar el modelo real y abrir sprint específico.

---

## 15. Permisos operativos

Los permisos deben separarse en tres categorías:

| Categoría | Nivel | Descripción |
| --------- | ----: | ----------- |
| Implementados y validados | A | Permisos realmente comprobados en runtime. |
| Propuestos | C | Diseño aprobado pero sin validación runtime. |
| Pendientes de decisión | D | Ideas o necesidades futuras. |

Reglas vigentes:

| Regla | Nivel | Observación |
| ----- | ----: | ----------- |
| Las operaciones V2 hasta `v2-rc4` fueron validadas con el perfil `admin` del workspace de pruebas. | A | No existe todavía una matriz completa validada para Compras, Almacén, Finanzas y Contabilidad. |
| Compras, Almacén, Finanzas y Contabilidad tendrán permisos diferenciados. | C | No presentar como ya operativo sin validación. |
| Permisos avanzados no están implementados como política completa para todas las operaciones V2. | D | Roadmap. |

---

## 16. Decisiones Arquitectónicas — ADR resumidas

### ADR-001 — Gateway como único contrato para clientes

| Campo | Valor |
| ----- | ----- |
| Estado | Aprobado |
| Nivel | A |
| Decisión | Los clientes consumen API Gateway, no microservicios internos. |
| Motivo | Centralizar seguridad, contratos y contexto autenticado. |
| Consecuencia | React/Web Admin no consume `ms-documentos` directamente. |
| Fuente comprobada | Sprints 2.0A, 2.0B, 2.0C; rutas `/api/v1/documental-v2/...`. |

### ADR-002 — React no ejecuta reglas de negocio

| Campo | Valor |
| ----- | ----- |
| Estado | Aprobado |
| Nivel | A |
| Decisión | React solo representa y orquesta interacción con Gateway. |
| Motivo | Evitar reglas duplicadas e inconsistentes. |
| Consecuencia | React no calcula resumen, no infiere principal ni tipoRelacion. |
| Fuente comprobada | Implementación Web Admin hasta v2-rc4. |

### ADR-003 — V1 adaptado es solo lectura

| Campo | Valor |
| ----- | ----- |
| Estado | Aprobado |
| Nivel | A |
| Decisión | Datos V1 adaptados se consultan, pero no reciben operaciones V2. |
| Motivo | Proteger histórico y evitar mutaciones sobre compatibilidad. |
| Consecuencia | Grupos `no_persistido` no muestran acciones operativas. |
| Fuente comprobada | Workspace V2 y validación visual 2.0B/2.0C. |

### ADR-004 — Solo entidades V2 persistidas admiten operación

| Campo | Valor |
| ----- | ----- |
| Estado | Aprobado |
| Nivel | A |
| Decisión | Solo entidades con `persistido.id` pueden operar. |
| Motivo | Las operaciones requieren identidad persistente V2. |
| Consecuencia | React muestra acciones solo cuando existe `persistido.id`. |
| Fuente comprobada | Sprint 2.0B y 2.0C. |

### ADR-005 — Auditoría obtenida del contexto autenticado

| Campo | Valor |
| ----- | ----- |
| Estado | Aprobado |
| Nivel | A |
| Decisión | Auditoría usa token, workspace, empresa y request context. |
| Motivo | Evitar manipulación desde frontend. |
| Consecuencia | Payload React no incluye usuario, empresa, workspace ni auditoría. |
| Fuente comprobada | Metadata/auditoría backend 2.0B y 2.0C. |

### ADR-006 — Relaciones documentales explícitas, no inferidas

| Campo | Valor |
| ----- | ----- |
| Estado | Aprobado |
| Nivel | A |
| Decisión | Las relaciones se crean mediante operaciones explícitas. |
| Motivo | Evitar deducciones por nombre, tipo o OCR. |
| Consecuencia | React usa `candidato.tipoRelacion`; backend valida compatibilidad. |
| Fuente comprobada | Sprint 2.0C. |

### ADR-007 — Factura funda Grupo de Factura, pero no es principal formal

| Campo | Valor |
| ----- | ----- |
| Estado | Aprobado |
| Nivel | A |
| Decisión | La Factura es fundadora del Grupo de Factura, no Documento Operativo Principal. |
| Motivo | Separar documento de apertura operativa de documento tributario. |
| Consecuencia | OC/OS/Requerimiento pueden abrir operación; Factura abre grupo. |
| Fuente comprobada | Sprint 2.0A y 2.0B. |

### ADR-008 — Caja Chica/Rendición no usa Grupo de Factura

| Campo | Valor |
| ----- | ----- |
| Estado | Aprobado |
| Nivel | C |
| Decisión | Caja Chica/Rendición tendrá jerarquía propia y compartirá motor documental. |
| Motivo | Una rendición contiene múltiples sustentos, no una jerarquía centrada en factura. |
| Consecuencia | No adaptar Caja Chica a Grupo de Factura. |
| Fuente comprobada | Decisión funcional Maestro Intermedio; pendiente implementación específica. |

---

## 17. Matriz de verificación inicial

| Regla | Fuente comprobada | Nivel | Observación |
| ----- | ----------------- | ----: | ----------- |
| Contexto Operativo persistido | Workspace + runtime v2-rc1/v2-rc4 | A | Base del modelo. |
| Documento Operativo Principal | service + Gateway + runtime 2.0A | A | Operativo desde v2-rc2. |
| Grupo de Factura persistido | migración + service + runtime 2.0B | A | Operativo desde v2-rc3. |
| Asociación de documentos al grupo | service + Gateway + Workspace 2.0C | A | Operativo desde v2-rc4. |
| Auditoría `ASOCIAR_DOCUMENTO_PRINCIPAL` | código / contrato 2.0A | B | Nombre exacto identificado; pendiente confirmar metadata runtime exacta. |
| Auditoría `GRUPO_FACTURA_CREADO` | runtime Workspace/metadata 2.0B | A | Operativo desde v2-rc3. |
| Auditoría `DOCUMENTO_GRUPO_FACTURA_ASOCIADO` | runtime Workspace/metadata 2.0C | A | Operativo desde v2-rc4. |
| Grupos V1 adaptados solo consulta | Workspace + UI 2.0B/2.0C | A | No muestran acciones. |
| React consume solo Gateway | Web Admin + servicios frontend | A | No consumir `ms-documentos`. |
| React usa `vista` como fuente visual | Workspace V2 + UI 2.0C | A | No usar metadata OCR. |
| Timeline visual | No existe en runtime | D | Roadmap. |
| Auditoría Visual | No existe en runtime | D | Roadmap. |
| Reemplazo de principal | No existe runtime | C | Reconocido como necesidad futura; no autorizado para implementación. |
| Caja Chica/Rendición con jerarquía propia | Decisión funcional | C | Pendiente implementación. |
| Permisos avanzados por rol | Parcial/no consolidado | D | No presentar como operativo. |

---

## 18. Contradicciones históricas conocidas

No se debe reescribir masivamente documentación histórica. La estrategia vigente es:

```text
Los documentos históricos conservan valor como evidencia del sprint.
Para reglas vigentes, consultar este documento oficial.
```

Cuando sea necesario, agregar nota visible en documentos antiguos:

```text
Documento histórico. Para reglas vigentes consultar:
docs/00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md
```

Términos que requieren revisión en documentación histórica:

| Patrón | Riesgo |
| ------ | ----- |
| `Factura.*principal` | Puede contradecir la regla: Factura no es principal formal. |
| `PAGO_TRANSFERENCIA` | Tipo funcional no usado en catálogo físico 2.0C. |
| `PAGO_DETRACCION` | Tipo funcional no usado en catálogo físico 2.0C. |
| `un solo principal` | No imponer si el modelo físico no lo garantiza. |
| `solo lectura` | Debe distinguir entre runtime congelado, Workspace consulta y operación controlada. |

---

## 19. Criterio de modificación futura

Toda modificación futura al Modelo Documental V2 debe cumplir:

1. decisión funcional formal;
2. actualización de este documento oficial;
3. identificación de nivel de autoridad;
4. contrato Gateway/backend cuando aplique;
5. validación runtime antes de declarar Nivel A;
6. evidencia Git y documentación de sprint.
