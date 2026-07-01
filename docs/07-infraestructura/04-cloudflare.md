# Cloudflare

**Estado:** Base aprobada  
**Responsable:** Viejo Maestro  

---

## Objetivo

Gestionar DNS, TLS, protección de borde y almacenamiento privado mediante R2.

---

## Componentes

- DNS
- TLS
- WAF futuro
- rate limit futuro
- Cloudflare R2 para documentos privados

---

## Reglas

- No cachear documentos privados.
- R2 debe permanecer privado.
- Preview se entrega mediante Signed URL temporal.
- El dominio público apunta a EC2/Traefik.

---

## Ver también

- `../08-seguridad/06-r2.md`
- `../08-seguridad/05-preview-seguro.md`
- `../18-runbooks/rotacion-secretos.md`
