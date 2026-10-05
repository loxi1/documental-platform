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
