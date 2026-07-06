# Plan técnico — Implementación de eventos documentales v2

## Objetivo

Convertir la especificación de dominio de eventos documentales en un plan técnico implementable para `ms-documentos`.

Este documento define el diseño técnico para implementar progresivamente el módulo `documento-eventos`, empezando con un único evento inicial de bajo riesgo:

```text
expediente.vinculado
```

La implementación completa de todos los eventos queda planificada, pero no se incorpora de golpe para no afectar el flujo productivo ya estable.

## Restricciones del bloque de diseño

Este documento respeta las restricciones del bloque de análisis:

```text
NO tocar runtime en esta fase documental
NO crear migración todavía en esta fase documental
NO tocar Docker
NO tocar deployment
NO tocar RDS directamente
NO tocar frontend
NO tocar OCR
```

Cuando se pase a Sprint 1.3C, la implementación sí podrá crear migración y runtime backend, según alcance aprobado.

Archivo de dominio relacionado:

```text
docs/17-domain/documento-eventos.md
```

---

# 1. Diseño de migración para documentos.documento_eventos

## 1.1 Nombre futuro de migración

Nombre sugerido:

```text
0006_documento_eventos.sql
```

Ruta futura sugerida:

```text
infra/postgres/migrations/0006_documento_eventos.sql
```

## 1.2 Tabla propuesta

```sql
CREATE TABLE documentos.documento_eventos (
  id BIGSERIAL PRIMARY KEY,

  documento_id BIGINT NULL REFERENCES documentos.documentos(id),
  archivo_id BIGINT NULL REFERENCES documentos.documentos_archivos(id),

  tipo_evento VARCHAR(80) NOT NULL,

  entidad_tipo VARCHAR(80) NULL,
  entidad_id BIGINT NULL,

  expediente_id BIGINT NULL REFERENCES documentos.expedientes(id),

  descripcion TEXT NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  usuario_id BIGINT NULL,

  origen VARCHAR(50) NOT NULL DEFAULT 'sistema',

  request_id UUID NULL,
  correlation_id UUID NULL,

  evento_version INT NOT NULL DEFAULT 1,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 1.3 Campos agregados en v2

### request_id

Identificador de la petición HTTP o proceso que originó el evento.

Uso esperado:

```text
Trazar un evento documental hacia una request concreta.
```

Debe llenarse cuando exista contexto HTTP o contexto de request interno.

Puede ser `NULL` para eventos antiguos, migraciones o procesos que aún no propaguen request id.

### correlation_id

Identificador de correlación funcional o técnica para agrupar varias operaciones relacionadas.

Uso esperado:

```text
Agrupar eventos que pertenecen al mismo flujo documental.
```

Ejemplos:

```text
carga de archivo
procesamiento OCR
vinculación a expediente
confirmación OCR
```

Puede ser igual a `request_id` cuando no exista un identificador de flujo más amplio.

### evento_version

Versión del contrato del evento.

Uso esperado:

```text
Permitir evolución futura del formato de metadata sin romper compatibilidad.
```

Valor inicial:

```text
1
```

Regla:

```text
No cambiar evento_version por cada fila.
Solo incrementarlo cuando cambie el contrato semántico de un tipo de evento.
```

## 1.4 Índices propuestos

```sql
CREATE INDEX idx_documento_eventos_documento_creado
ON documentos.documento_eventos(documento_id, creado_en DESC);

CREATE INDEX idx_documento_eventos_archivo_creado
ON documentos.documento_eventos(archivo_id, creado_en DESC);

CREATE INDEX idx_documento_eventos_expediente_creado
ON documentos.documento_eventos(expediente_id, creado_en DESC);

CREATE INDEX idx_documento_eventos_tipo_creado
ON documentos.documento_eventos(tipo_evento, creado_en DESC);

CREATE INDEX idx_documento_eventos_request_id
ON documentos.documento_eventos(request_id);

CREATE INDEX idx_documento_eventos_correlation_id
ON documentos.documento_eventos(correlation_id);
```

## 1.5 Registro en core.schema_migrations

La migración futura deberá registrar versión:

```sql
INSERT INTO core.schema_migrations (version, descripcion, checksum)
VALUES
  ('0006', 'Tabla documentos.documento_eventos para historial documental append-only', NULL)
ON CONFLICT (version) DO NOTHING;
```

## 1.6 Regla append-only

La tabla `documentos.documento_eventos` debe tratarse como append-only.

Reglas:

```text
NO actualizar eventos para representar cambios de negocio.
NO eliminar eventos en flujo normal.
SI hay error funcional, registrar evento correctivo o alerta relacionada.
```

---

# 2. Diseño de DocumentoEventosRepository

## 2.1 Ubicación futura

Ruta sugerida:

```text
apps/ms-documentos/src/documento-eventos/documento-eventos.repository.ts
```

## 2.2 Responsabilidad

`DocumentoEventosRepository` será responsable de acceso directo a PostgreSQL para:

- insertar eventos
- consultar eventos por documento
- consultar eventos por expediente
- consultar eventos por request id
- consultar eventos por correlation id en una fase posterior

No debe contener reglas de negocio. Solo persistencia y mapeo.

## 2.3 Tipos sugeridos

Archivo futuro:

```text
apps/ms-documentos/src/documento-eventos/documento-eventos.types.ts
```

Tipos sugeridos:

```ts
export type DocumentoEventoTipo =
  | 'documento.creado'
  | 'archivo.subido'
  | 'ocr.procesado'
  | 'ocr.confirmado'
  | 'ocr.rechazado'
  | 'expediente.vinculado'
  | 'version.agregada';

export type DocumentoEventoOrigen =
  | 'web'
  | 'api'
  | 'ocr'
  | 'n8n'
  | 'sistema'
  | 'migracion';

export interface RegistrarDocumentoEventoInput {
  documentoId?: number | null;
  archivoId?: number | null;
  tipoEvento: DocumentoEventoTipo;
  entidadTipo?: string | null;
  entidadId?: number | null;
  expedienteId?: number | null;
  descripcion?: string | null;
  metadata?: Record<string, unknown>;
  usuarioId?: number | null;
  origen?: DocumentoEventoOrigen;
  requestId?: string | null;
  correlationId?: string | null;
  eventoVersion?: number;
}

export interface DocumentoEventoRow {
  id: number;
  documento_id: number | null;
  archivo_id: number | null;
  tipo_evento: string;
  entidad_tipo: string | null;
  entidad_id: number | null;
  expediente_id: number | null;
  descripcion: string | null;
  metadata: Record<string, unknown>;
  usuario_id: number | null;
  origen: string;
  request_id: string | null;
  correlation_id: string | null;
  evento_version: number;
  creado_en: Date;
}
```

## 2.4 Métodos mínimos del repository

```ts
export class DocumentoEventosRepository {
  async crear(input: RegistrarDocumentoEventoInput): Promise<DocumentoEventoRow>;

  async listarPorDocumento(documentoId: number): Promise<DocumentoEventoRow[]>;

  async listarPorExpediente(expedienteId: number): Promise<DocumentoEventoRow[]>;
}
```

Métodos futuros:

```ts
async listarPorRequestId(requestId: string): Promise<DocumentoEventoRow[]>;

async listarPorCorrelationId(correlationId: string): Promise<DocumentoEventoRow[]>;
```

## 2.5 SQL de inserción sugerido

```sql
INSERT INTO documentos.documento_eventos (
  documento_id,
  archivo_id,
  tipo_evento,
  entidad_tipo,
  entidad_id,
  expediente_id,
  descripcion,
  metadata,
  usuario_id,
  origen,
  request_id,
  correlation_id,
  evento_version
)
VALUES (
  ${documentoId},
  ${archivoId},
  ${tipoEvento},
  ${entidadTipo},
  ${entidadId},
  ${expedienteId},
  ${descripcion},
  ${metadata},
  ${usuarioId},
  ${origen},
  ${requestId},
  ${correlationId},
  ${eventoVersion}
)
RETURNING *;
```

## 2.6 SQL por documento

```sql
SELECT *
FROM documentos.documento_eventos
WHERE documento_id = ${documentoId}
ORDER BY creado_en DESC, id DESC;
```

## 2.7 SQL por expediente

```sql
SELECT *
FROM documentos.documento_eventos
WHERE expediente_id = ${expedienteId}
ORDER BY creado_en DESC, id DESC;
```

---

# 3. Diseño de DocumentoEventosService

## 3.1 Ubicación futura

Ruta sugerida:

```text
apps/ms-documentos/src/documento-eventos/documento-eventos.service.ts
```

## 3.2 Responsabilidad

`DocumentoEventosService` será responsable de:

- normalizar inputs
- asignar descripciones por defecto
- asignar `eventoVersion`
- propagar `requestId` y `correlationId` si están disponibles
- llamar al repository
- evitar que errores de eventos rompan operaciones principales, según decisión funcional
- exponer métodos de consulta para controllers internos o gateway

## 3.3 Métodos mínimos

```ts
export class DocumentoEventosService {
  async registrarEvento(input: RegistrarDocumentoEventoInput): Promise<void>;

  async listarPorDocumento(documentoId: number): Promise<DocumentoEventoDto[]>;

  async listarPorExpediente(expedienteId: number): Promise<DocumentoEventoDto[]>;
}
```

## 3.4 Política de errores

Recomendación para MVP:

```text
El registro de eventos no debe romper la operación principal si falla por error no crítico.
```

Ejemplo:

- Si se vincula un documento a expediente correctamente, pero falla el registro del evento, la vinculación no debería revertirse inicialmente.
- El fallo debe loguearse para revisión técnica.

En una fase posterior se puede decidir transacción fuerte para eventos críticos.

## 3.5 Descripciones por defecto

```ts
const defaultDescriptions: Record<DocumentoEventoTipo, string> = {
  'documento.creado': 'Documento creado.',
  'archivo.subido': 'Archivo subido.',
  'ocr.procesado': 'OCR procesado.',
  'ocr.confirmado': 'OCR confirmado.',
  'ocr.rechazado': 'OCR rechazado.',
  'expediente.vinculado': 'Documento vinculado a expediente.',
  'version.agregada': 'Versión documental agregada.',
};
```

## 3.6 DTO de salida

```ts
export interface DocumentoEventoDto {
  id: number;
  documentoId: number | null;
  archivoId: number | null;
  tipoEvento: string;
  entidadTipo: string | null;
  entidadId: number | null;
  expedienteId: number | null;
  descripcion: string | null;
  metadata: Record<string, unknown>;
  usuarioId: number | null;
  origen: string;
  requestId: string | null;
  correlationId: string | null;
  eventoVersion: number;
  creadoEn: string;
}
```

## 3.7 Mapeo row → DTO

```ts
function mapDocumentoEvento(row: DocumentoEventoRow): DocumentoEventoDto {
  return {
    id: row.id,
    documentoId: row.documento_id,
    archivoId: row.archivo_id,
    tipoEvento: row.tipo_evento,
    entidadTipo: row.entidad_tipo,
    entidadId: row.entidad_id,
    expedienteId: row.expediente_id,
    descripcion: row.descripcion,
    metadata: row.metadata ?? {},
    usuarioId: row.usuario_id,
    origen: row.origen,
    requestId: row.request_id,
    correlationId: row.correlation_id,
    eventoVersion: row.evento_version,
    creadoEn: row.creado_en.toISOString(),
  };
}
```

---

# 4. Event Publisher futuro

## 4.1 Objetivo

El `Event Publisher` será una capa futura para publicar eventos documentales hacia NATS u otro bus interno.

En Sprint 1.3C no se recomienda publicar todos los eventos todavía. Primero se debe consolidar persistencia local en PostgreSQL.

## 4.2 Diseño futuro

Ubicación sugerida:

```text
apps/ms-documentos/src/documento-eventos/documento-eventos.publisher.ts
```

Interfaz sugerida:

```ts
export interface DocumentoEventosPublisher {
  publish(evento: DocumentoEventoDto): Promise<void>;
}
```

Implementación inicial futura:

```ts
export class NoopDocumentoEventosPublisher implements DocumentoEventosPublisher {
  async publish(): Promise<void> {
    return;
  }
}
```

## 4.3 Subject NATS futuro sugerido

```text
documento.evento.creado
```

o por tipo:

```text
documento.evento.expediente.vinculado
documento.evento.ocr.procesado
documento.evento.ocr.confirmado
```

## 4.4 Regla de implementación

Primera etapa:

```text
Persistir evento en PostgreSQL.
No publicar todavía.
```

Segunda etapa:

```text
Persistir evento.
Publicar evento de forma no bloqueante.
```

Tercera etapa:

```text
Evaluar outbox pattern si se requiere garantía fuerte.
```

---

# 5. Puntos exactos donde se registrará cada evento

## 5.1 evento inicial: expediente.vinculado

Este será el único evento que se recomienda implementar en Sprint 1.3C.

### Momento

Registrar después de insertar relación en:

```text
documentos.expediente_documentos
```

### Ubicación futura probable

Buscar en:

```text
apps/ms-documentos/src/expedientes/
apps/ms-documentos/src/documentos/
```

Puntos conocidos del flujo:

```text
vinculación manual documento-expediente
vinculación automática por código de expediente
vinculación durante OCR o procesamiento documental
```

### Input sugerido

```ts
await documentoEventosService.registrarEvento({
  documentoId,
  archivoId,
  expedienteId,
  tipoEvento: 'expediente.vinculado',
  entidadTipo: 'expediente',
  entidadId: expedienteId,
  descripcion: 'Documento vinculado a expediente.',
  metadata: {
    tipo_relacion,
    es_principal,
    orden,
  },
  usuarioId,
  origen: 'api',
  requestId,
  correlationId,
  eventoVersion: 1,
});
```

## 5.2 documento.creado

Planificado para fase posterior. No implementarlo primero por riesgo de duplicar eventos en varios puntos de creación.

## 5.3 archivo.subido

Planificado para fase posterior. No implementarlo primero porque cruza flujos Web, n8n, OCR y carga manual.

## 5.4 ocr.procesado

Planificado para fase posterior. No implementarlo primero porque toca flujo OCR.

## 5.5 ocr.confirmado

Planificado para fase posterior.

## 5.6 ocr.rechazado

Planificado para fase posterior.

## 5.7 version.agregada

Planificado para fase posterior de versionado.

Documento relacionado:

```text
docs/17-domain/documento-versiones.md
```

---

# 6. Contratos de endpoints

## 6.1 Sprint 1.3C — endpoint inicial

Para Sprint 1.3C se recomienda implementar solo:

```http
GET /api/v1/documentos/:id/eventos
```

## 6.2 GET /api/v1/documentos/:id/eventos

### Responsabilidad

Consultar historial de eventos de un documento.

### Servicio responsable

```text
ms-documentos
```

### Gateway

El API Gateway deberá exponer:

```http
GET /api/v1/documentos/:id/eventos
```

y enrutar al microservicio documental.

### Parámetros

```text
id: number
```

### Query params futuros opcionales

```text
tipoEvento
limit
offset
desde
hasta
```

### Respuesta exitosa

```json
{
  "success": true,
  "data": {
    "documentoId": 3727,
    "eventos": [
      {
        "id": 1,
        "documentoId": 3727,
        "archivoId": 3788,
        "tipoEvento": "expediente.vinculado",
        "entidadTipo": "expediente",
        "entidadId": 41,
        "expedienteId": 41,
        "descripcion": "Documento vinculado a expediente.",
        "metadata": {
          "tipo_relacion": "principal_oc",
          "es_principal": true,
          "orden": 1
        },
        "usuarioId": null,
        "origen": "api",
        "requestId": "2d3704e8-8335-47e3-8028-3d45413b8b20",
        "correlationId": "2d3704e8-8335-47e3-8028-3d45413b8b20",
        "eventoVersion": 1,
        "creadoEn": "2026-07-05T16:00:00.000Z"
      }
    ]
  }
}
```

### Caso sin eventos

```json
{
  "success": true,
  "data": {
    "documentoId": 3727,
    "eventos": []
  }
}
```

## 6.3 GET /api/v1/expedientes/:id/eventos

Contrato planificado, no recomendado para el primer corte Sprint 1.3C.

Endpoint futuro:

```http
GET /api/v1/expedientes/:id/eventos
```

---

# 7. Sprint 1.3C — Implementación del módulo documento-eventos

## 7.1 Alcance aprobado sugerido

```text
Crear la migración 0006_documento_eventos.sql.
Crear el módulo documento-eventos en ms-documentos.
Implementar Repository, Service y Types.
Registrar solo un evento inicialmente: expediente.vinculado.
Agregar el endpoint GET /documentos/:id/eventos.
Probar y validar antes de incorporar el resto de eventos.
```

## 7.2 Fuera de alcance para Sprint 1.3C

```text
No registrar documento.creado todavía.
No registrar archivo.subido todavía.
No registrar ocr.procesado todavía.
No registrar ocr.confirmado todavía.
No registrar ocr.rechazado todavía.
No registrar version.agregada todavía.
No implementar GET /expedientes/:id/eventos todavía.
No publicar eventos por NATS todavía.
No tocar frontend.
No tocar OCR worker.
No tocar Docker.
No tocar deployment.
```

---

# 8. Riesgos y mitigaciones

## Riesgo 1 — Eventos duplicados

Mitigación:

```text
Definir un único punto de registro por acción.
```

Para Sprint 1.3C:

```text
Solo registrar expediente.vinculado en el punto exacto de vinculación.
```

## Riesgo 2 — Eventos sin documento_id

Mitigación:

```text
Siempre enviar documento_id si ya está disponible.
Permitir NULL solo para eventos técnicos tempranos.
```

## Riesgo 3 — Falla de evento rompiendo flujo principal

Mitigación recomendada:

```text
Registrar evento en try/catch y loguear fallo.
No romper operación principal salvo decisión explícita.
```

## Riesgo 4 — metadata excesiva

Mitigación:

```text
Guardar solo datos de trazabilidad necesarios.
No almacenar contenido completo OCR ni documentos completos en metadata.
```

## Riesgo 5 — Desorden entre eventos y auditoría

Mitigación:

```text
Eventos = historial funcional documental.
Auditoría = trazabilidad técnica/sesión/request.
```

## Riesgo 6 — correlation_id no propagado

Mitigación:

```text
Permitir NULL.
Usar request_id como correlation_id inicial si no hay otro valor.
```

## Riesgo 7 — Event Publisher prematuro

Mitigación:

```text
Primero persistencia PostgreSQL.
Luego Publisher Noop.
Después Publisher NATS si se aprueba.
```

---

# 9. Orden de implementación ajustado

## Fase 1 — Migración

Crear:

```text
infra/postgres/migrations/0006_documento_eventos.sql
```

Debe incluir:

```text
tabla documentos.documento_eventos
índices mínimos
registro en core.schema_migrations
```

## Fase 2 — Types

Crear:

```text
apps/ms-documentos/src/documento-eventos/documento-eventos.types.ts
```

## Fase 3 — Repository

Crear:

```text
apps/ms-documentos/src/documento-eventos/documento-eventos.repository.ts
```

Implementar:

```text
crear
listarPorDocumento
```

## Fase 4 — Service

Crear:

```text
apps/ms-documentos/src/documento-eventos/documento-eventos.service.ts
```

Implementar:

```text
registrarEvento
listarPorDocumento
```

## Fase 5 — Module

Crear:

```text
apps/ms-documentos/src/documento-eventos/documento-eventos.module.ts
```

Exportar service para poder usarlo desde el flujo de vinculación.

## Fase 6 — Registrar expediente.vinculado

Integrar únicamente en el punto donde se inserta relación en:

```text
documentos.expediente_documentos
```

## Fase 7 — Endpoint ms-documentos

Agregar endpoint interno:

```http
GET /documentos/:id/eventos
```

## Fase 8 — Gateway

Exponer:

```http
GET /api/v1/documentos/:id/eventos
```

## Fase 9 — Validación

Validar:

```text
pnpm --filter @documental/ms-documentos build
pnpm --filter @documental/api-gateway build
GET /api/v1/documentos/:id/eventos
flujo de vinculación expediente
```

## Fase 10 — Próximos eventos

Solo después de validar Sprint 1.3C:

```text
ocr.procesado
ocr.confirmado
ocr.rechazado
archivo.subido
documento.creado
version.agregada
GET /expedientes/:id/eventos
Event Publisher
```

---

# 10. Criterio de éxito Sprint 1.3C

El sprint se considera exitoso si:

```text
Existe tabla documentos.documento_eventos.
Existe módulo documento-eventos en ms-documentos.
Se registra expediente.vinculado al vincular documento con expediente.
GET /api/v1/documentos/:id/eventos devuelve el historial del documento.
Build ms-documentos OK.
Build api-gateway OK.
No se afecta flujo OCR.
No se afecta frontend.
No se afecta Docker/deployment.
```
