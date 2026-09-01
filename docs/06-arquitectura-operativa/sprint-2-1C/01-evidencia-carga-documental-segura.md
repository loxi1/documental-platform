# Evidencia — Carga Documental Segura MVP

## Estado

```text
Evidencia nominal: RECIBIDA
Validación final: PENDIENTE
Cierre del Sprint: NO DECLARADO
```

## Flujo observado

```text
validación de archivo y contexto
→ cálculo SHA-256
→ consulta de duplicado
→ resolución del documento lógico
→ registro documental
→ almacenamiento en R2
→ inserción de documentos_archivos
→ evento archivo.subido
→ respuesta al cliente
```

## Capacidades observadas

- archivo PDF recibido mediante carga guiada;
- hash SHA-256 calculado por backend;
- persistencia en `documentos.documentos`;
- persistencia en `documentos.documentos_archivos`;
- almacenamiento con provider R2;
- emisión de eventos de carga;
- bloqueo de duplicado secuencial;
- disponibilidad posterior sin requerir confirmación OCR.

## Evidencia runtime consolidada

```text
cliente: BBTI
tipo esperado: OC
expediente de prueba: 17
hash SHA-256:
bcc17bbe1f7428c39a0b8c2b5a3408fbd27d3d39cb60179143dcb79def8cea2c
```

Esta referencia es técnica y no representa un documento comercial real.

## Matriz preliminar de permisos observada

```text
Estado: REFERENCIAL, NO RATIFICADO CONTRA AUTH Y WORKSPACES VIGENTES.
```

| Perfil | Observación preliminar | Ratificación |
|---|---:|---|
| Admin | Sí | Pendiente |
| Compras | Sí | Pendiente |
| Almacén | Sí | Pendiente |
| Finanzas | Sí | Pendiente |
| Contabilidad | No | Pendiente |

## Evidencia pendiente

- duplicado concurrente;
- alcance exacto del hash;
- consistencia PostgreSQL/R2 ante fallos parciales;
- compensación de objetos o documentos huérfanos;
- fallo del evento y reintentos;
- idempotencia;
- constraints e índices definitivos;
- contrato multipart y respuesta mínima;
- independencia visual del frontend respecto de OCR.

## Exclusión OCR

La evidencia sobre identidad del validador, `requestId`, `correlationId`, `ocr.confirmado` y `expediente.vinculado` pertenece exclusivamente a `CONF-OCR-AUD-01`.
