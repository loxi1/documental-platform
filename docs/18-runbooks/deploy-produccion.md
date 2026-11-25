**Estado:** Procedimiento estándar
**Autoridad:** Operations

# Deploy Producción

## Objetivo

Desplegar en EC2 exclusivamente una release previamente validada y publicada desde Enterprise.

La ruta de autoridad es:

`SOURCE main → Enterprise main → CI/GHCR → EC2`

Este runbook comienza cuando la release Enterprise y sus imágenes ya están autorizadas. El proceso completo está definido en `docs/31-governance/07-release-process.md`.

## Precondiciones

Antes del deploy deben estar identificados:

- `EXPECTED_ENTERPRISE_COMMIT` autorizado;
- CI asociado al commit Enterprise = PASS;
- imágenes GHCR correspondientes;
- tags de release;
- digest esperado por cada servicio publicado;
- `EXPECTED_RUNTIME_TUPLE` aplicable al alcance.

La autorización queda ligada a la identidad acreditada del candidato (`PROMOTION_FREEZE`). Si cambia el commit Enterprise o alguno de los digests esperados, detener y regresar al gate de autorización.

Si no puede demostrarse la relación `Enterprise commit → CI → GHCR`, detener el deploy.

## Actualizar EC2

El checkout productivo proviene exclusivamente de Enterprise main.

Secuencia estándar:

1. registrar `EXPECTED_ENTERPRISE_COMMIT`;
2. `git pull --ff-only origin main`;
3. `git rev-parse HEAD`;
4. verificar que HEAD coincide exactamente con `EXPECTED_ENTERPRISE_COMMIT`;
5. sólo después de esa igualdad ejecutar `docker compose pull`;
6. verificar que las imágenes corresponden a los digests esperados por servicio;
7. `docker compose up -d`.

Si cualquier identidad observada difiere de la esperada: `ABORT_ON_IDENTITY_MISMATCH`. No modificar producción para reconciliar una identidad inesperada dentro de este runbook.

`docker compose down` no forma parte del deploy normal.

Está prohibido desplegar EC2 directamente desde SOURCE, un development branch, un worktree o un index.

## Runtime witness

Después del recreate verificar:

- checkout EC2 = `EXPECTED_ENTERPRISE_COMMIT`;
- imágenes runtime = digests esperados por servicio;
- `RUNTIME_WITNESS = PASS`;
- contenedores requeridos running/healthy;
- API health = PASS;
- Web health = PASS.

El health técnico no sustituye el smoke funcional.

## Smoke

Ejecutar un smoke específico del entregable autorizado por el manifest.

El resultado debe acreditarse como `DELIVERABLE_SMOKE = PASS`.

Sólo después de `RUNTIME_WITNESS = PASS` y `DELIVERABLE_SMOKE = PASS` puede solicitarse el cierre `CLOSED_PASS`.

## Frontera OCR

OCR productivo no forma parte del stack Docker/GHCR de aplicación.

OCR PROD se ejecuta nativamente en Ubuntu mediante systemd. Su operación requiere el control correspondiente.

MinIO pertenece al entorno LAB y no debe introducirse en producción mediante este runbook.

## Prohibiciones

Este runbook no autoriza cambios de aplicación, base de datos, migraciones, GIS, OCR, secretos ni recuperación destructiva del checkout.

Cuando la release incluya un `migration set`, la migración conserva un gate independiente de `DB_WRITE` y debe seguir `docs/06-database/02-migraciones.md`.

La actualización del checkout EC2 desde Enterprise puede ser una precondición para acreditar la identidad productiva de una migración, pero no constituye autorización para ejecutarla.

Ante una divergencia, detener el deploy y regresar al control de release.

### Identidad completa de la imagen y del runtime

Para cada servicio autorizado debe acreditarse:

`ENTERPRISE_COMMIT → IMAGE_NAME → IMAGE_TAG → OCI_DIGEST`

El tag basado en SHA y el digest OCI son evidencias distintas.

`latest` no constituye autoridad de identidad del release.

El witness de EC2 debe acreditar como mínimo:

- checkout objetivo;
- servicio objetivo;
- referencia de imagen en ejecución;
- digest de imagen en ejecución;
- puertos;
- redes;
- dependencias relevantes.

Un checkout Git, commit o tag por sí solo no acredita la identidad
exacta del runtime.

La actualización debe preservar los servicios e infraestructura
fuera del alcance autorizado, incluyendo Traefik, NATS, OCR, DB y GIS
según corresponda al release.

## Composición productiva efectiva y override efímero histórico

La composición productiva permanente de referencia es:

`deployment/docker/docker-compose.production.yml`

Durante R4-P2 existe una referencia histórica a un override
efímero:

`/tmp/r4_p2_ec2_override_execution_r2.yml`

El override histórico no debe convertirse en una configuración
permanente del proyecto.

El contenido efectivo, los parámetros exclusivos, el orden exacto
de los archivos Compose y las opciones históricas de ejecución del
override R2 permanecen `UNKNOWN` cuando no existe evidencia
conservada suficiente.

Por tanto, no deben reconstruirse comandos históricos ni atribuirse
al override puertos, redes, dependencias, montajes u otras opciones
que no estén acreditadas.

Cuando un release utilice una composición distinta del Compose base,
la documentación del release debe identificar explícitamente:

- composición utilizada;
- orden de archivos Compose;
- servicios afectados;
- selección de imágenes versionadas;
- evidencia de configuración efectiva;
- witness final del runtime.

La referencia `docker-compose.ec2.yml` no se considera archivo
canónico de R4-P2 sin evidencia específica que acredite su utilización.

### Selección de imágenes

El Compose base puede contener instrucciones `build`; eso no demuestra
por sí solo que el release productivo deba construir localmente las
imágenes.

La selección de las imágenes autorizadas debe quedar vinculada a:

`Enterprise commit → image name → image tag → OCI digest`

El tag basado en SHA y el digest OCI son evidencias distintas.

`latest` no constituye autoridad de identidad del release.

### Witness

El cierre del deployment debe conservar evidencia suficiente para
relacionar la configuración utilizada con el runtime resultante.

La identidad del runtime debe acreditarse mediante el witness
correspondiente y no únicamente mediante el checkout Git, un commit o
un tag.

Los detalles históricos que no puedan acreditarse permanecen
`UNKNOWN`; la ausencia de evidencia no se convierte en evidencia de
ausencia.

## Precisión operativa incorporada en R2 (23/10/2026)

La secuencia genérica anterior requiere la composición efectiva aprobada, incluidos proyecto, env-file y override por digest. No usar comandos bare de pull/up como receta R2. Véase [procedimiento R2](DEPLOYMENT_RUNBOOK.md) y [verificación](DEPLOYMENT_VERIFICATION.md): imágenes ya disponibles, no-build/pull never, servicios explícitos y Config.Image exacto. Force-recreate requiere necesidad y autorización de interrupción. Started y HTTP 200 no certifican promoción ni aceptación funcional integral.


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
### Solo sincronización documental posterior

Este cierre no autoriza ejecutar las recetas anteriores de pull/up. Imágenes/runtime vigentes ya acreditados; docs-only exige revisar delta exclusivo docs/*, baseline y destino exactos, fast-forward, preservar configuración y comparar identidad runtime antes/después. Script preparado fuera del repositorio, sin ejecuciónEC2: `ec2-documentary-sync.py` en evidencia de cierre. Commit/push y sync requieren autorización específica; nunca latest, rebuild, recreate, migración ni rollbackautomático como consecuencia de documentación.
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
