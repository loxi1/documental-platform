# Git Standard

## Aplicación proporcional — R1

El [estándar canónico de desarrollo y release](11-source-development-and-release.md), aprobado por PO, ratificado por MI e integrado en SOURCE, define NORMAL, RELEASE y RECOVERY. En NORMAL basta evidencia focal; las exigencias de manifest exacto de este documento corresponden a composición RELEASE o recuperación que lo requiera, no a reconstrucción histórica rutinaria. Typecheck/build y regresión se ejecutan según impacto, con N/A motivado cuando corresponda. G3 debe registrar autorización de integración y push SOURCE; producción exige autorización expresa PO en G4.

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

## Cierre del branch para composición RELEASE

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
- build aplicable PASS o N/A motivado;
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

## Antecedente archivado SOURCE/Enterprise — 23/10/2026

La observación siguiente describe exclusivamente el 23/10. La reconciliación está cerrada según el antecedente PO del [estándar R1](11-source-development-and-release.md); no es un bloqueo actual ni una instrucción para reconstruir contratos.

Ver [inventario completo](../31-governance/BRANCH_INVENTORY.md). SOURCE main presenta cambios pendientes y divergencia 1/1 frente a origin/main local. No integrar ni promover automáticamente. Las refs remotas son las almacenadas localmente, sin fetch.

Un contrato funcional coherente corresponde a un commit focal verificable, con sus pruebas y evidencia. No imponer un commit por archivo ni agrupar las 45 rutas por conveniencia. La clasificación por hunks y matriz CONTRACT/PATHS/TESTS/DEPENDENCIES/BASE/RISK/PO_AUTHORIZATION es un siguiente expediente de diseño; esta orden no autoriza staging, commits ni reconciliación de historia.
