# Evidencia Técnica - Sprint 1.3D

## Tabla de eventos
Consulta de validación:

```sql
SELECT
  tipo_evento,
  COUNT(*) AS total
FROM documentos.documento_eventos
GROUP BY tipo_evento
ORDER BY tipo_evento;
```

Resultado validado:

```text
archivo.subido     | 2+
documento.creado   | 2+
ocr.confirmado     | 1+
ocr.procesado      | 1+
ocr.rechazado      | 1+
```

## Evidencia de eventos por documento
Caso validado para `archivo_id = 5` / `documento_id = 7`:

```text
documento.creado
archivo.subido
ocr.procesado
```

Posteriormente se validaron confirmaciones de:

```text
ocr.confirmado
ocr.rechazado
```

## OCR Worker
Servicio levantado manualmente en host:

```bash
cd ~/projects/apps/documental-platform/workers/ocr-worker
source .venv/bin/activate
export NATS_URL=nats://localhost:4222
python -m app.main
```

Salida esperada y validada:

```text
ocr-worker conectado a NATS
Escuchando subject: ocr.procesar-archivo
```

## Subscriber técnico opcional
Para observar publicación secundaria:

```bash
python -m app.test_subscribe_clasificado
```

Evento observado:

```text
EVENTO documento.clasificado
```

Este subscriber es opcional. El worker obligatorio para el flujo es `python -m app.main`.

## R2 / Preview seguro
Se validaron endpoints de preview:

```text
GET /api/v1/documentos/archivos/:archivoId/preview-url
```

Comportamiento validado:

- `success = true`
- `storageProvider = r2`
- `storageBucket = data-prod`
- URL firmada con expiración de 300 segundos

## Casos de documentos validados

| Documento | Archivo | Resultado |
|---|---:|---|
| OC 007950 | 5 | OCR completo y confirmado |
| Factura F011-00001135 | 7 | OCR completo y confirmado |
| Nota ingreso 0000000031 | 9 | Confirmada con metadata parcial |
| Guía EG07-00000165 | 10 | OCR completo y confirmado |
| Pago transferencia 6981-0 | 11 | OCR completo y confirmado |
| Detracción 296801526 | 12 | Confirmada con metadata parcial |

## Timeout OCR escaneado
Caso observado:

```text
PDF escaneado demoró aproximadamente 53 segundos en backend.
Frontend tenía timeout de 30000 ms.
```

Conclusión:

```text
Backend OK. Timeout originado en frontend.
```

Recomendación mínima para demo:

```ts
timeout: 120000,
```

Archivo sugerido:

```text
apps/web-admin/src/services/api.ts
```
