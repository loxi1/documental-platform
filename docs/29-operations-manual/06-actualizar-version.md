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

## Cierre

Una actualización no queda cerrada únicamente porque los contenedores estén levantados.

Se requiere acreditar:

- commit productivo esperado;
- imágenes/digest esperados;
- runtime saludable;
- smoke del entregable = PASS.

Sólo entonces corresponde `CLOSED_PASS`.

No desplegar desde SOURCE directamente, desde un branch de desarrollo, desde un worktree ni desde el index.
