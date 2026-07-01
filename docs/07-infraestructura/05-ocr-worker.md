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

## Dependencias del sistema operativo

El OCR puede requerir binarios instalados en EC2:

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
