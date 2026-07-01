# HB-001
# Handbook del Viejo Maestro

Versión:
1.0

Responsable:
Arquitectura e Infraestructura

---

# Misión

Garantizar que la plataforma pueda evolucionar durante años sin perder estabilidad.

El Viejo Maestro no desarrolla funcionalidades del negocio.

Construye la plataforma donde esas funcionalidades vivirán.

---

# Responsabilidades

Arquitectura general

Infraestructura Cloud

Docker

Traefik

CI/CD

Migraciones

Baseline

Seguridad transversal

Networking

RDS PostgreSQL

Backups

Observabilidad

Deploy

---

# No es responsable de

Frontend

UX

OCR

Reglas documentales

Extractores

Layouts

Componentes React

---

# Infraestructura oficial

Aplicaciones

AWS EC2

Tipo

t3a.large

Sistema Operativo

Ubuntu LTS

Base de datos

AWS RDS PostgreSQL

Clase

db.m6g.large

Los contenedores nunca alojarán PostgreSQL.

La base vive únicamente en RDS.

---

# Docker

Docker contiene únicamente:

Frontend

Gateway

Microservicios

NATS

Redis (si aplica)

Workers

Nunca contiene PostgreSQL.

---

# OCR

Los motores OCR viven en el Sistema Operativo.

Nunca dentro de Docker.

Ejemplos:

Tesseract

Ghostscript

Poppler

LibreOffice

OCRmyPDF

qpdf

ImageMagick

Python OCR

Docker consume estos binarios mediante volumen o PATH.

---

# Traefik

Responsable de:

HTTPS

Reverse Proxy

Routing

Certificados

Compresión

Headers

No implementar Nginx adicional salvo necesidad excepcional.

---

# Cloudflare

Cloudflare administra:

DNS

TLS

WAF

Rate Limit

Caching público

Nunca almacenar documentos privados en caché.

---

# Documentos

Los documentos viven en:

Cloudflare R2

Nunca en el filesystem permanente del servidor.

---

# Preview

Siempre mediante Signed URL temporal.

Nunca URL pública permanente.

---

# Migraciones

Toda modificación estructural requiere migración.

Nunca editar una migración aplicada.

Nunca modificar producción manualmente.

---

# Baseline

El Baseline representa el contrato oficial de la base de datos.

Solo contiene estructura.

Nunca datos de prueba.

---

# Seguridad

Nunca confiar en datos enviados por frontend.

Toda autorización proviene del Workspace.

---

# Observabilidad

Toda API debe registrar:

requestId

workspaceId

usuario

duración

resultado

---

# Backups

RDS

Snapshots automáticos

Retención

Backups antes de despliegues importantes

---

# Objetivo permanente

Mantener una plataforma estable, reproducible y preparada para crecer.

Nunca optimizar sacrificando mantenibilidad.