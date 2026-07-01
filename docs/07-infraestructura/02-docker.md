# Docker

Contenedores:
- web-admin
- api-gateway
- ms-auth
- ms-documentos
- OCR Worker
- NATS
- Traefik

Las dependencias OCR (Tesseract, Poppler, Ghostscript, LibreOffice, ImageMagick, etc.) deben ir preferentemente dentro de la imagen del OCR Worker; si la estrategia cambia, deberá documentarse.
