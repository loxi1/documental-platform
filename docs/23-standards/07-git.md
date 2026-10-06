# Git Standard

## Autoridades

Documental Platform separa desarrollo y release:

- **Development branch:** workspace aislado del entregable.
- **SOURCE main:** autoridad de integración.
- **Enterprise main:** frontera de publicación autorizada.
- **GHCR:** frontera de artefactos construidos desde Enterprise.
- **EC2:** materialización del runtime productivo de la release Enterprise.

El manifest define el contenido autorizado; los commits y digests acreditan la identidad material. Un PASS no constituye autorización implícita para cruzar la siguiente frontera.

## Inicio de un entregable

Todo requerimiento nuevo comienza desde un `SOURCE main` limpio y actualizado.

Ruta:

`REQUERIMIENTO → branch desde SOURCE main limpio → desarrollo`

El branch debe contener únicamente el trabajo correspondiente al entregable.

## Cierre del branch

Antes de integrar el branch son obligatorios:

1. inventario del entregable;
2. separación de otros trabajos;
3. manifest exacto;
4. tests focales PASS;
5. regresión/cross-flow PASS o N/A justificado;
6. build PASS;
7. staged = manifest;
8. commit = manifest;
9. push del branch.

Los archivos se agregan explícitamente según el manifest autorizado.

Antes del commit deben poder acreditarse:

- `STAGED_CONTENT = MANIFEST`;
- `COMMIT_CONTENT = MANIFEST`;
- `UNEXPECTED_PATHS = 0`;
- `UNEXPECTED_HUNKS = 0` cuando el control sea por hunks.

Contenido descubierto durante el cierre debe clasificarse como `RELEASE_CONTENT`, `VALIDATION_ONLY`, `PREEXISTING_BASELINE` o `SEPARATE_GAP`. El descubrimiento de una dependencia no amplía silenciosamente el manifest.

`CANDIDATE_DISCOVERED != RELEASE_AUTHORIZED`.

Un candidato descubierto, recuperado o reconstruido no adquiere autoridad de release por existir. Antes de su promoción debe completar los gates que correspondan al alcance: materialización controlada cuando aplique, manifest exacto, tests focales, regresión/cross-flow, build y validación de composición/runtime LAB cuando corresponda.

Un cambio de `TEST/HARNESS` puede formar parte legítima del entregable cuando existe una dependencia funcional acreditada, pero no debe clasificarse por sí mismo como corrección productiva.

No utilizar como mecanismo de composición de release:

- `git add -A`
- `git add .`

## Integración a SOURCE main

El branch se integra de forma trazable en SOURCE main.

La estrategia puede ser:

- merge;
- squash merge;
- rebase;
- otra estrategia controlada.

Este estándar no fija una estrategia única.

Después de integrar:

- tests requeridos PASS;
- build PASS;
- commit SOURCE main identificado;
- push SOURCE main realizado;
- remoto SOURCE verificado.

## Promoción a Enterprise

Enterprise recibe únicamente una composición ya integrada y validada en SOURCE main.

No está permitido:

- development branch → Enterprise;
- copiar el worktree completo → Enterprise.

La materialización debe limitarse al manifest autorizado.

Enterprise realiza su propia validación, commit y push.

## Producción

La ruta estándar es:

`SOURCE main → Enterprise main → CI/GHCR → EC2`

No está permitido desplegar a producción desde:

- worktree;
- index;
- branch dirty;
- development branch;
- SOURCE directamente.

## Commits

Usar Conventional Commits cuando sea posible.

El commit de cada gate debe poder relacionarse con el manifest autorizado.

## Excepción histórica

`HISTORICAL_RESCUE = EXCEPTION_ONLY`.

La arqueología HEAD / INDEX / WORKTREE utilizada para recuperar composiciones históricas no forma parte del flujo Git normal.

Sólo corresponde cuando existe evidencia de una brecha histórica de composición. No debe convertirse en procedimiento ordinario ni utilizarse para ampliar el manifest sin autorización.
