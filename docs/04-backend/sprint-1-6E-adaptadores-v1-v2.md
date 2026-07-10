# Sprint 1.6E — Adaptadores de compatibilidad V1 ↔ V2

## Objetivo

Construir una capa de compatibilidad de solo lectura entre el modelo documental V1 y una representación del Modelo Documental V2.

Este sprint no migra datos y no activa flujos operativos. Su responsabilidad es responder:

> ¿Cómo se ve un expediente V1 cuando se interpreta bajo el Modelo Documental V2?

## Alcance permitido

- Leer `documentos.expedientes`.
- Leer `documentos.expediente_documentos`.
- Leer `documentos.documentos`.
- Leer el archivo actual de `documentos.documentos_archivos` para enriquecer metadata de compatibilidad.
- Construir una vista V2 en memoria.
- Emitir advertencias cuando V1 no tenga suficiente información para asignar documentos con seguridad.

## Fuera de alcance

- No modifica datos V1.
- No escribe automáticamente en tablas V2.
- No expone endpoints nuevos.
- No integra con Web Admin.
- No usa Gateway.
- No usa OCR.
- No usa NATS.
- No publica eventos.
- No genera alertas.
- No usa R2.

## Componentes agregados

| Componente | Responsabilidad |
| --- | --- |
| `V1DocumentalReadOnlyRepository` | Lectura explícita y encapsulada del modelo V1. |
| `V1V2CompatibilityAdapter` | Traducción de datos V1 hacia una vista V2 en memoria. |
| `v1-v2-compatibility.types.ts` | Tipos de entrada V1 y proyección V2. |

## Reglas aplicadas

### Expediente V1 → Contenedor Operativo V2

`documentos.expedientes` se interpreta como `ContenedorOperativoCompatibilidadView`.

El campo `tipoContexto` se fija como:

```text
expediente_v1
```

para no confundirlo todavía con un contenedor V2 persistido.

### Documento principal V1 → Documento Operativo Principal V2

Solo se considera principal cuando:

```text
ed.es_principal = true
```

`tipo_relacion` puede ayudar a sugerir `tipoPrincipal`, pero no decide si el documento es principal.

### Factura V1 → Grupo de Factura V2

Cada documento V1 con:

```text
d.tipo_documental = 'FACTURA'
```

se interpreta como un `GrupoFacturaCompatibilidadView`.

La factura sigue siendo la fuente de verdad en V1. El grupo no duplica datos estructurales de factura.

### Adjuntos V1 → GrupoFacturaDocumento V2

Si existe una sola factura en el expediente, los adjuntos no principales se pueden asignar de forma segura al único grupo de factura.

Si existen múltiples facturas, los adjuntos quedan como `adjuntosNoClasificados` con motivo:

```text
MULTIPLES_FACTURAS
```

Eso evita inventar una jerarquía no confirmada por el modelo V1.

## Advertencias

El adaptador puede emitir advertencias como:

- `EXPEDIENTE_V1_SIN_DOCUMENTO_PRINCIPAL`
- `EXPEDIENTE_V1_CON_MULTIPLES_DOCUMENTOS_PRINCIPALES`
- `EXPEDIENTE_V1_SIN_FACTURA`
- `EXPEDIENTE_V1_CON_MULTIPLES_FACTURAS_REQUIERE_ASIGNACION_EXPLICITA`

## Dictamen técnico

Sprint 1.6E crea el puente conceptual V1 ↔ V2 sin mezclar persistencia, endpoints ni flujos operativos.
