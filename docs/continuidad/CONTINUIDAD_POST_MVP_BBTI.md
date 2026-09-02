# Continuidad post-MVP — Documental Platform BBTI

**Baseline:** `main` en `9e166aa6` — “merge: publica baseline gestion documental y deploy MVP”  
**Producción:** validada según el corte operativo informado  
**Propósito:** guía de continuidad; no ejecuta ni autoriza despliegues

## 1. Qué quedó cerrado

| Capacidad | Resultado |
|---|---:|
| Baseline productiva en repo empresa | `PASS` |
| EC2 + Docker + Traefik | `PASS` |
| Publicación de imágenes GHCR | `PASS` |
| Web `bbtecnologia.com` | `PASS` |
| API `api.bbtecnologia.com/api/v1` | `PASS` |
| Cloudflare R2 | `PASS` |
| RDS `gestion_documental` con rol runtime `document_platform` | `PASS` |
| OCR Python por `systemd` | `PASS` |
| Carga web Compras, Almacén, Finanzas y Contabilidad | `PASS` |

Quedan fuera de este cierre GIS (`gis_db`), `punonorte.bbtecnologia.com`, la limpieza controlada de schemas antiguos y la integración/despliegue de `bbti-erp`.

`documental_platform` no queda clasificada como una base legacy general: está reservada para ERP, proyectos y consultores externos. Su estado objetivo es conservar el schema `proyectos` y el usuario aplicativo autorizado para ese ámbito. Dentro de esa base, únicamente `auditoria`, `auth`, `core` y `documentos` son schemas legacy de Documental Platform. Su eliminación futura requiere backup y restore probado, inventario read-only, validación de roles/grants, rotación de credenciales expuestas, cuarentena reversible y aprobación explícita; no forma parte del MVP ni está autorizada por este documento.

## 2. Qué viene después

1. Aprobar contrato del upload temporal y su modelo de amenazas.
2. Inventariar comportamiento real de carga, esquema, R2, NATS y OCR.
3. Implementar por fases detrás de feature flag, comenzando en entorno no productivo.
4. Ejecutar matriz de pruebas para los cuatro módulos y rollback lógico.
5. Inventariar `bbti-erp` y `proyectos` en modo read-only.
6. Aislar ERP en una base propia; integrar documentos por APIs.
7. Solo después evaluar cuarentena y eliminación controlada de `auditoria`, `auth`, `core` y `documentos` dentro de `documental_platform`, conservando `proyectos`.

Documentos rectores:

- `docs/architecture/UPLOAD_TEMPORAL_PLAN.md`
- `docs/integraciones/BBTI_ERP_INVENTARIO_READONLY.md`
- `docs/integraciones/PLAN_AISLAMIENTO_BBTI_ERP.md`
- `docs/deploy/ESTADO_PRODUCTIVO_MVP_BBTI.md`

## 3. Del repo personal al repo empresa

Usar revisión por commit/PR, no copiar el directorio ni `.env.production`. Los nombres exactos de remotos deben verificarse con `git remote -v`.

Preparación read-only:

```bash
git status --short
git branch --show-current
git log --oneline --decorate main..HEAD
git diff --check main...HEAD
git diff --stat main...HEAD
git diff --name-status main...HEAD
```

Flujo recomendado una vez autorizado:

```bash
git fetch --all --prune
git switch main
git pull --ff-only <personal-remote> main
git switch -c <rama-de-integracion>
git cherry-pick <commit-aprobado>
git diff --check <empresa-remote>/main...HEAD
git push -u <empresa-remote> <rama-de-integracion>
```

Abrir PR hacia `main` de `BBTI-SAC/documental-platform-bbti-prod`, exigir CI/revisión y usar el método de merge acordado. Antes del push confirmar que solo viajan archivos esperados y que no existen `.env`, tokens, dumps, certificados ni evidencias sensibles. No asumir que los remotos se llaman `origin`/`upstream`.

Para una entrega solo documental, el PR no debe incluir apps, services, workers, packages, migraciones ni deploy runtime.

## 4. Actualización controlada en EC2

No desplegar directamente una rama personal. Después de merge aprobado en repo empresa:

```bash
cd ~/apps/documental-platform-bbti-prod
git status --short
git branch --show-current
git remote -v
git fetch <empresa-remote>
git log --oneline --decorate HEAD..<empresa-remote>/main
git pull --ff-only <empresa-remote> main
```

Si `git status --short` no está limpio, detenerse: no resetear ni borrar cambios. Los scripts `deployment/scripts/deploy.sh` y `deployment/scripts/check-production-stack.sh` fueron verificados como existentes en la baseline `9e166aa6`. El primero ya ejecuta `git pull --ff-only`, build, `up -d` y healthcheck; por eso debe usarse solo con rama/remoto y ventana confirmados.

```bash
bash deployment/scripts/deploy.sh
bash deployment/scripts/check-production-stack.sh
sudo systemctl status documental-ocr-worker --no-pager
```

Registrar commit anterior/nuevo, imágenes/digests, inicio/fin, operador y `PASS/FAIL`. Tener preparado `deployment/scripts/rollback.sh`, revisado para el release concreto, sin ejecutarlo preventivamente.

## 5. Limpieza segura de imágenes GHCR/Docker

Separar dos actividades:

- **Host EC2:** retirar caché/imágenes locales no usadas.
- **Registry GHCR:** aplicar retención de versiones desde GitHub con política y aprobación; conservar releases necesarios para rollback.

Inventario read-only en EC2:

```bash
docker system df
docker image ls --digests
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

Después de confirmar que el release es estable y que los digests de rollback están disponibles en GHCR, una limpieza local conservadora puede ser:

```bash
docker image prune
docker builder prune --filter 'until=168h'
```

Estos comandos son destructivos sobre recursos no usados y requieren autorización operativa. No usar `docker system prune -a`, no borrar volúmenes y no eliminar tags/digests activos. En GHCR conservar como mínimo versión activa, versión anterior comprobada y releases sujetos a retención/auditoría. Preferir política por antigüedad/estado sin seleccionar manualmente paquetes ambiguos.

## 6. Operación del OCR

El worker productivo es Python con virtualenv y `systemd`; NATS está en Docker y escucha en loopback. `deployment/scripts/ocr-status.sh` fue verificado como existente en la baseline `9e166aa6`.

```bash
bash deployment/scripts/ocr-status.sh
sudo systemctl status documental-ocr-worker --no-pager
sudo journalctl -u documental-ocr-worker -n 100 --no-pager
sudo journalctl -u documental-ocr-worker -f
```

Reinicio, solo en ventana autorizada:

```bash
sudo systemctl restart documental-ocr-worker
sudo systemctl status documental-ocr-worker --no-pager
```

Después de actualizar código/dependencias del worker, revisar primero `docs/18-runbooks/actualizar-ocr.md` y `docs/18-runbooks/ocr-worker-host.md`. Validar: proceso activo, conexión NATS, consumo de un archivo de prueba autorizado, persistencia del resultado y ausencia de fuga de OCR/datos en logs. Un fallo OCR no debe borrar el archivo ni confirmar el documento.

## 7. Autonomía operativa para BBTI

### Roles mínimos

| Rol | Responsabilidad |
|---|---|
| Dueño de producto | Prioridad, aceptación por módulo y ventana de cambio |
| Operador EC2 | Deploy, health, logs y rollback |
| Responsable DB/DBA | RDS, backups, restore, permisos y migraciones |
| Responsable seguridad | Secretos, GHCR, DNS/TLS, R2 y auditoría |
| Responsable funcional | Pruebas Compras/Almacén/Finanzas/Contabilidad |
| Responsable ERP/GIS | Autoridad sobre sus sistemas; aprobación de aislamiento |

### Paquete de transferencia

- matriz de accesos por rol, almacenada fuera del repo y sin compartir credenciales;
- mapa de servicios, dominios, owners y escalamiento;
- runbooks de deploy, rollback, RDS, R2, OCR, DNS/TLS y rotación de secretos;
- dashboard/alertas para EC2, RDS, API, R2, NATS, OCR y certificados;
- calendario de backups y simulacro periódico de restore;
- checklist de release con commit/digest y evidencia `PASS/FAIL`;
- sesión práctica: deploy no productivo, incidente OCR, rollback y restore;
- registro de decisiones y deuda: upload temporal, ERP y legacy.

### Criterio de autonomía

BBTI alcanza autonomía cuando al menos dos personas pueden, sin apoyo del autor original: identificar el release, ejecutar health checks, diagnosticar logs sin exponer secretos, desplegar mediante PR, revertir la aplicación, operar OCR y coordinar un restore ensayado. El acceso a producción debe seguir mínimo privilegio y doble control para DNS, secretos, DB y borrados.

## 8. Regla de oro

No mezclar en una misma ventana: deploy Documental, migración ERP, cambios GIS, limpieza de schemas y limpieza de imágenes. Cada cambio debe tener alcance, evidencia previa, rollback y dueño independientes.
