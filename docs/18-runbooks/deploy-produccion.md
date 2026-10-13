**Estado:** Procedimiento estándar
**Autoridad:** Operations

# Deploy Producción

## Objetivo

Desplegar en EC2 exclusivamente una release previamente validada y publicada desde Enterprise.

La ruta de autoridad es:

`SOURCE main → Enterprise main → CI/GHCR → EC2`

Este runbook comienza cuando la release Enterprise y sus imágenes ya están autorizadas. El proceso completo está definido en `docs/31-governance/07-release-process.md`.

## Precondiciones

Antes del deploy deben estar identificados:

- `EXPECTED_ENTERPRISE_COMMIT` autorizado;
- CI asociado al commit Enterprise = PASS;
- imágenes GHCR correspondientes;
- tags de release;
- digest esperado por cada servicio publicado;
- `EXPECTED_RUNTIME_TUPLE` aplicable al alcance.

La autorización queda ligada a la identidad acreditada del candidato (`PROMOTION_FREEZE`). Si cambia el commit Enterprise o alguno de los digests esperados, detener y regresar al gate de autorización.

Si no puede demostrarse la relación `Enterprise commit → CI → GHCR`, detener el deploy.

## Actualizar EC2

El checkout productivo proviene exclusivamente de Enterprise main.

Secuencia estándar:

1. registrar `EXPECTED_ENTERPRISE_COMMIT`;
2. `git pull --ff-only origin main`;
3. `git rev-parse HEAD`;
4. verificar que HEAD coincide exactamente con `EXPECTED_ENTERPRISE_COMMIT`;
5. sólo después de esa igualdad ejecutar `docker compose pull`;
6. verificar que las imágenes corresponden a los digests esperados por servicio;
7. `docker compose up -d`.

Si cualquier identidad observada difiere de la esperada: `ABORT_ON_IDENTITY_MISMATCH`. No modificar producción para reconciliar una identidad inesperada dentro de este runbook.

`docker compose down` no forma parte del deploy normal.

Está prohibido desplegar EC2 directamente desde SOURCE, un development branch, un worktree o un index.

## Runtime witness

Después del recreate verificar:

- checkout EC2 = `EXPECTED_ENTERPRISE_COMMIT`;
- imágenes runtime = digests esperados por servicio;
- `RUNTIME_WITNESS = PASS`;
- contenedores requeridos running/healthy;
- API health = PASS;
- Web health = PASS.

El health técnico no sustituye el smoke funcional.

## Smoke

Ejecutar un smoke específico del entregable autorizado por el manifest.

El resultado debe acreditarse como `DELIVERABLE_SMOKE = PASS`.

Sólo después de `RUNTIME_WITNESS = PASS` y `DELIVERABLE_SMOKE = PASS` puede solicitarse el cierre `CLOSED_PASS`.

## Frontera OCR

OCR productivo no forma parte del stack Docker/GHCR de aplicación.

OCR PROD se ejecuta nativamente en Ubuntu mediante systemd. Su operación requiere el control correspondiente.

MinIO pertenece al entorno LAB y no debe introducirse en producción mediante este runbook.

## Prohibiciones

Este runbook no autoriza cambios de aplicación, base de datos, migraciones, GIS, OCR, secretos ni recuperación destructiva del checkout.

Cuando la release incluya un `migration set`, la migración conserva un gate independiente de `DB_WRITE` y debe seguir `docs/06-database/02-migraciones.md`.

La actualización del checkout EC2 desde Enterprise puede ser una precondición para acreditar la identidad productiva de una migración, pero no constituye autorización para ejecutarla.

Ante una divergencia, detener el deploy y regresar al control de release.

### Identidad completa de la imagen y del runtime

Para cada servicio autorizado debe acreditarse:

`ENTERPRISE_COMMIT → IMAGE_NAME → IMAGE_TAG → OCI_DIGEST`

El tag basado en SHA y el digest OCI son evidencias distintas.

`latest` no constituye autoridad de identidad del release.

El witness de EC2 debe acreditar como mínimo:

- checkout objetivo;
- servicio objetivo;
- referencia de imagen en ejecución;
- digest de imagen en ejecución;
- puertos;
- redes;
- dependencias relevantes.

Un checkout Git, commit o tag por sí solo no acredita la identidad
exacta del runtime.

La actualización debe preservar los servicios e infraestructura
fuera del alcance autorizado, incluyendo Traefik, NATS, OCR, DB y GIS
según corresponda al release.

## Composición productiva efectiva y override efímero histórico

La composición productiva permanente de referencia es:

`deployment/docker/docker-compose.production.yml`

Durante R4-P2 existe una referencia histórica a un override
efímero:

`/tmp/r4_p2_ec2_override_execution_r2.yml`

El override histórico no debe convertirse en una configuración
permanente del proyecto.

El contenido efectivo, los parámetros exclusivos, el orden exacto
de los archivos Compose y las opciones históricas de ejecución del
override R2 permanecen `UNKNOWN` cuando no existe evidencia
conservada suficiente.

Por tanto, no deben reconstruirse comandos históricos ni atribuirse
al override puertos, redes, dependencias, montajes u otras opciones
que no estén acreditadas.

Cuando un release utilice una composición distinta del Compose base,
la documentación del release debe identificar explícitamente:

- composición utilizada;
- orden de archivos Compose;
- servicios afectados;
- selección de imágenes versionadas;
- evidencia de configuración efectiva;
- witness final del runtime.

La referencia `docker-compose.ec2.yml` no se considera archivo
canónico de R4-P2 sin evidencia específica que acredite su utilización.

### Selección de imágenes

El Compose base puede contener instrucciones `build`; eso no demuestra
por sí solo que el release productivo deba construir localmente las
imágenes.

La selección de las imágenes autorizadas debe quedar vinculada a:

`Enterprise commit → image name → image tag → OCI digest`

El tag basado en SHA y el digest OCI son evidencias distintas.

`latest` no constituye autoridad de identidad del release.

### Witness

El cierre del deployment debe conservar evidencia suficiente para
relacionar la configuración utilizada con el runtime resultante.

La identidad del runtime debe acreditarse mediante el witness
correspondiente y no únicamente mediante el checkout Git, un commit o
un tag.

Los detalles históricos que no puedan acreditarse permanecen
`UNKNOWN`; la ausencia de evidencia no se convierte en evidencia de
ausencia.
