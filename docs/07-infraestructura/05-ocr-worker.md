# OCR Worker

**Estado:** Base aprobada  
**Responsable:** Maestro Sucesor I / Viejo Maestro  

---

## Objetivo

Procesar archivos para clasificación y extracción de metadata documental.

---

## Características

- No es API pública.
- Consume mensajes internos.
- Procesa archivos registrados.
- Publica resultados.
- Responde request/reply cuando aplica.

---

## Topología de ejecución

### Producción

El OCR Worker productivo corre nativamente en Ubuntu mediante:

- Python venv;
- systemd.

No forma parte del stack Docker/GHCR productivo.

La autoridad operativa es:

`../18-runbooks/ocr-worker-host.md`

NATS corre en Docker y el OCR Worker host consume la conectividad local autorizada.

### LAB

El entorno LAB puede ejecutar un OCR Worker contenerizado para pruebas y validación.

La topología LAB no redefine la arquitectura productiva.

## Dependencias del sistema operativo

El OCR productivo puede requerir binarios instalados en EC2:

- Tesseract
- Poppler
- Ghostscript
- qpdf
- OCRmyPDF
- LibreOffice
- ImageMagick

---

## Regla

El OCR Worker no sube archivos ni confirma negocio.

Solo procesa archivos ya registrados.

---

## Ver también

- `../motor-documental/flujo-ocr.md`
- `../04-backend/05-ocr.md`
- `../18-runbooks/actualizar-ocr.md`
