# Informe técnico — Sprint 2.1C abierto

## Dictamen actual

```text
Sprint: ABIERTO
Carga nominal: OBSERVADA
Carga segura integral: NO DEMOSTRADA
Contrato técnico: PENDIENTE
Implementación: NO AUTORIZADA
Integración: BLOQUEADA
Push: BLOQUEADO
```

## Base aprovechable

La infraestructura existente contiene carga guiada, prevalidación, SHA-256, consulta de duplicados, persistencia documental, almacenamiento R2, registro de archivo y eventos documentales.

No se recomienda reconstruir el upload desde cero antes de cerrar la revisión contractual.

## Brechas prioritarias

### Duplicado e idempotencia

Definir alcance del hash, respuesta ante repetición, concurrencia, constraint de respaldo y semántica de reintento.

### Consistencia PostgreSQL/R2

Definir el comportamiento ante documento creado y fallo R2; objeto R2 creado y fallo PostgreSQL; fallo de registro de archivo; fallo de evento; reconciliación y limpieza.

### Contrato público

Acordar campos multipart, límites, MIME, respuesta mínima, errores estables, trazabilidad y semántica de duplicado.

### Seguridad y permisos

Ratificar permisos, contexto autenticado, URL temporal de preview y aislamiento por empresa/workspace.

### Independencia de OCR

El éxito debe quedar definido como:

```text
documentoId
+ archivoId
+ objeto almacenado
+ evento de carga
+ documento disponible
```

sin requerir ejecución o confirmación OCR.

## Decisión

No existe autorización para implementar brechas. Corresponde validar la propuesta de contrato y completar evidencia.
