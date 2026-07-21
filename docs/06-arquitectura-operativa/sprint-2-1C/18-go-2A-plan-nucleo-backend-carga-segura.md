# GO-2A — Plan del núcleo backend de carga documental segura

## Identificación

```text
Control: GO-2A
Subcontrol: GO-2A-1
Sprint: 2.1C
Responsable: Maestro Sucesor I
Baseline: feat/documental-v2-operacion-2-1B
Baseline SHA: 143eab88be79a7275c7102c5fb5b7ceda2e720d4
Rama: feat/documental-v2-carga-segura-backend-2-1C
```

## Objetivo

Implementar dentro de `ms-documentos` un núcleo interno de carga documental segura con idempotencia por ámbito, deduplicación física, almacenamiento mediante abstracción interna, persistencia transaccional, outbox, compensación segura, reconciliación explícita y resultados tipados.

GO-2A no incluye Gateway, Web Admin, publicación del outbox, RDS, producción ni nuevas migraciones.

## Alcance técnico

Directorio principal:

```text
apps/ms-documentos/src/documentos/carga-segura/
```

Integración mínima:

```text
apps/ms-documentos/src/documentos/documentos.module.ts
```

Componentes previstos:

```text
carga-segura.types.ts
carga-segura.constants.ts
carga-segura.errors.ts
carga-segura.fingerprint.ts
carga-segura.storage.ts
carga-segura.repository.ts
carga-segura.compensation.ts
carga-segura.service.ts
```

## Contrato de entrada

```ts
type CargaSeguraCommand = {
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  expedienteId: number | null;
  actorId: number;
  idempotencyKey: string;
  requestId: string | null;
  correlationId: string | null;
  canalIngreso: string;
  tipoDocumental: string;
  tipoRelacion: string | null;
  esPrincipal: boolean;
  nombreArchivo: string;
  contentType: string;
  tamanoBytes: number;
  archivo: Buffer;
  metadata?: Record<string, unknown>;
};
```

`workspaceId`, `empresaCodigo`, `clienteDestinoId` y `actorId` deben provenir del contexto autenticado o de un adaptador interno confiable.

## Contrato de resultado

```ts
type CargaSeguraResult =
  | {
      kind: "CREATED";
      operacionId: number;
      documentoId: number;
      archivoId: number;
      hashSha256: string;
    }
  | {
      kind: "REPLAYED";
      operacionId: number;
      documentoId: number;
      archivoId: number;
      hashSha256: string;
    }
  | {
      kind: "DUPLICATE";
      operacionId: number;
      documentoId: number;
      archivoId: number;
      hashSha256: string;
    }
  | { kind: "IDEMPOTENCY_CONFLICT"; operacionId: number }
  | { kind: "RECONCILIATION_REQUIRED"; operacionId: number; errorCode: string };
```

## Hash físico

Algoritmo: `SHA-256`.

Scope de duplicidad:

```text
workspaceId + empresaCodigo + hashSha256
```

`clienteDestinoId` no participa en la unicidad física.

## Fingerprint lógico

Versión:

```text
canonical-json-v1
```

Se calcula como SHA-256 de la serialización JSON canónica del payload lógico normalizado.

Campos incluidos:

```text
workspaceId
empresaCodigo
clienteDestinoId
expedienteId
actorId
canalIngreso
tipoDocumental
tipoRelacion
esPrincipal
nombreArchivo
contentType
tamanoBytes
hashSha256
```

Campos excluidos:

```text
idempotencyKey
requestId
correlationId
archivo binario
credenciales
timestamps generados por servidor
storageKey generado
```

Reglas: claves ordenadas lexicográficamente, arrays conservan orden, `undefined` se omite, `null` se conserva, números finitos, hashes en minúsculas y mismo contenido con distinto orden de propiedades produce el mismo fingerprint.

## Idempotencia

Clave lógica:

```text
workspaceId + empresaCodigo + idempotencyKey
```

Reglas:

```text
mismo scope + misma key + mismo fingerprint → REPLAYED
mismo scope + misma key + fingerprint distinto → IDEMPOTENCY_CONFLICT
```

La key es obligatoria, de 1 a 128 caracteres y sin caracteres de control.

Ventana funcional:

```text
expiraEn = iniciadaEn + 24 horas
```

La expiración no implica borrado físico ni reemplazo automático.

## Deduplicación y concurrencia

La reserva concurrente se apoya en `documentos.carga_operaciones` y en la unicidad parcial de:

```text
workspace_id + empresa_codigo + hash_sha256
```

para los estados `iniciada`, `almacenada`, `completada` y `requiere_reconciliacion`.

Una operación `fallida` deja de bloquear el hash.

## Estados

Estados oficiales:

```text
iniciada
almacenada
completada
fallida
requiere_reconciliacion
```

Transiciones permitidas:

```text
iniciada → almacenada
iniciada → fallida
almacenada → completada
almacenada → fallida
almacenada → requiere_reconciliacion
```

No se permiten transiciones automáticas desde estados terminales.

## Flujo principal

```text
validar feature flag
→ validar command
→ calcular hash SHA-256
→ construir payload lógico
→ calcular fingerprint canonical-json-v1
→ consultar/reservar idempotencia
→ resolver replay o conflicto
→ reservar hash dentro del scope
→ crear operación iniciada
→ generar storageKey
→ almacenar objeto
→ marcar operación almacenada
→ abrir transacción
→ crear o resolver documento
→ crear archivo
→ crear relación documental
→ insertar outbox
→ marcar operación completada
→ commit
→ devolver CREATED
```

`completada` debe persistirse dentro de la misma transacción que documento, archivo, relación y outbox.

## Storage

```ts
interface CargaSeguraStorage {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
}
```

Implementación inicial: R2 mediante SDK compatible con S3.

No se persistirán secretos, credenciales, tokens, URL firmadas ni endpoints internos en metadata.

## Compensación

`DeleteObject` solo se permite cuando:

1. el objeto fue creado por la misma operación;
2. la operación no está completada;
3. no existe referencia vigente al objeto;
4. no corresponde a replay;
5. no era un objeto preexistente;
6. el `storageKey` coincide exactamente con el reservado.

Resultados:

```text
persistencia falla + DeleteObject exitoso → fallida
persistencia falla + DeleteObject inseguro o fallido → requiere_reconciliacion
```

## Outbox

Tabla:

```text
documentos.documento_eventos_outbox
```

Evento inicial:

```text
tipoEvento: archivo.subido
eventoVersion: 1
aggregateType: documento
aggregateId: documentoId como texto
estado: pendiente
```

`eventKey` determinista:

```text
carga-segura:{cargaOperacionId}:archivo.subido:v1
```

GO-2A no implementa publicador, leases, reintentos ni consumidor.

## Feature flag

```text
DOCUMENTOS_CARGA_SEGURA_2_1C_ENABLED=false
```

El servicio debe rechazar la ejecución cuando el flag no sea exactamente `true`.

## Responsabilidades

- **Service:** orquestación, validación, hash, fingerprint, replay, conflicto y coordinación.
- **Repository:** reservas, transiciones, persistencia transaccional y consultas de compensación.
- **Storage:** put/delete sin lógica de negocio.
- **Compensation:** evaluar precondiciones y decidir `fallida` o `requiere_reconciliacion`.

## Pruebas previstas

Unitarias, integración PostgreSQL desechable, concurrencia, rollback, outbox atómico, compensación, reconciliación y storage simulado.

## Exclusiones

```text
Gateway
Web Admin
RDS
producción
main
nueva migración
modificación 0011–0013
modificación del manifest
publicador del outbox
worker de reconciliación
OCR
cambios a eventos CONF-OCR-AUD-01
push
PR
merge
```

## Estrategia de commits

```text
1. docs(go-2a): define secure upload backend plan
2. feat(documentos): add secure upload contracts and fingerprint
3. feat(documentos): add operation repository and idempotency
4. feat(documentos): add storage and compensation
5. feat(documentos): add transactional secure upload service and outbox
6. test(documentos): cover secure upload backend
7. docs(go-2a): record implementation evidence
```

## Condición de cierre

GO-2A requiere implementación limitada a `ms-documentos`, migraciones intactas, feature flag desactivado por defecto, idempotencia y deduplicación concurrentes, transacción atómica, outbox pendiente, compensación segura, reconciliación explícita, build y pruebas aprobados, documentación completa, commit local final y ausencia de push, PR, RDS y producción.
