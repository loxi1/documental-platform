# BBTI ERP — Inventario read-only

**Estado:** inventario inicial; scripts históricos revisados, repo externo y estado actual de RDS no inspeccionados  
**Regla:** no modificar `bbti-erp`, `.env`, DNS, base, schemas ni migraciones

## 1. Hechos conocidos

| Tema | Estado conocido |
|---|---|
| Proyecto | `https://github.com/mirkovedia/bbti-erp` |
| Subdominio previsto | `proyectos.bbtecnologia.com` |
| Base asignada a ERP/proyectos | `documental_platform` |
| Schema ERP que debe conservarse | `proyectos` |
| Usuario aplicativo esperado | `proyectos_user`, limitado a `documental_platform.proyectos` |
| Cambio inmediato | Ninguno; primero inventario y plan |
| Base Documental productiva | `gestion_documental`; usuario `document_platform`; schemas `auditoria`, `auth`, `core`, `documentos` |
| Base GIS productiva | `gis_db`; usuario `gis_app`; schema principal `gis`; activa y fuera de alcance |

`documental_platform` ya no es la base productiva de Documental Platform. Queda reservada para ERP, proyectos y consultores externos. Dentro de ella, `auditoria`, `auth`, `core` y `documentos` son schemas legacy de la etapa anterior de Documental; el objetivo futuro es conservar únicamente `proyectos` y el usuario aplicativo que corresponda, después de los controles obligatorios.

## 2. Contexto confirmado por el autor de migraciones

El autor original confirma el siguiente mapa de arquitectura y procedencia:

| Base | Uso y aislamiento confirmados |
|---|---|
| `gestion_documental` | Producción actual de Documental Platform. Usuario app `document_platform`; schemas `auditoria`, `auth`, `core` y `documentos`. |
| `documental_platform` | Reservada para ERP/proyectos/consultores externos. Debe conservar `proyectos`; sus schemas `auditoria`, `auth`, `core` y `documentos` pertenecen a Documental legacy. |
| `gis_db` | Producción GIS activa. Usuario app `gis_app`; schema principal `gis`. No tocar. |

Controles históricos conocidos:

- `gis_app` tiene conexión únicamente a `gis_db` y `search_path = gis, public`;
- `gis_app` no debe ver ni operar schemas de `documental_platform`;
- cuando correspondía, se revocó `CONNECT` desde `PUBLIC` a bases que no debían ser públicas;
- `proyectos_user` fue creado para conectarse solo a `documental_platform`;
- `proyectos_user` debe usar `search_path = proyectos`;
- `proyectos_user` no debe tener `CREATE DATABASE` ni capacidad de crear schemas;
- puede tener `CREATE` dentro del schema `proyectos` y privilegios sobre sus tablas, secuencias y funciones;
- se diseñaron revocaciones para impedir su acceso a `auditoria`, `auth`, `core`, `documentos` y `public`.

Estos hechos describen intención y ejecución histórica conocida. No sustituyen la consulta del estado efectivo de RDS: roles, memberships, owners, grants, default privileges, `search_path`, conexiones y dependencias deben volver a verificarse en modo read-only.

## 3. Revisión de scripts históricos sanitizados

Se revisaron en modo lectura los tres archivos de `/home/loxi1/Documentos/validar_script`:

- `script_documental_platform.sql`;
- `script_gestion_documental.sql`;
- `script_gis.sql`.

Hallazgos:

- respaldan la separación conceptual de `gis_db`/`gis_app`/`gis` y `documental_platform`/`proyectos_user`/`proyectos`;
- incluyen grants, revokes, default privileges y ajustes de `search_path` coherentes con el aislamiento descrito;
- mezclan instrucciones históricas de distintos momentos y no prueban el estado actual;
- contienen pruebas, DDL y operaciones destructivas como `DROP` y `TRUNCATE`;
- contienen credenciales y referencias de infraestructura en texto claro.

Por lo anterior, esos archivos son evidencia histórica, no runbooks ejecutables. No deben copiarse al repo, ejecutarse completos, compartirse sin sanitización ni usarse como fuente única para limpiar RDS.

### Pendiente de seguridad

`PENDIENTE_SEGURIDAD`: rotar la contraseña de `proyectos_user` porque fue expuesta en chat/documentación temporal. Además, revisar y rotar cualquier otra credencial todavía vigente que aparezca en esos scripts históricos. Después de la rotación, actualizar únicamente el gestor de secretos y los consumidores autorizados; no guardar el nuevo valor en SQL, Markdown, `.env` versionados, tickets, chat ni logs. Esta documentación no ejecuta la rotación.

## 4. Preguntas pendientes

- Commit/rama desplegados y mecanismo real de deploy.
- Stack, versión runtime, procesos, puertos y health endpoint.
- Variables requeridas por nombre, sin leer valores secretos.
- Construcción de la URL de base y `search_path` efectivo.
- Todas las referencias a `documental_platform`, `proyectos` y otros schemas.
- ORM, migraciones, ownership y política de ejecución automática al iniciar.
- Tablas, vistas, funciones, secuencias, extensiones y tipos que usa.
- Dependencias cruzadas desde/hacia otros schemas, especialmente `public`.
- Roles/grants efectivos y clientes externos que consumen `proyectos`.
- Volumen, crecimiento, RPO/RTO, backups y prueba de restauración.
- Imágenes/compose, integración Traefik, websockets, tareas programadas y almacenamiento.
- Datos compartidos con Documental: identidad, empresas, proyectos y documentos.

## 5. Checklist read-only del repo externo

Realizar en un clon separado y autorizado. Preferir clon en máquina local o entorno de análisis, no en EC2 productiva, salvo que solo se requiera inspección controlada. Estos comandos no escriben en el repo, salvo el clon inicial, que debe prepararse fuera de producción siempre que sea posible.

```bash
git status --short
git branch --show-current
git log -10 --oneline --decorate
git remote -v
rg --files | sed -n '1,240p'
find . -maxdepth 3 -type f \
  \( -name 'Dockerfile*' -o -name 'docker-compose*.yml' -o -name 'compose*.yml' \
  -o -name 'package.json' -o -name 'pyproject.toml' -o -name 'requirements*.txt' \
  -o -name 'go.mod' -o -name '*.service' \) -print
```

Buscar referencias sin imprimir `.env` ni credenciales:

```bash
rg -n --hidden \
  --glob '!.git/**' --glob '!.env*' --glob '!**/node_modules/**' \
  'documental_platform|gestion_documental|gis_db|schema|search_path|proyectos'
rg -n --hidden \
  --glob '!.git/**' --glob '!.env*' --glob '!**/node_modules/**' \
  'migrat|prisma|typeorm|sequelize|knex|alembic|django|flyway|liquibase'
rg -n --hidden \
  --glob '!.git/**' --glob '!.env*' --glob '!**/node_modules/**' \
  'traefik|Host\(|health|listen|port|cron|worker|queue|websocket'
```

Inspeccionar por nombre de variable, nunca por valor:

```bash
find . -maxdepth 3 -type f \( -name '.env.example' -o -name '*.env.example' \) -print
rg -n --glob '*.example' --glob '!*.env' \
  'DATABASE|DB_|POSTGRES|SCHEMA|HOST|PORT|URL'
```

Checklist de salida:

- [ ] commit y rama registrados;
- [ ] árbol de servicios y puertos;
- [ ] mecanismo de migración y arranque;
- [ ] schemas referenciados explícita e implícitamente;
- [ ] contrato de variables por nombre;
- [ ] health, logs, backup y rollback;
- [ ] dependencias con Documental/GIS;
- [ ] ningún archivo modificado (`git status --short` vacío).

## 6. Checklist read-only de PostgreSQL

Usar una cuenta de auditoría con `CONNECT` y `SELECT` de catálogo únicamente, idealmente contra réplica/snapshot. No usar el rol owner ni `document_platform`. No ejecutar `SET search_path` seguido de DDL, migraciones, `VACUUM FULL`, `REINDEX`, `ANALYZE` intensivo ni funciones de aplicación.

Desde `psql`, sin incluir host, usuario ni password en el historial:

```sql
SELECT current_database(), current_user, current_setting('server_version');
SHOW search_path;

SELECT schema_name, schema_owner
FROM information_schema.schemata
ORDER BY schema_name;

SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;

SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'proyectos'
ORDER BY table_name, ordinal_position;

SELECT routine_schema, routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'proyectos'
ORDER BY routine_name;

SELECT grantee, privilege_type, table_schema, table_name
FROM information_schema.role_table_grants
WHERE table_schema = 'proyectos'
ORDER BY grantee, table_name, privilege_type;

SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole
FROM pg_catalog.pg_roles
WHERE rolname IN ('proyectos_user', 'document_platform', 'gis_app')
ORDER BY rolname;

SELECT datname,
       has_database_privilege('proyectos_user', datname, 'CONNECT') AS proyectos_connect,
       has_database_privilege('gis_app', datname, 'CONNECT') AS gis_connect
FROM pg_catalog.pg_database
ORDER BY datname;

SELECT current_setting('search_path') AS session_search_path;
```

La configuración persistida por rol/base debe ser revisada por el DBA desde catálogo, sin cambiarla. Criterios esperados: `proyectos_user` solo conecta a `documental_platform`, trabaja en `proyectos`, no crea bases ni schemas y no accede a schemas legacy; `gis_app` queda aislado en `gis_db` y GIS no se modifica.

Dependencias entre schemas (revisar el resultado con un DBA; catálogo PostgreSQL):

```sql
SELECT DISTINCT
  source_ns.nspname AS source_schema,
  source.relname AS source_object,
  target_ns.nspname AS target_schema,
  target.relname AS target_object
FROM pg_depend dep
JOIN pg_rewrite rw ON rw.oid = dep.objid
JOIN pg_class source ON source.oid = rw.ev_class
JOIN pg_namespace source_ns ON source_ns.oid = source.relnamespace
JOIN pg_class target ON target.oid = dep.refobjid
JOIN pg_namespace target_ns ON target_ns.oid = target.relnamespace
WHERE source_ns.nspname = 'proyectos'
   OR target_ns.nspname = 'proyectos'
ORDER BY 1, 2, 3, 4;
```

Tamaño aproximado, solo si la cuenta tiene acceso:

```sql
SELECT schemaname, relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
WHERE schemaname = 'proyectos'
ORDER BY pg_total_relation_size(relid) DESC;
```

Además, obtener de AWS/RDS en modo lectura: snapshots disponibles, retención, cifrado, parameter group, conexiones y métricas. No volcar datos personales como evidencia. Si se autoriza un respaldo lógico posterior, primero documentar destino cifrado, retención y prueba de restore.

## 7. Control previo obligatorio antes de borrar schemas legacy

Los schemas candidatos dentro de `documental_platform` son exclusivamente `auditoria`, `auth`, `core` y `documentos`. `proyectos` debe conservarse. La confirmación de su origen legacy permite clasificarlos como candidatos, pero no autoriza su eliminación.

| Orden | Control obligatorio | Criterio de salida |
|---:|---|---|
| 1 | Backup/snapshot | Snapshot identificado, retención acordada y restore ensayado |
| 2 | Inventario read-only | Objetos, tamaños, owners, dependencias, tráfico y consumidores documentados |
| 3 | Roles/grants | Roles, memberships, `CONNECT`, `search_path`, grants y default privileges validados |
| 4 | Revocación/cuarentena | Acceso legacy retirado de forma reversible y período de observación sin errores |
| 5 | Eliminación controlada | Cambio separado, lista exacta, aprobación de ERP/DBA/seguridad y rollback disponible |
| 6 | Validación post-limpieza | ERP `PASS`; `proyectos` íntegro; Documental y GIS sin impacto; backups y monitoreo `PASS` |

No incluir SQL destructivo en este documento. Cada fase debe generar evidencia `PASS/FAIL`; cualquier `FAIL` detiene la secuencia.

## 8. Riesgos antes de borrar schemas

| Riesgo | Consecuencia |
|---|---|
| `search_path` implícito | La aplicación puede depender de objetos sin prefijo visible en código |
| FK/vistas/funciones cruzadas | Un drop rompe objetos fuera de `proyectos` |
| Migraciones al arranque | El ERP podría recrear, modificar o vaciar estructuras |
| Roles/grants compartidos | Aislamiento aparente pero acceso transversal real |
| Jobs o integraciones ocultas | Fallos diferidos después del borrado |
| Secuencias/extensiones/tipos compartidos | Restore parcial insuficiente |
| Backup sin restore probado | Pérdida no recuperable |
| Confusión de bases | Riesgo de actuar sobre `gestion_documental` o `gis_db`, ambas productivas y fuera de la limpieza ERP |
| Scripts históricos mixtos | Ejecutar un archivo completo puede alterar GIS, roles o datos no incluidos en el cambio |
| Credenciales expuestas | Acceso no autorizado incluso si el modelo de grants es correcto |

**Criterio obligatorio:** hasta completar inventario de código, catálogo, tráfico, backup/restauración y responsables, cualquier eliminación queda `FAIL / NO AUTORIZADA`.
