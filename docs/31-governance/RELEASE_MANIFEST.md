# Manifest vigente reportado — R2

Fecha de continuidad: 23/10/2026. **CURRENT_PRODUCTION=R2**, **DEPLOY_TECHNICAL_PASS=REPORTED_BY_PO_MSII**, **MVP_FUNCTIONAL_ACCEPTANCE=PENDING**. Sustituye como referencia actual al registro Actions #28 conservado más abajo; no se revalidó producción en esta orden.

Enterprise local comprobado: `e1f099faeb4dfdc9f2b49b9984fe211935875ff3`; main y origin/main local apuntan al mismo commit. La rama activa es `integration/enterprise-r2-po-20261023`. SOURCE tiene identidad distinta y cambios pendientes: [inventario](BRANCH_INVENTORY.md).

| Servicio | Referencia GHCR R2 reportada en Config.Image |
|---|---|
| api-gateway | `ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway@sha256:4ba59c185f52d308cffd163179819b26bbfa4b8b27968be1864c65eccb11ec0a` |
| ms-auth | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth@sha256:e299d52aa019c9d76e37618641ba2bce61b740b2df9c4523e8935e2df4a726b5` |
| ms-documentos | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos@sha256:949f9510bdc00c03842bb1218ffa817f941076d5eebc3bfa700a5a355ee7541f` |
| web-admin | `ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin@sha256:bab1a81e88262ac89d0c15bef87f20e1e80c6e5f1d370693e3f562fcf6ff49ad` |

Las cuatro referencias fueron reportadas running; frontend y gateway HTTP 200; OCR activo, NATS y Traefik running. Finanzas: confirmación visual PO. Esto no acredita aceptación integral. Pruebas previas: 122 PASS / 2 FAIL de expectativas de contrato, no bloqueantes según reconciliación previa; no convertir los fallos en PASS ni afirmar nueva ejecución.

Checkout EC2 reportado: `/home/ubuntu/apps/documental-platform-bbti-prod`; proyecto Compose `docker`; base `deployment/docker/docker-compose.production.yml`; entorno `deployment/env/.env.production`. Override release `/home/ubuntu/releases/documental-platform-bbti/r2-e1f099fa-r1/release.images.yml`; rollback C1 en el mismo directorio, `rollback.images.yml`. No confundir estas rutas EC2 con los repositorios locales.

Fuentes: paquete MSII y actualización ME del 23/10/2026 en `/home/loxi1/Descargas/`. [Deploy R2](../18-runbooks/DEPLOYMENT_RUNBOOK.md), [verificación](../18-runbooks/DEPLOYMENT_VERIFICATION.md), [rollback](../18-runbooks/ROLLBACK_RUNBOOK.md). Rollback preparado, no ensayado. Los digests históricos de abajo pertenecen a otros expedientes; no usarlos como override C1 R2 sin acreditar el archivo correspondiente.


---

## Registro histórico anterior (conservado)

# Manifest de release MVP — Actions #28

Control: `MVP-RELEASE-DOCUMENTARY-CONSOLIDATION-R11-FINAL`. Fecha: 2026-10-16. Estado: **CONSOLIDADO PARA REVISIÓN FINAL Y PUBLICACIÓN DOCUMENTAL CONTROLADA**. Despliegue NO autorizado.

## Cadena de identidad

- SOURCE main: `ca49e734393d370087b490568ac28c5b00e36368`, tree `807c428e9948e7102be912cd4a0f7ea32689fcf4`.
- Enterprise main: `6a61551420a18a041b732db10b2f56f84b7147b5`, parent `32b0a2b9fa536c7e71c315529f8e4278d64b7e22`, tree `275e826a561430469d1c0d039010fb47f6edaa8f`.
- Actions #28: run `38974113305`, evento PUSH, rama main, commit Enterprise anterior, conclusión SUCCESS. Fuente: resumen oficial aportado por el PO en R11; no se presenta como nueva verificación API (R9C recibió 403).
- GHCR: manifests y configs verificados en R9C. Registros oficiales aportados por PO, inspeccionados en R10B, vinculan servicio, tag, revisión VCS y config exacto con cada manifest GHCR. Los registros no contienen el digest manifest literal ni conclusión global; esta última procede del resumen PO. No afirmar attestation criptográfica firmada del workflow.

| Servicio | Referencia GHCR inmutable | Registro de build | Plataforma |
|---|---|---|---|
| api-gateway | `ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway@sha256:f60b6928b1f92efcd3247b1e60f9ba62a154ddcfd897f6a0ecf33be06bbaac10` | `BBTI-SAC~documental-platform-bbti-prod~IXMZE4.dockerbuild.zip` | linux/amd64 |
| ms-documentos | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos@sha256:48191dcbfb2283abd53d90566588167061534fe67a7e122280a9411fd091e721` | `BBTI-SAC~documental-platform-bbti-prod~EZTXUQ.dockerbuild.zip` | linux/amd64 |
| ms-auth | `ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth@sha256:d54b28f426c0ddd0f5ccc46c031bfe3310f5beb6d519b8158a4a95e7024671d7` | `BBTI-SAC~documental-platform-bbti-prod~NSX5IO.dockerbuild.zip` | linux/amd64 |
| web-admin | `ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin@sha256:2d224d284e0136e3c3a3b034c6872f0a2b405bc3cef9835d877ee827e25b3547` | `BBTI-SAC~documental-platform-bbti-prod~2LEFZE.dockerbuild.zip` | linux/amd64 |

## Frontend productivo

Argumentos efectivos acreditados en el registro web-admin:

```text
NEXT_PUBLIC_APP_URL=https://bbtecnologia.com
NEXT_PUBLIC_API_URL=https://api.bbtecnologia.com/api/v1
NEXT_PUBLIC_AUTH_API_URL=https://api.bbtecnologia.com/api/v1
NEXT_PUBLIC_APP_NAME=Documental Platform
NEXT_PUBLIC_ALLOW_LOCAL_API_FOR_TESTS=NOT_SUPPLIED
```

Sin localhost/configuración LAB en estos argumentos públicos. Son valores fijados durante build; no prometer que variables runtime los sustituyan. No se hizo inspección exhaustiva del bundle ni tráfico runtime. El frontend LAB local y sus URLs 3017/3117 no son artefacto productivo #28.

## Configuración y baseline productiva

El nuevo release es candidato publicado, NO estado ejecutado observado en EC2. No hubo inspección EC2 en R11. Última identidad histórica registrada: runtime `caf689b87bbd045221b821c4b9ffba19929634b9`, checkout `da19e9f0`; no asumir vigencia actual ni aceptación funcional integral.

Preservar RDS productivo, R2, OCR systemd, secretos, volúmenes, redes, puertos, NATS y servicios externos. No sustituir por PostgreSQL/MinIO/worker/roles/redes del LAB. No ejecutar migraciones automáticamente. Verificar compatibilidad y ledger productivo mediante control separado; el ledger LAB no acredita producción.

OCR histórico efectivo: unidad `/etc/systemd/system/documental-ocr-worker.service`, usuario `documental-ocr`, WorkingDirectory `/opt/documental-platform/current/workers/ocr-worker`, Python `/opt/documental-platform/venvs/ocr-worker/bin/python`, EnvironmentFile `/etc/documental-platform/ocr-worker.env`. Revalidar propiedades saneadas antes de desplegar; no sustituir por unidad versionada de desarrollo ni cambiar worker con las cuatro aplicaciones.

Variables requeridas por nombre, nunca secretos: `DATABASE_URL`, `JWT_SECRET`, `NATS_URL`, `MS_AUTH_URL`, `MS_DOCUMENTOS_URL`, `DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED`; R2 `R2_ENDPOINT_URL`/`R2_ENDPOINT` según consumidor, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_REGION`, `R2_FORCE_PATH_STYLE`. Frontend: argumentos arriba. Verificar consumo/configuración efectiva; no copiar roles ni permisos LAB a producción. Auth puede requerir auditoría/último acceso; Documentos requiere operaciones propias del MVP, no convertir el rol RO LAB en rol productivo universal.

## Cobertura

Baseline: árbol completo Enterprise `275e826a561430469d1c0d039010fb47f6edaa8f`, no solo ocho archivos modificados. Inventario reproducible futuro: `git ls-tree -r --full-tree 6a61551420a18a041b732db10b2f56f84b7147b5`. Los manifests históricos parciales no limitan el MVP. Se preservan Finanzas OP/OCOS, calendarios/parser, RH/factura/TEMP, asociación documental/A7F, OCR normal e histórico, bandejas y reglas empresa/cliente existentes. Esto define contenido, no certifica exhaustivamente cada flujo.

Dependencias de construcción: Dockerfiles comprometidos `deployment/docker/Dockerfile.nest` y `Dockerfile.next`, lockfile del árbol exacto, Node Alpine y tooling según registros. No prometer reproducibilidad binaria con tags/herramientas mutables; identidad operativa fijada por manifest digest. No reconstruir en EC2.

RELEASE_MANIFEST_STATUS=CONSOLIDATED_FOR_FINAL_REVIEW_NOT_DEPLOYMENT_AUTHORIZATION.
Gates previos: backup recuperable, baseline efectiva y rollback verificables, plataforma, configuración/esquema compatibles, aprobación PO de ventana y referencias exactas. Ver runbooks.

## Evidencias y límites

Expediente base: `/home/loxi1/projects/evidence/documental-platform-bbti/actions28/`.

- R8B: `/tmp/bbti-enterprise-r8b/result.json`: commit/push, parent/tree, coincidencia de ocho blobs; archivo temporal, conservar en paquete durable antes de publicación documental.
- R9C: `credential-match-r9c-20261016/RESULT.md`, `ghcr-only/verification.json`, cuatro manifests y SHA256SUMS.
- R10B: `build-record-r10b-20261016/RESULT.md`, `records-projection.json`, SHA256SUMS. Extensión ZIP pero formato gzip/TAR OCI; integridad de archivos/blobs validada sin ejecución ni importación Docker.
- R11: resumen oficial del run suministrado en la instrucción PO. No se reconsultaron Actions/GHCR.

Digest del archivo descargado, índice OCI del registro, config de imagen, digest local Docker y manifest GHCR son identidades diferentes. La tabla usa exclusivamente manifests GHCR. El tag del commit acredita referencia publicada en R9C; `latest` no es identidad del release.
