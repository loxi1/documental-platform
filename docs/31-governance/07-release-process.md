# Release Process

## Propósito

Este documento define el procedimiento estándar permanente de release de Documental Platform, desde un requerimiento hasta producción.

## Ruta obligatoria

REQUERIMIENTO
→ BRANCH DESDE SOURCE MAIN LIMPIO
→ DESARROLLO
→ INVENTARIO DEL ENTREGABLE
→ SEPARACIÓN DE OTROS TRABAJOS
→ MANIFEST
→ TESTS
→ REGRESIÓN
→ BUILD
→ COMMIT BRANCH
→ PUSH BRANCH
→ INTEGRACIÓN SOURCE MAIN
→ VALIDACIÓN SOURCE MAIN
→ PUSH SOURCE MAIN
→ ENTERPRISE MATERIALIZATION
→ ENTERPRISE VALIDATION
→ ENTERPRISE COMMIT
→ ENTERPRISE PUSH
→ CI / GHCR
→ EC2 UPDATE
→ RUNTIME WITNESS
→ SMOKE
→ CLOSED_PASS

## Autoridades

- Development branch: workspace aislado del entregable.
- SOURCE main: autoridad de integración.
- Enterprise main: frontera de publicación autorizada.
- GHCR: frontera de artefactos ejecutables construidos desde Enterprise.
- EC2: materialización del runtime productivo de la release Enterprise.

El `MANIFEST` define el contenido autorizado de la release. No sustituye la identidad material acreditada mediante commits, CI y digests.

`PROVENANCE`, `CLOSURE`, `AUTHORIZATION` y `AUTHORITY` son dimensiones distintas. El PASS de un gate no autoriza por sí mismo el siguiente.

## Composición y frontera de release

Todo contenido descubierto durante el cierre debe clasificarse antes de ampliar el manifest:

- `RELEASE_CONTENT`: contenido autorizado para la release;
- `VALIDATION_ONLY`: artefacto necesario para validar, pero no para publicar;
- `PREEXISTING_BASELINE`: contenido legítimo ya existente del que depende el entregable y que no fue producido por la release;
- `SEPARATE_GAP`: brecha adyacente fuera del alcance que requiere control independiente.

Una dependencia necesaria no se convierte automáticamente en `RELEASE_CONTENT`.

La frontera autorizada debe permitir acreditar:

- `UNEXPECTED_PATHS = 0`;
- `UNEXPECTED_HUNKS = 0` cuando el control sea por hunks;
- `STAGED_CONTENT = MANIFEST`;
- `COMMIT_CONTENT = MANIFEST`.

Si aparece contenido necesario fuera de la frontera autorizada, se detiene la composición y se solicita nueva autorización.

## Gate del branch

Antes del commit del branch son obligatorios:

1. inventario del entregable;
2. separación de otros trabajos;
3. manifest exacto;
4. tests focales PASS;
5. regresión/cross-flow PASS o N/A justificado;
6. build PASS;
7. staged = manifest;
8. commit = manifest;
9. push del branch.

Está prohibido utilizar `git add -A` o `git add .` como mecanismo de composición del release.

## Integración a SOURCE main

El branch del entregable debe integrarse de forma trazable en SOURCE main.

La estrategia no queda fijada universalmente. Puede utilizarse merge, squash merge, rebase u otra estrategia controlada.

Después de la integración:

- tests requeridos PASS;
- build PASS;
- commit SOURCE main identificado;
- push SOURCE main realizado;
- remoto SOURCE verificado.

No existe promoción directa development branch → Enterprise.

## Enterprise

Enterprise recibe exclusivamente la composición autorizada desde SOURCE main.

Requisitos:

- materialización controlada;
- manifest Enterprise = manifest autorizado de SOURCE;
- preservación de trabajos ajenos;
- validación requerida PASS;
- commit Enterprise propio;
- push Enterprise main.

Está prohibido copiar el worktree completo de SOURCE a Enterprise.

## CI / GHCR

El workflow CI debe ser trazable al commit Enterprise autorizado.

Requisitos:

- CI PASS;
- publicación GHCR PASS;
- tags registrados;
- provenance respecto del commit Enterprise;
- digest acreditado por cada servicio publicado.

`latest` por sí solo no constituye provenance suficiente.

Una vez autorizada la promoción, el candidato queda congelado por su identidad acreditada (`PROMOTION_FREEZE`). Si cambia el commit Enterprise o cambia un digest esperado, existe un candidato distinto y debe volver al gate de autorización correspondiente.

## EC2

EC2 consume exclusivamente Enterprise main y las imágenes de release correspondientes.

Secuencia normal:

1. identificar y registrar `EXPECTED_ENTERPRISE_COMMIT`;
2. `git pull --ff-only origin main`;
3. verificar que HEAD coincide exactamente con `EXPECTED_ENTERPRISE_COMMIT`;
4. sólo entonces ejecutar `docker compose pull`;
5. verificar los digests esperados por servicio;
6. `docker compose up -d`.

Antes de mutar el runtime debe existir un `EXPECTED_RUNTIME_TUPLE` suficiente para el alcance:

- Enterprise commit;
- image digests por servicio;
- migration set cuando aplique;
- config/deploy identity cuando aplique;
- identidad OCR cuando el entregable afecte OCR.

Si la identidad observada no coincide con la esperada: `ABORT_ON_IDENTITY_MISMATCH`. No se corrige producción sobre la marcha para hacerla coincidir con una expectativa distinta.

`docker compose down` no forma parte del deploy normal.

## Post-deploy

Antes de `CLOSED_PASS` deben acreditarse:

- checkout EC2 = commit Enterprise esperado;
- imágenes runtime = digests esperados por servicio;
- `RUNTIME_WITNESS = PASS`;
- contenedores requeridos running/healthy;
- API health PASS;
- Web health PASS;
- `DELIVERABLE_SMOKE = PASS`.

`/health = 200` no constituye por sí solo `RELEASE_PASS`.

`CLOSED_PASS` significa que el alcance autorizado llegó al runtime esperado con identidad, autorización y validaciones acreditadas. No significa deuda técnica cero ni ausencia de gaps adyacentes correctamente clasificados.

## Prohibiciones

- worktree → producción;
- index → producción;
- branch dirty → producción;
- development branch → Enterprise;
- SOURCE → EC2;
- copia completa del worktree → Enterprise;
- `git add -A` para composición del release;
- `git add .` para composición del release.

## Fronteras especializadas

`APPLICATION_RELEASE != DB_MIGRATION_AUTHORIZATION`.

Las migraciones, escrituras o restauraciones de base de datos requieren su propia autorización y validación de compatibilidad cuando correspondan.

OCR abre una frontera especializada cuando el entregable lo afecta. La implementación productiva vigente se gobierna por su documentación arquitectónica/runbook especializado y no debe inferirse como regla eterna de este estándar.

GIS permanece fuera del alcance de un release de aplicación salvo autorización explícita.

## Rescate histórico

`HISTORICAL_RESCUE = EXCEPTION_ONLY`.

La arqueología HEAD / INDEX / WORKTREE utilizada para recuperar composiciones históricas se clasifica como excepción.

No forma parte del procedimiento normal de release.

Sólo corresponde utilizar análisis Git forense extendido cuando existe evidencia real de una brecha histórica de composición.

## Regla operativa

READ → VALIDATE → AUTHORIZE → MUTATE → WITNESS → CLOSE → STOP → NEXT AUTHORIZATION
