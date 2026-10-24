# Despliegue R2 — continuidad y procedimiento focal

## Continuidad R2 — 23/10/2026

Fuente: paquete MSII `PAQUETE_CODEX_R2_DOCUMENTACION_INVENTARIO_2026-10-23.md` y actualización ME `ACTUALIZACION_BIBLIOTECARIO_TECNICO_R2_2026-10-23.md`, ambos en `/home/loxi1/Descargas/`. Producción R2 = **DEPLOY_TECHNICAL_PASS reportado por PO/MSII**; aceptación funcional integral = **PENDING**, E2E = **NOT_VERIFIED**. Esta actualización documental no accedió a EC2/GHCR/RDS ni autoriza operaciones.

Commit Enterprise R2: `e1f099faeb4dfdc9f2b49b9984fe211935875ff3`. Ver [manifest vigente](../31-governance/RELEASE_MANIFEST.md), [deploy](../18-runbooks/DEPLOYMENT_RUNBOOK.md) y [rollback](../18-runbooks/ROLLBACK_RUNBOOK.md).

## Configuración efectiva y alcance

Desde `/home/ubuntu/apps/documental-platform-bbti-prod`, registrar commit autorizado, configuración efectiva, cuatro imágenes locales por digest, disco, salud previa y rollback preparado. Preservar entorno privado, redes, volúmenes, RDS/R2. No construir en EC2 ni ejecutar migraciones implícitas.

Comando de referencia READ_ONLY; no ejecutado en esta orden:

```bash
docker compose \
  --project-name docker \
  --env-file deployment/env/.env.production \
  -f deployment/docker/docker-compose.production.yml \
  -f /home/ubuntu/releases/documental-platform-bbti/r2-e1f099fa-r1/release.images.yml \
  config --images
```

Comparar exactamente las cuatro referencias con el manifest. NATS y Traefik pueden aparecer como dependencias de la configuración; no son servicios objetivo de recreación.

## Activación documentada, requiere autorización PO independiente

```bash
docker compose \
  --project-name docker \
  --env-file deployment/env/.env.production \
  -f deployment/docker/docker-compose.production.yml \
  -f /home/ubuntu/releases/documental-platform-bbti/r2-e1f099fa-r1/release.images.yml \
  up -d --force-recreate --no-deps --no-build --pull never \
  api-gateway ms-auth ms-documentos web-admin
```

`--force-recreate` solo corresponde cuando el preflight acredita necesidad y alcance y el PO autoriza la interrupción; no es regla universal. No hacer down ni reiniciar OCR/NATS/Traefik por defecto.

## Incidente reportado y gate de cierre

El primer up indicó Started 4/4, pero Config.Image continuó en C1. Config --images resolvía R2. La segunda activación focal con force-recreate fue seguida de identidad R2 4/4 y disponibilidad. Causa interna de la no recreación inicial: **NO ACREDITADA**.

Separar COMPOSE_STARTED, EFFECTIVE_IMAGE_IDENTITY, HEALTH y FUNCTIONAL_ACCEPTANCE. `.Image` es ID local; `.Config.Image` conserva la referencia de creación. Aplicar [verificación](DEPLOYMENT_VERIFICATION.md). Los comandos históricos de abajo corresponden a Actions #28 y no deben combinarse con R2.


---

## Registro histórico anterior (conservado)

# Despliegue manual propuesto — Actions #28

Control: `MVP-RELEASE-DOCUMENTARY-CONSOLIDATION-R11-FINAL`. Fecha: 2026-10-16. Estado: **CONSOLIDADO PARA REVISIÓN FINAL Y PUBLICACIÓN DOCUMENTAL CONTROLADA**. Despliegue NO autorizado.

Complementa [deploy-produccion.md](deploy-produccion.md). No ejecutar por la existencia de este documento. Cadena cumplida hasta publicación: SOURCE → Enterprise → Actions #28 → GHCR; EC2 pendiente.

## Precondiciones obligatorias

1. Revisión final y publicación documental controlada; manifest y override aprobados por checksum.
2. Control predeploy read-only autorizado: baseline efectiva EC2, Compose/overrides, imágenes/digests, montajes, configuración y dependencias. No asumir que el histórico sigue activo.
3. Backup RDS recuperable, compatibilidad esquema/código nuevo y anterior, ledger verificado sin migraciones automáticas. Separar rollback de app de restauración DB.
4. Cuatro imágenes disponibles, plataforma linux/amd64 compatible con host, capacidad suficiente, salud base y rollback efectivo acreditados. No usar tags latest.
5. Preservación explícita de OCR systemd/R2/RDS/NATS/puertos/redes/volúmenes/secretos; autorización PO separada del despliegue, ventana y criterios de abortar.

## Override image-only candidato, todavía no creado en EC2

Guardar posteriormente en una ruta durable aprobada, sin secretos ni cambios de infraestructura. Usar nombres efectivos de servicios; si no coinciden, detener antes de ejecutar.

```yaml
services:
  api-gateway:
    image: ghcr.io/bbti-sac/documental-platform-bbti-prod/api-gateway@sha256:f60b6928b1f92efcd3247b1e60f9ba62a154ddcfd897f6a0ecf33be06bbaac10
  ms-documentos:
    image: ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-documentos@sha256:48191dcbfb2283abd53d90566588167061534fe67a7e122280a9411fd091e721
  ms-auth:
    image: ghcr.io/bbti-sac/documental-platform-bbti-prod/ms-auth@sha256:d54b28f426c0ddd0f5ccc46c031bfe3310f5beb6d519b8158a4a95e7024671d7
  web-admin:
    image: ghcr.io/bbti-sac/documental-platform-bbti-prod/web-admin@sha256:2d224d284e0136e3c3a3b034c6872f0a2b405bc3cef9835d877ee827e25b3547
```

El Compose base histórico es `deployment/docker/docker-compose.production.yml`; verificar orden y overrides efectivos. El override histórico `/tmp/r4_p2_ec2_override_execution_r2.yml` es evidencia efímera, no configuración autorizada para #28. Usar `--no-build`; no scripts que compilen en host. No hacer down, prune ni recrear servicios externos.

```bash
# FUTURO, solo tras aprobación expresa del despliegue y de estas rutas.
: "${RELEASE_PROJECT:?proyecto productivo efectivo requerido}"
: "${RELEASE_COMPOSE_BASE:?Compose efectivo aprobado requerido}"
: "${RELEASE_IMAGE_OVERRIDE:?override image-only aprobado requerido}"
docker compose -p "$RELEASE_PROJECT" -f "$RELEASE_COMPOSE_BASE" -f "$RELEASE_IMAGE_OVERRIDE" config --quiet
docker compose -p "$RELEASE_PROJECT" -f "$RELEASE_COMPOSE_BASE" -f "$RELEASE_IMAGE_OVERRIDE" pull api-gateway ms-auth ms-documentos web-admin
docker compose -p "$RELEASE_PROJECT" -f "$RELEASE_COMPOSE_BASE" -f "$RELEASE_IMAGE_OVERRIDE" up -d --no-build --no-deps api-gateway ms-auth ms-documentos web-admin
docker compose -p "$RELEASE_PROJECT" -f "$RELEASE_COMPOSE_BASE" -f "$RELEASE_IMAGE_OVERRIDE" ps api-gateway ms-auth ms-documentos web-admin
```
Después seguir [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md). Ante regresión aplicar [ROLLBACK_RUNBOOK.md](ROLLBACK_RUNBOOK.md) solo con baseline anterior acreditada. Credenciales mediante mecanismo privado aprobado; no en argv, URLs o informe. No modificar checkout productivo ni sustituir configuración por LAB sin control independiente.
