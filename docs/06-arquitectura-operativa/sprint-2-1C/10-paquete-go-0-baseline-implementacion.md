# Paquete GO-0 — Baseline de Implementación Sprint 2.1C

## 1. Propósito

Este documento consolida la evidencia técnica y Git necesaria para solicitar la autorización **GO-0** del Sprint 2.1C — Carga Documental Segura.

Su alcance es únicamente preparatorio. No autoriza por sí mismo crear la rama funcional, ejecutar merge/rebase/cherry-pick, modificar código, crear migraciones, ejecutar builds o pruebas, realizar push ni abrir Pull Request.

## 2. Estado de la rama documental

- Rama actual: `docs/sprint-2-1C-contrato-carga-documental-segura`
- HEAD local: `17b7913e6f08ff019b8f473c1e38d420567073aa`
- Commit: `docs(documental-v2): refine Sprint 2.1C implementation design`
- Working tree: limpio
- Estado frente al remoto: 9 commits locales por delante
- Push: no ejecutado

Documentos principales ya consolidados:

- `08-diseno-tecnico-implementacion-carga-documental-segura.md`
- `09-diseno-detallado-persistencia-y-plan-implementacion.md`

## 3. Rama funcional propuesta

### Nombre propuesto

```text
feat/documental-v2-carga-segura-2-1C
```

### Commit base exacto propuesto

```text
178cf9db6bb1c337c8cc6551c648b1d5cd107e50
```

Este commit corresponde a `feat/documental-v2-operacion-2-1B`.

La rama funcional futura no debe crearse todavía. Su creación requiere autorización expresa posterior al GO-0.

## 4. Referencias Git verificadas

```text
main:
ffc6ca62b66e391f0e175e0d72a146ff6a30e2f2

feat/documental-v2-operacion-2-1B:
178cf9db6bb1c337c8cc6551c648b1d5cd107e50

merge-base main ↔ 2.1B:
ffc6ca62b66e391f0e175e0d72a146ff6a30e2f2
```

Relación confirmada:

```text
commits_2_1B_sobre_main=9
commits_main_sobre_2_1B=0
```

Por tanto, `main` es ancestro directo de la rama funcional 2.1B.

## 5. Grafo Git relevante

```text
ffc6ca62  main
├── 714c3abc  feat(documental-v2): add idempotent contexto repository insert
├── e301f55d  chore: remove obsolete docs archive
├── 114081d7  feat(documental-v2): implement materializar contexto use case
├── 89fe96a9  feat(documental-v2): expose materializar contexto internal endpoint
├── 3dc8a544  feat(documental-v2): expose materializar contexto gateway endpoint
├── 431d8978  fix(documental-v2): normalize contexto cliente destino comparison
├── 92efe23c  docs(documental-v2): document Sprint 2.1B bloque 1 runtime evidence
├── a8238479  docs(documental-v2): document Sprint 2.1B bloque 2 runtime evidence
└── 178cf9db  docs(documental-v2): add Sprint 2.1B bloque 2 validation notes

ffc6ca62  main
└── rama documental 2.1C
    └── 17b7913e  HEAD documental actual
```

Las ramas `feat/documental-v2-operacion-2-1B` y `docs/sprint-2-1C-contrato-carga-documental-segura` son ramas hermanas con el mismo ancestro común.

## 6. Commits de Sprint 2.1B

| Commit | Clasificación | Descripción |
|---|---|---|
| `714c3abc` | Funcional | Inserción idempotente de contexto en repository |
| `e301f55d` | Limpieza | Eliminación de `docs.zip` obsoleto |
| `114081d7` | Funcional | Caso de uso de materialización de contexto |
| `89fe96a9` | Funcional | Endpoint interno en ms-documentos |
| `3dc8a544` | Funcional | Endpoint en API Gateway |
| `431d8978` | Corrección | Normalización de comparación de cliente destino |
| `92efe23c` | Documental | Evidencia runtime bloque 1 |
| `a8238479` | Documental | Evidencia runtime bloque 2 |
| `178cf9db` | Documental | Notas finales de validación del bloque 2 |

Resumen:

```text
commits funcionales: 5
commit de limpieza: 1
commits documentales: 3
total: 9
```

## 7. Resumen del diff frente a `main`

Delta de `main...feat/documental-v2-operacion-2-1B`:

```text
13 archivos modificados
1500 inserciones
1 eliminación
```

Componentes afectados:

- API Gateway — `documental-v2`
- ms-documentos — `documental-v2`
- pruebas unitarias asociadas
- documentación runtime de Sprint 2.1B
- eliminación de `docs.zip`

No se encontraron cambios exclusivos de 2.1B en:

- `infra/postgres/migrations`
- `infra/postgres/baseline`
- flujo de carga existente en `apps/api-gateway/src/documentos`
- flujo de carga existente en `apps/ms-documentos/src/documentos`
- Web Admin
- `packages/shared`

## 8. Diff por componente

### API Gateway

Archivos afectados:

- `apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.ts`
- `apps/api-gateway/src/documental-v2/documental-v2-gateway.controller.spec.ts`

Responsabilidad incorporada:

- exposición del contrato de materialización de contexto;
- propagación de contexto autenticado;
- validación de cliente destino;
- cobertura unitaria asociada.

### ms-documentos

Archivos afectados:

- `auditoria-operativa-v2.repository.ts`
- `contenedor-operativo.repository.ts`
- `documental-v2.controller.ts`
- `documental-v2.module.ts`
- pruebas asociadas;
- nuevo caso de uso `materializar-contexto-operativo-v2`.

Responsabilidad incorporada:

- persistencia idempotente de contexto;
- materialización de contexto operativo;
- validación y trazabilidad;
- endpoint interno.

### Documentación

Se agregan evidencias runtime de los bloques 1 y 2.

### Limpieza

Se elimina `docs.zip`. Esta eliminación debe conservarse como hallazgo explícito de baseline. No debe reconstruirse ni omitirse sin decisión de integración.

## 9. Solapamiento y conflictos

Resultado verificado:

```text
conflictos_git_reales=0
archivos_coincidentes=0
```

La búsqueda estricta sobre `git merge-tree` no encontró marcadores de conflicto ni estados `changed in both`.

Las coincidencias iniciales con la palabra `CONFLICT` correspondían a SQL `ON CONFLICT` y nombres de error con la palabra `CONFLICTO`; no eran conflictos Git.

Evaluación:

```text
riesgo de conflicto textual: muy bajo
riesgo de integración conceptual: medio
```

El riesgo conceptual existe porque Sprint 2.1C depende del contexto autenticado y materializado consolidado en 2.1B.

## 10. Migraciones existentes

En la baseline funcional se identificaron:

- `0002_schema_migrations.sql`
- `0006_documento_eventos.sql`
- `0007_expedientes_auditoria.sql`
- `0008_documental_v2_modelo_base.sql`

No existe delta de migraciones entre `main` y 2.1B.

Sprint 2.1C requerirá una migración nueva únicamente después de autorización de implementación.

## 11. Contratos existentes relevantes

El Gateway dispone y propaga:

- `workspaceId`
- `clienteDestinoId`
- empresa/código de contexto
- `x-request-id`
- `x-correlation-id`

Tipos confirmados:

```text
workspace_id=integer
cliente_destino_id=integer
request_id=textual_no_uuid_garantizado
correlation_id=textual
idempotency_key=independiente_de_request_id
```

Decisiones de diseño derivadas:

- `workspace_id`: `integer NOT NULL`
- `cliente_destino_id`: `integer`, nullable según alcance operativo
- `request_id`: tipo textual
- `correlation_id`: tipo textual
- `idempotency_key`: contrato independiente de `request_id`

No debe asumirse que todo `request_id` es UUID: el middleware genera UUID cuando el header no existe, pero el sistema acepta y propaga strings existentes, y las pruebas usan valores como `req-1`, `req-2` y `req-6`.

## 12. Builds aplicables

No ejecutados durante GO-0.

```bash
pnpm --filter @documental/api-gateway build
pnpm --filter @documental/ms-documentos build
pnpm --filter web-admin build
```

API Gateway y ms-documentos tienen scripts de build y test. Web Admin tiene build y lint, pero no se confirmó un script unitario equivalente.

El `package.json` raíz no debe usarse como autoridad para builds globales sin inspección adicional; los comandos deben ejecutarse por filtro de paquete.

## 13. Pruebas existentes

La baseline 2.1B contiene cobertura en:

- controller `documental-v2` del API Gateway;
- repository de contenedor operativo;
- controller de ms-documentos;
- caso de uso de materialización de contexto.

No se identificaron pruebas unitarias nuevas de Web Admin asociadas a 2.1B.

No se ejecutó ninguna prueba durante la preparación de GO-0.

## 14. Riesgos previsibles

### Baseline incorrecta

Crear 2.1C desde `main` omitiría nueve commits de 2.1B.

Mitigación: crear la futura rama desde `178cf9db`.

### Pérdida de documentación contractual

Crear la futura rama desde 2.1B no incorpora automáticamente los diez commits documentales de 2.1C.

Mitigación:

- integrar documentación mediante operación Git autorizada;
- no copiar manualmente sin trazabilidad;
- no decidir todavía entre merge o cherry-pick.

### Eliminación de `docs.zip`

Debe registrarse y no reconstruirse ni revertirse sin dictamen.

### Tipos incompatibles

No debe usarse `uuid` para `request_id` sin modificar antes el contrato HTTP.

Mitigación: usar tipo textual en el diseño inicial.

### Casts inconsistentes

Se encontraron usos de `::bigint` y `::int` para `clienteDestinoId`, mientras el baseline declara `integer`.

Mitigación:

- respetar `integer` como tipo canónico;
- registrar los casts existentes como deuda técnica;
- no corregirlos dentro del GO-0.

### Concurrencia e idempotencia

La carga segura requiere autoridad única de deduplicación, reserva activa de hash, idempotency key histórica, finalización transaccional, outbox consistente y compensación de almacenamiento.

Estos puntos deben implementarse en bloques controlados y con pruebas de concurrencia posteriores.

## 15. Estrategia propuesta de creación de rama

```bash
git switch feat/documental-v2-operacion-2-1B
git switch -c feat/documental-v2-carga-segura-2-1C
```

Condiciones previas:

- GO-0 aprobado;
- autorización expresa para crear rama;
- confirmación de HEAD exacto `178cf9db`;
- working tree limpio;
- respaldo creado;
- decisión sobre integración documental.

La documentación de 2.1C debe incorporarse mediante una operación separada y autorizada.

Alternativas pendientes de dictamen:

- merge de rama documental;
- cherry-pick de commits documentales;
- integración previa en una rama común;
- baseline consolidada creada por el Maestro responsable de integración.

## 16. Comandos propuestos, no ejecutados

### Respaldo de baseline funcional

```bash
git branch backup/pre-2-1C-178cf9db 178cf9db
```

### Creación de rama funcional

```bash
git switch feat/documental-v2-operacion-2-1B
git switch -c feat/documental-v2-carga-segura-2-1C
```

### Verificación

```bash
git branch --show-current
git rev-parse HEAD
git status --short
```

Resultado esperado:

```text
rama=feat/documental-v2-carga-segura-2-1C
HEAD=178cf9db6bb1c337c8cc6551c648b1d5cd107e50
working tree=limpio
```

No se propone todavía ejecutar merge, rebase, cherry-pick, push, Pull Request, build, test ni migración.

## 17. Rollback de la operación Git propuesta

Si la rama futura se crea pero no contiene cambios ni commits:

```bash
git switch docs/sprint-2-1C-contrato-carga-documental-segura
git branch -D feat/documental-v2-carga-segura-2-1C
```

Si ya existen commits funcionales:

1. conservar la rama;
2. crear respaldo exacto;
3. no usar `reset --hard` sin autorización;
4. solicitar dictamen de recuperación;
5. usar reflog únicamente como evidencia y mecanismo controlado.

Comandos de inspección:

```bash
git reflog --date=iso
git log --graph --decorate --oneline --all
git status --short
```

## 18. Estado de respaldos

Respaldo local identificado:

```text
backup/regularizacion-2-1C-0f5117fc
```

Commit:

```text
0f5117fc
```

Este respaldo no corresponde exactamente al HEAD documental actual ni a la futura baseline funcional. Antes de crear la rama 2.1C debe generarse un respaldo específico de `178cf9db`.

También existe un worktree paralelo:

```text
/home/loxi1/projects/apps/documental-platform-conf-ocr-aud-01
```

Rama:

```text
feat/conf-ocr-aud-01
```

Ese worktree no debe modificarse ni eliminarse como parte del Sprint 2.1C.

## 19. Estado actual de remotos

```text
origin:
git@github.com:loxi1/documental-platform.git
```

Estado observado:

- `main`: sincronizado con `origin/main`;
- `feat/documental-v2-operacion-2-1B`: sincronizado con remoto;
- rama documental 2.1C: nueve commits locales por delante;
- no se ejecutó push.

## 20. Solicitud expresa GO-0

Se solicita al Maestro Intermedio autorización para:

1. aceptar `178cf9db6bb1c337c8cc6551c648b1d5cd107e50` como baseline funcional de Sprint 2.1C;
2. crear, en una fase posterior y mediante orden expresa, la rama `feat/documental-v2-carga-segura-2-1C`;
3. crear previamente un respaldo local de la baseline;
4. definir la estrategia autorizada para incorporar la documentación 2.1C;
5. habilitar posteriormente el Bloque 1 de implementación;
6. mantener bloqueados hasta nueva orden migraciones, código funcional, builds, pruebas, merge, rebase, cherry-pick, push y Pull Request.

## 21. Dictamen técnico del paquete

```text
baseline candidata:
APTA

relación main → 2.1B:
LINEAL

conflictos Git reales:
0

archivos coincidentes 2.1B ↔ 2.1C:
0

working tree:
LIMPIO

migraciones exclusivas en 2.1B:
0

riesgo textual:
MUY BAJO

riesgo conceptual:
MEDIO

operaciones Git ejecutadas:
NINGUNA

estado:
PAQUETE GO-0 LISTO PARA REVISIÓN
```
