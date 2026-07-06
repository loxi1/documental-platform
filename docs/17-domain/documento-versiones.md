# Documento de diseño — Versionado documental

## Objetivo

Definir el modelo funcional futuro para manejar versiones documentales sin perder trazabilidad histórica.

Este documento es una especificación de dominio. No crea migraciones, no modifica runtime y no implementa endpoints.

## Principio general

Una nueva versión documental no reemplaza ni elimina el archivo anterior.

El sistema debe conservar:

- archivo anterior
- archivo nuevo
- número de versión
- motivo
- usuario u origen
- fecha de creación
- evento asociado

## Tabla futura sugerida

```sql
CREATE TABLE documentos.documento_versiones (
  id BIGSERIAL PRIMARY KEY,
  documento_id BIGINT NOT NULL REFERENCES documentos.documentos(id),
  archivo_anterior_id BIGINT NULL REFERENCES documentos.documentos_archivos(id),
  archivo_nuevo_id BIGINT NOT NULL REFERENCES documentos.documentos_archivos(id),
  version_numero INT NOT NULL,
  motivo TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  usuario_id BIGINT NULL,
  origen VARCHAR(50) NOT NULL DEFAULT 'sistema',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Índices sugeridos

```sql
CREATE INDEX idx_documento_versiones_documento_creado
ON documentos.documento_versiones(documento_id, creado_en DESC);

CREATE UNIQUE INDEX idx_documento_versiones_documento_numero
ON documentos.documento_versiones(documento_id, version_numero);
```

## Reglas funcionales

### Versión inicial

La primera versión puede manejarse de dos maneras:

1. Implícita: el primer archivo del documento representa la versión inicial.
2. Explícita: se registra como versión `1` en `documento_versiones`.

Para MVP se recomienda versión inicial implícita, salvo que el flujo operativo requiera historial completo desde el primer archivo.

### Nueva versión

Cuando se agrega una nueva versión:

- No se elimina el archivo anterior.
- Se registra `archivo_anterior_id`.
- Se registra `archivo_nuevo_id`.
- Se incrementa `version_numero`.
- Se registra motivo si la acción fue humana.
- Se emite evento `version.agregada`.

### Motivo

El motivo debe ser obligatorio cuando la versión sea originada por un usuario.

Ejemplos:

```text
Archivo ilegible.
Factura corregida.
Se reemplaza documento equivocado.
Nueva versión enviada por proveedor.
Corrección de escaneo.
```

### Origen

Valores sugeridos:

```text
web
api
ocr
n8n
sistema
migracion
```

## Evento asociado

Cada nueva versión debe registrar un evento documental:

```text
version.agregada
```

Metadata sugerida:

```json
{
  "version_numero": 2,
  "archivo_anterior_id": 100,
  "archivo_nuevo_id": 120,
  "motivo": "Archivo ilegible"
}
```

## Endpoints futuros sugeridos

```http
GET /api/v1/documentos/:id/versiones
GET /api/v1/documentos/:id/versiones/:versionId
POST /api/v1/documentos/:id/versiones
```

## Relación con alertas

Si una versión se agrega por problema documental, puede existir también una alerta relacionada.

Ejemplo:

- Alerta: `archivo.ilegible`
- Acción: se agrega nueva versión
- Evento: `version.agregada`
- Estado alerta: `resuelta`

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
