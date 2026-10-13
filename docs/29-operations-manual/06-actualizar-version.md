# Actualizar versión en producción

La actualización productiva sólo comienza después de que el entregable haya completado el flujo de release definido en:

`docs/31-governance/07-release-process.md`

## Autoridad de la release

La cadena estándar es:

`development branch → SOURCE main → Enterprise main → CI/GHCR → EC2`

SOURCE main es la primera autoridad de release.

Enterprise main es la autoridad de composición del producto liberable y la única fuente Git del checkout productivo.

## Antes de actualizar

Confirmar:

- manifest autorizado;
- SOURCE main validado y publicado;
- commit Enterprise main identificado;
- Enterprise validation = PASS;
- Enterprise push = PASS;
- CI/GHCR asociado al commit Enterprise = PASS;
- imágenes y tags esperados identificados;
- digest registrado cuando esté disponible.

## Actualización en EC2

Seguir:

`docs/18-runbooks/deploy-produccion.md`

La secuencia normal es:

1. actualizar el checkout desde Enterprise main;
2. verificar el commit esperado;
3. descargar las imágenes autorizadas;
4. recrear únicamente los servicios correspondientes;
5. obtener runtime witness;
6. verificar API y Web;
7. ejecutar el smoke específico del entregable.

## Migraciones asociadas

Si la release contiene un `migration set`, seguir además:

`docs/06-database/02-migraciones.md`

La migración requiere autorización independiente de `DB_WRITE`.

El orden `migración → aplicación` o `aplicación → migración` debe estar definido por compatibilidad para la release concreta; no se infiere automáticamente.

La actualización del checkout EC2 desde Enterprise permite acreditar la identidad publicada, pero no ejecuta ni autoriza por sí misma la migración.

## Cierre

Una actualización no queda cerrada únicamente porque los contenedores estén levantados.

Se requiere acreditar:

- commit productivo esperado;
- imágenes/digest esperados;
- runtime saludable;
- smoke del entregable = PASS.

Sólo entonces corresponde `CLOSED_PASS`.

No desplegar desde SOURCE directamente, desde un branch de desarrollo, desde un worktree ni desde el index.

### Regla de identidad del runtime

La actualización de EC2 no se considera cerrada únicamente por
actualizar el checkout Enterprise.

Debe acreditarse la relación:

`EC2_CHECKOUT_TARGET → TARGET_SERVICE → RUNNING_IMAGE_REFERENCE → RUNTIME_IMAGE_DIGEST`

y conservarse la configuración operativa necesaria:

- PORTS
- NETWORKS
- DEPENDENCIES

Si el release no contiene migración:

`DB_MIGRATION=NOT_APPLICABLE`

No se ejecutan migraciones pendientes como efecto automático de la
actualización de versión.

## Regla de composición e identidad del runtime

La actualización de producción debe distinguir entre:

- Compose productivo permanente;
- override efímero específico de un release;
- selección de imágenes versionadas;
- runtime efectivamente ejecutado.

La referencia permanente de composición es:

`deployment/docker/docker-compose.production.yml`

El override histórico R4-P2:

`/tmp/r4_p2_ec2_override_execution_r2.yml`

es una referencia efímera y no debe convertirse en dependencia
permanente del procedimiento.

Cuando no se conserve el contenido histórico del override, debe
declararse `UNKNOWN`. No se deben reconstruir comandos, parámetros,
puertos, redes, dependencias ni otras opciones a partir de inferencias.

La identidad de una release debe poder relacionar:

`Enterprise commit → image name → image tag → OCI digest`

`latest` no es autoridad de release.

El witness final debe conservar, sin secretos:

- checkout objetivo;
- servicio afectado;
- referencia de imagen;
- digest de runtime;
- puertos;
- redes;
- dependencias relevantes;
- configuración efectiva utilizada para la composición.

Un checkout, commit o tag aislado no acredita por sí mismo la identidad
del runtime.

La referencia `docker-compose.ec2.yml` queda como
`NO_ACREDITADO_COMO_CANÓNICO` para R4-P2 mientras no exista evidencia
específica de su utilización.

Los valores históricos no acreditados deben permanecer `UNKNOWN`.
