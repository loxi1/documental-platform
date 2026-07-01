# Arquitectura General

**Estado:** Aprobado  
**Responsable:** Arquitectura de Plataforma  

---

## Objetivo

Describir la organización general de Documental Platform y sus capas principales.

---

## Visión conceptual

```text
Usuarios
  ↓
Frontend Web
  ↓
API Gateway
  ↓
Microservicios
  ↓
Capacidades Compartidas
  ↓
RDS PostgreSQL / R2 / OCR Worker
```

---

## Capas

### Frontend

Interfaz web basada en una UI Foundation común.

No implementa reglas de negocio documental.

---

### API Gateway

Punto de entrada para el frontend.

Responsable de:

- enrutar solicitudes
- validar autenticación
- propagar requestId
- centralizar acceso externo

No debe contener reglas documentales.

---

### Microservicios

Servicios especializados:

- Auth
- Documentos
- OCR Worker
- futuros servicios administrativos

---

### Capacidades compartidas

- Workspace
- Motor Documental
- OCR
- Versionado
- Auditoría
- UI Foundation

---

### Persistencia

La información vive en PostgreSQL administrado por AWS RDS.

Los archivos viven en Cloudflare R2.

---

## Principio

La plataforma se diseña por capacidades compartidas, no por pantallas aisladas.

---

## Ver también

- `02-capacidades-compartidas.md`
- `../11-adr/ADR-009-arquitectura-por-capacidades-compartidas.md`
- `../architecture/C2-Containers.md`
