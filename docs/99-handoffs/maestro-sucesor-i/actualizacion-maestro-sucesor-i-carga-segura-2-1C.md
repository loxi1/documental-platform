# Actualización de legado — Maestro Sucesor I

## Sprint 2.1C — Carga Documental Segura MVP

**Proyecto:** Documental Platform ERP
**Rol:** Maestro Sucesor I
**Rama actual:** `test/integracion-exposicion-carga-segura-2-1C`
**HEAD técnico cerrado:** `25e24463`
**Fecha de actualización:** 2026-07-24

---

## 1. Rol y alcance vigente

El Maestro Sucesor I custodia:

- backend documental;
- Modelo Documental V2;
- carga documental segura;
- integración API Gateway ↔ ms-documentos;
- consistencia R2/PostgreSQL;
- idempotencia, deduplicación y compensación;
- auditoría y outbox;
- OCR cuando esté autorizado;
- contratos técnicos, pruebas y evidencia runtime.

No invade UX/UI ni componentes React, salvo coordinación de contratos con Maestro Sucesor II.

---

## 2. Decisión vigente sobre OCR

Para el MVP inmediato, OCR avanzado permanece fuera del alcance y no debe bloquear:

```text
Carga segura
→ validaciones
→ hash
→ idempotencia / duplicados
→ R2
→ persistencia documental
→ auditoría / outbox
→ validación manual
```

Durante el desarrollo del motor OCR puede ejecutarse manualmente:

```bash
cd workers/ocr-worker
python3 main.py
```

La decisión de despliegue estable se tomará en un sprint específico de OCR.

Preferencia inicial:

```text
dp_ocr_worker
→ worker Docker independiente
→ sin puerto público
→ separado de ms-documentos
```

`systemd` queda como alternativa válida solo cuando exista una necesidad técnica demostrada: GPU, drivers, watcher de carpetas locales, dependencias legacy o herramientas no contenerizables.

No existe una regla aprobada que obligue OCR a ejecutarse mediante `systemd`.

---

## 3. Estado técnico confirmado de Carga Segura

Las imágenes activas contienen el código compilado de Carga Segura 2.1C.

### ms-documentos

```text
/app/apps/ms-documentos/dist/documentos/carga-segura/
```

Incluye:

- `carga-segura.service.js`
- `carga-segura.persistence.js`
- `carga-segura.repository.js`
- `carga-segura.storage.js`
- `carga-segura.compensation.js`

### API Gateway

```text
/app/apps/api-gateway/dist/documentos/
```

Incluye:

- `carga-segura.contract.js`
- `carga-segura.validation.js`
- `carga-segura.mapper.js`
- controlador público en `documentos.controller.js`

La ruta pública es:

```http
POST /api/v1/documentos/carga-segura
```

---

## 4. Feature flag

Variable:

```text
DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED
```

Autoridad única:

```text
ms-documentos
```

Evaluación exacta:

```ts
if (value !== 'true') {
  throw new CargaSeguraError(
    'CARGA_SEGURA_DESHABILITADA',
    'La carga documental segura está deshabilitada',
  );
}
```

Consecuencias:

```text
true        → habilitado
false       → deshabilitado
undefined   → deshabilitado
TRUE        → deshabilitado
1           → deshabilitado
```

Con el flag apagado:

```http
HTTP 503
```

Código público:

```text
CARGA_SEGURA_DESHABILITADA
```

No debe reservar operación, persistir en PostgreSQL ni subir a R2.

El feature flag permanece **OFF** hasta autorización posterior.

---

## 5. Contrato multipart canónico

Contrato aprobado:

```text
archivo
```

Es el único nombre permitido para el archivo multipart de Carga Segura.

No forman parte del contrato:

```text
file
archivo + file
```

El Gateway público ya rechaza `file` y reenvía internamente siempre como `archivo`.

La brecha del endpoint interno de `ms-documentos` fue corregida.

Estado final:

```text
archivo → aceptado
file    → rechazado
```

La corrección quedó incorporada en:

```text
1f63e41e fix(documental-v2): align secure upload contract
```

No se debe tocar la Carga Guiada legacy, cuyos endpoints y uso histórico de `file` quedan fuera de este bloque.

---

## 6. Metadata canónica y claves reservadas

Regla aprobada:

```text
metadata no puede duplicar, sustituir ni sombrear
atributos canónicos de la operación de Carga Segura.
```

Claves reservadas aprobadas:

```text
__proto__
prototype
constructor

workspaceId
empresaCodigo
clienteDestinoId
expedienteId
actorId
usuarioId

idempotencyKey
requestId
correlationId
cargaOperacionId

canalIngreso
tipoDocumental
tipoRelacion
esPrincipal

nombreArchivo
contentType
tamanoBytes
hashSha256

storageProvider
storageBucket
storageKey

origen
```

La lista debe documentarse explícitamente en el contrato técnico y en la documentación del endpoint.

No deben reservarse claves especulativas que todavía no formen parte del contrato canónico.

La validación existente es recursiva, por lo que estas claves deben rechazarse también en objetos anidados.

---

## 7. Mensaje fallback aprobado

Texto anterior:

```text
No se pudo confirmar el resultado de la carga documental segura
```

Texto aprobado:

```text
No se pudo completar la carga del documento.
```

Esta corrección corresponde a C-03 y debe aplicarse en el mapper del API Gateway y sus pruebas.

---

## 8. Bloque de corrección autorizado

El Maestro Intermedio aprobó incorporar en un único bloque controlado:

```text
C-01
Eliminar el alias interno file.

C-02
Ampliar y documentar las claves reservadas de metadata.

C-03
Corregir el mensaje fallback.
```

No deben dividirse en commits independientes.

Commit aplicado:

```text
1f63e41e fix(documental-v2): align secure upload contract
```

---

## 9. Archivos técnicos afectados

### ms-documentos

```text
apps/ms-documentos/src/documentos/carga-segura/http/
  carga-segura-http.constants.ts
  carga-segura-multer.ts
  carga-segura.controller.ts
  carga-segura.controller.spec.ts
  carga-segura-http.validation.spec.ts
```

### API Gateway

```text
apps/api-gateway/src/documentos/
  carga-segura.mapper.ts
  carga-segura.mapper.spec.ts
  documentos.carga-segura.controller.spec.ts
```

### Documentación

Contrato principal existente:

```text
docs/06-arquitectura-operativa/sprint-2-1C/
  07-propuesta-contractual-carga-documental-segura.md
```

Debe añadirse una adenda contractual final, sin reescribir como vigente el estado histórico de la propuesta inicial.

Documento de endpoint a crear en la rama actual:

```text
docs/16-api/carga-documental-segura.md
```

En la rama actual, `docs/16-api/` contiene documentación de:

- autenticación;
- carga guiada;
- confirmación con expediente;
- documentos;
- edición manual;
- expediente-documentos;
- gateway;
- OCR;
- preview;
- procesar OCR;
- revisión contable;
- versionado.

No se observó todavía un documento específico de Carga Segura.

Puede existir información adicional en otra rama, pero no debe copiarse o asumirse sin inspección explícita.

---

## 10. Validaciones obligatorias del bloque

Antes de cerrar el ajuste:

```text
tests específicos de ms-documentos;
tests específicos del API Gateway;
regresión completa de Carga Segura;
build de ms-documentos;
build del API Gateway;
git diff --check;
documentación actualizada;
un único commit.
```

El test positivo actual que acepta:

```json
{"origen":"laboratorio"}
```

debe cambiar porque `origen` pasa a ser clave reservada.

Puede utilizarse una clave complementaria no canónica, por ejemplo:

```json
{"comentarioUsuario":"laboratorio"}
```

---

## 11. Restricciones vigentes

Todavía no está autorizado:

```text
activar el feature flag;
aplicar migraciones;
modificar RDS;
ejecutar despliegue;
hacer push, merge o rebase;
dockerizar OCR;
cambiar reglas de negocio adicionales;
tocar Carga Guiada legacy.
```

Las migraciones `0011–0013` y las tablas asociadas deben tratarse en un paso separado y con autorización expresa.

---

## 12. Siguiente paso exacto

Implementar C-01, C-02 y C-03 como una sola unidad controlada.

Después:

```text
1. ejecutar tests específicos;
2. ejecutar regresión;
3. ejecutar builds;
4. validar git diff --check;
5. revisar diff completo;
6. crear un único commit;
7. presentar evidencia;
8. solicitar autorización separada para migraciones y feature flag.
```

El OCR no forma parte del bloqueo de este bloque contractual.

---

## 10. Cierre de integración OCR → expediente → Workspace V2

Durante la validación de la demo local se detectó un error en:

```http
POST /api/v1/documentos/ocr-resultados/:id/vincular-expediente
```

Error PostgreSQL:

```text
could not determine data type of parameter $1
```

Causa:

```text
parámetros sin cast explícito dentro de jsonb_build_object
```

Corrección aplicada:

- casts explícitos para `bigint`, `text`, `boolean` e `integer`;
- persistencia de `ocr_resultados.expediente_id`;
- persistencia de `ocr_resultados.vinculado_en`;
- mantenimiento de `metadata.vinculoExpediente`.

Commit técnico:

```text
7eed83a6 fix(ms-documentos): persist OCR expediente link metadata
```

Validaciones:

```text
32 suites PASS
182 tests PASS
build ms-documentos PASS
health HTTP 200
ready HTTP 200
PostgreSQL up
NATS up
```

Flujo funcional validado:

```text
Carga Guiada legacy
→ archivo en R2
→ procesamiento OCR
→ vinculación al expediente 17
→ confirmación con expediente
→ documento confirmado
→ Workspace Documental V2
```

Caso demostrado:

```text
OCR resultado: 3
Documento: 3
Expediente: 17
Código de expediente: 050201
Tipo documental: OC
Número: 007950
Proveedor: CORPORACION ACEROS AREQUIPA S.A.
RUC: 20370146994
Fecha: 2026-04-23
Moneda: DOLARES AMERICANOS
Monto: 4181.92
Clave documental: BBTI|OC|007950
Estado final: confirmado
Relación: principal_oc
Principal activo: true
```

Evidencias versionadas en:

```text
docs/99-handoffs/evidencias-integracion-ocr-workspace-2026-07-24/
```

Commit de evidencias:

```text
25e24463 docs(documental): add OCR workspace integration evidence
```

## 11. Restricciones que permanecen vigentes

No se realizó:

```text
push
merge
rebase
activación de DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED
aplicación de migraciones 0011–0013
modificación de RDS
activación en producción
```

El feature flag de Carga Segura 2.1C permanece apagado.

La demostración se ejecutó mediante el flujo legacy de Carga Guiada.
