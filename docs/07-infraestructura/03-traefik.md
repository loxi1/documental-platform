# Traefik

**Estado:** Base aprobada  
**Responsable:** Viejo Maestro  

---

## Objetivo

Actuar como reverse proxy de entrada para la plataforma.

---

## Responsabilidades

- routing HTTP/HTTPS
- certificados TLS
- headers de seguridad
- compresión
- health checks
- separación de rutas frontend/backend

---

## Reglas

- No exponer servicios internos innecesarios.
- No exponer NATS.
- No exponer OCR Worker directamente.
- Proteger APIs con Gateway.

---

## Ver también

- `01-despliegue.md`
- `04-cloudflare.md`
- `../18-runbooks/renovar-certificados.md`
