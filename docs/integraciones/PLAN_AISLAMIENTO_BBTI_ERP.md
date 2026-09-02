# Plan de aislamiento — BBTI ERP

**Estado:** propuesta conservadora, no ejecutable  
**Dependencia:** completar `BBTI_ERP_INVENTARIO_READONLY.md`

## 1. Objetivo

Publicar y operar `bbti-erp` como sistema independiente sobre la base reservada `documental_platform`, evitando que la limpieza de schemas de Documental legacy afecte ERP, Documental productivo o GIS. La integración funcional futura debe realizarse por APIs con contratos explícitos, nunca mediante tablas compartidas.

## 2. Contexto confirmado por el autor de migraciones

| Sistema | Base productiva/asignada | Usuario app | Schemas propios |
|---|---|---|---|
| Documental Platform | `gestion_documental` | `document_platform` | `auditoria`, `auth`, `core`, `documentos` |
| ERP/proyectos/consultores | `documental_platform` | `proyectos_user` actualmente esperado | `proyectos` |
| GIS | `gis_db` | `gis_app` | `gis` |

En `documental_platform`, los schemas `auditoria`, `auth`, `core` y `documentos` pertenecen a una etapa legacy de Documental Platform. Deben tratarse como candidatos a limpieza controlada, no como schemas compartidos con ERP. GIS está activo y no se toca.

## 3. Opciones

| Opción | Ventajas | Riesgos/costos | Uso recomendado |
|---|---|---|---|
| A. Mantener `proyectos` en `documental_platform` | Coincide con la base reservada para ERP; menor cambio; permite retirar solo residuos legacy | Requiere limpiar con cuidado roles/schemas históricos y verificar aislamiento | Recomendación actual conservadora |
| B. Migrar `proyectos` a una base nueva | Aislamiento fuerte, backups/escalado/ownership independientes | Requiere inventario completo, migración, corte, validación y rollback | Destino recomendado después del inventario |
| C. Integrar parcialmente con `gestion_documental` por APIs | Contratos claros; Documental conserva autoridad sobre documentos/OCR | Diseño de identidad, autorización, disponibilidad, versionado y consistencia eventual | Integración objetivo; no trasladar tablas de ERP a Documental |

Las opciones no son excluyentes: A es la arquitectura conservadora confirmada, B queda como evolución opcional si se requiere otra base y C es la forma obligatoria de integración funcional con Documental.

Para la opción B, los nombres técnicos sugeridos —sujetos a inventario, estándar de infraestructura y aprobación del DBA— son:

```yaml
nueva_base_sugerida: proyectos_erp  # alternativa: bbti_erp
usuario_sugerido: bbti_erp_app
```

## 4. Recomendación conservadora

1. Conservar `documental_platform` como base asignada a ERP/proyectos/consultores externos y `proyectos` como su único schema aplicativo objetivo.
2. Mantener `proyectos_user` limitado a conexión en `documental_platform`, `search_path = proyectos`, sin `CREATE DATABASE` ni creación de schemas.
3. Inventariar y luego deshabilitar o retirar usuarios legacy de Documental, usando cuarentena reversible cuando aplique.
4. Limpiar `auditoria`, `auth`, `core` y `documentos` de `documental_platform` únicamente después de backup, restore probado, inventario y aprobaciones.
5. Mantener Documental en `gestion_documental` y GIS en `gis_db`, con usuarios, grants, backups y ciclos de migración independientes.
6. Integrar ERP con Documental/GIS exclusivamente mediante APIs versionadas; evitar queries cross-database, tablas o credenciales compartidas.

La opción B no es necesaria para alcanzar el aislamiento inmediato: queda disponible si una futura decisión arquitectónica exige una base ERP nueva. No se recomienda mover `proyectos` dentro de `gestion_documental`. Tampoco se recomienda que ERP consulte tablas de `gis_db`; la integración GIS debe ser por API/contrato propio si algún caso de uso lo exige.

## 5. Control previo obligatorio antes de borrar schemas legacy

Alcance exacto de candidatos en `documental_platform`: `auditoria`, `auth`, `core` y `documentos`. Deben conservarse `proyectos`, su información y el usuario aplicativo autorizado. No ejecutar esta secuencia todavía.

| Paso | Evidencia de salida |
|---|---|
| 1. Congelar alcance | Bases, schemas, owners y responsables identificados |
| 2. Inventario repo/runtime | Commit desplegado, configuración por nombre, procesos y migraciones |
| 3. Inventario catálogo | Objetos, dependencias, grants, tamaños y extensiones |
| 4. Inventario tráfico | Lecturas/escrituras y clientes durante un período representativo |
| 5. Clasificación | Cada objeto: conservar, migrar, archivar o candidato a borrar |
| 6. Backup | Snapshot y dump cifrado según política |
| 7. Restore | Restauración ensayada y tiempos RPO/RTO medidos |
| 8. Rotación de credenciales | `proyectos_user` y cualquier secreto expuesto rotados mediante gestor seguro |
| 9. Cuarentena | Usuarios legacy deshabilitados/revocados de forma reversible y período de observación cumplido |
| 10. Eliminación | Lista exacta de schemas, cambio separado, aprobación y respaldo restaurable |
| 11. Validación posterior | ERP, `proyectos`, conexiones, jobs, Documental y GIS en `PASS` |
| 12. Cierre | Evidencias, responsables, fecha y resultado archivados sin secretos |

La ausencia de errores visibles no prueba ausencia de consumidores. El borrado requiere aprobación explícita de dueños de ERP, Documental, GIS y DBA.

## 6. DNS y Traefik para `proyectos.bbtecnologia.com`

Plan, no comandos de ejecución:

1. Confirmar propietario del DNS, IP/target productivo y si Cloudflare está en proxy o DNS-only.
2. Inventariar puertos y health endpoint de ERP; el puerto de aplicación no debe exponerse públicamente.
3. Crear para ERP su propio compose, servicio y router, con red Docker/host aislada, nombre, logs y política de restart propios.
4. Incorporar router Traefik exclusivo con regla `Host(`proyectos.bbtecnologia.com`)`, entrypoint HTTPS, servicio/puerto exacto y certificado.
5. No modificar routers de `bbtecnologia.com`, `api.bbtecnologia.com` ni `punonorte.bbtecnologia.com`.
6. Aplicar headers, límites, timeouts y websockets según inventario; no copiar middlewares a ciegas.
7. Validar primero resolución y routing local por `Host`, luego DNS/TLS público y health funcional.
8. Definir rollback: retirar solo el registro/router ERP y volver a la versión anterior, sin tocar Documental.

ERP no debe agregarse al compose productivo de Documental sin ADR o control de arquitectura aprobado. Hasta que exista esa decisión, sus archivos de despliegue, ciclo de vida y rollback deben permanecer separados.

Checks posteriores propuestos:

```bash
curl --fail --silent --show-error --head https://proyectos.bbtecnologia.com
curl -k --head -H 'Host: proyectos.bbtecnologia.com' https://127.0.0.1
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker logs --since 15m --tail 200 dp_traefik
```

El prefijo/nombre real del contenedor ERP queda pendiente del inventario.

## 7. Independencia objetivo

| Sistema | Base/ownership | Entrada pública | Integración permitida |
|---|---|---|---|
| Documental | `gestion_documental`; equipo Documental | Web/API actuales | API versionada, eventos contractuales |
| ERP Proyectos | `documental_platform`, conservando solo `proyectos`; equipo ERP | `proyectos.bbtecnologia.com` | API Documental; API GIS si se aprueba |
| GIS | `gis_db`; equipo GIS | Endpoints GIS vigentes | API propia; nunca tablas compartidas |

Controles mínimos:

- credencial y rol distintos por sistema, sin owner compartido;
- security groups/network policies con mínimo acceso;
- backups, restore, métricas, alertas y deploy independientes;
- migraciones ejecutadas únicamente por el sistema dueño;
- IDs externos estables y tablas de mapeo en el consumidor, si son necesarias;
- API con autenticación servicio-a-servicio, scopes, timeouts, reintentos e idempotencia;
- ninguna dependencia de `search_path` cruzado;
- pruebas de caída: ERP debe degradar de forma controlada si Documental/GIS no responde.

## 8. Puertas `PASS/FAIL`

- `PASS`: inventario completo, backup restaurable, migración piloto, permisos mínimos, health y rollback ensayados.
- `FAIL`: referencias desconocidas, migraciones automáticas no controladas, dependencias cross-schema, restore no probado o necesidad de credenciales compartidas.
- Con cualquier `FAIL`, se mantiene intacto el estado actual de `documental_platform` y se prohíbe borrar schemas.
