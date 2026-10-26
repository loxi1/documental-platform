---
title: Desarrollo SOURCE y release proporcional al riesgo
owner: Product Architect
status: Review
version: R1
last_review: 2026-10-26
source_of_truth: true
related:
  - 07-git.md
  - ../31-governance/07-release-process.md
  - ../31-governance/RELEASE_MANIFEST.md
---

# Estándar de desarrollo SOURCE y release — R1

Acción: `BBTI_SOURCE_DEVELOPMENT_AND_RELEASE_STANDARD_R1`. Mandato PO: estandarización solicitada. Documento preparado para aceptación MSII/PO; no implica aprobación del MI, registro del Bibliotecario Técnico ni autorización productiva.

## Alcance y autoridad

Este es el documento canónico del flujo normal, los cuatro gates, la evidencia proporcional y la continuidad. Complementa el [estándar Git](07-git.md) y el [proceso de release](../31-governance/07-release-process.md), que conserva los controles técnicos de promoción. Sustituye la exigencia universal de manifiesto exacto y reconstrucción histórica para cambios NORMAL por evidencia focal. Los controles de composición exacta permanecen en RELEASE y en RECOVERY cuando correspondan.

No crea una jerarquía. Se preservan los [roles oficiales](../09-equipo/01-roles.md), las [competencias MSI](../09-equipo/03-maestro-sucesor-I.md), las [competencias MSII](../09-equipo/04-maestro-sucesor-II.md), los [revisores](../31-governance/05-review-process.md) y los [owners](../31-governance/09-ownership.md). MSI atiende motor documental/backend/OCR/APIs; MSII producto/frontend/UX, respetando sus restricciones. PO conserva reglas funcionales, aceptación, integración y decisión productiva. La operación se mantiene en el dominio de infraestructura; este estándar no habilita deploy a MSI ni amplía el dominio de MSII.

MI interviene ante conflicto arquitectónico, cambio de autoridad, decisión rectora o riesgo extraordinario; no se exige su intervención para cambios funcionales normales dentro de competencias y alcance aprobados. Bibliotecario Técnico recibe la transferencia para índices y continuidad, conservando las funciones documentales formalizadas del Knowledge Manager. No se encontró una competencia general formalizada para MSE en las normas de roles consultadas: no se le asigna autoridad por inferencia. Si un encargo requiere resolver esa identidad o una diferencia de autoridad, elevar únicamente esa decisión al PO/MI antes de actuar fuera del dominio aprobado. Los dictámenes históricos específicos conservan su alcance; no se convierten en gates universales.

## Gobernanza ligera

```ini
STANDARD=BBTI_LIGHT_GOVERNANCE
MAX_GATES=4
G1=DIAGNOSTICO_FOCAL_READ_ONLY
G2=IMPLEMENTACION_Y_PRUEBAS_AUTORIZADAS
G3=ACEPTACION_Y_RELEASE
G4=PROMOCION_PRODUCTIVA_CON_AUTORIZACION_EXPRESA
```

| Gate | Resultado consolidado y autorización |
|---|---|
| G1 | Identidad de base, requerimiento, criterios, contratos/rutas afectados, categoría y riesgos; diagnóstico focal de solo lectura. |
| G2 | Alcance autorizado, implementación, pruebas pertinentes y diff revisado. Registrar si incluye commits y push de rama. |
| G3 | Aceptación PO según sus competencias; definir expresamente integración SOURCE, estrategia, commit/push ordinarios y si existe decisión de preparar release. Si solo se acepta SOURCE, G4 = N/A. |
| G4 | Autorización expresa PO para promoción productiva del candidato identificado, con alcance Enterprise/GHCR/EC2, rollback y fronteras especializadas. |

Un informe consolidado por gate; no abrir subgates por comando o prueba ni gates rutinarios adicionales. No volver a pedir permiso para comprobaciones u operaciones ya incluidas en la autorización vigente. Un PASS no concede una autorización nueva. Una ampliación real de alcance o cambio de identidad vuelve al gate pertinente, sin crear una jerarquía adicional. Las autorizaciones separadas de DB, OCR u otras fronteras especializadas se registran en el gate aplicable; no quedan implícitas en la autorización de aplicación.

## Fases del ciclo

### A — Inicio

1. Verificar SOURCE `main` limpio, identificar su commit y comprobar sincronización con `origin/main`, distinguiendo refs locales de consulta remota vigente.
2. Identificar requerimiento y criterios de aceptación.
3. Crear rama o worktree aislado desde la base verificada.
4. Delimitar archivos, contratos y validaciones afectadas.

SOURCE limpio y sincronizado habilita NORMAL sin reconciliación histórica ni manifiesto histórico completo. Si avanzó legítimamente, usar el HEAD actual limpio; no regresar automáticamente a un baseline anterior. Si hay cambios o divergencia, preservar trabajo y delimitar la causa; activar RECOVERY solo bajo sus condiciones.

### B — Desarrollo

1. Inspeccionar exclusivamente el recorrido funcional afectado e implementar el cambio autorizado.
2. Crear o actualizar pruebas focales cuando corresponda al cambio.
3. Ejecutar tests, typecheck, build y regresión/cross-flow pertinentes al impacto. Registrar N/A justificado para validaciones no aplicables; una edición documental requiere validaciones documentales.
4. Revisar diff y archivos; corregir regresiones atribuibles al cambio.

No repetir investigaciones cerradas ni pruebas históricas no afectadas sin evidencia nueva. No reconstruir contratos o manifiestos históricos como requisito rutinario.

### C — Integración SOURCE

1. Verificar criterios de aceptación y autorización de integración registrada en G3.
2. Crear commits claros, separados por contrato cuando corresponda; comprobar ausencia de cambios ajenos al alcance y usar staging explícito.
3. Integrar a SOURCE `main` mediante la estrategia autorizada.
4. Ejecutar las validaciones pertinentes al resultado integrado; no repetir suites históricas sin impacto.
5. Ejecutar push normal, verificar igualdad del HEAD local y remoto y confirmar worktree limpio.

Commit y push son operaciones ordinarias del alcance aprobado, no expedientes independientes de reconciliación. Si G3 no autoriza integrar/publicar, entregar el commit aislado para aceptación y detenerse en esa frontera.

### D — Release

Solo con decisión de promoción: `SOURCE main → Enterprise main → GHCR → EC2`.

Aplicar el [proceso técnico de release](../31-governance/07-release-process.md) y el [manifiesto único](../31-governance/RELEASE_MANIFEST.md). Preservar trazabilidad exacta SOURCE/Enterprise y digests por servicio; si la materialización produce otro commit, acreditar la composición autorizada y su correspondencia, sin asumir igualdad de hashes entre repositorios. Mantener freeze, abortar ante discrepancia de identidad y verificar runtime y aceptación funcional pertinente.

No construir imágenes productivas desde SOURCE, desplegar desde desarrollo ni interpretar push SOURCE como autorización productiva. La intervención productiva requiere autorización expresa PO en G4. No copiar worktrees completos; DB y OCR conservan sus fronteras específicas.

## Evidencia proporcional

| Categoría | Uso y evidencia |
|---|---|
| NORMAL | Cambio focal con SOURCE limpio/sincronizado: requerimiento, commit base, archivos modificados, pruebas, typecheck/build aplicable o N/A motivado, commits, HEAD final y estado Git. Sin manifiesto histórico. |
| RELEASE | Promoción: usar únicamente el manifiesto vigente con commit SOURCE, commit Enterprise, identidades GHCR y EC2, aceptación, rollback y autorización PO. No copiarlo a otros documentos. |
| RECOVERY | Excepción delimitada por divergencia Git no resuelta, worktree histórico contaminado, riesgo de pérdida, inconsistencia de identidad, conflicto entre contratos o evidencia de integridad comprometida. Registrar causa, alcance, preservación, resolución y cierre antes de volver a NORMAL. |

Los expedientes excepcionales de octubre de 2026 son antecedentes, no requisitos permanentes. No reabrir G0 ni alterar C04/C06 o sus respaldos.

## Continuidad entre sucesores

**Todo sucesor debe partir del estado rector vigente, no reconstruir toda la historia del proyecto.** Entregar este bloque con datos observados y N/A cuando no corresponda:

```ini
PROJECT=...
CURRENT_PHASE=...
SOURCE_MAIN_HEAD=...
SOURCE_REMOTE_SYNC=...
ACTIVE_WORKTREE=...
ACTIVE_REQUIREMENT=...
APPROVED_SCOPE=...
TEST_STATUS=...
PENDING_DECISION=...
NEXT_ACTION=...
PRODUCTION_STATUS=...
```

Separar expresamente hechos acreditados, decisiones aprobadas, trabajo pendiente, riesgos vigentes y evidencia histórica archivada. Indicar procedencia/fecha de evidencia heredada; no presentar expedientes cerrados como bloqueos actuales ni estado productivo reportado como recién verificado.

Antecedente PO de esta orden: SOURCE `c56250a0095ad3af8250952291087561a8ac30e0`, C01/C02/C03/C05 integrados, C04/C06 HOLD preservados, 148 PASS/0 FAIL y tres typechecks PASS; reconciliación histórica cerrada. Son evidencias heredadas, no pruebas ejecutadas por esta edición. Identidad inicial comprobada el 26/10/2026: main limpio, HEAD = origin/main local = main consultado en origin. Este registro no fija ese commit como base eterna ni acredita producción.

## Transferencia institucional — preparada, no enviada

Para MI y Bibliotecario Técnico:

> Se prepara para aceptación MSII/PO el estándar R1 `BBTI_SOURCE_DEVELOPMENT_AND_RELEASE_STANDARD_R1`, canónico en `docs/23-standards/11-source-development-and-release.md`. Establece NORMAL como ruta predeterminada, cuatro gates máximos, evidencia proporcional, continuidad desde el estado rector vigente y RECOVERY excepcional. Complementa Git y release; reemplaza la exigencia universal de manifiesto exacto/histórico para cambios focales, sin reducir los controles de promoción Enterprise/GHCR/EC2 ni las competencias vigentes. Los índices de estándares, operaciones y gobernanza se enlazan en esta propuesta. Tras aceptación, registrar la versión y sus referencias en los índices institucionales y de continuidad, conservando los expedientes históricos como antecedentes y evitando su reactivación automática. No se afirma aprobación MI ni actualización del registro del Bibliotecario. MSE no tiene competencia general identificada en las fuentes de roles consultadas; cualquier asignación necesaria requiere definición de la autoridad competente.

La aceptación e integración de esta propuesta quedan pendientes; esta orden solo prepara un commit documental aislado, sin push ni merge. Finanzas nueva no iniciada; Enterprise, GHCR, EC2 y DB fuera de ejecución.
