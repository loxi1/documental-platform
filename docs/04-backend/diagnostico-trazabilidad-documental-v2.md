# Diagnóstico de trazabilidad documental V2

## 1. Contexto

Este documento corresponde al Sprint 2.0D.1 — Diagnóstico y consulta consolidada de trazabilidad V2.

El objetivo es verificar la trazabilidad real existente en backend antes de implementar endpoints, Timeline Visual o Auditoría Visual.

Este diagnóstico parte de:

- `main` consolidado en `fdc3f4dd`;
- `v2-rc4` como último hito funcional;
- `v2-model-official` como hito normativo;
- `MODELO_DOCUMENTAL_V2_OFICIAL.md` como referencia normativa vigente.

## 2. Restricciones del diagnóstico

Durante esta fase se mantiene bloqueado:

- React;
- Timeline Visual;
- Auditoría Visual;
- endpoints nuevos;
- migraciones;
- nuevos eventos;
- NATS;
- OCR;
- alertas;
- modificación de operaciones V2 existentes;
- escritura de datos.

El diagnóstico es de solo lectura.

## 3. Operaciones V2 evaluadas

Se evaluó la cobertura de trazabilidad para las siguientes operaciones V2:

- `ASOCIAR_DOCUMENTO_PRINCIPAL`;
- `GRUPO_FACTURA_CREADO`;
- `DOCUMENTO_GRUPO_FACTURA_ASOCIADO`.

Estas operaciones corresponden a los sprints funcionales 2.0A, 2.0B y 2.0C.

## 4. Fuentes físicas revisadas

Se revisaron dos fuentes físicas:

- `core.auditoria_eventos`;
- `documentos.documento_eventos`.

También se revisó la existencia de referencias en código para las operaciones V2 evaluadas.

## 5. Fuente física: documentos.documento_eventos

### 5.1 Existencia

La tabla `documentos.documento_eventos` existe físicamente.

### 5.2 Campos comprobados

Campos físicos comprobados:

| Campo | Observación |
|---|---|
| `id` | Identificador del evento |
| `documento_id` | Referencia opcional al documento |
| `archivo_id` | Referencia opcional al archivo |
| `tipo_evento` | Tipo de evento documental |
| `entidad_tipo` | Tipo de entidad relacionada |
| `entidad_id` | Identificador de entidad relacionada |
| `expediente_id` | Expediente relacionado |
| `descripcion` | Descripción textual |
| `metadata` | Metadata JSONB |
| `usuario_id` | Usuario relacionado, si existe |
| `origen` | Origen del evento |
| `request_id` | Request UUID, si existe |
| `correlation_id` | Correlation UUID, si existe |
| `evento_version` | Versión del evento |
| `creado_en` | Fecha de creación |

### 5.3 Índices comprobados

La tabla cuenta con índices para:

- documento + fecha;
- archivo + fecha;
- expediente + fecha;
- tipo de evento + fecha;
- request_id;
- correlation_id.

Esto confirma que la infraestructura existe y es apta técnicamente para consultas de eventos documentales.

### 5.4 Eventos reales encontrados

Se encontraron eventos reales de tipo:

| tipo_evento | entidad_tipo | total |
|---|---|---:|
| `documento.creado` | `documento` | 2 |
| `archivo.subido` | `archivo` | 2 |
| `ocr.procesado` | `ocr_resultado` | 2 |

### 5.5 Cobertura de operaciones V2

No se encontraron eventos relacionados con:

- asociación de documento principal;
- creación de grupo de factura;
- asociación de documento al grupo de factura.

La búsqueda sobre `tipo_evento`, `descripcion` y `metadata` no devolvió registros para:

- `ASOCIAR_DOCUMENTO_PRINCIPAL`;
- `GRUPO_FACTURA_CREADO`;
- `DOCUMENTO_GRUPO_FACTURA_ASOCIADO`.

### 5.6 Conclusión sobre documento_eventos

`documentos.documento_eventos` existe y registra eventos documentales base, principalmente vinculados a creación/carga/OCR.

Sin embargo, no evidencia cobertura runtime actual para las operaciones V2 2.0A–2.0C evaluadas.

Clasificación:

| Aspecto | Estado |
|---|---|
| Existencia de infraestructura | Comprobada |
| Eventos documentales base | Comprobados |
| Cobertura de operaciones V2 2.0A–2.0C | Nula en runtime actual |
| Uso como fuente oficial de Timeline V2 | Pendiente de decisión |

## 6. Fuente física: core.auditoria_eventos

### 6.1 Existencia

La tabla `core.auditoria_eventos` existe físicamente.

### 6.2 Campos comprobados

Campos físicos comprobados:

| Campo | Observación |
|---|---|
| `id` | Identificador del evento de auditoría |
| `workspace_id` | Workspace relacionado |
| `session_context_id` | Contexto de sesión |
| `request_id` | Request UUID |
| `usuario_id` | Usuario relacionado |
| `empresa_codigo` | Código de empresa |
| `sistema_codigo` | Código de sistema |
| `perfil_codigo` | Código de perfil |
| `modulo` | Módulo funcional |
| `entidad` | Entidad auditada |
| `entidad_id` | Identificador de entidad, en texto |
| `accion` | Acción auditada |
| `descripcion` | Descripción textual |
| `antes` | JSONB con estado previo |
| `despues` | JSONB con estado posterior |
| `ip` | IP |
| `user_agent` | User agent |
| `creado_en` | Fecha de creación |

### 6.3 Campos no existentes como columnas físicas

No existen como columnas físicas directas:

- `tipo_operacion`;
- `entidad_tipo`;
- `resultado_operacion`;
- `usuario_email`;
- `origen`;
- `correlation_id`;
- `metadata`.

Si estos datos existieran, tendrían que obtenerse desde `antes`, `despues`, otra fuente o mediante enriquecimiento posterior.

### 6.4 Cobertura de operaciones V2

Se consultó `core.auditoria_eventos` usando `accion IN (...)` para:

- `ASOCIAR_DOCUMENTO_PRINCIPAL`;
- `GRUPO_FACTURA_CREADO`;
- `DOCUMENTO_GRUPO_FACTURA_ASOCIADO`.

Resultado:

```text
0 rows
```

También se realizó búsqueda amplia sobre `accion` usando términos:

- `PRINCIPAL`;
- `GRUPO`;
- `FACTURA`;
- `DOCUMENTO`.

Resultado:

```text
0 rows
```

### 6.5 Conclusión sobre auditoría

`core.auditoria_eventos` existe y tiene estructura suficiente para auditoría operativa general.

Sin embargo, en la base consultada no existen registros físicos para las operaciones V2 2.0A–2.0C evaluadas.

Clasificación:

| Aspecto | Estado |
|---|---|
| Existencia de infraestructura | Comprobada |
| Campos de auditoría base | Comprobados |
| Cobertura de operaciones V2 2.0A–2.0C | Nula en runtime actual |
| `usuario_email` físico | No existe |
| `correlation_id` físico | No existe |
| `tipo_operacion` físico | No existe |
| `resultado_operacion` físico | No existe |

## 7. Evidencia en código

Se encontraron referencias en código a las operaciones V2 evaluadas dentro de los use-cases backend.

Operaciones observadas en código:

- `ASOCIAR_DOCUMENTO_PRINCIPAL`;
- `GRUPO_FACTURA_CREADO`;
- `DOCUMENTO_GRUPO_FACTURA_ASOCIADO`.

Esto indica que existe intención o instrumentación de auditoría en código, pero esa intención no se refleja como registros físicos en la base consultada.

La evidencia runtime prevalece sobre la memoria o nombres esperados.

## 8. Consultas SQL utilizadas

### 8.1 Estructura de documento_eventos

```sql
\d+ documentos.documento_eventos
```

### 8.2 Estructura de auditoria_eventos

```sql
\d+ core.auditoria_eventos
```

### 8.3 Búsqueda exacta de operaciones V2 en auditoría

```sql
SELECT
  id,
  workspace_id,
  session_context_id,
  request_id,
  usuario_id,
  empresa_codigo,
  sistema_codigo,
  perfil_codigo,
  modulo,
  entidad,
  entidad_id,
  accion,
  descripcion,
  antes,
  despues,
  creado_en
FROM core.auditoria_eventos
WHERE accion IN (
  'ASOCIAR_DOCUMENTO_PRINCIPAL',
  'GRUPO_FACTURA_CREADO',
  'DOCUMENTO_GRUPO_FACTURA_ASOCIADO'
)
ORDER BY creado_en DESC
LIMIT 50;
```

Resultado:

```text
0 rows
```

### 8.4 Búsqueda amplia de operaciones documentales en auditoría

```sql
SELECT
  accion,
  modulo,
  entidad,
  COUNT(*) AS total,
  MIN(creado_en) AS primero,
  MAX(creado_en) AS ultimo
FROM core.auditoria_eventos
WHERE
  accion ILIKE '%PRINCIPAL%'
  OR accion ILIKE '%GRUPO%'
  OR accion ILIKE '%FACTURA%'
  OR accion ILIKE '%DOCUMENTO%'
GROUP BY accion, modulo, entidad
ORDER BY ultimo DESC;
```

Resultado:

```text
0 rows
```

### 8.5 Búsqueda exacta con JSON de auditoría

```sql
SELECT
  id,
  accion,
  jsonb_pretty(antes) AS antes,
  jsonb_pretty(despues) AS despues
FROM core.auditoria_eventos
WHERE accion IN (
  'ASOCIAR_DOCUMENTO_PRINCIPAL',
  'GRUPO_FACTURA_CREADO',
  'DOCUMENTO_GRUPO_FACTURA_ASOCIADO'
)
ORDER BY creado_en DESC
LIMIT 10;
```

Resultado:

```text
0 rows
```

### 8.6 Resumen de tipos de evento documental

```sql
SELECT
  tipo_evento,
  entidad_tipo,
  COUNT(*) AS total,
  MIN(creado_en) AS primero,
  MAX(creado_en) AS ultimo
FROM documentos.documento_eventos
GROUP BY tipo_evento, entidad_tipo
ORDER BY ultimo DESC;
```

Resultado observado:

| tipo_evento | entidad_tipo | total |
|---|---|---:|
| `ocr.procesado` | `ocr_resultado` | 2 |
| `archivo.subido` | `archivo` | 2 |
| `documento.creado` | `documento` | 2 |

### 8.7 Búsqueda amplia de operaciones V2 en documento_eventos

```sql
SELECT
  id,
  documento_id,
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
  creado_en
FROM documentos.documento_eventos
WHERE
  tipo_evento ILIKE '%principal%'
  OR tipo_evento ILIKE '%grupo%'
  OR tipo_evento ILIKE '%factura%'
  OR tipo_evento ILIKE '%asoci%'
  OR descripcion ILIKE '%principal%'
  OR descripcion ILIKE '%grupo%'
  OR descripcion ILIKE '%factura%'
  OR descripcion ILIKE '%asoci%'
  OR metadata::text ILIKE '%ASOCIAR_DOCUMENTO_PRINCIPAL%'
  OR metadata::text ILIKE '%GRUPO_FACTURA_CREADO%'
  OR metadata::text ILIKE '%DOCUMENTO_GRUPO_FACTURA_ASOCIADO%'
ORDER BY creado_en DESC
LIMIT 50;
```

Resultado:

```text
0 rows
```

## 9. Matriz de cobertura

| Operación V2 | Auditoría | documento_eventos | Usuario | Entidad | Request/Correlation | Cobertura |
|---|---|---|---|---|---|---|
| Asociar principal | Sin registros físicos para `ASOCIAR_DOCUMENTO_PRINCIPAL` | Sin registros físicos | No comprobable por registros | No comprobable por registros | No comprobable por registros | Nula |
| Crear grupo factura | Sin registros físicos para `GRUPO_FACTURA_CREADO` | Sin registros físicos | No comprobable por registros | No comprobable por registros | No comprobable por registros | Nula |
| Asociar documento al grupo | Sin registros físicos para `DOCUMENTO_GRUPO_FACTURA_ASOCIADO` | Sin registros físicos | No comprobable por registros | No comprobable por registros | No comprobable por registros | Nula |

## 10. Vacíos detectados

Se detectan los siguientes vacíos:

1. No hay registros runtime de operaciones V2 2.0A–2.0C en `core.auditoria_eventos`.
2. No hay registros runtime de operaciones V2 2.0A–2.0C en `documentos.documento_eventos`.
3. `core.auditoria_eventos` no tiene `usuario_email` como columna física.
4. `core.auditoria_eventos` no tiene `correlation_id` como columna física.
5. `core.auditoria_eventos` no tiene `tipo_operacion` como columna física.
6. `core.auditoria_eventos` no tiene `resultado_operacion` como columna física.
7. `documentos.documento_eventos` sí tiene `request_id` y `correlation_id`, pero los eventos encontrados no corresponden a operaciones V2.
8. No existe evidencia suficiente para construir Timeline Visual ni Auditoría Visual.
9. Una respuesta `items=[]` no debe interpretarse como ausencia de actividad; en el estado actual debe interpretarse como ausencia de trazabilidad instrumentada para las operaciones V2 evaluadas.

## 11. Duplicidades entre fuentes

No se detectaron duplicidades entre `core.auditoria_eventos` y `documentos.documento_eventos` para las operaciones V2 evaluadas, porque ninguna de las dos fuentes contiene registros runtime de esas operaciones.

Sí existe posible superposición conceptual futura:

- `core.auditoria_eventos` como auditoría operativa;
- `documentos.documento_eventos` como evento documental;
- una proyección normalizada como lectura consolidada.

Esa superposición debe resolverse por decisión arquitectónica antes de construir Timeline Visual.

## 12. Capacidad de correlación

### 12.1 core.auditoria_eventos

Tiene:

- `request_id`;
- `session_context_id`;
- `workspace_id`;
- `usuario_id`;
- `empresa_codigo`.

No tiene:

- `correlation_id`;
- `usuario_email`;
- `origen`.

### 12.2 documentos.documento_eventos

Tiene:

- `request_id`;
- `correlation_id`;
- `usuario_id`;
- `origen`;
- `documento_id`;
- `archivo_id`;
- `expediente_id`.

Pero los eventos existentes no corresponden a operaciones V2 2.0A–2.0C.

### 12.3 Conclusión de correlación

La correlación entre ambas fuentes no puede validarse para operaciones V2 2.0A–2.0C porque no existen registros de esas operaciones en ninguna de las dos fuentes.

## 13. Riesgos de exponer metadata cruda

No debe exponerse metadata cruda como contrato principal porque:

1. La estructura de `antes` y `despues` puede cambiar.
2. `metadata` puede contener campos técnicos o internos.
3. La UI podría empezar a depender de nombres físicos no estables.
4. Se mezclarían responsabilidades de auditoría, documento_eventos y Timeline Visual.
5. Se trasladaría lógica de interpretación al frontend.

La futura respuesta pública debe ser una proyección normalizada.

## 14. Revisión conceptual UX/Workspace

El Maestro Sucesor II realizó revisión conceptual UX/Workspace sobre la proyección vacía con advertencias.

Conclusiones UX:

- una respuesta `items=[]` es aceptable para diagnóstico, pero no como contrato definitivo;
- `items=[]` solo es seguro si viene acompañado de `cobertura` y `advertencias`;
- la UI futura debe distinguir entre "sin actividad registrada" y "trazabilidad no instrumentada";
- React debe mantenerse bloqueado hasta contar con contrato backend/Gateway aprobado;
- Timeline Visual sigue bloqueado;
- Auditoría Visual sigue bloqueada;
- no debe exponerse metadata cruda;
- la futura UI debe mostrar un estado informativo, no una Timeline Visual ni una Auditoría Visual;
- React no debe inferir eventos ni consumir metadata cruda;
- React debe esperar una proyección normalizada desde backend/Gateway.

Implicancia:

En el estado actual, una respuesta vacía no prueba que no hubo actividad documental. Solo prueba que no existe trazabilidad instrumentada en las fuentes revisadas para las operaciones V2 evaluadas.

## 15. Propuesta de proyección normalizada

La siguiente estructura es preliminar y no constituye contrato definitivo:

```json
{
  "items": [],
  "cobertura": {
    "auditoria": false,
    "documentoEventos": false,
    "parcial": true
  },
  "advertencias": [
    "core.auditoria_eventos no contiene registros físicos para las operaciones V2 evaluadas.",
    "documentos.documento_eventos existe, pero no registra las operaciones V2 2.0A–2.0C.",
    "items=[] no debe interpretarse como ausencia de actividad, sino como ausencia de trazabilidad instrumentada.",
    "No debe exponerse metadata cruda como contrato principal."
  ]
}
```

Si en una fase posterior existieran registros, cada item debería normalizar al menos:

```json
{
  "id": "auditoria:123",
  "fecha": "2026-07-14T10:30:00Z",
  "tipoOperacion": "GRUPO_FACTURA_CREADO",
  "descripcion": "Se creó un Grupo de Factura",
  "usuario": {
    "id": 1,
    "email": null
  },
  "entidad": {
    "tipo": "grupo_factura",
    "id": "2"
  },
  "workspaceId": 1,
  "empresaCodigo": "BBTI",
  "requestId": "...",
  "correlationId": null,
  "fuente": "auditoria"
}
```

Campos como `usuario.email` y `correlationId` deben admitir `null` cuando la fuente física no los provea.

## 16. Endpoint recomendado

No se recomienda implementar endpoint funcional todavía.

La razón es que ambas fuentes tienen cobertura nula para operaciones V2 2.0A–2.0C en runtime actual.

Endpoint tentativo, solo si el Maestro Intermedio autoriza una fase posterior:

```http
GET /api/v1/documental-v2/trazabilidad/contextos/:contenedorOperativoId
```

Sin embargo, el endpoint definitivo debe decidirse después de resolver si la trazabilidad se basará en:

- auditoría;
- documento_eventos;
- proyección combinada;
- corrección previa de emisión de eventos.

## 17. Decisiones pendientes

Quedan pendientes las siguientes decisiones:

1. Si se debe corregir primero la emisión de auditoría para operaciones V2.
2. Si las operaciones V2 deben registrar también en `documentos.documento_eventos`.
3. Si se debe construir una proyección combinada.
4. Si se acepta un endpoint inicial que devuelva cobertura vacía con advertencias.
5. Si `correlation_id` debe incorporarse a auditoría o resolverse por otra vía.
6. Si `usuarioEmail` debe enriquecerse desde auth/usuarios o mantenerse fuera del contrato.
7. Si el endpoint debe consultarse por `contenedorOperativoId`, `expedienteId`, `documentoOperativoPrincipalId` o `grupoFacturaId`.
8. Si 2.0D.1 debe continuar con endpoint o cerrarse como diagnóstico de vacío de cobertura.

## 18. Dictamen técnico

La infraestructura de trazabilidad existe parcialmente:

- `core.auditoria_eventos` existe para auditoría operativa general;
- `documentos.documento_eventos` existe para eventos documentales;
- el código contiene referencias a las operaciones V2 evaluadas.

Sin embargo, la cobertura runtime actual para operaciones V2 2.0A–2.0C es nula en ambas fuentes consultadas.

Por tanto:

- no debe implementarse todavía Timeline Visual;
- no debe implementarse Auditoría Visual;
- no debe implementarse endpoint consolidado sin decisión superior;
- no debe exponerse metadata cruda como contrato principal;
- debe elevarse este diagnóstico al Maestro Intermedio para decidir el siguiente camino.