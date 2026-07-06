# Documento de diseño — Alertas documentales

## Objetivo

Definir el modelo funcional futuro para alertas documentales dentro del sistema de gestión documental.

Este documento es una especificación de dominio. No crea migraciones, no modifica runtime y no implementa endpoints.

## Principio general

Una alerta representa una condición que requiere atención.

Una alerta no es lo mismo que un evento.

- Evento: algo ocurrió.
- Alerta: algo necesita revisión, acción o resolución.

Ejemplos de eventos:

```text
archivo.subido
ocr.procesado
expediente.vinculado
```

Ejemplos de alertas:

```text
Factura observada.
Documento ilegible.
Pago pendiente.
Expediente incompleto.
```

## Decisión del sprint

En este sprint, las alertas son manuales.

No se implementan alertas automáticas todavía.

Las áreas responsables pueden crear alertas según revisión funcional:

- Contabilidad
- Finanzas
- Logística
- Almacén

## Tipos de alerta sugeridos

```text
documento.incompleto
documento.duplicado
archivo.ilegible
ocr.inconsistente
ocr.rechazado
expediente.incompleto
factura.observada
pago.pendiente
detraccion.pendiente
monto.inconsistente
validacion.requerida
```

## Severidades sugeridas

```text
baja
media
alta
critica
```

## Estados sugeridos

```text
abierta
en_revision
resuelta
descartada
```

## Tabla futura sugerida

```sql
CREATE TABLE documentos.documento_alertas (
  id BIGSERIAL PRIMARY KEY,
  documento_id BIGINT NULL REFERENCES documentos.documentos(id),
  archivo_id BIGINT NULL REFERENCES documentos.documentos_archivos(id),
  expediente_id BIGINT NULL REFERENCES documentos.expedientes(id),
  tipo_alerta VARCHAR(80) NOT NULL,
  severidad VARCHAR(30) NOT NULL DEFAULT 'media',
  estado VARCHAR(30) NOT NULL DEFAULT 'abierta',
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_por BIGINT NULL,
  resuelto_por BIGINT NULL,
  origen VARCHAR(50) NOT NULL DEFAULT 'manual',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  resuelto_en TIMESTAMPTZ NULL
);
```

## Índices sugeridos

```sql
CREATE INDEX idx_documento_alertas_documento_estado
ON documentos.documento_alertas(documento_id, estado);

CREATE INDEX idx_documento_alertas_expediente_estado
ON documentos.documento_alertas(expediente_id, estado);

CREATE INDEX idx_documento_alertas_estado_creado
ON documentos.documento_alertas(estado, creado_en DESC);
```

## Reglas funcionales

### Crear alerta

Una alerta debe poder crearse asociada a:

- documento
- archivo
- expediente
- combinación de los anteriores

### Resolver alerta

Resolver una alerta no debe eliminarla.

Debe actualizar:

```text
estado = resuelta
resuelto_por
resuelto_en
```

### Descartar alerta

Si una alerta fue creada por error, no debe eliminarse.

Debe marcarse como:

```text
estado = descartada
```

### No perder trazabilidad

Regla principal:

```text
No perder trazabilidad aunque el usuario se equivoque.
```

## Ejemplos funcionales

### Factura observada

```json
{
  "tipo_alerta": "factura.observada",
  "severidad": "alta",
  "titulo": "Factura observada",
  "descripcion": "La factura no coincide con la OC asociada."
}
```

### Documento ilegible

```json
{
  "tipo_alerta": "archivo.ilegible",
  "severidad": "media",
  "titulo": "Documento ilegible",
  "descripcion": "El archivo no permite validar los datos principales."
}
```

### Pago pendiente

```json
{
  "tipo_alerta": "pago.pendiente",
  "severidad": "alta",
  "titulo": "Pago pendiente",
  "descripcion": "El expediente no tiene transferencia asociada."
}
```

## Endpoints futuros sugeridos

```http
GET /api/v1/documentos/:id/alertas
GET /api/v1/expedientes/:id/alertas
POST /api/v1/alertas
POST /api/v1/alertas/:id/resolver
POST /api/v1/alertas/:id/descartar
```

## Relación con eventos

Una alerta puede generar eventos futuros, pero no reemplaza eventos documentales.

Ejemplo:

```text
alerta creada
alerta resuelta
alerta descartada
```

Estos eventos podrían registrarse posteriormente en `documentos.documento_eventos`.

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
