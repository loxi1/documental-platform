# Modelo Relacional Documental V2

## Propósito

Proponer un modelo relacional conceptual para el Modelo Documental V2, sin crear SQL, sin definir nombres finales de tablas y sin generar migraciones.

Este documento depende conceptualmente de:

```text
docs/17-domain/contenedor-operativo.md
```

## Principio

El modelo relacional debe adaptarse al dominio, no el dominio al modelo relacional.

## Jerarquía conceptual

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

## Entidades conceptuales

### Contenedor Operativo

Representa la operación documental superior.

Puede mapearse funcionalmente a:

- Expediente
- Centro de costo
- OP
- PR
- Proyecto
- otra entidad de negocio

No se define todavía tabla final.

### Documento Operativo Principal

Representa el documento principal formal dentro del contenedor.

Tipos:

- OC
- OS
- Requerimiento de Compra

### Grupo de Factura

Representa el grupo documental que nace alrededor de una Factura.

Debe contener referencia a la Factura y permitir asociación de adjuntos.

### Adjuntos de Factura

Representa documentos derivados del Grupo de Factura:

- Guía
- Nota de ingreso
- Transferencia
- Detracción
- Otros

## Tablas actuales que se conservan conceptualmente

El modelo actual no se descarta.

Se conserva como base conceptual:

- documentos.documentos
- documentos.documentos_archivos
- documentos.ocr_resultados
- documentos.expediente_documentos
- eventos documentales
- carga guiada
- prevalidación
- control de duplicados

## Relaciones nuevas sugeridas conceptualmente

Sin definir nombres finales, el modelo V2 podría requerir entidades relacionales para:

- vincular Contenedor Operativo con Documento Operativo Principal
- vincular Documento Operativo Principal con Grupo de Factura
- vincular Grupo de Factura con Factura
- vincular Grupo de Factura con Adjuntos
- registrar eventos y auditoría por nivel

## Modelo conceptual sugerido

```text
ContenedorOperativo
  id conceptual
  identificador funcional
  tipo funcional pendiente

DocumentoOperativoPrincipal
  id conceptual
  contenedor_operativo_id
  documento_id
  tipo: materialización del Documento Operativo Principal, por ejemplo OC / OS / RC
  estado

GrupoFactura
  id conceptual
  documento_operativo_principal_id
  factura_documento_id
  fecha_emision_factura
  proveedor
  estado

GrupoFacturaDocumento
  id conceptual
  grupo_factura_id
  documento_id
  tipo_relacion
```

Esto no es SQL definitivo.

## Compatibilidad con expediente_documentos

La tabla actual `expediente_documentos` puede seguir siendo útil como relación general de trazabilidad.

Sin embargo, no debe forzar la jerarquía V2.

La jerarquía V2 requiere expresar relaciones más específicas:

```text
Contenedor -> Principal -> Grupo Factura -> Adjuntos
```

## Reglas de duplicidad

Deben conservarse controles de:

- duplicado por hash de archivo
- duplicado por clave documental
- documento vinculado a otro contenedor
- principal duplicado si se mantiene regla de principal activo único

La regla exacta sobre uno o varios documentos principales por contenedor sigue pendiente.

## Pendientes antes de migraciones

No crear migraciones hasta resolver:

- nombre funcional visible del Contenedor Operativo
- si un contenedor admite uno o varios principales
- tratamiento de documentos sin Documento Operativo Principal formal
- relación con distribución de Almacén
- estrategia de convivencia con datos actuales
- estrategia de consulta Legacy

## Qué no define este documento

No define:

- SQL
- migraciones
- índices finales
- endpoints
- contratos API
- eventos NATS
- repositorios
- DTOs
- implementación frontend

## Dictamen

El modelo relacional V2 debe diseñarse después de validar el dominio y UX.

Este documento sirve como puente conceptual entre dominio y futura implementación.
