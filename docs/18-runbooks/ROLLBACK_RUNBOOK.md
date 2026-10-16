# Rollback de aplicación — Actions #28

Control: `MVP-RELEASE-DOCUMENTARY-CONSOLIDATION-R11-FINAL`. Fecha: 2026-10-16. Estado: **CONSOLIDADO PARA REVISIÓN FINAL Y PUBLICACIÓN DOCUMENTAL CONTROLADA**. Despliegue NO autorizado.

Complementa [rollback.md](rollback.md) y [backup-rds.md](backup-rds.md). ROLLBACK_PREDEPLOY_GATE=PENDING_EFFECTIVE_EC2_VERIFICATION.

La baseline anterior efectiva debe identificarse y preservarse ANTES del despliegue. No se inspeccionó EC2 en R11. Último registro histórico caf689b87bbd045221b821c4b9ffba19929634b9 (checkout histórico da19e9f0) no es prueba de vigencia actual ni última aceptación PO.

| Servicio | Manifest histórico registrado, no revalidado actualmente |
|---|---|
| api-gateway | sha256:7dca0ede769644032a05a8948026fff3413d188fa6ba9819f33b37f3a2de3fcc |
| ms-auth | sha256:138ef602087ec5cb4bbb9c58dcf928162f037683f79f9868edd9b9746f57fed9 |
| ms-documentos | sha256:1c46005438306549b00a135b142508c8e3b20ffdda6cb1882d6da90a964a5b4b |
| web-admin | sha256:1a189346af2a43b8c8ecc380cf0105dcdfae7ad345322a366d93e6ffa67bb8d6 |

No usar #27 automáticamente como rollback. Acreditar digests efectivos, disponibilidad, Compose/override/config preservados, secretos privados, backup RDS recuperable y compatibilidad del esquema con ambas versiones. Generar override anterior durable desde esa evidencia, no desde suposiciones.

## Procedimiento futuro autorizado

Disparadores: regresión de login/contexto/bandeja/persistencia o salud atribuible al release. Conservar evidencia saneada, detener promoción y solicitar decisión PO según ventana aprobada.

```bash
: "${RELEASE_PROJECT:?proyecto productivo efectivo requerido}"
: "${RELEASE_COMPOSE_BASE:?base preservada aprobada requerida}"
: "${ROLLBACK_IMAGE_OVERRIDE:?override anterior efectivo verificado requerido}"
docker compose -p "$RELEASE_PROJECT" -f "$RELEASE_COMPOSE_BASE" -f "$ROLLBACK_IMAGE_OVERRIDE" config --quiet
docker compose -p "$RELEASE_PROJECT" -f "$RELEASE_COMPOSE_BASE" -f "$ROLLBACK_IMAGE_OVERRIDE" pull api-gateway ms-auth ms-documentos web-admin
docker compose -p "$RELEASE_PROJECT" -f "$RELEASE_COMPOSE_BASE" -f "$ROLLBACK_IMAGE_OVERRIDE" up -d --no-build --no-deps api-gateway ms-auth ms-documentos web-admin
docker compose -p "$RELEASE_PROJECT" -f "$RELEASE_COMPOSE_BASE" -f "$ROLLBACK_IMAGE_OVERRIDE" ps api-gateway ms-auth ms-documentos web-admin
```

Registrar digests restaurados y salud/validación mínima autorizada. No restaurar DB ni revertir migraciones automáticamente; si el esquema no permite rollback app, STOP y autorización separada de recuperación. No git reset, eliminación de volúmenes, prune, cambios de OCR systemd/R2/RDS/secretos ni servicios externos. El rollback de imágenes no revierte datos de negocio.
