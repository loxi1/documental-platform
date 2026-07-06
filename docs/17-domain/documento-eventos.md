# Documento de diseño — Eventos documentales

## Objetivo

Definir el modelo funcional de eventos documentales para registrar hechos relevantes dentro del ciclo de vida de documentos, archivos, OCR, expedientes y versiones.

Este documento es una especificación de dominio. No crea migraciones, no modifica runtime y no define implementación final.

## Principio general

Los eventos documentales representan hechos ocurridos.

Ejemplos:

- Documento creado.
- Archivo subido.
- OCR procesado.
- OCR confirmado.
- OCR rechazado.
- Documento vinculado a expediente.
- Versión agregada.

Los eventos no son alertas. Una alerta indica una condición que requiere atención. Un evento indica que algo ocurrió.

## Tabla futura sugerida

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
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Índices sugeridos

```sql
CREATE INDEX idx_documento_eventos_documento_creado
ON documentos.documento_eventos(documento_id, creado_en DESC);

CREATE INDEX idx_documento_eventos_archivo_creado
ON documentos.documento_eventos(archivo_id, creado_en DESC);

CREATE INDEX idx_documento_eventos_expediente_creado
ON documentos.documento_eventos(expediente_id, creado_en DESC);

CREATE INDEX idx_documento_eventos_tipo_creado
ON documentos.documento_eventos(tipo_evento, creado_en DESC);
```

## Regla append-only

`documentos.documento_eventos` debe ser append-only.

Reglas:

- No actualizar eventos para cambiar la historia funcional.
- No eliminar eventos en flujo normal.
- Si hay un error, registrar un evento correctivo o una alerta relacionada.
- La trazabilidad debe conservarse aunque un usuario se equivoque.

## Eventos mínimos oficiales

| Evento | Descripción |
|---|---|
| `documento.creado` | Se creó el documento base. |
| `archivo.subido` | Se registró un archivo asociado. |
| `ocr.procesado` | Se procesó OCR sobre un archivo. |
| `ocr.confirmado` | Un usuario confirmó el resultado OCR. |
| `ocr.rechazado` | Un usuario rechazó el resultado OCR. |
| `expediente.vinculado` | El documento fue vinculado a un expediente. |
| `version.agregada` | Se agregó una nueva versión documental. |

## Campos funcionales

### documento_id

Puede ser `NULL` porque algunos eventos técnicos pueden ocurrir antes de identificar o crear el documento final.

### archivo_id

Permite registrar eventos vinculados directamente a un archivo, incluso si el documento aún no está identificado.

### expediente_id

Debe llenarse cuando el evento afecte a un expediente o sea parte de la vista 360°.

### tipo_evento

Debe ser una clave estable, no una descripción libre.

Ejemplos:

```text
documento.creado
archivo.subido
ocr.procesado
ocr.confirmado
ocr.rechazado
expediente.vinculado
version.agregada
```

### entidad_tipo y entidad_id

Permiten apuntar a la entidad funcional que originó el evento.

Ejemplos:

```text
ocr_resultado / 15
expediente / 41
version / 3
archivo / 3788
```

### metadata

Debe guardar datos complementarios de trazabilidad, no reemplazar columnas consultables.

Ejemplos:

```json
{
  "clave_documental": "BBTI|OC|007950",
  "tipo_relacion": "principal_oc",
  "origen_regla": "codigo_expediente"
}
```

### usuario_id

Debe llenarse cuando el evento sea provocado por un usuario.

Puede ser `NULL` para eventos automáticos del sistema, OCR o integración.

### origen

Valores sugeridos:

```text
web
api
ocr
n8n
sistema
migracion
```

## Momentos de registro

### documento.creado

Después de insertar en `documentos.documentos`.

### archivo.subido

Después de registrar el archivo en `documentos.documentos_archivos` y confirmar almacenamiento.

### ocr.procesado

Después de crear o actualizar un resultado OCR.

### ocr.confirmado

Después de que un usuario confirme un resultado OCR.

### ocr.rechazado

Después de que un usuario rechace un resultado OCR con motivo.

### expediente.vinculado

Después de insertar relación en `documentos.expediente_documentos`.

### version.agregada

Después de agregar una nueva versión documental.

## Endpoints futuros sugeridos

```http
GET /api/v1/documentos/:id/eventos
GET /api/v1/expedientes/:id/eventos
```

## Exclusiones de este documento

Este documento no crea:

- migraciones
- repositorios
- servicios
- controllers
- endpoints
- cambios Docker
- cambios Traefik
- cambios RDS
- cambios frontend
- cambios OCR
