# Consulta Consolidada de Trazabilidad V2

**Sprint:** 2.0D.1B — Consulta Consolidada de Trazabilidad V2  
**Estado:** en implementación  
**Base:** `v2-rc4.1`  
**Rama:** `feat/documental-v2-trazabilidad-consulta-2-0D1B`

---


## Consulta Canónica

La API de trazabilidad V2 no expone una tabla de auditoría ni una tabla de eventos documentales.

Aunque la fuente principal actual sea `core.auditoria_eventos`, el contrato público representa el historial operativo del dominio documental, no la estructura física de persistencia.

Del mismo modo, `documentos.documento_eventos` puede ser una fuente complementaria futura, pero el consumidor no debe conocer ni depender de esa fuente.

La respuesta pública se construye como una proyección estable del dominio:

```text
Fuente física
  ↓
Repository
  ↓
UseCase
  ↓
Projection Mapper
  ↓
DTO
  ↓
Controller
  ↓
Contrato público
```

Por esta razón, el endpoint no devuelve `antes`, `despues`, `metadata` ni estructuras JSONB crudas.

El contrato público mantiene campos estables como:

- `version`;
- `contenedorOperativoId`;
- `items`;
- `categoria`;
- `tipo`;
- `actor`;
- `entidad`;
- `resultado`;
- `origen`;
- `cobertura`;
- `advertencias`.

Esto permite que futuros consumidores como Timeline Documental, Auditoría Visual o Dashboard puedan evolucionar sin acoplarse a tablas internas.

---

## 1. Objetivo

Construir la primera API canónica de lectura de trazabilidad del Modelo Documental V2.

La API representa el **historial operativo del dominio**, no una consulta directa a la tabla de auditoría.

El consumidor no debe conocer si un item proviene de:

- `core.auditoria_eventos`;
- `documentos.documento_eventos`;
- una fuente futura.

La fuente física queda encapsulada en backend mediante una proyección estable.

---

## 2. Decisiones arquitectónicas aplicadas

| Código | Decisión | Consecuencia |
| ------ | -------- | ------------ |
| DA-021 | La API representa historial operativo del dominio. | No se modela como endpoint de auditoría. |
| DA-022 | `categoria` y `tipo` son obligatorios. | El consumidor no infiere clasificación. |
| DA-023 | `items[]` se devuelve ordenado por fecha DESC. | React no ordena. |
| DA-024 | El contrato incluye `version`. | Se prepara evolución del contrato. |
| DA-025 | La cobertura forma parte del contrato. | Se puede diagnosticar sin revisar tablas. |
| DA-026 | Las advertencias son códigos normalizados. | No se devuelven textos arbitrarios. |

---

## 3. Fuentes de información

### 3.1 Fuente principal: `core.auditoria_eventos`

Fuente aprobada para operaciones V2 en este corte.

Aporta actualmente:

| Operación | Entidad | Cobertura |
| --------- | ------- | --------- |
| `ASOCIAR_DOCUMENTO_PRINCIPAL` | `documento_operativo_principal` | Validada runtime |
| `GRUPO_FACTURA_CREADO` | `grupo_factura` | Validada runtime |
| `DOCUMENTO_GRUPO_FACTURA_ASOCIADO` | `grupo_factura_documento` | Validada runtime |

Columnas físicas útiles:

- `id`;
- `workspace_id`;
- `request_id`;
- `usuario_id`;
- `empresa_codigo`;
- `modulo`;
- `entidad`;
- `entidad_id`;
- `accion`;
- `descripcion`;
- `despues`;
- `creado_en`.

Campos usados desde `despues JSONB` para enriquecer la proyección:

- `contenedorOperativoId`;
- `documentoOperativoPrincipalId`;
- `grupoFacturaId`;
- `facturaDocumentoId`;
- `documentoId`;
- `tipoRelacion`;
- `tipoDocumental`;
- `resultadoOperacion`;
- `usuarioEmail`;
- `correlationId`;
- `origen`.

Regla:

> Los campos utilizados para enriquecer una proyección pueden provenir de estructuras JSON internas, pero el contrato público nunca dependerá de la estructura física de dichos JSON.

### 3.2 Fuente complementaria: `documentos.documento_eventos`

Actualmente registra eventos base:

| Tipo evento | Entidad tipo | Uso actual |
| ----------- | ------------ | ---------- |
| `documento.creado` | `documento` | Carga/base documental |
| `archivo.subido` | `archivo` | Carga de archivo |
| `ocr.procesado` | `ocr_resultado` | OCR |

No registra actualmente operaciones V2 operativas:

- `ASOCIAR_DOCUMENTO_PRINCIPAL`;
- `GRUPO_FACTURA_CREADO`;
- `DOCUMENTO_GRUPO_FACTURA_ASOCIADO`.

Por tanto, en este sprint queda como fuente complementaria no combinada.

---

## 4. Matriz de solapamiento

| Dato | Auditoría | Documento Eventos | Ambas | Ninguna |
| ---- | --------- | ----------------- | ----- | ------- |
| fecha | Sí, `creado_en` | Sí, `creado_en` | Sí | — |
| usuario | Sí, `usuario_id` | Parcial, `usuario_id` | Parcial | — |
| email de usuario | Sí, desde `despues.usuarioEmail` | No garantizado | — | Parcial |
| acción / tipo | Sí, `accion` | Sí, `tipo_evento` | Sí | — |
| categoría | Derivable por proyección | Derivable por proyección | Sí | — |
| entidad | Sí, `entidad` / `entidad_id` | Sí, `entidad_tipo` / `entidad_id` | Sí | — |
| descripción | Sí, `descripcion` | Sí, `descripcion` | Sí | — |
| requestId | Sí, `request_id` | Sí, `request_id` | Sí | — |
| correlationId | Desde JSONB | Sí, columna física | Parcial | — |
| resultado | Desde JSONB | No garantizado | — | Parcial |
| origen operativo | Desde JSONB | `origen` técnico | Parcial | — |
| contenedorOperativoId | Desde JSONB | No | — | Parcial |
| documentoOperativoPrincipalId | Desde JSONB | No | — | Parcial |
| grupoFacturaId | Desde JSONB | No | — | Parcial |

---

## 5. Llave de consulta

| Llave | Cobertura | Estabilidad | Escalabilidad | Dictamen |
| ----- | --------- | ----------- | ------------- | -------- |
| `contenedorOperativoId` | Alta | Alta | Alta | Recomendada |
| `documentoOperativoPrincipalId` | Media | Media | Media | Uso interno |
| `grupoFacturaId` | Baja | Baja | Baja | Uso específico |
| `expedienteId` | Baja | Baja | Baja | Compatibilidad V1 |

La consulta canónica inicial usará `contenedorOperativoId` porque el Modelo Documental V2 se organiza alrededor del Contexto Operativo:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Factura fundadora
          -> Documentos asociados
```

---

## 6. Modelo de proyección

Flujo aprobado:

```text
Fuente física
  -> Repository de lectura
  -> UseCase
  -> Projection Mapper
  -> DTO
  -> Controller
```

Responsabilidades:

| Capa | Responsabilidad |
| ---- | --------------- |
| Repository | Leer fuentes físicas autorizadas. |
| UseCase | Resolver autorización, eje de consulta y fuentes a proyectar. |
| Projection Mapper | Convertir filas físicas en items del dominio. |
| DTO | Exponer contrato estable. |
| Controller | Recibir parámetros y delegar. |

El controller no extrae campos de JSONB ni interpreta acciones.

---

## 7. Endpoint

### Backend interno

```http
GET /api/v1/documental-v2/trazabilidad/contenedores/:contenedorOperativoId
```

### Gateway

```http
GET /api/v1/documental-v2/trazabilidad/contenedores/:contenedorOperativoId
```

---

## 8. Contrato público

```json
{
  "version": 1,
  "contenedorOperativoId": 2,
  "items": [
    {
      "id": "auditoria:348",
      "fecha": "2026-07-14T21:23:43.735Z",
      "categoria": "AUDITORIA",
      "tipo": "DOCUMENTO_GRUPO_FACTURA_ASOCIADO",
      "descripcion": "Documento asociado al Grupo de Factura desde operación V2.",
      "actor": {
        "usuarioId": 1,
        "email": "admin@documental.local"
      },
      "entidad": {
        "tipo": "grupo_factura_documento",
        "id": "5"
      },
      "resultado": "CREADO",
      "origen": "api-gateway",
      "requestId": "8ac9a276-305e-4932-8942-6f3539362601",
      "correlationId": "8ac9a276-305e-4932-8942-6f3539362601"
    }
  ],
  "cobertura": {
    "auditoria": true,
    "documentoEventos": false,
    "parcial": true
  },
  "advertencias": [
    "TRAZABILIDAD_PARCIAL",
    "SIN_EVENTOS_DOCUMENTALES"
  ]
}
```

### Reglas del contrato

- `version` es obligatorio.
- `categoria` y `tipo` son obligatorios en cada item.
- `items[]` se devuelve en orden cronológico DESC.
- `cobertura` es obligatoria.
- `advertencias` usa códigos normalizados.
- campos no disponibles se devuelven como `null`.
- no se expone `antes`, `despues` ni `metadata` cruda.

---

## 9. Advertencias normalizadas

| Código | Uso |
| ------ | --- |
| `TRAZABILIDAD_PARCIAL` | La respuesta usa una fuente principal, pero no todas las fuentes futuras están integradas. |
| `SIN_EVENTOS_DOCUMENTALES` | `documentos.documento_eventos` no aporta eventos operativos V2 en este corte. |
| `SIN_TRAZABILIDAD_OPERATIVA` | No existen items operativos para el contenedor consultado. |
| `FUENTE_COMPLEMENTARIA_NO_DISPONIBLE` | Reservado para fallas futuras de fuentes complementarias. |

---

## 10. Riesgos técnicos

### Nivel B — campos relevantes en JSONB

Los siguientes campos viven actualmente dentro de `despues JSONB`:

- `correlationId`;
- `usuarioEmail`;
- `resultadoOperacion`;
- `origen`;
- `contenedorOperativoId`;
- `documentoOperativoPrincipalId`;
- `grupoFacturaId`.

Riesgo:

- no son indexables de forma eficiente sin índice específico;
- no son columnas físicas;
- podrían cambiar si cambia la serialización interna.

Mitigación en este sprint:

- el contrato público no depende de la estructura JSONB;
- el mapper normaliza los campos;
- valores ausentes se devuelven como `null`;
- no se expone JSON crudo.

---

## 11. Fuera de alcance

No se implementa:

- React;
- Timeline Visual;
- Auditoría Visual;
- filtros avanzados;
- paginación compleja;
- combinación con `documentos.documento_eventos`;
- nuevas escrituras;
- migraciones;
- cambios sobre operaciones existentes.
