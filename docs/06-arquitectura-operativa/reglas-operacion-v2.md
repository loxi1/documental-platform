# Reglas de Operación V2

**Documento auxiliar:** `docs/06-arquitectura-operativa/reglas-operacion-v2.md`
**Fuente normativa:** [`MODELO_DOCUMENTAL_V2_OFICIAL.md`](../00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md)
**Sprint:** 2.0D.0 — Consolidación Operacional V2
**Estado:** reglas operativas comprobadas y restricciones vigentes
**Runtime:** congelado

---

## 1. Propósito

Este documento desarrolla reglas operativas comprobadas hasta `v2-rc4`.

No redefine la jerarquía oficial ni las cardinalidades vigentes. Para esas reglas consultar:

```text
docs/00-arquitectura/MODELO_DOCUMENTAL_V2_OFICIAL.md
```

---

## 2. Operaciones existentes hasta v2-rc4

| Operación | Estado | Nivel | Observación |
| --------- | ------ | ----: | ----------- |
| Consultar Workspace V2 consolidado | Implementado | A | Vía API Gateway. |
| Asociar Documento Operativo Principal | Implementado | A | Operación validada en Sprint 2.0A. |
| Crear Grupo de Factura desde Factura existente | Implementado | A | Operación validada en Sprint 2.0B. |
| Asociar Guía al Grupo de Factura | Implementado | A | Operación validada en Sprint 2.0C. |
| Asociar Nota de ingreso al Grupo de Factura | Implementado | A | Operación validada en Sprint 2.0C. |
| Asociar Transferencia al Grupo de Factura | Implementado | A | Operación validada en Sprint 2.0C. |
| Asociar Detracción al Grupo de Factura | Implementado | A | Operación validada en Sprint 2.0C. |


## 2.1 Fichas operativas transversales

Esta matriz no redefine reglas normativas. Resume, para mantenimiento operativo, las operaciones documentadas en `MODELO_DOCUMENTAL_V2_OFICIAL.md` y sus condiciones mínimas de ejecución.

| Operación | Entidad sobre la que opera | Precondiciones | Resultado esperado | Restricciones | Nivel | Referencia normativa |
| --------- | -------------------------- | -------------- | ------------------ | ------------- | ----: | -------------------- |
| Consultar Workspace V2 consolidado | Workspace Documental V2 de un expediente V1 adaptado | Usuario autenticado con workspace válido; expediente consultable dentro del alcance autorizado. | Vista normalizada con `contenedorOperativo`, `documentosOperativosPrincipales`, `gruposFactura`, documentos asociados y resumen backend. | Solo lectura; React no reconstruye Workspace ni calcula reglas de negocio. | A | `MODELO_DOCUMENTAL_V2_OFICIAL.md`, secciones 2, 7, 9, 10 y 11. |
| Asociar Documento Operativo Principal | `documentos.documentos_operativos_principales` | Contexto operativo V2 existente y activo; documento existente y autorizado; tipo principal permitido; contexto autenticado desde Gateway. | Documento existente queda asociado como Documento Operativo Principal V2; respuesta indica idempotencia cuando aplica. | No reemplaza ni desasocia principal; React no decide principalidad; auditoría de principal mantiene nombre `ASOCIAR_DOCUMENTO_PRINCIPAL` en Nivel B para metadata runtime exacta. | A | `MODELO_DOCUMENTAL_V2_OFICIAL.md`, secciones 4.1, 7, 11 y 12. |
| Crear Grupo de Factura desde Factura existente | `documentos.grupos_factura` | Documento Operativo Principal V2 persistido y activo; factura existente, autorizada y no asociada a otro grupo según constraint físico vigente; contexto autenticado desde Gateway. | Grupo de Factura V2 persistido con factura fundadora obligatoria y estado inicial `pendiente_revision`. | Factura no es principal formal; no se crean documentos secundarios en esta operación; no se anula ni reabre grupo desde UI. | A | `MODELO_DOCUMENTAL_V2_OFICIAL.md`, secciones 4.2, 6, 7, 8 y 12. |
| Asociar Guía al Grupo de Factura | `documentos.grupo_factura_documentos` | Grupo de Factura V2 persistido y activo; documento `GUIA_REMISION` existente, autorizado y no asociado activamente a otro grupo; `tipoRelacion` recibido desde Gateway como `adjunto_guia`. | Documento queda asociado al grupo como `adjunto_guia`; Workspace se refresca cuando `workspaceDebeRefrescar=true`. | No permite grupos V1 adaptados; no permite inferir `tipoRelacion` en React; no mueve documentos silenciosamente. | A | `MODELO_DOCUMENTAL_V2_OFICIAL.md`, secciones 4.3, 7, 8, 10 y 11. |
| Asociar Nota de ingreso al Grupo de Factura | `documentos.grupo_factura_documentos` | Grupo de Factura V2 persistido y activo; documento `NOTA_INGRESO` existente, autorizado y no asociado activamente a otro grupo; `tipoRelacion` recibido desde Gateway como `adjunto_nota_ingreso`. | Documento queda asociado al grupo como `adjunto_nota_ingreso`; Workspace se refresca cuando `workspaceDebeRefrescar=true`. | No permite grupos V1 adaptados; no permite inferir `tipoRelacion` en React; no cambia relación de documentos ya asociados. | A | `MODELO_DOCUMENTAL_V2_OFICIAL.md`, secciones 4.3, 7, 8, 10 y 11. |
| Asociar Transferencia al Grupo de Factura | `documentos.grupo_factura_documentos` | Grupo de Factura V2 persistido y activo; documento `TRANSFERENCIA` existente, autorizado y no asociado activamente a otro grupo; `tipoRelacion` recibido desde Gateway como `adjunto_transferencia`. | Documento queda asociado al grupo como `adjunto_transferencia`; Workspace se refresca cuando `workspaceDebeRefrescar=true`. | No representa Caja Chica/Rendición; no debe confundirse con transferencia de Requerimiento de Fondo; no permite inferencia en React. | A | `MODELO_DOCUMENTAL_V2_OFICIAL.md`, secciones 4.3, 5, 7, 8, 10 y 11. |
| Asociar Detracción al Grupo de Factura | `documentos.grupo_factura_documentos` | Grupo de Factura V2 persistido y activo; documento `DETRACCION` existente, autorizado y no asociado activamente a otro grupo; `tipoRelacion` recibido desde Gateway como `adjunto_detraccion`. | Documento queda asociado al grupo como `adjunto_detraccion`; Workspace se refresca cuando `workspaceDebeRefrescar=true`. | No usar `PAGO_DETRACCION` como tipo operativo implementado 2.0C; no permite inferencia en React; no mueve documentos silenciosamente. | A | `MODELO_DOCUMENTAL_V2_OFICIAL.md`, secciones 4.3, 7, 8, 10 y 11. |

Reglas transversales de la matriz:

- ocultar o mostrar un botón en React no equivale a autorización real;
- la autorización real pertenece al backend/Gateway;
- el frontend solo refleja capacidades autorizadas por contrato;
- los grupos V1 adaptados permanecen en consulta;
- las operaciones se ejecutan únicamente sobre entidades V2 persistidas;
- los términos técnicos `persistido`, `no_persistido`, `legacy` y `adapter` pueden usarse en documentación técnica, pero no como etiquetas visibles para el usuario final;
- los estados vacíos son representación UX y no estados persistentes;
- ninguna operación futura debe declararse Nivel A sin implementación, prueba y validación runtime.

---

## 2.2 Revisión UX/Workspace de la matriz operativa

La matriz anterior fue revisada desde Workspace/React/UX con los siguientes criterios:

| Criterio | Resultado | Observación |
| -------- | --------- | ----------- |
| No atribuir reglas de negocio a React. | Conforme | React solo consume Gateway y refleja capacidades. |
| No confundir ocultar botones con autorización. | Conforme | La autorización real pertenece a backend/Gateway. |
| No permitir operaciones sobre grupos V1 adaptados. | Conforme | La matriz exige entidades V2 persistidas para operar. |
| No presentar Timeline Visual, Auditoría Visual ni permisos avanzados como implementados. | Conforme | Permanecen fuera de esta matriz operativa. |
| No usar empty states como estados persistentes. | Conforme | Los estados vacíos son representación UX. |
| No exponer términos técnicos como etiquetas de usuario final. | Conforme | `persistido`, `no_persistido`, `legacy` y `adapter` son términos técnicos internos. |
| Mantener campos `vista` como fuente visual normalizada. | Conforme | La presentación UI debe basarse en datos normalizados del Workspace/Gateway. |
| No duplicar jerarquía, cardinalidades o invariantes. | Conforme | La matriz referencia el documento oficial sin redefinirlo. |

---

## 3. Autorización y contexto

Reglas vigentes:

| Regla | Estado | Nivel |
| ----- | ------ | ----: |
| Las operaciones se ejecutan vía API Gateway. | Implementado | A |
| El backend valida reglas de negocio y contexto. | Implementado | A |
| React no envía usuario, empresa, workspace, cliente destino ni auditoría. | Implementado | A |
| El contexto autenticado provee identidad y alcance operacional. | Implementado | A |
| La matriz completa de permisos por rol no está consolidada. | Roadmap / pendiente | D |

---

## 4. Idempotencia

| Regla | Estado | Nivel | Observación |
| ----- | ------ | ----: | ----------- |
| La asociación de Documento Operativo Principal es idempotente cuando aplica. | Implementado | A | Validada en Sprint 2.0A. |
| La creación de Grupo de Factura es idempotente por documento principal y factura fundadora. | Implementado | A | Validada en Sprint 2.0B. |
| La asociación de documento al grupo es idempotente por `grupoFacturaId + documentoId + tipoRelacion`. | Implementado | A | Validada en Sprint 2.0C. |
| La idempotencia no debe duplicar auditoría funcional de creación. | Implementado / pendiente de detalle global | B | No declarar global Nivel A sin verificación por operación. |

---

## 5. Persistencia operativa

| Regla | Estado | Nivel |
| ----- | ------ | ----: |
| Solo entidades V2 persistidas admiten operaciones. | Implementado | A |
| Para acciones de Grupo de Factura se requiere `grupoFactura.persistido.id`. | Implementado | A |
| Los grupos adaptados desde V1 no admiten operaciones V2. | Implementado | A |
| React muestra o habilita controles visuales solo cuando existe identidad persistida entregada por el contrato; esto no reemplaza la autorización backend/Gateway. | Implementado | A |

---

## 6. Convivencia V1/V2

Principio:

```text
El histórico se consulta.
El Modelo V2 gobierna.
```

| Regla | Estado | Nivel |
| ----- | ------ | ----: |
| Los adaptadores V1 son de lectura. | Implementado | A |
| Los adaptadores V1 no crean relaciones V2. | Implementado | A |
| Las entidades V2 persistidas son autoridad operativa. | Implementado | A |
| Si un documento aparece por V1 y V2 persistido, V2 prevalece operacionalmente. | Implementado | A |
| La UI no muestra etiquetas técnicas `legacy`, `adapter`, `persistido` o `no_persistido` al usuario final. | Implementado | A |

---

## 7. Catálogo operativo vigente

Tipos y relaciones operativas hasta `v2-rc4`:

| Tipo documental | Relación | Estado | Nivel |
| --------------- | -------- | ------ | ----: |
| `GUIA_REMISION` | `adjunto_guia` | Implementado | A |
| `NOTA_INGRESO` | `adjunto_nota_ingreso` | Implementado | A |
| `TRANSFERENCIA` | `adjunto_transferencia` | Implementado | A |
| `DETRACCION` | `adjunto_detraccion` | Implementado | A |

No usar en 2.0C como tipos operativos implementados:

- `PAGO_TRANSFERENCIA`;
- `PAGO_DETRACCION`;
- `NOTA_CREDITO`;
- `NOTA_DEBITO`;
- `OTRO`.

---

## 8. Prohibiciones actuales

| Prohibición | Estado | Nivel |
| ----------- | ------ | ----: |
| Reemplazar Documento Operativo Principal. | Propuesto, no autorizado | C |
| Desasociar Documento Operativo Principal. | Pendiente | C |
| Eliminar Grupo Factura. | Pendiente | C |
| Anular o reabrir Grupo Factura desde UI. | Pendiente | C |
| Mover documentos entre grupos. | Propuesto, no autorizado | C |
| Cambiar `tipoRelacion`. | No autorizado | C |
| Eliminar asociaciones de documentos. | Pendiente | C |
| Asociar documentos a grupos V1 adaptados. | Prohibición implementada | A |
| React consumiendo `ms-documentos` directamente. | Prohibición arquitectónica | A |
| Timeline visual. | Roadmap | D |
| Auditoría Visual. | Roadmap | D |
| OCR integrado al flujo V2 operativo. | Roadmap | D |
| Alertas automáticas. | Roadmap | D |

---

## 9. Errores funcionales

Los errores funcionales pueden venir anidados por Gateway. La UI debe usar extractor profundo y mostrar mensajes funcionales, no mensajes técnicos crudos.

Este documento no congela la lista completa de códigos de error. Los nombres exactos deben comprobarse contra código y contratos antes de elevarlos al documento oficial.

---

## 10. Criterio para nuevas reglas

Una nueva regla operativa solo puede elevarse a Nivel A cuando exista:

1. implementación;
2. prueba o smoke funcional;
3. validación runtime;
4. evidencia documentada;
5. actualización del documento oficial.
