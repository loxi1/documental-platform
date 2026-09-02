# Estado productivo MVP — Documental Platform BBTI

**Fecha de corte:** 2026-09-02  
**Estado:** `PASS` según validación productiva informada  
**Alcance:** fotografía operativa y comandos de diagnóstico; no autoriza cambios

## 1. Baseline y alcance validado

| Componente | Estado | Evidencia/decisión vigente |
|---|---:|---|
| Repositorio empresa | `PASS` | `BBTI-SAC/documental-platform-bbti-prod` |
| Host | `PASS` | EC2 `ec2-documental-prod` |
| Web | `PASS` | `https://bbtecnologia.com` |
| API | `PASS` | `https://api.bbtecnologia.com/api/v1` |
| Contenedores | `PASS` | Docker operativo |
| Enrutamiento/TLS | `PASS` | Traefik operativo |
| Imágenes | `PASS` | GHCR operativo |
| Objetos | `PASS` | Cloudflare R2 operativo; nombre de bucket no publicado en documentación versionada |
| OCR | `PASS` | Worker Python nativo administrado por `systemd` |
| Persistencia | `PASS` | AWS RDS PostgreSQL; base `gestion_documental`, usuario `document_platform` |

No registrar aquí endpoints internos, credenciales, IDs de cuenta, tokens ni valores del archivo `.env.production`. El nombre operativo del bucket R2 puede documentarse cuando exista una referencia versionada y aprobada; en este corte no se encontró fuera de la configuración sensible, por lo que se omite.

## 2. Topología productiva

```text
Internet
  ├─ bbtecnologia.com ──────────┐
  └─ api.bbtecnologia.com ──────┤
                                v
                         Traefik en EC2
                         ├─ Web Admin
                         ├─ API Gateway
                         ├─ ms-auth
                         └─ ms-documentos
                                ├─ RDS: gestion_documental
                                ├─ R2: objetos privados
                                └─ NATS -> OCR Worker Python/systemd
```

El OCR no corre en Docker en producción. NATS se expone solo en loopback para el worker del host. RDS es externo: no debe levantarse PostgreSQL productivo dentro del compose.

## 3. Módulos validados de extremo a extremo

| Módulo | Carga desde web | Resultado |
|---|---:|---:|
| Compras | Validada | `PASS` |
| Almacén | Validada | `PASS` |
| Finanzas | Validada | `PASS` |
| Contabilidad | Validada | `PASS` |

La evidencia confirma el MVP de carga; no implica que el futuro ciclo de upload temporal esté implementado.

ERP/proyectos está fuera del MVP Documental. Su base asignada es `documental_platform` y el schema objetivo que debe conservarse es `proyectos`; esto no autoriza todavía despliegue ERP, cambios RDS ni limpieza de schemas.

## 4. Health checks de solo lectura

Ejecutar desde la raíz del repo desplegado en `ec2-documental-prod`:

Los seis scripts siguientes fueron verificados como existentes en la baseline `9e166aa6`:

```bash
bash deployment/scripts/healthcheck.sh
bash deployment/scripts/check-production-stack.sh
bash deployment/scripts/check-backend-health.sh
bash deployment/scripts/check-traefik-routing.sh
bash deployment/scripts/check-nats.sh
bash deployment/scripts/check-swagger-closed.sh
```

Comprobación pública sin mostrar secretos:

```bash
curl --fail --silent --show-error https://api.bbtecnologia.com/api/v1/health
curl --fail --silent --show-error --head https://bbtecnologia.com
```

Comprobación directa de inventario:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker compose --env-file deployment/env/.env.production \
  -f deployment/docker/docker-compose.production.yml ps
sudo systemctl status documental-ocr-worker --no-pager
```

Resultado esperado: servicios `dp_traefik`, `dp_nats`, `dp_api_gateway`, `dp_web_admin`, `dp_ms_auth` y `dp_ms_documentos` en estado saludable/activo, y `documental-ocr-worker` en `active (running)`. Registrar `PASS` o `FAIL` por componente; un script que imprime “OK” no reemplaza la revisión de cada salida.

## 5. Logs de diagnóstico

```bash
bash deployment/scripts/logs.sh dp_api_gateway
bash deployment/scripts/logs.sh dp_ms_auth
bash deployment/scripts/logs.sh dp_ms_documentos
bash deployment/scripts/logs.sh dp_web_admin
bash deployment/scripts/logs.sh dp_traefik
```

El script sigue logs en vivo. Para una captura acotada:

```bash
docker logs --since 30m --tail 200 dp_api_gateway
docker logs --since 30m --tail 200 dp_ms_documentos
docker logs --since 30m --tail 200 dp_traefik
sudo journalctl -u documental-ocr-worker --since '30 minutes ago' --no-pager
```

Antes de compartir logs, ocultar cookies, JWT, query strings firmadas, headers de autorización, datos personales y referencias sensibles de R2/RDS.

## 6. Límites y elementos que no se deben tocar

| Elemento | Regla |
|---|---|
| `punonorte.bbtecnologia.com` | Fuera de alcance; no cambiar DNS, router, certificado ni servicio asociado. |
| GIS | Independiente; usa `gis_db`. No reutilizarla ni ejecutar cambios desde Documental/ERP. |
| `gestion_documental` | Base productiva actual de Documental; no confundir con la base asignada a ERP. |
| `documental_platform` | Base reservada para ERP/proyectos/consultores externos; conservar `proyectos`. No borrar ni migrar sin inventario y respaldo verificado. |
| Schemas legacy | No borrar, renombrar ni alterar antes del inventario de dependencias. |
| `.env.production` | No inspeccionar en salidas compartidas, editar, copiar ni versionar. |

## 7. Criterio de incidente

Marcar `FAIL` y detener cambios si falla cualquiera de estos puntos: TLS/routing, health del API, acceso autenticado, escritura/lectura R2, conexión RDS, NATS u OCR. Recopilar timestamps UTC y local, request ID y logs acotados; no “reparar” borrando objetos, schemas, volúmenes o imágenes en uso.
