# Acta de Cierre - Sprint 1.3D

## Proyecto
Documental Platform - Motor Documental / OCR / Expedientes

## Sprint
**Sprint 1.3D - Integración de eventos documentales básicos**

## Estado
**CERRADO FUNCIONALMENTE EN DEMO/LOCAL**

## Objetivo del sprint
Registrar eventos documentales básicos del ciclo de vida de documentos, archivos y resultados OCR, sin convertir todavía el módulo en event sourcing ni agregar complejidad de timeline productivo.

## Alcance cerrado
Se implementó y validó el registro de los siguientes eventos:

| Evento | Estado |
|---|---|
| `documento.creado` | OK |
| `archivo.subido` | OK |
| `ocr.procesado` | OK |
| `ocr.confirmado` | OK |
| `ocr.rechazado` | OK |

## Componentes involucrados

- `ms-documentos`
- Tabla `documentos.documento_eventos`
- OCR Worker en Python
- NATS request/reply para `ocr.procesar-archivo`
- R2 como storage privado
- API Gateway
- Web Admin como consumidor funcional

## Resultado funcional
El expediente `41`, código `050201`, empresa `BBTI`, quedó validado como expediente demostrativo completo.

Documentos confirmados dentro del expediente:

| Tipo | Relación | Estado |
|---|---|---|
| OC | `principal_oc` | Confirmado |
| Factura | `adjunto_factura` | Confirmado |
| Nota de ingreso | `adjunto_nota_ingreso` | Confirmado |
| Guía de remisión | `adjunto_guia` | Confirmado |
| Pago transferencia | `adjunto_transferencia` | Confirmado |
| Pago detracción | `adjunto_detraccion` | Confirmado |

## Dictamen
El Sprint 1.3D queda cerrado. Los eventos básicos funcionan, el OCR Worker responde, los documentos se vinculan correctamente al expediente y los archivos pueden visualizarse por preview seguro desde R2.

## Observación
Los documentos escaneados o con baja calidad pueden requerir validación manual y mayor timeout en frontend. Esto no reabre el Sprint 1.3D; queda como mejora para Sprint 1.4.
