# Maestro Sucesor II — Frontend, Workspace Visual y UX

## Continuidad vigente — 11/11/2026

Acción `MSI_CODEX_GIT_MANIFEST_CONTINUITY_RECONCILIATION_R4`. Esta sección prevalece sobre la prioridad NAS de 05/11 conservada abajo; el alcance frontend/UX del rol no concede autoridad sobre backend, JWT o migraciones.

Todo sucesor MI/MSII/MSI lee: [Operations Manual](../../29-operations-manual/README.md#continuidad-vigente--11112026), [estándar SOURCE/release R1](../../23-standards/11-source-development-and-release.md) y [Git](../../23-standards/07-git.md); después el [inventario Git](../../31-governance/BRANCH_INVENTORY.md#continuidad-git-reconciliada--11112026) y solo contratos necesarios. Los contextos/prompt antiguos no prevalecen sobre esta continuidad.

- MVP aceptado05/11: ACCEPTED_WITH_OBSERVATIONS; no reabrir 101 archivos ni repetir aceptación.
- Enterprise f80d05e8 / GHCR#34: BUILT_NOT_DEPLOYED; no sumar commits posteriores a sus digests ni asumir despliegue por SUCCESS.
- SOURCE main89cd4c6e: corrección Almacén integrada/publicada; LAB históricamente reportado, no Enterprise ni producción. No reintroducir el segundo filtrado frontend.
- UX Compras OC/OS y Subir Facturas: INTEGRATED_SOURCE_AND_ENTERPRISE (`1ebdbf4f82ec3cae84b6a6caafc979353af2172a` → `7323e1b0ae62584c08714d06ab5bbf6bbd036292`); no requiere reintegración. La terminología aprobada y la simplificación del modal para OC/OS/FACTURA ya existen: Cancelar/X cierran sin persistir ni descartar el temporal, frente a Guardar y confirmar; Ocultar creación manual solo contrae su formulario. Véanse el [Manual operativo](../../29-operations-manual/README.md) para acciones y modos y el [Inventario Git](../../31-governance/BRANCH_INVENTORY.md) para commits. Su inclusión en imágenes GHCR no acredita despliegue; no confundir con Mi Perfil o G2-B.
- Mi Perfil UX: dos archivos locales pendientes en el candidato existente (page.tsx y AppHeader.tsx), IMPLEMENTED_NOT_INTEGRATED; preservar y confirmar alcance/acta PO antes de integración.
- G2-B: exportación aislada, hashes Auth/Gateway verificados; validación técnica MSE 19/19 y401 recibida en R4, PENDING_E2E de cambio de contraseña y revocación JWT. No confundir UX con aceptación funcional completa.
- P3/R3: PARTIAL_HOLD; PRE_PUT no cerrado funcionalmente; encargo de preparación posterior conservado, no ejecutarlo ahora.
- APISPERU privado, respaldo remoto OCR, cambio OCR systemd y despliegue productivo: PENDING. No solicitar secretos ni intervenir producción desde esta continuidad.
- Migración G2-B: autorización separada, SQL+SHA256+runner; no crear 0025 ni cambiar auth_version/conexiones/bases en R4.

Las novedades documentales actuales están sin commit, con SOURCE dirty original preservado y sin cambios de ramas. Revisar el diff mediante MSI/PO; no promover automáticamente ni ejecutar limpieza. Estados y pruebas declarados se distinguen de las verificaciones realizadas, que fueron Git, documentos, hashes y consulta de lectura del run existente.

---


**Estado:** continuidad aprobada  
**Responsable:** Maestro Sucesor II  
**Alcance:** `apps/web-admin` y documentación de experiencia de usuario  
**No tocar:** backend documental, OCR, migraciones funcionales, JWT backend ni permisos backend.

---

## Continuidad vigente — 05/11/2026

Acción `POST_MVP_SUCCESSOR_CONTINUITY_UPDATE_R1`. Las responsabilidades de frontend y UX de este documento permanecen vigentes; el orden de trabajo histórico inferior no constituye autorización para reabrir el MVP aceptado.

Todo nuevo chat de MI, MSII o MSI comienza por:

1. [Operations Manual](../../29-operations-manual/README.md).
2. [Estándar SOURCE y release R1](../../23-standards/11-source-development-and-release.md).
3. [Estándar Git](../../23-standards/07-git.md).

Después, consultar sólo los contratos necesarios para su misión. La continuidad actual y sus identidades están en el Operations Manual y el [manifest rector](../../31-governance/RELEASE_MANIFEST.md); los documentos de contexto/prompt relacionados conservan su función, sin prevalecer sobre este estado.

```ini
MVP_STATUS=ACCEPTED_WITH_OBSERVATIONS
MVP_DEPLOYMENT=PASS
PO_ACCEPTANCE=APPROVED
DOCUMENTARY_CLOSURE=PASS
RELEASE_RECONCILIATION=NOT_REQUIRED
NEXT_WORKSTREAM=NAS_PREPARATION
```

El PO declaró aceptación funcional productiva el **05/11/2026**: Compras PASS (carga R2 TEMP y promoción definitiva), Almacén PASS (carga y validación de Guía), Finanzas/Regularización PASS (TEMP y promoción definitiva) y Contabilidad PASS (visualización de registros de los demás módulos). Son resultados declarados por el PO, diferenciados de las pruebas automatizadas y verificaciones técnicas del despliegue.

Observaciones abiertas: recuperación OCR tardía sin E2E productivo completo; expiración TEMP sin verificación productiva; referencia histórica R2 con HTTP 403; 16 errores globales de tipado conocidos. Se preservan como límites/antecedentes, no como defectos nuevos del despliegue; esta continuidad no los corrige ni reabre el release.

**Siguiente entregable: preparación NAS**, responsable MSI, supervisión MSII y autoridad Product Owner. Debe mantenerse aislada del MVP productivo; no se presume que NAS sustituya Cloudflare R2 y esta orden no autoriza cambios de infraestructura.

No repetir aceptación, reconciliación de 101 archivos, builds ni despliegue. Preservar SOURCE dirty y el MVP productivo.

---

## Misión

Convertir Documental Platform en una plataforma coherente, profesional y lista para uso desde la experiencia de usuario, sin modificar contratos backend innecesariamente.

El objetivo no es agregar más reglas de negocio, sino consolidar:

- Workspace visual.
- Sidebar y navegación.
- Mi Perfil.
- Componentes reutilizables.
- Estados visuales.
- Revisión Contable UI.
- Expediente 360 UI.
- Loading, empty states y accesibilidad.

---

## Regla principal

```text
Primero componentes comunes.
Después pantallas.
No al revés.
```

El motivo es evitar duplicar badges, colores, estados, formatos y layouts en cada módulo.

---

## Responsabilidades

El Maestro Sucesor II puede trabajar en:

```text
Frontend
Workspace visual
Sidebar / Header
Mi Perfil
Experiencia de usuario
Componentes reutilizables
Estados visuales
Loading / Empty / Skeleton states
Accesibilidad
Responsive
Refactor visual
```

Principalmente en:

```text
apps/web-admin/src/app
apps/web-admin/src/components
apps/web-admin/src/layout
apps/web-admin/src/lib
apps/web-admin/src/constants
apps/web-admin/src/types
```

---

## Fuera de alcance

No tocar:

```text
Backend documental
OCR Worker
Extractores
Versionado documental
Duplicados
Clave documental
Migraciones
JWT backend
Permisos backend
APIs documentales
Usuarios / perfiles backend
Caja Chica
Rendiciones
```

Si el frontend necesita un dato o endpoint nuevo, se documenta como requerimiento para el Maestro Sucesor I. No se implementa desde este rol.

---

## Orden de trabajo aprobado

1. Crear base visual reutilizable.
2. Aplicar la base a Revisión Contable.
3. Aplicar la base a Expediente 360.
4. Aplicar la base a Mi Perfil.
5. Aplicar la base a Compras.
6. Aplicar la base a Almacén.
7. Aplicar la base a Finanzas.

---

Para iniciar un requerimiento, seguir la [entrada operativa común](../../29-operations-manual/README.md), que remite al estándar R1.

## Archivos relacionados

- `context.md`: estado real del proyecto y decisiones ya validadas.
- `prompt.md`: prompt listo para abrir un nuevo chat del Maestro Sucesor II.
- `docs/05-frontend/README.md`: guía del área frontend.
- `docs/03-producto/02-ui-foundation.md`: criterios de UI Foundation.
- `docs/11-adr/ADR-005-ui-foundation.md`: decisión arquitectónica de UI Foundation.
- `docs/09-equipo/04-maestro-sucesor-II.md`: rol resumido dentro del equipo.


## Actualización posterior para sucesores — 11/11/2026

Acción: MSE_UNIFIED_MANIFEST_CONTINUITY_G2B_APPLY_R1.

Consultar la adenda del RELEASE_MANIFEST: Documentos/Web GHCR#34 observados ejecutándose en EC2; aceptación funcional posterior al MVP NOT_VERIFIED. Conservar aceptación05/11. No repetir integración26+3, MVP101 ni publicación de las mismas imágenes por este registro.

G2-B backend E2E y revocación multicontexto PASS; mínimo8 probado focalmente y máximo72bytesUTF8 preservado. El PENDING_E2E anterior queda superado para backend, no para UX3005. Nueve archivos candidatos; delta final NOT_ESTABLISHED, ampliable por interceptor/UX; producción G2-B NOT_EXECUTED.

Pendientes: activación selectiva segura, tratamiento401, éxito visible, aceptación UX y trazabilidad versionada auth_version antes de promoción. R4 documental publicado en SOURCE `d343a1bfb9ecc4f933ea425486de892fe74009b1` / Enterprise `85b6486ecbf7ae2c652cafd84f2217b0e43590a2`; las menciones históricas sin commit no representan este cierre.

Evidencias durables: `/home/loxi1/bbti-evidence/unified-manifest-continuity-g2b-r2/{ec2-ghcr-identity.json,g2b-backend-e2e.json,g2b-candidate-inventory.json}`. Sin aceptación UX ni despliegue G2-B por inferencia.


---

## Relevo vigente MSII — aceptación SOURCE LAB 17/11/2026

ACTION: BBTI_SOURCE_DOCUMENTARY_CONTINUITY_R1.

SOURCE_NATIVE_RUNTIME=CLOSED_PASS.
SOURCE_FUNCTIONAL_ACCEPTANCE=CLOSED_PASS_WITH_OBSERVATIONS.
CONTABILIDAD_UX=PASS_PO.
CUSTODY_RELEASE=CLOSED_PASS.

SOURCE main baseline anterior a esta adenda:
`9359b9720328d0bb4c429e90330c997269be5dc3`.

El PO aceptó el entorno nativo puerto 3005 y sus
servicios SOURCE. No repetir las pruebas testigo
ni volver a cargar documentos por el cambio de sucesor.

### Alcance funcional acreditado

| Frente | Testigo |
|---|---|
| Login/workspace y Mi Perfil | PASS PO |
| Cambio de contraseña y lectura R2 | PASS PO |
| Compras OC TEMP | temp366, doc530, archivo533 |
| Factura OC | doc531, archivo vigente535 |
| Guía | doc532, archivo536, OCR514 |
| Versión Guía | archivo538, versión 2 |
| Nota de Ingreso | doc533, archivo537, OCR515 |
| Sustento OC | doc534, archivo539, OCR516 |
| Sustento OP172 | doc537, archivo542, OCR518 |
| Factura OP172 | temp374, doc538, archivo543, OCR519 |
| RH OP173 | temp376, doc540, archivo545, OCR520 |
| Contabilidad | OC mayo; OP172 y OP173 noviembre 2026 |

Los identificadores corresponden a registros testigo
LAB; no son identificadores productivos ni instrucciones
para modificar datos.

### Observaciones conservadas

- Guía y NI: ruta R2 mayo frente a campos internos
  noviembre; Contabilidad presenta correctamente mayo.
  Contrastar el contrato antes de modificar metadata.
- NI requirió revisión manual por OCR incompleto.
  La versión Guía fue agregada sin OCR nuevo. No se
  acredita fallback raster ni recuperación OCR tardía
  de Guía mediante esa prueba.
- Sustento OC: documento sintético de S/1000 frente al
  importe registrado S/3350.73 y proveedor Moneda.
  La aceptación funcional no certifica exactitud financiera.
- Factura OP172: datos OCR de comprador/emisor y
  beneficiario requieren contraste; importe manual S/50.
  Sustento OP reportó contexto COMPRAS_EDITAR_MODAL.
- Versión Guía538: columnas de contexto nulas pese a
  metadata y vínculo existentes; contrato pendiente.
- No acreditados integralmente: caso OS independiente,
  expiración TEMP real de 24 horas, revocación JWT y
  auditoría authVersion, rutas finales TEMP de ambos
  regularizadores y aislamiento exhaustivo.

No extender la aceptación a P3/PRE_PUT, TEMP334 u otros
casos no cubiertos específicamente.

### Próxima continuidad

Conservar SOURCE nativo, R2 DEV y OCR systemd.
No reabrir recuperación de runtime ni custodias.

Completar reconciliación documental SOURCE/Enterprise
y guías externas. No atribuir a producción la aceptación
LAB. G4-A tiene publicación GHCR y cierre histórico RDS
0025 acreditados, pero EC2 y UX productiva no acreditados.

Volver al ciclo NORMAL para nuevos requerimientos según
los estándares institucionales aprobados. Solo abrir
una nueva intervención funcional conforme a alcance PO.


---

## Ratificación funcional y arquitectónica PO — 17/11/2026

La presente ratificación prevalece sobre las clasificaciones
históricas incompatibles de P3/R3, TEMP328/334 y NAS.

- Aceptación funcional PO: PASS para SOURCE LAB,
  Compras, Almacén, Finanzas y Contabilidad.
- P3/R3: la propuesta universal TEMP fue sustituida.
  Respetar el canal de carga existente según origen y
  tipo documental: TEMP o carga directa al periodo.
- Incidencia Almacén: regularizada mediante intervención
  en base de datos, según PO.
- Modal OCR Almacén: mantener visibles únicamente
  Guardar y confirmar y Cancelar. Ocultar los demás
  botones, no eliminarlos ni suprimir capacidades backend.
  Cancelar únicamente cierra el modal.
- TEMP328/334: incidencia operativa resuelta según PO.
  El diseño especial de recuperación queda histórico;
  no reabrirlo ni inferir eliminación física en R2.
- Compras: OC regularizada y APISPERU configurado,
  según PO, para corregir la selección del RUC emisor.
- RDS 0025: ejecutada en producción desde Enterprise
  según PO. Evidencia SQL aportada: gestion_documental,
  usuario postgres, auth_version integer NOT NULL
  DEFAULT 1. No repetir migración.
- G2-A residual: alcance no identificado suficientemente;
  no constituye un bloqueo acreditado.
- NAS DEV y archivado definitivo: entregable independiente,
  fuera del alcance de este cierre.

La ratificación funcional no acredita por sí misma
nuevas identidades de imágenes, despliegues EC2,
borrados físicos ni nuevas pruebas automatizadas.

### Manuales técnicos permanentes

Colección instalada por el PO el 17/11/2026:

`~/Documentos/importantesProyectos/Documentacion_tecnica/BBTI_MANUALES_2026-11-17/`

Punto de entrada: `00_LEER_PRIMERO_BBTI.md`.

Nueve manuales cubren arquitectura, operación SOURCE,
Git y releases, R2/OCR, producción, aceptación,
autonomía y custodia de los 48 archivos históricos.

No repetir investigaciones cerradas. Consultar el manual
específico y la documentación institucional vigente.
Las referencias Git de los manuales se actualizarán
después de la publicación SOURCE y Enterprise.


---

## R3 Factura TEMP — aceptación SOURCE y relevo — 19/11/2026

Acción `BBTI_FACTURA_TEMP_G3_SOURCE_CLOSURE_R1`. Para este frente prevalece esta adenda sobre el estado de G3 pendiente del informe G2; se conserva el historial. PO/MSE 3.0 ratifica aceptación SOURCE con observaciones, no aceptación PROD. Rama `feat/compras-factura-temp-recovery-r1`, base `8807b4a9a99870396ec35a7ef1011cec1402c745`; commit e integración SOURCE pendientes.

- PASS PO: recuperación por cargador y tras refrescar, OCR parcial editable, confirmación, dos pendientes simultáneos, aislamiento OC/OS y regresión OC/OS. Testigo TEMP378 / expediente121 / principal541 / documento542 / archivo547 / grupo150 / OCR522, noviembre 2026.
- **CROSS_USER_RECOVERY=FAIL; DEFERRED_BY_PO.** No anunciar recuperación entre usuarios como funcionalmente aceptada ni corregirla en esta intervención. La implementación y las pruebas offline no sustituyen ese resultado real.
- Listado contextual en Documentos de compra, selección individual, PDF/TEMP originales, OCR y borrador persistidos y edición manual sin OCR nuevo por recuperar. Mantener el modal existente, cierre sin confirmación y validaciones de Guardar y confirmar. No inferir persistencia de ediciones manuales nunca guardadas.
- La recuperación genérica de Factura y Factura directa se sustituyó en ese bloque por el listado y un acceso histórico por identidad propia conocida. OC/OS conserva su recuperación. No se modifican constantes globales ni Almacén.
- 218 PASS, tres typechecks y builds backend 2/2/Web PASS son evidencia heredada ratificada en la orden G3; no repetir. No se dispone de captura exhaustiva de red, inspección física independiente R2 posterior o concurrencia exhaustiva.
- Mantener observaciones OCR legacy FINANZAS/TEMP_REGULARIZACION_OP y `principalActivo`, sin atribuirles causa o asociación incorrecta no demostradas.
- Web3005 permanece activo por decisión PO. Build formal con URLs PROD mientras estaba activo: desviación operativa registrada; no ejecutar el artefacto formal ni limpiar `.next` ahora. Arranques backend acreditados, no tareas pendientes de este cierre.

Revisión focal estática: controles JWT/permisos y ámbito contextual presentes; rutas generales conservan propietario. No se halló un bypass nuevo demostrable en el alcance revisado. Esto no certifica todos los accesos reales ni amplía autoridad MSII a backend/seguridad.

Ver [operación SOURCE](../../29-operations-manual/README.md#r3-factura-temp--cierre-g3-source-con-observaciones--19112026), [contrato](../../28-api-cookbook/04-documentos.md#r3-factura-temp--contrato-contextual-y-estado-g3--19112026) y [delta técnico de entrega](../../../DELTA_TECNICO_MSE3_A_MSE_ACTUAL.md). Manifest e inventario: propuestas aditivas pendientes de cierre Git, con SHA funcional real solo después del commit. Enterprise/GHCR/EC2 y aceptación PROD R3 pendientes; sin migración, OCR Python o NAS. No iniciar G4 por esta lectura.


### Corrección cross-user R3 — 19/11/2026

**CROSS_USER_RECOVERY=FIX_IMPLEMENTED_PENDING_PO_VALIDATION.** Sustituye únicamente el estado vigente de la observación diferida; conserva el FAIL real y las evidencias anteriores. Se acreditó que workspaceId es una asignación individual de usuario, no un identificador compartido entre A y B. La corrección se limita al repositorio TEMP: verifica pertenencias del origen y del operador al mismo DOCUMENTAL/empresa/cliente, manteniendo autenticación, permisos y contexto OC/OS. No cambian frontend, rutas ni OCR; no se solicita nuevo upload para recuperar. Los tests entre actores ahora incluyen IDs personales distintos; 27 PASS focales y typecheck Documentos PASS, sin validación física PostgreSQL o aceptación visual aún. MSE debe actualizar solo Documentos3002 y coordinar la comprobación sobre un pendiente vigente como TEMP382/exp121/principal541. No reiniciar por leer esta nota ni declarar PASS funcional. Véase el delta técnico para diff exacto, límites y propuesta de manifest actualizada. SOURCE main, Enterprise y producción siguen sin promoción de R3 en esta intervención.


---

## R3 Factura TEMP - consolidacion documental G3 - 19/11/2026

ACTION: BBTI_FACTURA_TEMP_G3_DOCUMENTARY_FINALIZATION_R1

- Base SOURCE: `8807b4a9a99870396ec35a7ef1011cec1402c745`.
- Rama focal: `feat/compras-factura-temp-recovery-r1`.
- Commit funcional SOURCE local: `793152d3cdc9ab752cfb699839358255a1db25c5`.
- Inventario funcional: 12 archivos, +593/-45.
- Commit documental e integracion SOURCE main: pendientes.
- Publicacion remota de R3: pendiente.

### Aceptacion SOURCE LAB y precedencia

Esta entrada actualiza el estado vigente de R3 Factura TEMP.
Conserva el FAIL, HOLD y diferimiento anteriores como
antecedentes historicos.

- CROSS_USER_RECOVERY=PASS_PO.
- CROSS_USER_CONFIRMATION=NOT_ACCREDITED.
- DOCUMENTOS_BUILD=PASS, exit 0.
- DOCUMENTOS_RESTART=PASS_PO.
- SOURCE_FUNCTIONAL_ACCEPTANCE=PASS_WITH_OBSERVATIONS.

El PO confirma que, despues de actualizar Documentos3002,
puede recuperar una factura cargada por otro usuario.
Este resultado acredita el recorrido funcional observado,
no una auditoria SQL, de seguridad o concurrencia integral.

Se conservan las aceptaciones anteriores: recuperacion
por cargador y despues de refrescar, OCR parcial editable,
confirmacion ordinaria, pendientes simultaneos, aislamiento
OC/OS y regresion OC/OS.

No inferir confirmacion cruzada, nueva materializacion,
verificacion fisica independiente R2 ni aceptacion PROD.

### Evidencia tecnica y limites

- Pruebas G2: 218 PASS, evidencia historica.
- Typechecks G2: 3/3 PASS.
- Builds previos Documentos/Gateway: 2/2 PASS.
- Build formal Web: PASS, 22/22 prerender, exit 0.
- Correccion cross-user: 27 PASS, 0 FAIL,
  24 omitidas por filtro, dos suites.
- Typecheck focal Documentos: PASS.
- Build Documentos posterior a la correccion: PASS.
- SECURITY_FOCAL_RESULT=PASS_STATIC_WITH_OBSERVATIONS.
- STAGED_DIFF_CHECK=PASS.

No sumar las 218 pruebas y las 27 focales como casos
independientes. No afirmar repeticion integral posterior.

La correccion valida las asignaciones personales del
cargador y operador al mismo DOCUMENTAL, empresa y cliente,
conservando contexto OC/OS, permisos y propietario de las
rutas generales. No modifica Auth ni suplanta actores.

El recorrido real de recuperacion funciona en SOURCE LAB.
No se acredita una auditoria independiente de privilegios
SQL ni su disponibilidad en produccion. Si faltan permisos
SELECT requeridos, STOP, sin GRANT automatico.

Se conservan las observaciones OCR legacy, principalActivo,
captura de red no exhaustiva y concurrencia no acreditada.

### Actualizacion operativa acreditada

Solo Documentos3002 fue recompilado y actualizado por
la correccion cross-user. El primer arranque encontro
EADDRINUSE por el proceso anterior activo. El PO confirma
recuperacion correcta despues del reinicio.

No repetir build ni reinicio por leer esta entrada.
Preservar Gateway3000, Auth3001, Web3005, PostgreSQL,
NATS, R2 DEV y OCR systemd existentes.

Web3005 permanece activo. La limpieza de .next queda
diferida hasta su detencion ordinaria. No ejecutar el
artefacto Web formal con URLs PROD como runtime LAB.

Sin PID files, timers ni supervisores adicionales.

### Alcance y promocion

- Migraciones nuevas: NONE.
- Cambios OCR Python: NONE.
- Cambios Auth: NONE.
- Cambios NAS: NONE.
- Enterprise R3: NOT_PROMOTED.
- GHCR R3: NOT_PUBLISHED.
- EC2 R3: NOT_DEPLOYED.
- Aceptacion PROD R3: NOT_PERFORMED.
- G4: NOT_AUTHORIZED.

Aplicar ONE_INTEGRATED_RELEASE de cuatro componentes,
tras cierre SOURCE y autorizacion independiente del PO,
bajo direccion de MSE Actual.

No atribuir a R3 digests de releases anteriores.
MSE Actual conserva gobernanza del manifest, promocion,
despliegue y cierre institucional posterior.

NAS constituye un entregable independiente y posterior.

### Continuidad MSE

Siguiente paso: finalizar commit documental e integrar
SOURCE main tras verificar su identidad local/remota.
Entregar el delta tecnico a MSE Actual antes de G4.

No reabrir diagnostico cross-user, repetir pruebas
cerradas ni modificar los servicios por este cierre.


---

## Consolidación de continuidad del release integrado — 19/11/2026

ACTION: BBTI_INTEGRATED_RELEASE_SOURCE_DOCUMENTARY_CONSOLIDATION_R1


### Publicación SOURCE de Factura TEMP — 19/11/2026

- Baseline SOURCE:
  `8807b4a9a99870396ec35a7ef1011cec1402c745`.
- Commit funcional:
  `793152d3cdc9ab752cfb699839358255a1db25c5`.
- Commit documental y cierre SOURCE publicado:
  `3716b71c2ff812710f4d9c44242dbad73331336f`.
- Integración fast-forward autorizada por PO: PASS.
- Publicación SOURCE main: CLOSED_PASS.
- main, origin/main y remoto real coincidentes en
  `3716b71c2ff812710f4d9c44242dbad73331336f`.
- Working tree limpio en la comprobación previa a esta edición.
- Rama `feat/compras-factura-temp-recovery-r1` preservada.
- Delta acumulado: 18 archivos, +1673/-45.
- Composición: 6 funcionales, 6 tests y 6 documentales.
- G3=CLOSED_PASS_WITH_OBSERVATIONS.
- CROSS_USER_RECOVERY=PASS_PO.
- CROSS_USER_CONFIRMATION=NOT_ACCREDITED.

Estas identidades corresponden al cierre publicado,
anterior al commit de la presente consolidación.
No anticipar la SHA de esta nueva adenda.

### Reconciliación de continuidad operativa

MSE Actual acredita el cierre técnico del release
integrado del 18/11, Enterprise y EC2 f26f292d,
GHCR run 44327350315, job 134882118595, 4/4 PASS.

La aceptación funcional productiva integral permanece
pendiente. El rendimiento se cerró con observaciones.

Las identidades completas y evidencias se mantienen
en el [manifest rector](../../31-governance/RELEASE_MANIFEST.md).

No confundir este release técnico anterior con
Factura TEMP R3, todavía no promovido a Enterprise.

### Compatibilidad Enterprise y SQL productiva

Evidencia recibida y acreditada por MSE 2.0
en la delegación operativa del 19/11/2026.

- Enterprise baseline:
  `f26f292d2c07c9a75feba9db782c5b30982b1060`.
- Compatibilidad funcional/test: 12/12 PASS.
- Adaptaciones funcionales necesarias: NONE.
- DATABASE=gestion_documental.
- ROLE=document_platform.
- TRANSACTION_READ_ONLY=on.
- AUTH_USUARIO_WORKSPACES_SELECT=PASS.
- CORE_SISTEMAS_SELECT=PASS.
- SQL_PREFLIGHT=PASS.
- PRODUCTION_SQL_COMPATIBILITY=CLOSED_PASS.

La comprobación SQL fue realizada desde MS Documentos
productivo, según evidencia institucional de MSE Actual.
Supera la condición de privilegios no acreditados
registrada durante G3.

No repetir las consultas ni conceder GRANT.
No equivale a aceptación funcional productiva de R3.

### Observaciones funcionales preservadas

- Confirmación cross-user R3 aún no acreditada.
- Seguridad focal: PASS_STATIC_WITH_OBSERVATIONS.
- Concurrencia exhaustiva y captura completa de red
  no acreditadas.
- Sin verificación física independiente R2 posterior.
- Observaciones OCR legacy y principalActivo preservadas.
- Pruebas G2 y focales previamente acreditadas:
  no sumar casos superpuestos ni repetir integralmente.
- Aceptación productiva anterior Auth/OCR pendiente.

No reabrir el diagnóstico cross-user cerrado en SOURCE.
No reabrir TEMP328/334 ni custodias históricas.
No repetir migración 0025 o instalación OCR.

El [delta técnico G3](../../../DELTA_TECNICO_MSE3_A_MSE_ACTUAL.md)
se conserva íntegro como evidencia histórica.
Los estados posteriores acreditados constan en esta
adenda y en el manifest rector.

### Gobernanza y precedencia

Se preservan todas las entradas históricas. La presente
adenda prevalece únicamente sobre estados anteriores
incompatibles con estos acontecimientos acreditados.

MSE 2.0 acepta la entrega G3 y delega a MSE 3.0
la coordinación y ejecución operativa del ciclo G4.

- MODE=NORMAL.
- GOVERNANCE=R1.
- MANUALS_VERSION=R3.
- MAX_GATES=4.
- RELEASE_MODEL=ONE_INTEGRATED_RELEASE.
- ARCHITECTURE_OWNER=MSE_2_0.
- RELEASE_GOVERNANCE_OWNER=MSE_2_0.
- OPERATIONAL_EXECUTOR=MSE_3_0.
- AUTHORIZATION_OWNER=PO.
- MANUALS_AND_LIBRARIAN_OWNER=MSE_2_0.
- MSE3_IS_SUCCESSOR=NO.
- CODEX=OPTIONAL_SPECIALIZED_COLLABORATOR.

La delegación no concede autorización automática
de commit, push, publicación GHCR ni despliegue EC2.

No reabrir G2/G3 ni activar RECOVERY por estados
documentales históricos superados.

La colección permanente vigente es R3, diez manuales
00-09 del 18/11/2026, instalada en:

`~/Documentos/importantesProyectos/Documentacion_tecnica/BBTI_MANUALES_2026-11-18_R3/`

Consultar primero el manual 00 y los manuales
específicos según la intervención.

La actualización externa y transferencia a Bibliotecario
permanecen bajo responsabilidad de MSE 2.0.

### Estado del nuevo release Factura TEMP

- SOURCE_FUNCTIONAL_PUBLICATION=CLOSED_PASS.
- SOURCE_DOCUMENTARY_CONSOLIDATION=PREPARED_PENDING_PUBLICATION.
- ENTERPRISE_PROMOTION=PENDING.
- GHCR_PUBLICATION=NOT_AUTHORIZED.
- EC2_DEPLOYMENT=NOT_AUTHORIZED.
- PRODUCTION_FUNCTIONAL_ACCEPTANCE_R3=NOT_PERFORMED.
- POST_DEPLOY_DOCUMENTATION_R3=PENDING.

El release anterior del 18/11 y R3 Factura TEMP del 19/11
son acontecimientos diferenciados.

No atribuir a R3 imágenes o digests anteriores.
No introducir migraciones, cambios Auth, cambios OCR Python
ni integración NAS por este requerimiento.

NAS permanece fuera del alcance.

### Próxima intervención

Validar y publicar, con autorización PO, esta
consolidación documental SOURCE.

Después preparar la promoción focal Enterprise
sin modificar código previamente aceptado.

MSE 3.0 coordina el ciclo restante y entrega a MSE 2.0
un único delta de continuidad final con evidencias.

No realizar transferencia independiente a Bibliotecario
ni modificar los manuales externos.

Escalar divergencias materiales, incompatibilidad,
riesgos productivos, fallos de publicación/despliegue
o insuficiencia real de evidencia.


---

## 2026-11-19 — Cierre productivo R3 Factura TEMP

ACTION: BBTI_FACTURA_TEMP_POST_DEPLOY_DOCUMENTARY_CLOSURE_R1

Adenda exclusivamente documental posterior al despliegue
y aceptación funcional productiva del 19/11/2026.

Prevalece sobre estados anteriores incompatibles de R3.
Se preservan íntegramente los antecedentes históricos.


### Identidades acreditadas

- SOURCE funcional:
  `793152d3cdc9ab752cfb699839358255a1db25c5`.
- SOURCE cierre G3:
  `3716b71c2ff812710f4d9c44242dbad73331336f`.
- SOURCE consolidado previo a esta adenda:
  `5f5ff49b1e48d2dea200c4a1476a7cff3f6e9f58`.
- Enterprise funcional:
  `c2198dcb8a6eaeb063f45c31d6b225e630e81af9`.
- Enterprise publicado y desplegado:
  `5066a6e9eaeb95e3039ce16f6a0acb732846ea0e`.
- EC2 checkout acreditado durante despliegue:
  `5066a6e9eaeb95e3039ce16f6a0acb732846ea0e`.
- GHCR workflow: `.github/workflows/build-images.yml`.
- GHCR run: `44563965795`.
- GHCR job: `135700545256`.
- Publicacion integrada: 4/4 SUCCESS.
- Plataforma: linux/amd64.

### Instrucciones al siguiente colaborador

El requerimiento R3 Factura TEMP esta desplegado
y cuenta con aceptacion funcional productiva 8/8 PASS.

No tratar los estados PENDING historicos como
incidencias vigentes cuando esta adenda los supera.

Consultar RELEASE_MANIFEST.md para digests completos,
directorio release, evidencias y rollback.

La gobernanza y la transferencia al Bibliotecario
permanecen bajo MSE Actual.

No repetir el diagnostico cross-user ni reabrir
custodias historicas de TEMP328/334 o 48 archivos.

R2 NAS es el siguiente requerimiento autorizado
para continuidad una vez cerrado G4 documental.
Recuperar su acuerdo funcional y evidencia DEV.
No comenzar nuevamente desde cero.

### Aceptacion funcional productiva PO

Fecha: 2026-11-19.

Resultados expresamente reportados por PO:

1. Carga de factura TEMP: PASS.
2. Recuperacion despues de actualizar: PASS.
3. Recuperacion por otro usuario: PASS.
4. Preservacion OCR y PDF: PASS.
5. Aislamiento documental: PASS.
6. Confirmacion por otro usuario: PASS.
7. Persistencia definitiva: PASS.
8. Regresion OC/OS: PASS.

PRODUCTION_FUNCTIONAL_ACCEPTANCE_R3=CLOSED_PASS.
R3_FUNCTIONAL_TESTS=8_OF_8_PASS.

La confirmacion cross-user pendiente de acreditacion
en SOURCE queda aceptada funcionalmente en produccion.

La evidencia funcional corresponde a declaracion PO;
no implica auditoria SQL/R2 independiente ni prueba
exhaustiva de concurrencia.

No extender esta aceptacion a pendientes historicos
Auth, OCR o consumo efectivo de APISPERU.

### Observacion posterior y decision PO

Contexto: BBTEC OC 002870, expediente 3,
documento base 500.

- TEMP 336 y 337: mismo nombre de factura FF62-1891.
- TEMP 338: factura FF62-1695, nombre diferente.
- Los registros fueron observados como pendientes.
- Identidad binaria SHA256 no verificada.
- Duplicidad documental definitiva no establecida.

PO decide mantener R3 PASS y diferir el diagnostico.
No realizar borrados, cambios de contexto ni
intervenciones correctivas por esta observacion.

Requerimiento futuro separado:

- Descartar/eliminar factura TEMP cargada por error.
- Cambiar OC/OS de una factura TEMP pendiente.

El diseno y autorizacion de ese requerimiento
permanecen pendientes.

TEMP_DUPLICATE_DIAGNOSTIC=DEFERRED_BY_PO.

### Gobernanza y continuidad

- MODE=NORMAL.
- GOVERNANCE=R1.
- MANUALS_VERSION=R3.
- MAX_GATES=4.
- RELEASE_MODEL=ONE_INTEGRATED_RELEASE.
- MSE 2.0 conserva arquitectura y gobierno institucional.
- MSE 3.0 dirige el ciclo operativo delegado.
- PO conserva las autorizaciones.
- Codex es colaborador opcional.

Preservar SOURCE nativo pnpm, OCR Python systemd
y Cloudflare R2 directo en LAB unificado y PROD.
No reintroducir MinIO como intermediario en ese circuito.

No reintroducir PID files, timers administrativos
ni supervisores adicionales para SOURCE.

No repetir pruebas, migracion 0025, builds, publicacion
GHCR o recreacion por cambios exclusivamente documentales.

Conservar la limpieza .next diferida hasta la detencion
ordinaria de Web LAB, segun disposicion PO.

La presente adenda no acredita su propia publicacion.
Registrar las identidades documentales posteriores
solo despues de commit/push y sincronizacion efectivos.

Pendientes:

1. Publicacion documental SOURCE autorizada.
2. Adaptacion y publicacion documental Enterprise.
3. Fast-forward documental EC2 autorizado,
   sin recreacion de servicios.
4. Entrega de continuidad a MSE Actual.
5. Actualizacion de manuales externos y Bibliotecario
   bajo responsabilidad institucional MSE 2.0.

No abrir G5. El cierre documental pertenece a G4.

Siguiente requerimiento: R2 NAS, conservando G1
y la validacion de infraestructura NAS DEV ya acreditadas.
No iniciar implementacion NAS antes del cierre R3.


---

## 2026-11-25 — Cierre institucional documental NAS R1

Repository=SOURCE. Esta adenda prevalece únicamente sobre estados históricos incompatibles de NAS; no reescribe antecedentes ni autoriza acciones por su lectura.

SOURCE conserva excluidos los scripts locales de recuperación no rastreados.

### Identidad del release y procedencia

| Plano | Identidad acreditada |
| --- | --- |
| SOURCE funcional NAS previo | `8db6fb57590e1f1715208ef8744d77fc248d37b1` |
| SOURCE corrección CSP publicada / HEAD anterior a esta revisión | `4776f2e907e64e3eaaacf5d6cff2874a907a3785` |
| Enterprise anterior | `4e9fb65feeeac1441508dd4d1aff10074bc6d0cc` |
| Enterprise constructor GHCR | `8cbdbc176158b69f676f5bbf8acef483af659ae1` |
| Enterprise documental publicado anterior a esta revisión | `33b646a7b73fb8ae549727d5cd3ac09b1bf08203` |
| EC2 checkout acreditado, no observado nuevamente | `33b646a7b73fb8ae549727d5cd3ac09b1bf08203` |
| GHCR | run **45508868647**, main / components=all, SUCCESS, 4/4, linux/amd64, 3m30s |

Workflow existente: `.github/workflows/build-images.yml`.
[Run acreditado](https://github.com/BBTI-SAC/documental-platform-bbti-prod/actions/runs/45508868647).
Los nuevos commits documentales de esta revisión no existen todavía: publicación SOURCE/Enterprise pendiente de autorización específica PO. No anticipar sus SHA ni confundirlos con el constructor.
### Producción acreditada y aceptación PO

Release activa acreditada: `/home/ubuntu/releases/documental-platform-bbti/integrated-45508868647-8cbdbc17-r1`.
Checkout: `/home/ubuntu/apps/documental-platform-bbti-prod`.
Validación técnica heredada del **25/11/2026 08:06:03 PET**: cuatro servicios RUNNING_PASS; API PASS; Web HTTP200; NATS HEALTH PASS; configuración NAS PASS; smbclient 4.23.8; raíz SMB READ_ONLY PASS; APISPERU preservado. No es una nueva inspección de esta edición.

Evidencias en `evidence/` de la release: `preparation-result.txt`, `deployment-execution.txt`, `runtime-validation.txt`, `runtime.before.json`, `runtime.after.json`, `images-pulled.json`, `release-overrides.sha256`.
Preservar `release.images.yml`, `rollback.images.yml`, `nas.production.override.yml`, `/etc/documental-platform/ms-documentos.apisperu.override.yml` y `.env.production`; no copiar secretos a Git.

PO, 25/11: «OC -> ok», «Factura -> ok», «Guia -> ok», «NI -> ok», «Tambien fui a contabilidad y la visualizacon es de nas», «yo hice la aceptacion transversal».
`PRODUCTION_TRANSVERSAL_ACCEPTANCE=PASS_PO`, `PRODUCTION_NAS_ARCHIVER=PASS_PO`, `PRODUCTION_NAS_VIEWER=PASS_PO`, `PRODUCTION_CSP_FUNCTIONAL_CORRECTION=PASS_PO`.
Es aceptación comunicada por PO; no nueva prueba automatizada ni certificación independiente de todos los casos individuales de Finanzas/OP/RH/sustentos.

Testigos PO bajo `/volume1/GESTION-DOCUMENTARIA/PLATAFORMA_DOCUMENTAL/`:

- `documentos/2026/04/BBTEC/OC_003214.pdf`
- `documentos/2026/04/BBTEC/OC_003214__FACTURA_F001-13640_20522718786.pdf`
- `documentos/2026/04/BBTEC/OC_003214__GUIA_T001-8018_20522718786.pdf`
- `documentos/2026/04/BBTEC/OC_003214__NOTA_INGRESO_0000003344.pdf`

Contabilidad: visualización NAS aceptada por PO. Archivo498 fue testigo anterior de CSP (`documentos/2026/04/BBTEC/OS_000262__FACTURA_F001-00001680_20610013822.pdf`); no se acredita una nueva prueba individual de 498.
### Continuidad institucional y siguiente acción legítima

PO conserva autorización y aceptación. MSE Actual/MSE 2.0: arquitectura, gobierno de release/manuales/Bibliotecario; MSE 3.0: dirección técnica; MSE 3.1: operación DEV y ejecución delegada; Codex ejecutor. Máximo cuatro gates: G1/G2/G3 cerrados; esta actualización pertenece a G4 y no crea G5.
Documentos versionados gobiernan; colección externa permanente `BBTI_MANUALES_2026-11-18_R3`, revisión 25/11/2026, subordinada. Antecedentes19/11/24/11 no son tareas actuales. No reabrir Factura TEMP, custodias de los 48 archivos, SMB/VPN, migración 0026, ingeniería NAS ni aceptación transversal. No extender PASS_PO a otros requerimientos independientes.

Esta revisión es documental local: commit/push SOURCE y Enterprise pendientes de autorización específica. Historial Enterprise propio preservado; no copiar manifest/inventario completo desde SOURCE. Procedencia funcional SOURCE `4776f2e907e64e3eaaacf5d6cff2874a907a3785`; el futuro SHA documental SOURCE se registrará externamente al publicarlo, sin autorreferencias imposibles. EC2 sync=PENDING hasta autorización/acceso y ejecución docs-only fast-forward; sin pull de imágenes ni recreate.
Paquete Bibliotecario y legado en `/home/loxi1/bbti-evidence/nas-institutional-closure-20261125-r1/`; transferencia/indexación=PENDING_MSE_ACTUAL_VALIDATION. No crear R4. Próximo paso: revisión MSE Actual/PO del diff y autorización focal publicación SOURCE→Enterprise→sync documentalEC2. Futuro DELETE productivo y respaldo NAS son decisiones separadas, no ejecutar en este cierre.
### Seguridad, retención y recuperación

`PRODUCTION_R2_DELETE=DISABLED_BY_DESIGN`; `DEV_ONLY_DELETE_RESTRICTION=PRESERVED`; `PRODUCTION_R2_RETENTION=ACTIVE`. El código exige NODE_ENV=development, destino SYNOLOGY_DEV, autorización exacta y demás controles; cambiar solo una variable no habilita DELETE productivo. La permanencia en R2 de Factura/Guía/NI OC003214 y facturaOS000262 citadas arriba es esperada y no invalida NAS ni visor.

`NAS_BACKUP_RESTORE=NOT_ACCREDITED`. Hyper Backup y Snapshot Replication diferidos a consulta PO. Synology BASIC/BTRFS sin redundancia acreditada; BTRFS no es backup. Cuota técnica compartida de 500 GiB. Usuario SMB `documental_platform_dev` compartido entre DEV/PROD: separación por raíces/destino/configuración, no credenciales independientes.
DEV: `GESTION-DOCUMENTARIA/_DEV_DOCUMENTAL_PLATFORM`; PROD: `GESTION-DOCUMENTARIA/PLATAFORMA_DOCUMENTAL`. VPN/OpenVPN y SMB existentes preservados.

RDS snapshot automático aceptado: `rds:database-1-2026-11-24-08-42`; sin snapshot manual adicional; restore no probado. Respaldo RDS no protege archivos NAS. Cualquier futura eliminación productiva exige autorización independiente, protección NAS, revisión del bloqueo de código, integridad y auditoría; no está autorizada por este cierre.

Rollback de aplicación condicionado a compatibilidad de 0025/0026, authVersion global, JWT contextual, contraseñas actuales y auditoría; no reducir auth_version, no revivir JWT ni restaurar Auth legacy incompatible. No restaurar RDS ni borrar reservas/archivos como rollback automático. Preservar evidencia e imágenes anteriores; si no existe destino acreditado compatible, STOP y decisión PO/roll-forward.


---

## 2026-11-25 — Ampliación focal DELETE productivo, ingeniería local R1

### Estado vigente de la ampliación DELETE — 25/11/2026

ACTION=BBTI_PRODUCTION_R2_SAFE_DELETE_AND_FINAL_CLOSURE_R1. El mandato rector sustituye las recetas documentales pendientes anteriores, conserva el cierre NAS/CSP y añade ingeniería focal de eliminación productiva segura. NORMAL/R1, máximo cuatro gates, ONE_INTEGRATED_RELEASE.

- G1 focal: contrato y revisión directa Codex de los entregables previos completados; no validación externa MSE Actual.
- G2: implementación local y pruebas técnicas PASS; aceptación física DEV del flujo ordinario acreditada abajo. G3 pendiente de aceptación explícita PO y autorización de integración/publicación.
- SOURCE HEAD sigue `4776f2e907e64e3eaaacf5d6cff2874a907a3785`; el nuevo delta es local, sin commit/push. No hay SHA funcional nuevo ni constructor nuevo.
- Enterprise sigue `33b646a7b73fb8ae549727d5cd3ac09b1bf08203`, constructor `8cbdbc176158b69f676f5bbf8acef483af659ae1`. Sus14adendas documentales están preservadas; la extensión funcional NO está promovida.
- Producción continúa en release 45508868647, ya aceptada para NAS/visor/CSP. No hay nuevo GHCR, deploy, cambio de flags ni DELETE productivo en esta intervención.
- El bloqueo DEV-only describe esa release desplegada. El código SOURCE local ahora contempla autorización productiva separada, deshabilitada por defecto; no confundir ingeniería con activación.
### Evidencias reales G2

- Node: 63 PASS/0 FAIL, tres suites afectadas (MOVE 35, adaptadores 22, exclusión 6); typecheck estricto PASS.
- Jest: 118 PASS/0 FAIL, 7 suites focales/afectadas; no repetición de suites históricas ajenas.
- PostgreSQL G2 real READ ONLY: 5 sentencias del repositorio Parse/Describe,29 parámetros Bind válidos, auditoría/lease y exclusión real entre 2 sesiones PASS; DML0. No reaplicación ni modificación de 0026.
- Build Nest Documentos:PASS en salida aislada con sello de fuentes. Gateway no requiere build por este delta, no tiene cambios funcionales.
- SDK real con transporte controlado: un solo intento DELETE ante 503 y transmisión de If-Match, sin credenciales productivas.
- Prueba física NUEVA R2 DEV: testigo UUID exclusivo 109 bytes; ETag incorrecto → HTTP 412 y objeto conservado; ETag correcto → HTTP 204 y HEAD 404. La documentación oficial consultada no enumera DELETE como operación condicional; su aplicación se acredita aquí por prueba DEV, no por suposición AWS ni por aceptación productiva.
- Prueba funcional DEV ordinaria solicitada al PO: TEMP423 → archivo592/documento588/reserva36/expediente4, BBTEC/cliente1. Ruta `documentos/2025/12/BBTEC/OC_002896.pdf`, 357458 bytes, SHA256 `3add252e5ebc057a20656d97404a60590d6af7beae3249c98ba4745a38920904`.
- Estado observado:NAS VERIFICADO, R2 ELIMINADO_ACREDITADO, trabajo COMPLETADO, último error null. Auditoría: intención 15:32:03.181Z→respuesta DELETE 204 a 15:32:03.445Z→ausencia/acreditación15:32:03.641Z, mismo UUID de intento. HEAD independiente 404 y lectura NAS independiente con hash/tamaño idénticos. Visualización PASS_PO; descarga aún no confirmada por PO.
- Actualización DEV:solo Documentos3002, entorno preservado en memoria, artefacto anterior privado y Gateway/Auth/Web preservados; READY 3/3 PASS. El último ajuste de verificación del endpoint es productivo y tiene build/pruebas propias; no se atribuye al recorrido físico DEV una ejecución bajo NODE_ENV=production.

Evidencias durables: `/home/loxi1/bbti-evidence/nas-production-safe-delete-20261125-r1/`, `CHECKPOINT.json`, `checkpoints/g2-conditional-delete-r1/`, `r2-conditional-delete-dev/result.json`, `dev-physical-592/result.json`, `dev-runtime/execution.json`. La prueba física ordinaria usa el flujo DEV existente; la rama productiva se prueba con configuración/adaptadores controlados hasta autorización G4.
### Fronteras reales y continuidad

Backup/restore NAS sigue NO_ACREDITADO. No equiparar BTRFS/SHA256/backup RDS con respaldo recuperable. Antes de DELETE productivo se requiere protección acreditada o una aceptación PO explícita, informada y acotada del riesgo de copia única. Ingeniería y prueba DEV no aceptan ese riesgo por el PO.

Publicación/commit SOURCE, promoción/commit/push Enterprise, GHCR integral y deploy EC2 requieren autorización específica ligada al delta revisado; se solicitarán juntas, separando decisiones irreversibles. Despliegue inicial con DELETE productivo false, sin ampliar candidatos B ni modificar cutoff/secretos/flagsNAS existentes. G4 no está cerrado.

Tras autorización:SOURCE→Enterprise preservando historias/adaptaciones→un workflow build-images.yml main/all→cuatro imágenes OCI/runnable linux/amd64→EC2 por digests; luego activación piloto exacta únicamente con protección/decisión y autorización de DELETE. No latest, gh CLI, build EC2, migración automática ni rollback ciego. Recuperación tras borrar debe conservar lectura NAS y estados 0026; no volver a un runtime dependiente del objeto R2 eliminado.

Los procedimientos docs-only anteriores eran válidos para el cierre pendiente previo. No ejecutarlos sobre este incremento funcional ni usar sus inventarios/baselines como autorización actual. No publicar Enterprise antes de acreditar el nuevo SOURCE publicado. No inventar SHA/RunID/digests futuros. Reutilizar manuales R3, preservar 08 y transferir paquete tras validación MSE Actual; no indexación Bibliotecario supuesta.


---

## 2026-11-25 — Aceptación G3 PO y autorización incremental de publicación

La aceptación G3 pendiente de las entradas anteriores queda acreditada por PO. Archivo592 / reserva36 / OC_002896: visualizaciónPASS_PO y descargaPASS_PO desde interfaz DEV, renombrada localmente592.pdf. Codex contrastó directamente357458bytes y SHA256 `3add252e5ebc057a20656d97404a60590d6af7beae3249c98ba4745a38920904`, idénticos a la lecturaNAS independiente ya acreditada. No se repitió upload, OCR, confirmación, DELETE ni pruebas anteriores.

Commit funcional SOURCE local: `b90eca0dd7fd3c1b7432b4266a7c64708e29cf6f` (15rutas exactas; parent4776f2e9). G3=ACCEPTED_BY_PO. El PO autoriza integración/publicación SOURCE, promoción selectiva Enterprise, GHCR integral y despliegue controlado conforme a R1/ONE_INTEGRATED_RELEASE. La publicación se ejecuta después de esta entrada; sus SHA/recibos efectivos se registran externamente y en las siguientes adendas sin autorreferencia.

DELETE productivo debe seguir deshabilitado hasta resolver la política de protecciónNAS. No existe autorización para borrar objetos productivos ni candidatosB. El flagDEV continúa false en producción. No nuevas migraciones. La aceptaciónPO no se presenta como validación independiente MSEActual ni como indexaciónBibliotecario; sus estados se acreditarán separadamente.

Evidencia: `/home/loxi1/bbti-evidence/nas-production-safe-delete-20261125-r1/PO_G3_AND_INCREMENTAL_AUTHORIZATION.json`, `dev-physical-592/result.json`, `source-functional-commit.json` y recibos de publicación posteriores. Los scripts locales SOURCE permanecen excluidos.


---

## 2026-11-25 — Cierre físico productivo DELETE permanente y continuidad institucional

ACTION=BBTI_PRODUCTION_R2_SAFE_DELETE_AND_FINAL_CLOSURE_R1; NORMAL/R1, colecciónR3, ONE_INTEGRATED_RELEASE. G1/G2/G3 cerrados. PO autoriza activación permanente y recuperación institucional exclusivamente reserva7/archivo504, más automatismo ordinario NUEVOS en BBTEC/cliente1 y BBTI/cliente2. Mandatos y declaracionesPO preservados en `/home/loxi1/bbti-evidence/nas-production-safe-delete-20261125-r1/final-physical-documentary-closure-r1`. No nueva ingeniería, build, migración ni publicaciónGHCR.

### Identidad de release y configuración efectiva

GHCRrun45698872132 SUCCESS4/4, constructorEnterprise `1e1377a83fea4811f93b19628aed4b2d0dcd7279`, checkout previoEC2 `0d8f4cb139ce13fe4f37c88f03ab3e973b363d9f`. Deploy integral y validación técnica PASS acreditados por MSE3.1, sin repetición. Releaseactiva `/home/ubuntu/releases/documental-platform-bbti/integrated-45698872132-1e1377a8-r1`. Cuatro digests linux/amd64 preservados:

- api-gateway:`sha256:55b04235af79c484fe2bc2c6ec9a2a1ecf2d09b373a89b7533c36b9b4ee60e34`
- ms-auth:`sha256:2bf72bdff09ed42508c739cbb0c4f09b9f192500d85c588885c21e72a507f80f`
- ms-documentos:`sha256:e830168139d3a550a871f48f72b7f628d3eccaf6696a26df433530c7368c81ea`
- web-admin:`sha256:bba959ab197ec890d2fed429a4857feff800a1d197ee94232589a362d0a4e75c`

Configuración aplicada por autorizaciónPO:versión1,modoNUEVOS,permanente:true,sin propiedad hasta. DELETE_FROM=`2026-11-25T20:00:00Z`; cutoffNASindependiente=`2026-11-24T22:48:35.970Z`;contextosBBTEC:1 yBBTI:2. DELETEPROD=true,DELETEDEV=false,visoraceptado=true. SoloDocumentos recreado porconfiguración con mismo digest; demáscontenedores preservados,health/ready200 PostgreSQL/NATS UP. No renovación ni fecha artificial. Revocación:deshabilitar flag productivo en últimooverride efectivo,validarCompose yrecrear soloDocumentos mismo digest; editar archivo no cambia el proceso yaejecutado. Preservar evidencia yno rollbackautomático.

### Recuperación institucional504 y aceptaciónPO

Archivo504/documento512/reserva7 UUID8618824d-9781-825a-a45b-6e0a06f7234b,v1,expediente3,BBTEC/cliente1. Ruta `documentos/2026/04/BBTEC/OC_003211__FACTURA_F001-7164_20600211618.pdf`. Única invocación de recuperarPendientesExactosProduccion bajoNUEVOS,sin ampliarEXACTO ni repetirconfirmación. NAS522007bytes/SHA256`d18207ca73ce7c8ff92d2b202d399f1538ac7298b9e40ec46c6781b89789f8b7`. DELETE204yHEAD404,autorización durable ymismaintención/respuesta/ausencia `4c304057-2005-4c98-b231-b2b8481bbbd5`,estadoELIMINADO_ACREDITADO/COMPLETADO,documentoconfirmado yrelaciónpreservada. PO confirmó explícitamentevisualizaciónPASS,descargaPASS ycontenidocorrecto;previewPOproveedorNAS, sin persistir ni reutilizar ticket compartido.

### Testigo nuevo automático505:GuíaTEO1-329

Archivo505/documento513/reserva8 UUID587e84b2-b2e6-8b76-a135-381fe52402a1,v1,BBTEC/cliente1/expediente3,adjunto_guia. Confirmación25/11 21:57:33.768334Z (16:57:33PET),CLAIM21:57:33.805812Z. PO confirmóflujoordinario yvisualización/descargaPASS. No recuperaciónmanual505 porCodex ni nueva confirmación provocada por la verificación. Cadena postcommitexistente:confirmación→NASverificado/lecturavisor→autorizaciónpermanente→DELETEcondicional204→ausencia acreditada yHEAD404. Mismointento `722ddaae-2ebb-40d0-8d33-6f79abfc5250`. If-Match exigido poradaptadorpublicado yETagopaco registrado; sin afirmar captura independiente de paquetes.

RutaR2/NASidéntica `documentos/2026/04/BBTEC/OC_003211__GUIA_TEO1-329_20600211618.pdf`;NASindependiente452079bytes/SHA256`a34797c1ff772c9fdded951528f448bcca24ec9a3ae70546f0b63934b9c1962d`,estadoCOMPLETADO/ELIMINADO_ACREDITADO,documentoconfirmado. DescargaHTTPindependiente desde endpointpúblicoautorizadoHTTP200(application/pdf) coincideexactamente en452079bytes ySHA256 conNAS/RDS. Ticket generado mediante lógica existente permaneció solo enmemoria, sin exposición nipersistencia.

### Conciliación de copias locales y exclusiones

507.pdf local1819732bytes/hash2ef7cd7b5d6e1f0cc05e1fd53bd8ce2eed0270dc550a51103428d945c3b88b93 no corresponde aarchivo507 enRDS;POidentificóelpreview504. Copiaslocales505.pdf y505-original.pdf también sonPDFgeneradosporvisor/navegador(CreatorFirefox,ProducerSkia/PDFm149),conbytes/hashesdistintos. No se declaran idénticas aNAS ni se usan comoprueba deidentidadalmacenada. La igualdadacreditada corresponde aloriginal recibido porHTTPpúblico yNAS, separada dePASS_PO. No fallodeintegridadservidoracreditado.

Reservas1–6/archivos498–503 quedanexcluidos porconfirmaciónanteriora20Z. Filascompletas conservanSHA256idénticos antes/después;ningunaintervención físicaenobjetosexcluidos. OC003211principal503/documento511 sigue enR2;su exclusión no afecta nuevosadjuntoselegibles. Losobjetosanterioresno se adoptanretroactivamente.

HyperBackupCLOSED_PASS_PO;recuperaciónhashPASS;riesgomismovolumenBASIC eintervaloentrebackupsdiarios aceptados. No se atribuyebackup previoacadanuevodocumento. Sinreaperturabackup,OCR/R2/NAS/periodos/migraciones/infraestructura, sinDELETEdirecto,cron,timersni nuevosservicios.

Cierre técnico/funcional físico acreditado; este incremento esexclusivamentedocumental. Commit/pushSOURCE→adendaspropiasEnterprise→sincronizaciónEC2 documental, sinrebuild nirecreate. SHAfinales ypreservaciónruntime se registran enrecibosexternos tras ejecución, evitandoautorreferencia. EntregaMSEActual paraactualizaciónincrementalR3,Bibliotecario,legadosucesoryresolucióndefinitivaG4;noafirmar indexaciónoaprobaciónexternanorecibida.
