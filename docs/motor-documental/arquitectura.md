# Arquitectura lógica del Motor Documental

## Componentes

- `api-gateway`: entrada HTTP pública de la plataforma.
- `ms-documentos`: backend documental y reglas de negocio.
- `ocr-worker`: procesamiento OCR/documental mediante NATS.
- PostgreSQL: persistencia de documentos, expedientes, OCR y catálogos.
- Cloudflare R2: almacenamiento privado de archivos.

## Flujo técnico aprobado

```text
Upload
↓
Cloudflare R2
↓
documentos.documentos_archivos
↓
OCR Worker
↓
ocr_resultados
↓
OcrValidationModal
↓
confirmar-con-expediente
↓
documentos.documentos
↓
expediente_documentos
```

## Reglas

- El upload crea archivo físico y documento temporal si aplica.
- El OCR produce una propuesta, no un documento final.
- La confirmación convierte la propuesta en documento oficial.
- El documento oficial queda vinculado a un expediente mediante `expediente_documentos`.

## APIs relacionadas

- `POST /api/v1/documentos/carga-guiada`
- `POST /api/v1/documentos/archivos/:archivoId/procesar-ocr`
- `POST /api/v1/documentos/ocr-resultados/:id/confirmar-con-expediente`
- `GET /api/v1/documentos/archivos/:archivoId/preview-url`
- `GET /api/v1/expedientes/:id/documentos`
