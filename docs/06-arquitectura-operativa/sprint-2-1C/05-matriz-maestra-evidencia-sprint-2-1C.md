# Matriz maestra de evidencia — Sprint 2.1C

**Proyecto:** Documental Platform ERP
**Sprint:** 2.1C — Carga Documental Segura MVP
**Estado:** ABIERTO
**Contrato técnico:** PENDIENTE
**Implementación:** NO AUTORIZADA
**Integración:** BLOQUEADA
**Push:** BLOQUEADO

## 1. Baseline de referencia

```text
Baseline oficial integrada:
main / origin/main
→ ffc6ca62

Sprint 2.1B:
VALIDADO Y CERRADO EN RAMAS DE TRABAJO
PENDIENTE DE INTEGRACIÓN A MAIN

Rama funcional de referencia obligatoria para revisar 2.1C:
feat/documental-v2-operacion-2-1B
→ 178cf9db

Rama documental 2.1B:
docs/sprint-2-1B-contrato-tecnico
PUBLICADA EN RAMA
PENDIENTE DE INTEGRACIÓN A MAIN

Rama documental de la evidencia:
docs/sprint-2-1C-contrato-carga-documental-segura

Commit desplegado durante la prueba:
no determinado

Commit de consolidación de evidencia:
be9f8fd0

Alcance del commit:
cierra únicamente EVID-2.1C-018 y EVID-2.1C-021
No cierra el Sprint 2.1C.

Estado del Sprint 2.1C:
ABIERTO
```

Sprint 2.1B no forma parte actualmente de la baseline oficial integrada.

La revisión técnica de Sprint 2.1C debe interpretarse como:

```text
main
+ delta validado de Sprint 2.1B
+ documentación vigente de Sprint 2.1C
```

## 2. Clasificaciones oficiales

```text
CONFIRMADO POR CÓDIGO
CONFIRMADO POR RUNTIME
CONFIRMADO POR SQL
DESCARTADO
NO REPRODUCIDO
BLOQUEADO POR ENTORNO
RIESGO CONFIRMADO POR CÓDIGO
RIESGO CONFIRMADO POR RUNTIME
DECISIÓN CONTRACTUAL PENDIENTE
FUERA DE ALCANCE
```

## 3. Matriz consolidada

| ID | Tema | Evidencia | Fuente | Resultado | Clasificación | Impacto | Bloquea contrato | Bloquea implementación | Próxima prueba | Entorno | Fecha | Commit/Rama | Actor | Request ID |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EVID-2.1C-001 | Carga guiada | La operación recibió el PDF y devolvió respuesta válida | Runtime HTTP | Flujo nominal ejecutado | CONFIRMADO POR RUNTIME | Alto | No | No | Duplicado secuencial | Producción controlada | 2026-07-16 | docs/sprint-2-1C-contrato-carga-documental-segura | Usuario Compras autorizado | Pendiente de consolidar |
| EVID-2.1C-002 | Documento lógico | Se creó una fila en `documentos.documentos` | SQL | Documento lógico creado | CONFIRMADO POR SQL | Alto | Sí | Sí | Revisar orden exacto del flujo | PostgreSQL | 2026-07-16 | Baseline 2.1C | Usuario Compras autorizado | Pendiente de consolidar |
| EVID-2.1C-003 | Archivo físico | Se creó una fila en `documentos.documentos_archivos` | SQL | Archivo físico registrado | CONFIRMADO POR SQL | Alto | No | No | Verificar duplicado secuencial | PostgreSQL | 2026-07-16 | Baseline 2.1C | Usuario Compras autorizado | Pendiente de consolidar |
| EVID-2.1C-004 | R2 operativo | La respuesta y persistencia indican almacenamiento con provider R2 | Runtime + SQL | Objeto almacenado y referencia persistida | CONFIRMADO POR RUNTIME | Alto | No | No | Evidencia antes/después del duplicado | Producción controlada | 2026-07-16 | Baseline 2.1C | Usuario Compras autorizado | Pendiente de consolidar |
| EVID-2.1C-005 | SHA-256 persistido | Hash `bcc17bbe...8cea2c` registrado en `documentos_archivos` | SQL | Hash persistido | CONFIRMADO POR SQL | Alto | Sí | Sí | Validar alcance real de búsqueda por hash | PostgreSQL | 2026-07-16 | Baseline 2.1C | Usuario Compras autorizado | Pendiente de consolidar |
| EVID-2.1C-006 | `documentoId` devuelto | La respuesta devolvió `documentoId = 3` | Runtime HTTP | Identificador lógico disponible | CONFIRMADO POR RUNTIME | Alto | No | No | Consolidar respuesta mínima contractual | Producción controlada | 2026-07-16 | Baseline 2.1C | Usuario Compras autorizado | Pendiente de consolidar |
| EVID-2.1C-007 | `archivoId` devuelto | La respuesta devolvió `archivoId = 33` | Runtime HTTP | Identificador físico disponible | CONFIRMADO POR RUNTIME | Alto | No | No | Consolidar respuesta mínima contractual | Producción controlada | 2026-07-16 | Baseline 2.1C | Usuario Compras autorizado | Pendiente de consolidar |
| EVID-2.1C-008 | Evento `documento.creado` | Evento persistido en `documento_eventos` | SQL | Evento registrado | CONFIRMADO POR SQL | Medio | Sí | No | Revisar payload, actor y trazabilidad | PostgreSQL | 2026-07-16 | Baseline 2.1C | No persistido | `null` |
| EVID-2.1C-009 | Evento `archivo.subido` | Evento persistido en `documento_eventos` | SQL | Evento registrado | CONFIRMADO POR SQL | Medio | Sí | No | Revisar payload, actor y trazabilidad | PostgreSQL | 2026-07-16 | Baseline 2.1C | No persistido | `null` |
| EVID-2.1C-010 | Documento antes de R2 | El documento lógico se crea antes del archivo físico y del almacenamiento final | Código + timestamps SQL | Orden confirmado | CONFIRMADO POR CÓDIGO | Alto | Sí | Sí | Diseñar estrategia de consistencia | Baseline funcional | 2026-07-16 | feat/documental-v2-operacion-2-1B + 2.1C | N/A | N/A |
| EVID-2.1C-011 | Documento lógico huérfano | Si R2 falla después de crear el documento, puede quedar documento sin archivo | Código | Riesgo identificado, no reproducido | RIESGO CONFIRMADO POR CÓDIGO | Alto | Sí | Sí | Diseñar caso de fallo controlado en entorno seguro | Baseline funcional | 2026-07-16 | Baseline 2.1C | N/A | N/A |
| EVID-2.1C-012 | Objeto R2 huérfano | Si R2 persiste y PostgreSQL falla después, puede quedar objeto sin referencia | Código | Riesgo identificado, no reproducido | RIESGO CONFIRMADO POR CÓDIGO | Alto | Sí | Sí | Revisar compensación y reconciliación | Baseline funcional | 2026-07-16 | Baseline 2.1C | N/A | N/A |
| EVID-2.1C-013 | Estado `pendiente_ocr` | El documento quedó con estado inicial `pendiente_ocr` | Runtime + SQL | Comportamiento legacy observado | CONFIRMADO POR SQL | Alto | Sí | Sí | Proponer estado post-upload independiente de OCR | PostgreSQL | 2026-07-16 | Baseline 2.1C | Usuario Compras autorizado | Pendiente de consolidar |
| EVID-2.1C-014 | Evento sin `usuario_id` | `usuario_id = null` en eventos registrados | SQL | Actor no persistido | CONFIRMADO POR SQL | Alto | Sí | Sí | Revisar propagación de identidad | PostgreSQL | 2026-07-16 | Baseline 2.1C | No persistido | N/A |
| EVID-2.1C-015 | Evento sin `request_id` | `request_id = null` | SQL | Trazabilidad de solicitud incompleta | CONFIRMADO POR SQL | Alto | Sí | Sí | Verificar contrato transversal de request ID | PostgreSQL | 2026-07-16 | Baseline 2.1C | No persistido | `null` |
| EVID-2.1C-016 | Evento sin `correlation_id` | `correlation_id = null` | SQL | Correlación incompleta | CONFIRMADO POR SQL | Alto | Sí | Sí | Revisar contrato de correlación | PostgreSQL | 2026-07-16 | Baseline 2.1C | No persistido | `null` |
| EVID-2.1C-017 | `storageKey` con nombre saneado | La clave incluye UUID y nombre original saneado | Runtime + SQL | Convención actual confirmada | CONFIRMADO POR RUNTIME | Medio | Sí | No | Definir política contractual de key opaca | R2 + PostgreSQL | 2026-07-16 | Baseline 2.1C | N/A | N/A |
| EVID-2.1C-018 | Duplicado secuencial | Se repitió la carga del mismo binario y SHA-256; el endpoint respondió HTTP 409 con `ARCHIVO_DUPLICADO_EN_CARGA_GUIADA`, devolvió `archivoId = 33`, `documentoId = 3` y `accionSugerida = abrir_existente`; no se creó nuevo documento, archivo ni evento | Runtime HTTP + SQL | Duplicado bloqueado; referencia existente devuelta; sin nueva persistencia observable | CONFIRMADO POR RUNTIME | Alto | Sí | Sí | Definir contractualmente el alcance global del hash y la semántica pública del conflicto | Producción controlada | 2026-07-17 | docs/sprint-2-1C-contrato-carga-documental-segura @ a3f4e8e9 | Mismo usuario Compras autorizado | 23333333-3333-4333-8333-333333333333 |
| EVID-2.1C-019 | Disponibilidad backend sin confirmación OCR | La carga devolvió IDs y persistió archivo antes de confirmación OCR | Runtime + SQL | Backend disponible técnicamente | CONFIRMADO POR RUNTIME | Alto | Sí | No | Definir condición contractual de éxito | Producción controlada | 2026-07-16 | Baseline 2.1C | Usuario Compras autorizado | Pendiente de consolidar |
| EVID-2.1C-020 | Dependencia visual del frontend | No existe todavía evidencia suficiente de disponibilidad visual independiente de OCR | Evidencia incompleta | Pendiente | BLOQUEADO POR ENTORNO | Medio | Sí | No | Validar frontend con documento post-upload | Web Admin | Pendiente | Baseline frontend vigente | Pendiente | Pendiente |
| EVID-2.1C-021 | Alcance del hash | La consulta usa `hash_sha256`, excluye `duplicado_absorbido` y, cuando `documentoId` o `expedienteId` son nulos, el grupo OR hace que la búsqueda sea global; solo con ambos valores restringe al mismo documento o expediente | Revisión de código y SQL embebido | Alcance global por SHA-256 con restricción condicional cuando ambos IDs están presentes | CONFIRMADO POR CÓDIGO | Alto | Sí | Sí | Definir contractualmente si la deduplicación global es la política definitiva | Baseline funcional | 2026-07-17 | feat/documental-v2-operacion-2-1B @ 178cf9db | N/A | N/A |
| EVID-2.1C-022 | Concurrencia | No se ha probado carga simultánea del mismo archivo | Fuera de prueba actual | No ejecutado | FUERA DE ALCANCE | Alto | Sí | Sí | Preparar plan separado con GO | Entorno controlado | Pendiente | Baseline 2.1C | N/A | N/A |
| EVID-2.1C-023 | Respuesta mínima contractual | `documentoId`, `archivoId`, `hashSha256`, `duplicado` son la base propuesta | Dictamen vigente | Propuesta aceptada como base | DECISIÓN CONTRACTUAL PENDIENTE | Alto | Sí | No | Consolidar en contrato técnico | Documentación | 2026-07-17 | ef880be0 | N/A | N/A |
| EVID-2.1C-024 | Preview temporal | La URL temporal no debe formar parte del contrato mínimo de carga | Dictamen vigente | Separado del upload mínimo | DECISIÓN CONTRACTUAL PENDIENTE | Medio | Sí | No | Revisar endpoint de preview | Documentación/código | Pendiente | Baseline 2.1C | N/A | N/A |

## 4. Evidencia runtime nominal consolidada

```text
Cliente:
BBTI

Expediente:
17

Tipo esperado:
OC

Documento ID:
3

Archivo ID:
33

SHA-256:
bcc17bbe1f7428c39a0b8c2b5a3408fbd27d3d39cb60179143dcb79def8cea2c

Storage provider:
r2

Storage key observado:
documentos/2026/07/BBTI/1c529071-6de1-4e60-9586-b06a7d06beab__test-2-1C-upload.pdf

Estado inicial:
pendiente_ocr
```

## 5. Próxima prueba autorizada

```text
Prueba:
Duplicado secuencial

Mismo archivo:
SÍ

Mismo SHA-256:
SÍ

Mismo expediente:
17

Mismo usuario autorizado:
SÍ

Nuevo request ID:
OBLIGATORIO

Concurrencia:
NO AUTORIZADA
```

## 6. Evidencia mínima requerida

1. Respuesta HTTP del segundo intento.
2. Código o acción de duplicado.
3. Mismo SHA-256.
4. Ausencia de nuevo documento.
5. Ausencia de nueva fila en `documentos_archivos`.
6. Ausencia de nuevo evento `documento.creado`.
7. Ausencia de nuevo evento `archivo.subido`.
8. Ausencia de nuevo `storageKey`.
9. Evidencia R2 antes/después o retorno previo a `PutObject`.
10. Request ID nuevo y claramente identificado.

## 7. Decisiones contractuales pendientes

- condición de éxito;
- momento de creación del documento lógico;
- semántica de duplicado;
- idempotencia;
- reintentos;
- concurrencia;
- orden PostgreSQL/R2;
- compensación;
- reconciliación;
- estados documentales;
- estados del archivo;
- errores públicos;
- eventos;
- auditoría;
- permisos;
- aislamiento por empresa/workspace;
- convención de `storageKey`;
- respuesta pública;
- disponibilidad independiente de OCR;
- compatibilidad con asociación V2.

## 8. Gobierno

```text
Matriz maestra:
AUTORIZADA

Duplicado secuencial:
AUTORIZADO

Consultas SQL de solo lectura:
AUTORIZADAS

Lectura de código:
AUTORIZADA

Commits documentales locales:
AUTORIZADOS

Implementación:
NO AUTORIZADA

Merge:
NO AUTORIZADO

Push:
NO AUTORIZADO

PR:
NO AUTORIZADO

Concurrencia:
NO AUTORIZADA

Eliminación del respaldo:
NO AUTORIZADA
```

## 9. Próximo documento

```text
06-evidencia-duplicado-secuencial.md
```

Debe incluir:

- request y response sanitizados;
- HTTP status;
- SQL antes y después;
- eventos antes y después;
- evidencia R2 o retorno previo;
- clasificación final;
- impacto contractual;
- estado Git.
