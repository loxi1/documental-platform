# Reconciliación del release MVP BBTI

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

## Alcance funcional comprometido

- `apps/api-gateway/src/expedientes/expedientes.controller.ts`
- `apps/api-gateway/src/expedientes/expedientes.controller.op-contable.spec.ts`
- `apps/api-gateway/src/expedientes/expedientes.controller.bandeja-propagacion.spec.ts`
- `apps/ms-documentos/src/expedientes/expedientes.repository.ts`
- `apps/web-admin/src/components/compras/CompraExpedienteEditor.tsx`
- `apps/web-admin/src/components/compras/ComprasBandeja.tsx`
- `apps/web-admin/src/services/expedientes.ts`
- `apps/web-admin/src/lib/compras-principal.ts`

Ocho blobs Enterprise coinciden con SOURCE comprometido (R8B). Ruta contable OP y derivación segura de identidad se promovieron explícitamente; los pases adicionales de contexto de otras rutas y ampliación proxyData permanecen locales SOURCE. Los cinco dirty restantes no fueron promovidos. Los seis archivos históricos siguen preservados, sin incorporar automáticamente documentación/configuración ni worktree completo.

La divergencia funcional descrita en R1 fue resuelta por los commits SOURCE/Enterprise indicados; R1 es antecedente, no bloqueo vigente. El set #28 nuevo no es el set #27 ni las imágenes LAB modificadas. La procedencia por config exacto se apoya en R10B; la identidad global #28 se apoya en resumen oficial PO.

Las pruebas y aceptación LAB ya existentes no se repitieron. No declarar aceptación de cada endpoint productivo por esos resultados. OCR 58 permanece testigo histórico pendiente, fuera de este release documental; no se abre desarrollo nuevo.

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

## Evidencias y límites

Expediente base: `/home/loxi1/projects/evidence/documental-platform-bbti/actions28/`.

- R8B: `/tmp/bbti-enterprise-r8b/result.json`: commit/push, parent/tree, coincidencia de ocho blobs; archivo temporal, conservar en paquete durable antes de publicación documental.
- R9C: `credential-match-r9c-20261016/RESULT.md`, `ghcr-only/verification.json`, cuatro manifests y SHA256SUMS.
- R10B: `build-record-r10b-20261016/RESULT.md`, `records-projection.json`, SHA256SUMS. Extensión ZIP pero formato gzip/TAR OCI; integridad de archivos/blobs validada sin ejecución ni importación Docker.
- R11: resumen oficial del run suministrado en la instrucción PO. No se reconsultaron Actions/GHCR.

Digest del archivo descargado, índice OCI del registro, config de imagen, digest local Docker y manifest GHCR son identidades diferentes. La tabla usa exclusivamente manifests GHCR. El tag del commit acredita referencia publicada en R9C; `latest` no es identidad del release.

## Gates

ACTIONS28_GATE=PASS (resumen oficial PO + evidencia de builds).
GHCR_GATE=PASS (R9C).
DOCUMENTATION_GATE=READY_FOR_FINAL_REVIEW.
Producción efectiva, backup y rollback: pendientes de predeploy read-only autorizado. No autoriza desplegar ni congelar identidades de runtime no observadas.
