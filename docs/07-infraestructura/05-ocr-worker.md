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

## Continuidad R2 — 23/10/2026

Fuente: paquete MSII `PAQUETE_CODEX_R2_DOCUMENTACION_INVENTARIO_2026-10-23.md` y actualización ME `ACTUALIZACION_BIBLIOTECARIO_TECNICO_R2_2026-10-23.md`, ambos en `/home/loxi1/Descargas/`. Producción R2 = **DEPLOY_TECHNICAL_PASS reportado por PO/MSII**; aceptación funcional integral = **PENDING**, E2E = **NOT_VERIFIED**. Esta actualización documental no accedió a EC2/GHCR/RDS ni autoriza operaciones.

Commit Enterprise R2: `e1f099faeb4dfdc9f2b49b9984fe211935875ff3`. Ver [manifest vigente](../31-governance/RELEASE_MANIFEST.md), [deploy](../18-runbooks/DEPLOYMENT_RUNBOOK.md) y [rollback](../18-runbooks/ROLLBACK_RUNBOOK.md).

Los únicos servicios de aplicación recreados en R2 fueron api-gateway, ms-auth, ms-documentos y web-admin. NATS/Traefik permanecen en Docker; OCR en documental-ocr-worker.service, fuera de la recreación de aplicaciones.
