# Configuración de Producción

## Propósito

Resumir la configuración productiva de Documental Platform y dirigir cada operación a su autoridad correspondiente.

Este documento no sustituye los runbooks de deploy, backup, restore u OCR.

## Infraestructura

- aplicación: EC2 t3a.large;
- base de datos: AWS RDS PostgreSQL db.m6g.large;
- almacenamiento de objetos: Cloudflare R2 privado;
- reverse proxy: Traefik;
- servicios de aplicación: Docker Compose;
- OCR productivo: Ubuntu host + Python venv + systemd.

PostgreSQL productivo no corre en Docker.

MinIO pertenece a LAB y no forma parte de producción.

## Servicios Docker productivos

- web-admin;
- api-gateway;
- ms-auth;
- ms-documentos;
- NATS;
- Traefik.

OCR Worker no pertenece al stack Docker/GHCR productivo.

## Configuración y secretos

La configuración productiva debe mantenerse fuera del repositorio cuando contenga secretos.

Usar como referencias:

- `../18-runbooks/production-env.md`
- `11-deployment-readiness-checklist.md`

## Backup y restore

Las operaciones de backup y restore de RDS se gobiernan por:

- `../18-runbooks/backup-rds.md`
- `../18-runbooks/restore-rds.md`

Restore no forma parte automática de un deploy ni de un rollback de aplicación.

## OCR

La autoridad operativa del OCR productivo es:

- `../18-runbooks/ocr-worker-host.md`

La actualización de dependencias OCR del host se documenta en:

- `../18-runbooks/actualizar-ocr.md`

## Release y deploy

La cadena estándar es:

`development branch → SOURCE main → Enterprise main → CI/GHCR → EC2`

Autoridades:

- gobernanza de release: `../31-governance/07-release-process.md`;
- estándar Git: `../23-standards/07-git.md`;
- deploy EC2: `../18-runbooks/deploy-produccion.md`;
- actualización posterior: `06-actualizar-version.md`;
- go-live: `10-checklist-go-live.md`.

No se despliega EC2 directamente desde SOURCE, development branches, worktrees o índices.


---

## 2026-11-25 — Cierre institucional documental NAS R1

Repository=SOURCE. Esta adenda prevalece únicamente sobre estados históricos incompatibles de NAS; no reescribe antecedentes ni autoriza acciones por su lectura.

SOURCE conserva excluidos los scripts locales de recuperación no rastreados.

### Configuración productiva acreditada (referencia, no ejecutar)

```ini
NODE_ENV=production
R2_NAS_ACTIVATION_FROM=2026-11-24T22:48:35.970Z
R2_NAS_ARCHIVE_ENABLED=true
R2_NAS_AUTO_ENABLED=true
R2_NAS_NEW_DOCUMENTS_ENABLED=true
R2_NAS_VIEWER_ENABLED=true
R2_NAS_VIEWER_ACCEPTED=false
R2_NAS_DEV_DELETE_ENABLED=false
R2_NAS_DESTINATION=SYNOLOGY_PROD
R2_NAS_SMB_HOST=10.77.26.2
R2_NAS_SMB_SHARE=GESTION-DOCUMENTARIA
R2_NAS_SMB_ROOT=PLATAFORMA_DOCUMENTAL
R2_NAS_SMB_USER=documental_platform_dev
R2_NAS_SMB_AUTH_FILE=/run/secrets/nas-smb.auth
R2_NAS_PUBLIC_GATEWAY_URL=https://api.bbtecnologia.com
R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS=https://api.bbtecnologia.com
```

Autenticación host `/etc/documental-platform/nas-prod.auth`, root:root, modo 0600, montaje read-only. R2_ACCOUNT_ID, credenciales R2 y preview secret existentes configurados; valores excluidos. No regenerar cutoff/secretos ni reactivar NAS. `R2_NAS_VIEWER_ACCEPTED=false` es el último flag runtime acreditado; aceptación PO PASS_PO es otro hecho y no cambia dicho flag por esta edición. La allowlist API valida URLs generadas, no frame ancestors.
### Seguridad, retención y recuperación

`PRODUCTION_R2_DELETE=DISABLED_BY_DESIGN`; `DEV_ONLY_DELETE_RESTRICTION=PRESERVED`; `PRODUCTION_R2_RETENTION=ACTIVE`. El código exige NODE_ENV=development, destino SYNOLOGY_DEV, autorización exacta y demás controles; cambiar solo una variable no habilita DELETE productivo. La permanencia en R2 de Factura/Guía/NI OC003214 y facturaOS000262 citadas arriba es esperada y no invalida NAS ni visor.

`NAS_BACKUP_RESTORE=NOT_ACCREDITED`. Hyper Backup y Snapshot Replication diferidos a consulta PO. Synology BASIC/BTRFS sin redundancia acreditada; BTRFS no es backup. Cuota técnica compartida de 500 GiB. Usuario SMB `documental_platform_dev` compartido entre DEV/PROD: separación por raíces/destino/configuración, no credenciales independientes.
DEV: `GESTION-DOCUMENTARIA/_DEV_DOCUMENTAL_PLATFORM`; PROD: `GESTION-DOCUMENTARIA/PLATAFORMA_DOCUMENTAL`. VPN/OpenVPN y SMB existentes preservados.

RDS snapshot automático aceptado: `rds:database-1-2026-11-24-08-42`; sin snapshot manual adicional; restore no probado. Respaldo RDS no protege archivos NAS. Cualquier futura eliminación productiva exige autorización independiente, protección NAS, revisión del bloqueo de código, integridad y auditoría; no está autorizada por este cierre.

Rollback de aplicación condicionado a compatibilidad de 0025/0026, authVersion global, JWT contextual, contraseñas actuales y auditoría; no reducir auth_version, no revivir JWT ni restaurar Auth legacy incompatible. No restaurar RDS ni borrar reservas/archivos como rollback automático. Preservar evidencia e imágenes anteriores; si no existe destino acreditado compatible, STOP y decisión PO/roll-forward.


---

## 2026-11-25 — Ampliación focal DELETE productivo, ingeniería local R1

### Contrato implementado para la autorización productiva

`R2_NAS_PRODUCTION_DELETE_ENABLED` está deshabilitado por defecto. No sustituye ni reutiliza `R2_NAS_DEV_DELETE_ENABLED`; en PROD este último permanece false. Se requiere adicionalmente `R2_NAS_PRODUCTION_DELETE_POLICY`, JSON de una decisión PO acreditada, nunca una autorización inferida del código.

La política versión 1 contiene `decisionId`, `proteccion.tipo` (`BACKUP_RECUPERABLE` o `RIESGO_COPIA_UNICA_ACEPTADO_PO`) y `proteccion.referencia`, `modo`, `desde`, `hasta`, y `contextos` con pares empresa/clienteId. La referencia no demuestra por sí sola un backup: antes de configurarla debe existir evidencia/decisión humana correspondiente. Fechas UTC estrictas, vigencia acotada, desde no anterior al cutoff original.

Modo `EXACTO`: lista de 1 a 20 identidades completas `{reservaId,archivoId,documentoId,version,empresa,clienteId,expedienteId}`; sin duplicados ni cruces de contexto. Es el mecanismo de piloto y recuperación B expresamente autorizada; ningún otro archivo se borra por activar el flag. Método interno `recuperarPendientesExactosProduccion()` reutiliza reserva/MOVE y no crea endpoint público de borrado. El lote entero se valida antes de reclamar trabajo. No usar scripts históricos ni barridos de prefijos.

Modo `NUEVOS`: sin lista de archivos y solo confirmaciones individuales desde `policy.desde`, dentro de los contextos autorizados. Así no adopta candidatos B ya confirmados. No impone las listas DEV como requisito de la operación ordinaria productiva. La elegibilidad documental existente mantiene sus verificaciones de archivo nuevo/fecha/contexto, más confirmación individual posterior al corte. No se usa la fecha de la OC/OS padre como autorización de borrado.

Se exige NODE_ENV=production, destino SYNOLOGY_PROD, host 10.77.26.2, share GESTION-DOCUMENTARIA, raíz PLATAFORMA_DOCUMENTAL, archivador/automatismo/nuevos/visor activos y aceptación de visor explícita. `R2_NAS_VIEWER_ACCEPTED=false` sigue siendo el flag productivo acreditado; PASS_PO anterior no lo cambia. No activar estos valores hasta autorización específica y protección/decisión de riesgo. Cutoff original preservado: `2026-11-24T22:48:35.970Z`.

Antes de DELETE: documento confirmado, reserva/tenant/contexto/versión y ruta definitiva coincidentes, lectura NAS independiente con tamaño/SHA256, disponibilidad por el camino de visor y ausencia de referencias incompatibles. Revalidar política; registrar durablemente decisión, protección e identidad R2/ETag antes de la intención DELETE, mediante la tabla 0026 y auditoría aditiva existentes.

El adaptador vuelve a hashear los bytes R2 y comprueba la cuenta contra el endpoint real del SDK. ETag es un token opaco, no SHA256. Con exclusión compartida y reserva permanente, el DELETE productivo envía `If-Match` del objeto verificado y no dispone de fallback incondicional. El cliente DELETE usa maxAttempts=1. Si la API rechaza la condición o existe sustitución/fallo/ambigüedad, no atribuir eliminación ni repetir DELETE automáticamente.

Los escritores genéricos y directos no pueden recrear o eliminar por fuera del archivador una clave reservada confirmada o incierta. Se conservan publicación NAS sin reemplazo, lease/CAS, protección del origen previo y reconciliación. Respuesta perdida+HEAD404 no acredita autoría; respuesta previa exitosa y ausencia posterior solo se acreditan para el mismo intento. Un intento incierto todavía presente tampoco se repite automáticamente. Fallos de NAS/DELETE no revierten la confirmación de negocio.

Las exclusiones numéricas 546/552/553 y autorizaciones 554/555 pertenecen a DEV y no se trasladan a identidades PROD por coincidencia de número. No se intervinieron esos objetos. Sin renombrar, recalcular periodo, modificar TEMP/OCR, esquemas, SQL 0025/0026 ni credenciales.
### Fronteras reales y continuidad

Backup/restore NAS sigue NO_ACREDITADO. No equiparar BTRFS/SHA256/backup RDS con respaldo recuperable. Antes de DELETE productivo se requiere protección acreditada o una aceptación PO explícita, informada y acotada del riesgo de copia única. Ingeniería y prueba DEV no aceptan ese riesgo por el PO.

Publicación/commit SOURCE, promoción/commit/push Enterprise, GHCR integral y deploy EC2 requieren autorización específica ligada al delta revisado; se solicitarán juntas, separando decisiones irreversibles. Despliegue inicial con DELETE productivo false, sin ampliar candidatos B ni modificar cutoff/secretos/flagsNAS existentes. G4 no está cerrado.

Tras autorización:SOURCE→Enterprise preservando historias/adaptaciones→un workflow build-images.yml main/all→cuatro imágenes OCI/runnable linux/amd64→EC2 por digests; luego activación piloto exacta únicamente con protección/decisión y autorización de DELETE. No latest, gh CLI, build EC2, migración automática ni rollback ciego. Recuperación tras borrar debe conservar lectura NAS y estados 0026; no volver a un runtime dependiente del objeto R2 eliminado.

Los procedimientos docs-only anteriores eran válidos para el cierre pendiente previo. No ejecutarlos sobre este incremento funcional ni usar sus inventarios/baselines como autorización actual. No publicar Enterprise antes de acreditar el nuevo SOURCE publicado. No inventar SHA/RunID/digests futuros. Reutilizar manuales R3, preservar 08 y transferir paquete tras validación MSE Actual; no indexación Bibliotecario supuesta.
