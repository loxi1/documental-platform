# Prompt para Maestro Intermedio - Continuidad después del Sprint 1.3D

## Contexto
Maestro Intermedio,

Se culminó funcionalmente el Sprint 1.3D de Documental Platform. El foco del sprint fue consolidar la integración de eventos documentales básicos y validar un flujo real de expediente con OCR, R2, NATS y confirmación documental.

## Sprint culminado

```text
Sprint 1.3D - Integración de eventos documentales básicos
Estado: CERRADO FUNCIONALMENTE EN DEMO/LOCAL
```

## Lo culminado

Se validó el registro de eventos:

```text
documento.creado
archivo.subido
ocr.procesado
ocr.confirmado
ocr.rechazado
```

Se confirmó el funcionamiento de:

```text
OCR Worker Python
NATS request/reply
R2 storage
Preview URL seguro
Confirmar OCR con expediente
Bandeja contable por periodo de factura
Vista expediente con todos los documentos vinculados
```

## Expediente demo validado

```text
expedienteId = 41
empresa = BBTI
codigoExpediente = 050201
descripcion = PRODUCCION C X DISTRIBUIR
```

Documentos vinculados:

| Documento | Relación | Estado |
|---|---|---|
| OC 007950 | principal_oc | confirmado |
| Factura F011-00001135 | adjunto_factura | confirmado |
| Nota ingreso 0000000031 | adjunto_nota_ingreso | confirmado |
| Guía EG07-00000165 | adjunto_guia | confirmado |
| Transferencia 6981-0 | adjunto_transferencia | confirmado |
| Detracción 296801526 | adjunto_detraccion | confirmado |

## Revisión contable validada

La bandeja contable se filtra por fecha de emisión de la factura:

```text
GET /api/v1/expedientes/bandeja-contable?empresa=BBTI&anio=2026&mes=5
```

La factura `F011-00001135` tiene fecha de emisión `2026-05-04`, por eso aparece en mayo 2026. Al abrir el expediente, la vista carga todos los documentos relacionados, aunque tengan fechas de emisión de abril, enero o febrero.

## Hallazgos relevantes

### OCR escaneado
Un PDF escaneado fue procesado correctamente por backend, pero demoró más de 30 segundos. El frontend tenía timeout de 30000 ms.

Conclusión:

```text
Backend OK.
Timeout originado en frontend.
```

Recomendación mínima:

```text
Subir timeout OCR frontend a 120000 ms.
```

### Metadata parcial
Documentos como Nota de Ingreso y Detracción pueden quedar confirmados, pero con metadata parcial o `confidence` bajo. Esto debe reflejarse visualmente como documento confirmado pero con advertencia de revisión/manual.

## Sprint recomendado siguiente

```text
Sprint 1.4 - Vista documental contable y UX por tipo de documento
```

## Objetivo Sprint 1.4
Mejorar la vista de revisión contable y vista del expediente para que el contador pueda comprender el expediente sin leer JSON.

## Alcance funcional propuesto

1. Mostrar resumen del expediente:
   - empresa
   - código expediente
   - descripción
   - estado
   - periodo contable de la factura

2. Mostrar documento principal destacado:
   - OC/OS
   - proveedor
   - fecha
   - monto
   - estado
   - preview

3. Mostrar documentos adjuntos agrupados por tipo:
   - factura
   - guía
   - nota ingreso
   - transferencia
   - detracción

4. Mostrar indicadores por documento:
   - tipo documental
   - tipo relación
   - estado confirmado / pendiente / revisión manual
   - confidence OCR si aplica
   - campos incompletos si aplica

5. Mostrar acciones:
   - ver PDF
   - validar / observar
   - generar alerta manual, si corresponde

## Criterio de aceptación

```text
Desde Revisión Contable, el usuario debe poder abrir el expediente 41 y entender inmediatamente qué documentos tiene, cuáles están confirmados, cuáles tienen metadata incompleta y abrir el PDF de cada uno.
```

## No tocar en Sprint 1.4, salvo necesidad explícita

```text
Login
JWT
Workspace
Migraciones baseline
Event sourcing
Embeddings
IA avanzada
Alertas automáticas
Cierre contable automático
```

## Mensaje final
Sprint 1.3D queda cerrado. El siguiente valor ya no está en crear más eventos, sino en presentar correctamente la trazabilidad documental al usuario contable y financiero.
