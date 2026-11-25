**Estado:** Procedimiento estándar
**Autoridad:** Operations

# Rollback de aplicación

## Objetivo

Revertir de forma controlada una release de aplicación en producción cuando el runtime o el smoke posterior al deploy no permiten mantener la release actual.

Este procedimiento preserva la base de datos y no constituye un restore de RDS.

## Alcance

El rollback normal comprende únicamente la release de aplicación distribuida mediante:

`Enterprise main → CI/GHCR → EC2`

No autoriza por sí mismo:

- rollback de migraciones;
- restore de RDS;
- cambios de datos;
- cambios GIS;
- cambios de secretos;
- cambios o rollback del OCR host.

## Precondición

Antes de mutar producción deben identificarse:

- release Enterprise actualmente desplegada;
- release Enterprise anterior autorizada a la que se pretende volver;
- commit Enterprise objetivo;
- imágenes GHCR objetivo;
- digest por cada servicio de aplicación objetivo;
- motivo del rollback.

La identidad mínima del rollback de aplicación es:

`APPLICATION_ROLLBACK_IDENTITY = ENTERPRISE_COMMIT + IMAGE_DIGESTS`.

No seleccionar una versión únicamente porque tenga el tag `latest`.

Si no puede establecerse provenance de la release objetivo, detener la operación.

## Base de datos

El rollback de aplicación preserva RDS.

No ejecutar automáticamente migraciones inversas ni restaurar snapshots como consecuencia de este runbook.

Si existe incompatibilidad entre la aplicación anterior y el estado actual de la base de datos, detener el rollback y abrir un control específico de base de datos/migración.

`APPLICATION_ROLLBACK != DB_ROLLBACK != RDS_RESTORE`.

Cuando el estado de DB/configuración haga inseguro volver a la aplicación anterior, la recuperación puede requerir `ROLL_FORWARD`; esa decisión necesita autorización específica y no se infiere desde este runbook.

La restauración de RDS se gobierna por `restore-rds.md`.

## OCR

OCR productivo queda fuera de este rollback.

El OCR Worker corre nativamente en Ubuntu mediante Python venv + systemd, según `ocr-worker-host.md`.

No reiniciar, reinstalar ni modificar OCR como consecuencia automática de un rollback de aplicación.

## Ejecución controlada

Una vez autorizada la release objetivo:

1. registrar el commit Enterprise objetivo;
2. posicionar el checkout productivo en la composición Enterprise autorizada mediante el mecanismo autorizado;
3. verificar exactamente el commit esperado;
4. obtener las imágenes GHCR correspondientes a los digests objetivo;
5. verificar la identidad de las imágenes;
6. recrear únicamente los servicios de aplicación requeridos;
7. preservar RDS, OCR, GIS y servicios fuera del alcance.

Ante cualquier mismatch entre identidad esperada y observada: `ABORT_ON_IDENTITY_MISMATCH`.

Los comandos concretos deben corresponder al mecanismo de release autorizado y a la evidencia disponible para la versión objetivo.

No utilizar `docker compose down` como mecanismo normal de rollback.

## Runtime witness

Después de la reversión verificar:

- checkout EC2 = commit Enterprise objetivo;
- imágenes runtime = release objetivo;
- digest esperado/verificado cuando esté disponible;
- contenedores requeridos running/healthy;
- API health = PASS;
- Web health = PASS.

## Smoke

Ejecutar smoke de:

1. la capacidad afectada que originó el rollback;
2. las capacidades críticas adyacentes que puedan haber sido afectadas.

Un rollback no queda cerrado únicamente porque los contenedores estén levantados.

## Cierre

Registrar:

- release retirada;
- release restaurada;
- commit Enterprise restaurado;
- imágenes/digests acreditados;
- causa;
- runtime witness;
- resultado del smoke.

Sólo entonces corresponde cerrar el rollback.

Si el rollback de aplicación no recupera el servicio, detener nuevas mutaciones y escalar al procedimiento específico correspondiente.

## Continuidad R2 → C1 (23/10/2026)

El override C1 se reporta preparado, no ensayado. Véase [procedimiento y límites R2](ROLLBACK_RUNBOOK.md). No inferir digests C1 de manifests históricos ni ejecutar restore RDS o reinicios auxiliares como consecuencia del rollback de imágenes.


---

## 2026-11-25 — Cierre institucional documental NAS R1

Repository=SOURCE. Esta adenda prevalece únicamente sobre estados históricos incompatibles de NAS; no reescribe antecedentes ni autoriza acciones por su lectura.

SOURCE conserva excluidos los scripts locales de recuperación no rastreados.

### Seguridad, retención y recuperación

`PRODUCTION_R2_DELETE=DISABLED_BY_DESIGN`; `DEV_ONLY_DELETE_RESTRICTION=PRESERVED`; `PRODUCTION_R2_RETENTION=ACTIVE`. El código exige NODE_ENV=development, destino SYNOLOGY_DEV, autorización exacta y demás controles; cambiar solo una variable no habilita DELETE productivo. La permanencia en R2 de Factura/Guía/NI OC003214 y facturaOS000262 citadas arriba es esperada y no invalida NAS ni visor.

`NAS_BACKUP_RESTORE=NOT_ACCREDITED`. Hyper Backup y Snapshot Replication diferidos a consulta PO. Synology BASIC/BTRFS sin redundancia acreditada; BTRFS no es backup. Cuota técnica compartida de 500 GiB. Usuario SMB `documental_platform_dev` compartido entre DEV/PROD: separación por raíces/destino/configuración, no credenciales independientes.
DEV: `GESTION-DOCUMENTARIA/_DEV_DOCUMENTAL_PLATFORM`; PROD: `GESTION-DOCUMENTARIA/PLATAFORMA_DOCUMENTAL`. VPN/OpenVPN y SMB existentes preservados.

RDS snapshot automático aceptado: `rds:database-1-2026-11-24-08-42`; sin snapshot manual adicional; restore no probado. Respaldo RDS no protege archivos NAS. Cualquier futura eliminación productiva exige autorización independiente, protección NAS, revisión del bloqueo de código, integridad y auditoría; no está autorizada por este cierre.

Rollback de aplicación condicionado a compatibilidad de 0025/0026, authVersion global, JWT contextual, contraseñas actuales y auditoría; no reducir auth_version, no revivir JWT ni restaurar Auth legacy incompatible. No restaurar RDS ni borrar reservas/archivos como rollback automático. Preservar evidencia e imágenes anteriores; si no existe destino acreditado compatible, STOP y decisión PO/roll-forward.
### Límite docs-only

La sincronización documental no selecciona rollback.images.yml ni cambia imágenes. Si falla después de publicación, preservar estado real y evidencia, sin reset/force-push/rollback automático. La existencia de un override antiguo no acredita compatibilidad Auth/NAS. Las rutas de release y evidencias actuales constan en RELEASE_MANIFEST.


---

## 2026-11-25 — Ampliación focal DELETE productivo, ingeniería local R1

### Fronteras reales y continuidad

Backup/restore NAS sigue NO_ACREDITADO. No equiparar BTRFS/SHA256/backup RDS con respaldo recuperable. Antes de DELETE productivo se requiere protección acreditada o una aceptación PO explícita, informada y acotada del riesgo de copia única. Ingeniería y prueba DEV no aceptan ese riesgo por el PO.

Publicación/commit SOURCE, promoción/commit/push Enterprise, GHCR integral y deploy EC2 requieren autorización específica ligada al delta revisado; se solicitarán juntas, separando decisiones irreversibles. Despliegue inicial con DELETE productivo false, sin ampliar candidatos B ni modificar cutoff/secretos/flagsNAS existentes. G4 no está cerrado.

Tras autorización:SOURCE→Enterprise preservando historias/adaptaciones→un workflow build-images.yml main/all→cuatro imágenes OCI/runnable linux/amd64→EC2 por digests; luego activación piloto exacta únicamente con protección/decisión y autorización de DELETE. No latest, gh CLI, build EC2, migración automática ni rollback ciego. Recuperación tras borrar debe conservar lectura NAS y estados 0026; no volver a un runtime dependiente del objeto R2 eliminado.

Los procedimientos docs-only anteriores eran válidos para el cierre pendiente previo. No ejecutarlos sobre este incremento funcional ni usar sus inventarios/baselines como autorización actual. No publicar Enterprise antes de acreditar el nuevo SOURCE publicado. No inventar SHA/RunID/digests futuros. Reutilizar manuales R3, preservar 08 y transferir paquete tras validación MSE Actual; no indexación Bibliotecario supuesta.
