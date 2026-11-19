# Factura TEMP — recuperación contextual de Compras

ACTION=BBTI_FACTURA_TEMP_RECOVERY_IMPLEMENTATION_R1
Fecha: 2026-11-18
G1=CLOSED_DESIGN_PASS
G2=IMPLEMENTED_FOCAL_TESTS_PASS
G3=PENDING_PO_VALIDATION
G4=NOT_AUTHORIZED

## Base, autorización y estado Git

Contrato leído íntegramente: `/home/loxi1/Descargas/BBTI_FACTURA_TEMP_CONTINUIDAD_FUNCIONAL_MINIMA_2026-11-18_R1.md`.
Orden: adjunto `750d387d-ec55-4dff-be0b-0fd02737139a/Texto pegado.txt`.

SOURCE inicial: `main`, limpio, HEAD y origin/main local `8807b4a9a99870396ec35a7ef1011cec1402c745`.
SOURCE final: rama focal `feat/compras-factura-temp-recovery-r1`, mismo HEAD. `main` no se ha avanzado. Cambios sin staging ni commit, disponibles para revisión. No se consultó el remoto ni se hizo push.
No se reabrieron inventarios históricos ni los antiguos 48 cambios.

## Resultado funcional

- La reserva de Factura de Compras persiste contexto validado (expediente y principal OC/OS) en `carga_operaciones.metadata.comprasFactura` desde el INSERT, antes del PUT existente.
- El fingerprint incorpora este contexto para las reservas nuevas que lo declaran; los consumidores sin contexto mantienen su fingerprint anterior.
- Listado contextual compartido, sin filtro por cargador, dentro de Documentos de compra. Muestra identidad TEMP, nombre, fecha, ID del cargador y disponibilidad de OCR/borrador; selección individual y actualización explícita.
- Recuperación del mismo TEMP y preview existente, sin upload y sin procesar OCR. La carga inicial conserva su solicitud OCR.
- Extracción completa/parcial/fallida/ausente/en curso y borrador persistido: el borrador prevalece; formulario existente editable, incluso sin OCR. Se suprimen localmente los fallbacks del proveedor de la OC/OS para Factura TEMP; se mantiene el contexto legítimo del expediente/comprador.
- La confirmación y borrador reutilizan la materialización existente. El endpoint compartido recupera internamente la clave idempotente original; nunca suplanta al cargador. El actor real sigue llegando a materialización, auditoría y validación V2. La fila conserva `actor_id` original.
- Bloqueos por TEMP, fingerprint, destino reservado y protección frente a OCR tardío se conservan. Confirmaciones compatibles comparten resultado; las incompatibles entran en conflicto.
- Se elimina del bloque histórico la recuperación genérica FACTURA y Factura directa; OC/OS permanecen. Un acceso explícito a la referencia histórica local conserva la recuperación propia válida sin inventar asociaciones.
- Se permiten varias cargas de archivos distintos por contexto. Una respuesta de reserva perdida conserva la identidad para reintentar el mismo archivo.

## Archivos

| Ruta relativa | Cambio |
|---|---|
| `apps/api-gateway/src/documentos/documentos.controller.ts` | Proxy contextual y autorización; multipart con contexto opcional. Indispensable para conservar el tránsito Web → Gateway → Documentos. |
| `apps/ms-documentos/src/documentos/tmp/tmp.controller.ts` | Reserva contextual y cuatro operaciones acotadas de Compras. |
| `apps/ms-documentos/src/documentos/tmp/tmp.service.ts` | Validación JWT/permisos, listado, vínculo inmutable y reutilización de identidad original durante confirmación compartida. |
| `apps/ms-documentos/src/documentos/tmp/tmp.repository.ts` | Contexto atómico en reserva, consulta compartida acotada y listado vigente. Acceso genérico conserva propietario. |
| `apps/web-admin/src/services/carga-segura.ts` | Separación carga/OCR inicial de recuperación; listado backend y selección por ID; uso del contrato contextual al validar. |
| `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx` | Listado local, apertura protegida contra respuesta de otro principal/ámbito y adaptación de datos del modal. |
| `apps/api-gateway/src/documentos/documentos.tmp-compras.controller.spec.ts` | Pruebas de proxy y permisos/contexto. |
| `apps/ms-documentos/src/documentos/tmp/tmp.compras-recovery.spec.ts` | Autorización, descubrimiento, reserva contextual y alcance del repositorio. |
| `apps/ms-documentos/src/documentos/tmp/tmp.documental.spec.ts` | Concurrencia entre validadores, identidad original, auditoría y conflictos contextuales. |
| `apps/ms-documentos/src/documentos/tmp/tmp.repository.spec.ts` | Doble JSON para reserva y regresión del serializador real compartido, sin conexión DB. |
| `apps/web-admin/src/services/carga-segura.temp.test.cjs` | Recuperación sin sessionStorage/OCR, varios pendientes, envelope, borrador y formulario real. |
| `apps/web-admin/src/components/compras/CompraExpedienteEditor.temp-recovery.test.cjs` | Apertura editable, respuestas tardías y TEMP ya confirmado. |

Este informe es el único documento nuevo de relevo; no modifica manuales rectores ni manifests.

## API

`POST /documentos/tmp` conserva `archivo` y admite un campo multipart opcional `comprasFactura`, JSON `{expedienteId, documentoBaseId}`. Solo se acepta mediante identidad/permisos de Compras validados. El servidor deriva el resto del contexto y del ámbito.

Nuevas rutas en Gateway y controlador TEMP (prefijo API existente):

- `GET /documentos/tmp/compras-facturas/:expedienteId/:documentoBaseId`: `{contexto, data: [{tempId,nombreOriginal,actorId,creadoEn,ocrEstado,tieneBorrador,reservada}]}`.
- `GET /documentos/tmp/compras-facturas/:expedienteId/:documentoBaseId/:tempId`: consulta individual con ámbito compartido.
- `GET /documentos/tmp/compras-facturas/:expedienteId/:documentoBaseId/:tempId/preview-url`: preview existente.
- `POST /documentos/tmp/compras-facturas/:expedienteId/:documentoBaseId/:tempId/promover`: exactamente `confirmacionDocumental` o `borradorDocumental`, con el cuerpo documental existente. No acepta destino ni identidad de promoción suministrados por cliente.

Acceso compartido: sistema DOCUMENTAL, menú Compras, `documentos.subir` y `documentos.vincular_expediente`; confirmación/borrador requieren además `documentos.confirmar_ocr` u `ocr.confirmar`. Gateway verifica acceso a expediente y documento. Documentos revalida JWT, identidad de headers y ámbito persistido; revalida expediente, cliente, empresa y principal confirmado OC/OS. La marca interna compartida no es serializable desde un body HTTP.

No se retorna la clave idempotente del cargador en el listado ni en la recuperación compartida. No se elimina globalmente el filtro de propietario. Se excluyen consumidores de regularización OP o integración ajena.

## Validaciones ejecutadas

**218 pruebas PASS, 0 FAIL en los resultados finales de los conjuntos indicados.** Son pruebas offline con dobles y funciones reales aisladas; no certifican PostgreSQL/NATS/R2 reales ni aceptación de navegador.

1. **Documentos: 139 PASS / 5 suites.** Desde `apps/ms-documentos`:

```sh
pnpm exec jest --runInBand --runTestsByPath src/documentos/tmp/tmp.compras-recovery.spec.ts src/documentos/tmp/tmp.documental.spec.ts src/documentos/tmp/tmp.service.spec.ts src/documentos/tmp/tmp.repository.spec.ts src/documentos/tmp/tmp.ocr-context-experiment.spec.ts
```

Incluye el serializador del cliente compartido inicializado por Drizzle: el contrato existente requiere JSON serializado explícitamente. Se conservó ese contrato y se verificó también el nuevo contexto de reserva. El subproceso de esa prueba fue bloqueado inicialmente con EPERM por el sandbox; la ejecución autorizada fuera de él terminó PASS. La prueba usa un destino sintético no conectable y no abre PostgreSQL.

2. **Gateway: 27 PASS / 3 suites.** Desde `apps/api-gateway`:

```sh
pnpm exec jest --runInBand --runTestsByPath src/documentos/documentos.tmp-compras.controller.spec.ts src/documentos/documentos.tmp.controller.spec.ts src/documentos/documentos.tmp-documental.controller.spec.ts
```

3. **Frontend: 52 PASS.** Desde la raíz:

```sh
node --test --test-isolation=none apps/web-admin/src/services/carga-segura.temp.test.cjs apps/web-admin/src/components/compras/CompraExpedienteEditor.temp-recovery.test.cjs apps/web-admin/src/components/compras/Compras.temp.test.cjs apps/web-admin/src/components/ocr/OcrValidationModal.initial-upload.test.cjs apps/web-admin/src/components/compras/CompraExpedienteEditor.pendientes.test.cjs apps/web-admin/src/components/compras/CompraExpedienteEditor.recuperacion.test.cjs
```

4. **Tres typechecks PASS**, sin emisión ni caché incremental:

```sh
pnpm exec tsc --noEmit --incremental false -p apps/web-admin/tsconfig.json
pnpm exec tsc --noEmit --incremental false -p apps/ms-documentos/tsconfig.build.json
pnpm exec tsc --noEmit --incremental false -p apps/api-gateway/tsconfig.build.json
```

5. `git diff --check`: PASS. Sin cambios de lockfile, dependencias, Almacén, modal compartido, materializador, resolución de periodos o manifest. Sin builds de release: el cambio no altera configuración de compilación ni dependencias; typechecks y pruebas focales cubren G2. No se inicia una certificación productiva.

## Límites reales y preservación

- Los TEMP históricos sin asociación acreditada no se incorporan al listado por inferencia. La referencia local propia válida sigue disponible. No se ejecutó backfill.
- La lista incluye TEMP almacenados, vigentes y no materializados; no amplía la vigencia de 24 horas. Las reservas de promoción existentes conservan identidad/destino y sus conflictos.
- Se recupera lo ya persistido. Cerrar el modal no guarda ediciones que nunca fueron guardadas; no se añadió autosave.
- No está acreditada la causa específica de las fallas intermitentes históricas. No se atribuye automáticamente a una recarga.
- Pendientes para G3: PostgreSQL/NATS/R2 integrados, concurrencia real y validación visual PO en SOURCE LAB.
- No se ejecutaron escrituras reales de DB/R2, SQL, migraciones, nuevos servicios, recuperaciones administrativas, builds, commits, push, Enterprise, GHCR ni EC2. No se iniciaron/reiniciaron servicios mediante comandos de esta intervención.

## Recorrido breve propuesto para PO — pendiente, no ejecutado

1. Con componentes SOURCE DEV actuales y usuarios autorizados de Compras, entrar a una OC/OS confirmada. A adjunta una factura y cierra el modal sin confirmar.
2. B abre la misma OC/OS en otra sesión sin referencia local: Actualizar pendientes, elegir ese TEMP y comprobar mismo PDF y datos disponibles, sin nueva carga ni OCR.
3. Repetir sobre los estados OCR que existan en el LAB: completo, parcial o ausente; comprobar edición manual y borrador persistido. No provocar fallos OCR ni reconstruir infraestructura para fabricar casos.
4. Adjuntar otra factura distinta al mismo principal; comprobar selección individual. Cambiar OC/OS y comprobar aislamiento.
5. Con autorización funcional G3, B completa y confirma una factura: una sola materialización, desaparición de pendientes, actor cargador preservado y auditoría del validador. El segundo intento compatible no duplica; payload incompatible debe dar conflicto.
6. Comprobar recuperación OC/OS histórica y documento ya confirmado, sin alterar periodos, Almacén, R2/NAS ni producción.

NEXT=MSE3_REVIEW_AND_PO_G3_VALIDATION
SOURCE_MAIN_INTEGRATION=NOT_EXECUTED
COMMIT=NOT_EXECUTED
PUSH=NOT_EXECUTED
PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

---

## Adenda G3 SOURCE — 19/11/2026 — estado vigente de R3

ACTION=BBTI_FACTURA_TEMP_G3_SOURCE_CLOSURE_R1
RESULT=PASS_WITH_OBSERVATIONS
G3_FUNCTIONAL_ACCEPTANCE=ACCEPTED_BY_PO_WITH_OBSERVATIONS
SOURCE_GIT_CLOSURE=PENDING_AUTHORIZATION
CROSS_USER_RECOVERY=FAIL_DEFERRED_BY_PO

Esta adenda prevalece sobre los pendientes de ejecución/aceptación G3 del informe G2 anterior, que se conserva íntegro como antecedente. Fuente de los hechos funcionales y builds posteriores: orden PO/MSE 3.0 `BBTI_FACTURA_TEMP_G3_SOURCE_CLOSURE_R1`, adjunto `/home/loxi1/.codex/attachments/f3d243ae-e40e-4d5f-b48e-9b72b008ccb5/Texto pegado.txt`. No son pruebas repetidas ni verificaciones independientes nuevas de runtime, SQL o R2.

### Aceptación y límites ratificados

PO acredita recuperación por cargador, recuperación después de refrescar, OCR parcial con edición manual, confirmación, dos pendientes simultáneos, aislamiento OC/OS y regresión OC/OS (recuperación, carga y confirmación). Testigo: TEMP378 → expediente121 / documentoBase541 / OC008979 → documento542 / archivo547 / grupoFactura150 / OCR522, periodo noviembre 2026.

**Otro usuario no consiguió recuperar: FAIL y DEFERRED_BY_PO.** El PASS offline entre actores demuestra una propiedad del código con dobles, no el éxito de la sesión real. No se conoce la causa concreta del fallo entre usuarios ni se inventa un estado HTTP, diferencia de workspace o permiso faltante. No se implementa su corrección en este cierre. La recuperación compartida permanece como capacidad implementada pendiente de cierre funcional; no debe anunciarse como aceptada.

218 PASS (139 Documentos, 27 Gateway, 52 frontend), typechecks 3/3 PASS y ahora builds backend 2/2 PASS y Web Next16.2.7 PASS, prerender22/22, exit0: ratificados por PO/MSE, sin repetición. La recuperación utilizó OCR persistido. No hay captura exhaustiva de red de toda la sesión, verificación física independiente posterior R2 ni concurrencia exhaustiva acreditadas. No afirmar lo contrario.

### Revisión focal de seguridad — estática, sin ejecución autenticada

| Control | Evidencia de código y conclusión limitada al alcance |
| --- | --- |
| JWT y permisos efectivos | Gateway `documentos.controller.ts`, `comprasTmpScope` (línea833), `tmpHeaders` y `assertSecureUploadContext`: identidad autenticada/sistema DOCUMENTAL, menú compras, subir y vincular; confirmar/borrador agregan confirmar_ocr u ocr.confirmar. `tmp.service.ts:32`, `comprasActor`: revalidación JWT por Auth y correspondencia sub/workspace/empresa/cliente con los headers forward; replica permisos y sistema. No usa permisos suministrados por body. |
| Listado, consulta y preview | `tmp.controller.ts`, cuatro handlers compras-facturas, derivan el actor contextual mediante comprasActor. `tmp.repository.ts:124` y `:143`: predicados workspace, empresa, cliente y contexto JSON exacto; revalidación de expediente y OC/OS confirmado vinculado (`assertDocumentalScope`, línea158). Se excluyen regularización OP e integración ajena. Preview (`tmp.service.ts:617`) usa storage persistido, estado y vigencia; no acepta bucket/key arbitrarios. |
| Promoción y asociación | `tmp.service.ts:478`, `documental`: comprueba que tipo/expediente/principal coincidan con la asociación persistida y rechaza grupo ajeno. Conserva fingerprint/destino/identidad de reserva, bloqueo y validación del contexto. Gateway valida empresa/cliente del expediente y empresa del documento; backend completa la relación principal/expediente y ámbito TEMP. |
| Cargador y validador | No se actualiza actor_id del TEMP. Se reutiliza la clave idempotente original sin suplantar actor.actorId. Materialización/V2 reciben al validador real. `tmp.repository.ts:433`/`:454`: transacción y auditoría TMP_PROMOVIDO con el actor actual. `DocumentosRepository.materializarTemporalConExecutor` registra validadoPor y creado_por del validador; la carga conserva su creador original. No se certifica aquí auditoría física entre usuarios que no se logró validar funcionalmente. |
| Rutas generales y sujetos no autorizados | `TmpRepository.own` mantiene actor_id para actor sin Symbol interno; ese Symbol solo lo crea comprasActor después del JWT/permiso, no se deserializa de HTTP. No se encontró eliminación global del owner ni bypass nuevo demostrable. El acceso nuevo sigue condicionado por ámbito y permisos; no se certifica ausencia universal de vulnerabilidades o acceso real exhaustivo. |

**Dictamen:** no se identificó vulnerabilidad nueva bloqueante demostrada en las rutas revisadas. El diferimiento entre usuarios es compatible con una promoción limitada a la aceptación efectiva, manteniendo controles, observación y decisión PO expresas; no acredita funcionalidad compartida ni autoriza G4. No se relajan permisos ni se parchea código por este resultado.

Observaciones preservadas: OCR legacy `FINANZAS/TEMP_REGULARIZACION_OP` corresponde al procesamiento inicial preexistente de FACTURA; no es una fuente de autorización ni sustituye `metadata.comprasFactura`. La confirmación usa contexto persistido y el principal/documentoBase validado, no esas etiquetas. La discrepancia intermedia de `principalActivo` en prevalidación no prueba asociación incorrecta: el flujo R3 comprueba vínculo OC/OS y propaga documentoBaseId a la materialización V2 existente. El testigo aportado coincide con principal541. No se demuestra un bypass por estas dos observaciones; su causa específica no se investigó ni se considera corregida.

### Continuidad SOURCE acreditada por PO/MSE, sin ejecutar recetas ahora

Servicios SOURCE: Node24.16.0, pnpm11.4.0, Gateway3000/Auth3001/Documentos3002/Web3005; DB DEV `gestion_documental_g2_prodclone_20261028`, PostgreSQL `bbti-mvp3005-postgres`, NATS `dp_nats`, R2 DEV y OCR systemd existentes. No equivale a observación contemporánea independiente en esta adenda.

La incertidumbre anterior sobre el lanzador Documentos queda superada por el arranque acreditado en la orden G3: parser Node de `.env` raíz en memoria, flag DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED=true obligatorio y ejecución `node --enable-source-maps dist/main` con cwd `apps/ms-documentos`. Gateway acreditado con el mismo parser raíz y `pnpm --dir apps/api-gateway exec node dist/main.js`. Auth sin cambios. No reiniciar por lectura documental; conservar el entorno LAB.

Builds backend acreditados: `pnpm --filter @documental/ms-documentos build` y `pnpm --filter @documental/api-gateway build`. Build formal Web acreditado:

```bash
NEXT_PUBLIC_APP_URL=https://bbtecnologia.com \
NEXT_PUBLIC_API_URL=https://api.bbtecnologia.com/api/v1 \
NEXT_PUBLIC_AUTH_API_URL=https://api.bbtecnologia.com/api/v1 \
NEXT_PUBLIC_ALLOW_LOCAL_API_FOR_TESTS=false \
pnpm --filter web-admin build
```

Receta conservada como evidencia, no instrucción de nueva ejecución. Web3005 siguió activo durante el build: desviación de la recomendación institucional de no sobrescribir `.next` activo, aunque exit0. PO dispone mantenerlo activo y diferir limpieza hasta su próxima detención ordinaria. No ejecutar el artefacto formal con URLs PROD, no tocar `.env.local`, no desactivar protecciones. No se limpia `.next`, no se crean PID/timers/supervisores.

### Documentos actualizados y preservación

Solo adiciones a este informe y a:

- `docs/29-operations-manual/README.md`: aceptación SOURCE efectiva, límites y continuidad.
- `docs/ai/successor-II/README.md`: relevo UX, recuperación entre usuarios diferida y siguiente gate.
- `docs/28-api-cookbook/04-documentos.md`: reserva contextual, cuatro rutas, permisos y límites.

Los doce archivos funcionales/de pruebas del inventario G2 se mantienen byte a byte. Los manifests e inventario rector no se editan en esta intervención. No hay migración, dependencia nueva, cambio OCR Python, periodos, R2, Almacén, Finanzas o NAS.

### Propuesta incremental — RELEASE_MANIFEST.md — NO APLICADA

Destino exacto: `docs/31-governance/RELEASE_MANIFEST.md`, nueva sección al final, preservando todas las entradas existentes. Texto propuesto para completar en el cierre Git autorizado:

> **19/11/2026 — R3 Factura TEMP, SOURCE aceptado con observaciones.** Base8807b4a9a99870396ec35a7ef1011cec1402c745; rama feat/compras-factura-temp-recovery-r1. Commit funcional: PENDING_CREATION; sustituir por SHA real verificado después de crearlo, antes de publicar el manifest definitivo. Alcance: doce rutas funcionales/de pruebas del inventario de esta entrega; recuperación contextual por OC/OS de mismo TEMP/PDF/OCR/borrador y materialización existente, sin migración/OCR Python/NAS. Validación offline218 PASS y tres typechecks; builds Documentos/Gateway2/2 y WebPASS, prerender22/22, exit0; evidencia heredada ratificada por orden PO/MSE de cierre G3. Aceptación SOURCE por cargador y regresiones PASS con observaciones, testigo TEMP378/exp121/principal541/doc542/archivo547/grupo150/OCR522. CROSS_USER_RECOVERY=FAIL_DEFERRED_BY_PO. Mantener observaciones OCR legacy y principalActivo, límites de red/R2/concurrencia y build Web con servidor activo; limpieza diferida por PO. Enterprise/GHCR/EC2 y aceptación PROD de R3: NOT_EXECUTED/NOT_ACCREDITED. No atribuir a R3 identidades del release previo18/11. G4 requiere autorización expresa y ONE_INTEGRATED_RELEASE.

No anticipar SHA del commit documental, digests ni fecha de despliegue. Tras los hechos futuros, anexar identidades SOURCE/Enterprise, cuatro imágenes y runtime, conservando las historias independientes. Esta propuesta dentro del delta no es un segundo manifest rector.

### Propuesta incremental — BRANCH_INVENTORY.md — NO APLICADA

Destino exacto: `docs/31-governance/BRANCH_INVENTORY.md`, nueva entrada al final:

> **19/11/2026 — feat/compras-factura-temp-recovery-r1**, checkout `/home/loxi1/projects/apps/documental-platform`, base/HEAD observado8807b4a9a99870396ec35a7ef1011cec1402c745. Implementación R3 local sin commit; G2 PASS_WITH_OBSERVATIONS, aceptación funcional G3 SOURCE con observaciones y recuperación entre usuarios diferida. Inventario inicial9 modified+4 untracked,0 staged; inventario posterior documental12 modified+4 untracked,0 staged. Sin nueva rama/worktree en este cierre, sin integración/publicación. Actualizar con SHA funcional/documental reales y estado remoto solo después de ejecución autorizada. No reabrir48 históricos, siete commits backup ni custodias cerradas. Enterprise/GHCR/EC2 R3 pendientes.

### Rutas exactas propuestas para el cierre Git posterior — no ejecutado

**Commit funcional: doce rutas, sin documentos.**

```text
apps/api-gateway/src/documentos/documentos.controller.ts
apps/api-gateway/src/documentos/documentos.tmp-compras.controller.spec.ts
apps/ms-documentos/src/documentos/tmp/tmp.controller.ts
apps/ms-documentos/src/documentos/tmp/tmp.repository.ts
apps/ms-documentos/src/documentos/tmp/tmp.service.ts
apps/ms-documentos/src/documentos/tmp/tmp.compras-recovery.spec.ts
apps/ms-documentos/src/documentos/tmp/tmp.documental.spec.ts
apps/ms-documentos/src/documentos/tmp/tmp.repository.spec.ts
apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx
apps/web-admin/src/components/compras/CompraExpedienteEditor.temp-recovery.test.cjs
apps/web-admin/src/services/carga-segura.ts
apps/web-admin/src/services/carga-segura.temp.test.cjs
```

**Commit documental propuesto: seis rutas**, de las cuales las dos rectoras siguen sin modificar y requieren materializar las propuestas con el SHA funcional real:

```text
DELTA_TECNICO_MSE3_A_MSE_ACTUAL.md
docs/29-operations-manual/README.md
docs/ai/successor-II/README.md
docs/28-api-cookbook/04-documentos.md
docs/31-governance/RELEASE_MANIFEST.md
docs/31-governance/BRANCH_INVENTORY.md
```

Secuencia condicionada a PO: verificar identidad y diffs, commit funcional focal, obtener su SHA, completar adendas rectoras con hechos reales, commit documental focal, integración/publicación SOURCE por método autorizado y verificación remota. Después G4 independiente Enterprise → GHCR cuatro imágenes → EC2 con rollback compatible y aceptación PROD. Nada de ello se ejecuta aquí. R2 NAS continúa separado y posterior al cierre dispuesto por PO.

### Plan de actualización de manuales externos — preparado, no aplicado

Colección destino: `~/Documentos/importantesProyectos/Documentacion_tecnica/BBTI_MANUALES_2026-11-18_R3`. MSE Actual consolida después de verificar hechos materiales; no se modifica esa colección ahora.

| Manual | Delta futuro mínimo |
| --- | --- |
| 00 | Entrada R3 SOURCE aceptado con observaciones, Git pendiente y alcance real; estado productivo previo independiente. |
| 01 | Solo asociación contextual TEMP y rutas si afecta su mapa de responsabilidades; no nueva arquitectura. |
| 02 | Promover las dos recetas backend ya acreditadas en la orden G3 a instrucciones condicionadas de uso futuro; entorno raíz, flag y cwd correctos; no repetir arranques. |
| 03 | Rama y, después de crearlos/verificarlos, commits funcional/documental e integración/push; no inventar SHA. |
| 04 | OCR/borrador persistidos sin reproceso por recuperar, contexto Compras separado del legacy OCR, sin cambio R2/periodo/24h ni Python. |
| 05 | Mantener R3 no promovido; actualizar únicamente tras Enterprise/GHCR/EC2 realmente acreditados, cuatro imágenes y rollback compatible. |
| 06 | Aceptación SOURCE/testigo y CROSS_USER FAIL_DEFERRED_BY_PO; límites y desviación de build activo, sin aceptación PROD. |
| 07 | Siguiente autorización Git SOURCE y luego G4 independiente; no reabrir custodias ni NAS. |
| 09 | Build formal Web con URLs no locales y flag=false; no ejecutar ese artefacto como LAB; arranques focales acreditados y distinción de build/UX/runtime. Registrar desviación .next activo y decisión PO. |
| 08 | Sin actualización: no existe nueva evidencia de custodia en esta intervención. |

SHA256SUMS obligatorio sobre los manuales finales antes de entregar al Bibliotecario; no regenerarlo sobre una colección no editada ni presentar este plan como actualización realizada.

FUNCTIONAL_CODE_CHANGED=NO
TESTS_REPEATED=NO
BUILDS_REPEATED=NO
RUNTIME_OPERATIONS=NONE
MANIFEST_INCREMENTAL_DELTA=PREPARED_NOT_APPLIED
BRANCH_INVENTORY_DELTA=PREPARED_NOT_APPLIED
COMMIT_CREATED=NO
PUSH_PERFORMED=NO
PRODUCTION_DEPLOYED=NO
NEXT_ACTION=MSE_PO_REVIEW_AND_AUTHORIZATION_FOR_SOURCE_GIT_CLOSURE
STOP_AFTER_REPORT=YES

Control final de esta adenda: doce hashes de código/pruebas sin cambios; prefijos originales de los cuatro documentos preservados byte a byte; manifest e inventario sin cambios; inventario final12 modified+4 untracked, índice vacío, HEAD esperado conservado y sin archivos inesperados. `git diff --check` PASS.
SECURITY_FOCAL_RESULT=PASS_STATIC_WITH_OBSERVATIONS
DOCUMENTS_UPDATED=4
MANUALS_EXTERNAL_EDITED=NO
STAGED_FILES=0

### Corrección cross-user focal solicitada — 19/11/2026 — pendiente de evidencia

ACTION=BBTI_FACTURA_TEMP_CROSS_USER_FOCAL_CORRECTION_R1
RESULT=HOLD
ROOT_CAUSE=NOT_DEMONSTRATED

Control focal: rama/HEAD e inventario12 modified+4 untracked coincidentes; sin staging. La selección individual en CompraExpedienteEditor entrega tempId al helper; este usa compras-facturas para consulta y preview, sin sessionStorage para descubrir/seleccionar por ID y sin reprocesar OCR. Gateway y controlador conservan el contexto; comprasActor valida JWT/ámbito/permisos y establece la marca interna. La rama compartida de TmpRepository.own/listCompras no filtra por actor_id; las rutas generales sí conservan owner. No se encontró en ese recorrido una pérdida demostrada de la marca ni una llamada genérica obligatoria para B. El acceso histórico sin tempId sigue siendo local/propio y no sustituye el listado.

Límite de evidencia: las pruebas entre actores emplean dobles de repositorio/SQL y no acreditan la respuesta del flujo real que falló. No se infiere que la causa sea propietario, permisos, workspace, caducidad, frontend o runtime desactualizado.

Se solicitó una única evidencia desde Network del usuario B sobre una factura ya existente: método, ruta, estado HTTP y código/mensaje de la operación que falla, o 200/lista vacía; sin JWT, cabeceras, cookies, URL firmada ni datos personales. No se solicitó otro upload, confirmación o cambio de datos. Pendiente de recibirla.

FUNCTIONAL_FILES_CHANGED=NONE
TEST_FILES_CHANGED=NONE
FOCAL_TEST_RESULT=NOT_EXECUTED_NO_FIX
TYPECHECK_RESULT=NOT_EXECUTED_NO_FIX
SECURITY_BOUNDARIES_PRESERVED=UNCHANGED
GIT_DIFF_CHECK=PASS
RUNTIME_COMPONENTS_AFFECTED=NONE_BY_THIS_INTERVENTION
MANIFEST_DELTA_UPDATED=NO_EXISTING_DEFERMENT_PRESERVED
PO_VISUAL_VALIDATION=PENDING
COMMIT_CREATED=NO
PUSH_PERFORMED=NO
PRODUCTION_OPERATIONS=NONE

No se declara FIX_IMPLEMENTED_PENDING_PO_VALIDATION porque no existe corrección aplicada. Se conserva FAIL_DEFERRED_BY_PO y la propuesta de manifest previa. Reanudar únicamente el diagnóstico focal con la respuesta HTTP solicitada; si acredita una corrección mínima, aplicar el alcance autorizado; si exige ampliación, conservar el diferimiento y presentar la decisión correspondiente al PO.

Evidencia de navegador recibida posteriormente: `/api/v1/expedientes/121/principales/541/facturas-pendientes`, requestId `15e88df4-66ab-43c5-819d-29d177c2a6c6`, timestamp aportado `2026-11-19T14:22:45.565Z`, envelopes success=true, lista data vacía y conflictos vacíos. No se aportó el estado HTTP explícito. Ese endpoint corresponde a getFacturasPendientes/findFacturasPendientes (documentos/archivos y OCR ya materializados); es distinto del listado TEMP de carga_operaciones. No acredita un rechazo owner ni un fallo de la ruta compartida R3. Se precisó la misma solicitud de evidencia: respuesta de `/api/v1/documentos/tmp/compras-facturas/121/541` al pulsar Actualizar pendientes en el bloque TEMP, o constancia de que no se genera esa solicitud. No se solicitaron nuevos uploads/confirmaciones ni se modificó código. RESULT=HOLD y causa no demostrada se mantienen. TEMP378 ya figura materializado en la aceptación aportada; no se presume pendiente de recuperación por ninguno de los dos listados.

Evidencia adicional aportada por PO: HTTP200 y JSON con requestId `8405feaa-499c-4fbd-b2ba-faec79d5c414`, timestamp `2026-11-19T14:24:03.048Z`, doble envelope success=true, contenido `{data:[],contexto:{expedienteId:121,principalId:541},conflictos:[]}`. Se registra íntegramente su significado sin pedir otra captura: acredita una respuesta exitosa de listado vacío. El formato coincide con el contrato facturas-pendientes y difiere del contrato SOURCE listCompras, cuyo contexto contiene documentoBaseId/origen/tipoDocumental/tipoRelacion y no incluye conflictos. El JSON no contiene la URL de la solicitud; no permite decidir si se seleccionó otra solicitud en Network o si hay discrepancia del runtime servido. Tampoco demuestra que existiera un TEMP contextual vigente, no materializado y del mismo ámbito al consultar B. No hay causa de código demostrada, no se atribuye a actor_id ni se modifica seguridad. La recuperación entre usuarios sigue FAIL_DEFERRED_BY_PO; corrección HOLD, código/pruebas intactos, sin reinicios, tests o nuevas operaciones. La conciliación de petición y runtime efectiva queda para coordinación MSE 3.0; no se ejecuta una investigación operativa adicional en esta intervención.


## Corrección cross-user focal implementada — 19/11/2026

ACTION=BBTI_FACTURA_TEMP_CROSS_USER_FOCAL_CORRECTION_R1
RESULT=FIX_IMPLEMENTED
CROSS_USER_RECOVERY=FIX_IMPLEMENTED_PENDING_PO_VALIDATION

Esta adenda actualiza el HOLD anterior: se recibió evidencia funcional adicional de un TEMP efectivamente pendiente. PO reporta TEMP382, cargador4, OCR DONE, visible en el bloque TEMP del cargador para expediente121/principal541; otro usuario autorizado ve el bloque TEMP vacío. La respuesta de expedientes/.../facturas-pendientes aportada sigue correspondiendo a otro listado; no se confunde con evidencia SQL del TEMP.

**Causa de código demostrada:** AuthRepository.findUserWorkspaces/findUserWorkspaceById (`apps/ms-auth/src/auth/auth.repository.ts`, selección de uw.id/uw.usuario_id, líneas185–252) y AuthService.selectWorkspace (`auth.service.ts`, líneas244–280) vinculan cada workspaceId a un usuario concreto. Por tanto dos usuarios distintos no comparten ese ID personal. Las consultas compartidas de TmpRepository exigían `workspace_id=actor.workspaceId`: aplicaban un identificador personal como si fuera el ámbito compartido. Esa condición impedía recuperar la carga de A con la asignación propia de B. No era un filtro actor_id residual ni una pérdida del Symbol. El defecto estaba en la implementación R3 inicial; las pruebas anteriores utilizaban el mismo workspace12 para actores distintos o dobles que no ejercitaban esa relación real de Auth.

**Corrección mínima:** solo `apps/ms-documentos/src/documentos/tmp/tmp.repository.ts`, ramas compartidas own/listCompras. Reemplazar la igualdad incorrecta por verificación SQL de ambas asignaciones: la de origen pertenece al cargador y conserva su ID en el TEMP; la del operador corresponde a su actor/workspace autenticado y está activa/vigente; ambas pertenecen al mismo sistema DOCUMENTAL, empresa y cliente. Continúan los filtros tenant, contexto JSON exacto, principal/expediente y estado/vigencia existentes. No se concede acceso por coincidencia de empresa aislada ni se modifica el filtro owner de rutas generales. Los IDs personales distintos no se convierten en contextos documentales distintos ni se falsifica el workspace del validador.

No se modifica Auth, schema, permisos JWT, menú, acciones, env, dependencias, uploader, workspace original, destino, identidad idempotente, auditoría, preview, materializador, OCR, R2, Almacén o Finanzas. La consulta requiere SELECT a auth.usuario_workspaces y core.sistemas; no se consultó DB ni se verificó ese privilegio en el runtime. Si no está disponible, STOP y decisión MSE/PO, sin GRANT/migración ni otra corrección automática.

### Archivos y validación de esta corrección

- Funcional: `apps/ms-documentos/src/documentos/tmp/tmp.repository.ts` (1).
- Pruebas: `apps/ms-documentos/src/documentos/tmp/tmp.compras-recovery.spec.ts` y `apps/ms-documentos/src/documentos/tmp/tmp.documental.spec.ts` (2).
- Documentos: este delta y las adendas R3 del manual operativo, sucesor-II y cookbook04. Mismo inventario global de rutas; sin ficheros nuevos adicionales.
- Pruebas ejecutadas: **27 PASS, 0 FAIL, 24 omitidas por filtro**, dos suites. Contratos SQL de asignaciones/tenant/sistema/actividad, permisos previos, owner genérico intacto y materialización concurrente simulada con workspace12 del cargador y workspace13/14 de validadores. Se preservan actor/workspace de origen y el actor/workspace real de auditoría. Son dobles y comprobaciones del SQL generado, no ejecución de la consulta en PostgreSQL.

Desde apps/ms-documentos:

```bash
pnpm exec jest --runInBand --runTestsByPath src/documentos/tmp/tmp.compras-recovery.spec.ts src/documentos/tmp/tmp.documental.spec.ts --testNamePattern='Factura TEMP Compras|Acceso compartido acotado|Reserva contextual|A adjunta;|confirmaciones compartidas|no permite mover'
```

Typecheck necesario desde raíz: `pnpm exec tsc --noEmit --incremental false -p apps/ms-documentos/tsconfig.build.json`, PASS. No se repiten218 pruebas, typechecks de otros componentes ni build Web. `git diff --check` PASS.

### Diff funcional exacto de la corrección, respecto al estado G3 previo

```diff
--- before/tmp.repository.ts
+++ after/tmp.repository.ts
@@ -124,10 +124,28 @@
   async own(c: Connection, id: number, actor: TmpActor): Promise<TmpRow> {
     const context = actor[COMPRAS_FACTURA_ACCESS];
     if (context) {
-      const [row] = await c`SELECT * FROM documentos.carga_operaciones WHERE id=${id} AND operacion_tipo='tmp'
-        AND workspace_id=${actor.workspaceId} AND empresa_codigo=${actor.empresaCodigo}
+      // workspaceId identifica una asignación personal, no el ámbito compartido.
+      // Validar ambas asignaciones sin cambiar el workspace ni actor de la carga.
+      const [row] = await c`SELECT * FROM documentos.carga_operaciones carga WHERE id=${id} AND operacion_tipo='tmp'
+        AND empresa_codigo=${actor.empresaCodigo}
         AND cliente_destino_id=${actor.clienteDestinoId}
-        AND metadata->'comprasFactura'=${c.json(JSON.stringify(context))}::jsonb`;
+        AND metadata->'comprasFactura'=${c.json(JSON.stringify(context))}::jsonb
+        AND EXISTS (
+          SELECT 1 FROM auth.usuario_workspaces origen
+          JOIN auth.usuario_workspaces acceso
+            ON acceso.id=${actor.workspaceId} AND acceso.usuario_id=${actor.actorId}
+            AND acceso.sistema_id=origen.sistema_id
+            AND acceso.empresa_codigo=origen.empresa_codigo
+            AND acceso.cliente_destino_id=origen.cliente_destino_id
+          JOIN core.sistemas sistema ON sistema.id=acceso.sistema_id
+          WHERE origen.id=carga.workspace_id AND origen.usuario_id=carga.actor_id
+            AND origen.empresa_codigo=carga.empresa_codigo
+            AND origen.cliente_destino_id=carga.cliente_destino_id
+            AND sistema.codigo='DOCUMENTAL' AND sistema.estado='activo'
+            AND acceso.estado='activo'
+            AND (acceso.vigencia_desde IS NULL OR acceso.vigencia_desde<=CURRENT_DATE)
+            AND (acceso.vigencia_hasta IS NULL OR acceso.vigencia_hasta>=CURRENT_DATE)
+        )`;
       if (!row || row.metadata?.regularizacionOp ||
           (row.metadata?.integration && row.metadata.integration.consumer !== 'COMPRAS_TEMP_DOCUMENTAL'))
         throw new NotFoundException('TEMP no disponible');
@@ -142,10 +160,26 @@
   }
   async listCompras(c: Connection, actor: TmpActor, context: ComprasFacturaContext): Promise<TmpRow[]> {
     await this.assertDocumentalScope(c, { empresa_codigo: actor.empresaCodigo, cliente_destino_id: actor.clienteDestinoId }, context);
-    return c`SELECT * FROM documentos.carga_operaciones WHERE operacion_tipo='tmp'
-      AND workspace_id=${actor.workspaceId} AND empresa_codigo=${actor.empresaCodigo}
+    return c`SELECT * FROM documentos.carga_operaciones carga WHERE operacion_tipo='tmp'
+      AND empresa_codigo=${actor.empresaCodigo}
       AND cliente_destino_id=${actor.clienteDestinoId}
       AND metadata->'comprasFactura'=${c.json(JSON.stringify(context))}::jsonb
+      AND EXISTS (
+        SELECT 1 FROM auth.usuario_workspaces origen
+        JOIN auth.usuario_workspaces acceso
+          ON acceso.id=${actor.workspaceId} AND acceso.usuario_id=${actor.actorId}
+          AND acceso.sistema_id=origen.sistema_id
+          AND acceso.empresa_codigo=origen.empresa_codigo
+          AND acceso.cliente_destino_id=origen.cliente_destino_id
+        JOIN core.sistemas sistema ON sistema.id=acceso.sistema_id
+        WHERE origen.id=carga.workspace_id AND origen.usuario_id=carga.actor_id
+          AND origen.empresa_codigo=carga.empresa_codigo
+          AND origen.cliente_destino_id=carga.cliente_destino_id
+          AND sistema.codigo='DOCUMENTAL' AND sistema.estado='activo'
+          AND acceso.estado='activo'
+          AND (acceso.vigencia_desde IS NULL OR acceso.vigencia_desde<=CURRENT_DATE)
+          AND (acceso.vigencia_hasta IS NULL OR acceso.vigencia_hasta>=CURRENT_DATE)
+      )
       AND estado='almacenada' AND promovida_en IS NULL AND documento_id IS NULL AND archivo_id IS NULL
       AND expira_en > now() AND NOT (metadata ? 'regularizacionOp')
       AND (metadata->'integration' IS NULL OR metadata#>>'{integration,consumer}'='COMPRAS_TEMP_DOCUMENTAL')
```

### Actualización de la propuesta incremental de manifest — NO APLICADA

Conservar las propuestas anteriores como antecedentes. En la futura entrada R3 de `docs/31-governance/RELEASE_MANIFEST.md`, completar antes de publicación con SHA funcional real y añadir:

> Corrección cross-user: el ID de workspace es una asignación personal; consultas compartidas de TmpRepository validan la asignación del origen y la del operador al mismo DOCUMENTAL/empresa/cliente, manteniendo contexto OC/OS, permisos y owner de rutas generales. Un archivo funcional y dos pruebas ajustados dentro de las mismas doce rutas.27 pruebas focales PASS,24 omitidas por filtro, typecheck Documentos PASS. CROSS_USER_RECOVERY=FIX_IMPLEMENTED_PENDING_PO_VALIDATION; FAIL/diferimiento anterior preservado. Actualización de runtime Documentos y validación PostgreSQL/PO pendientes; no afirmar recuperación entre usuarios aceptada ni desplegada. Sin migración/OCR Python/NAS. No conceder SELECT automáticamente si la consulta de autorización requiere privilegio no disponible.

Manifest e inventario rectores permanecen sin editar. Las rutas propuestas para commits funcional/documental no cambian; los hashes finales de tres archivos de código/pruebas sí deben tomarse después de esta corrección, sin reutilizar hashes G2 previos.

### Entrega a MSE para aceptación — no ejecutada

Actualizar únicamente **ms-documentos3002** con compilación y reinicio coordinados conservando el entorno LAB acreditado. Gateway, Web, Auth, NATS y OCR no requieren cambios por este diff. No se ejecutan builds/reinicios aquí. Sobre un TEMP aún vigente y no confirmado, comprobar listado de B, misma identidad/PDF/OCR/borrador, ausencia de nuevo upload/OCR por recuperar y confirmación explícita autorizada con validador real. No recrear TEMP382 si ya fue confirmado o expiró; ese estado se debe respetar. No declarar PASS antes del resultado PO y de la ejecución real de las consultas.

SECURITY_BOUNDARIES_PRESERVED=YES
PO_VISUAL_VALIDATION=PENDING
COMMIT_CREATED=NO
PUSH_PERFORMED=NO
PRODUCTION_OPERATIONS=NONE
NEXT=MSE_RUNTIME_UPDATE_AND_PO_CROSS_USER_VALIDATION
STOP_AFTER_REPORT=YES

Control final de la corrección: solo un funcional, dos pruebas y las cuatro adendas documentales cambiaron respecto al inicio de esta intervención. El resto del trabajo previo y los prefijos documentales se preservaron por SHA-256. Inventario16 rutas sin adicionales, staging vacío y HEAD8807b4a9 intacto; manifest/inventario rectores sin cambios. Hashes actuales para revisión posterior:

| Ruta | SHA-256 |
| --- | --- |
| `apps/ms-documentos/src/documentos/tmp/tmp.repository.ts` | `c3f71bdba453c66d83f64860c5cc1cc605ac58b7c3073329c56cdcf94d6aded8` |
| `apps/ms-documentos/src/documentos/tmp/tmp.compras-recovery.spec.ts` | `772884ac09850f4511b0333c84310aa21ee7cf24ec455215da0c19677cda81b6` |
| `apps/ms-documentos/src/documentos/tmp/tmp.documental.spec.ts` | `df57c0e161b92c05048546399a464413b852abca1e92d2a0e81597a12b0ea3be` |


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

### Inventario funcional comprometido

- `apps/api-gateway/src/documentos/documentos.controller.ts`
- `apps/api-gateway/src/documentos/documentos.tmp-compras.controller.spec.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.compras-recovery.spec.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.controller.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.documental.spec.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.repository.spec.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.repository.ts`
- `apps/ms-documentos/src/documentos/tmp/tmp.service.ts`
- `apps/web-admin/src/components/compras/CompraExpedienteEditor.temp-recovery.test.cjs`
- `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx`
- `apps/web-admin/src/services/carga-segura.temp.test.cjs`
- `apps/web-admin/src/services/carga-segura.ts`

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
