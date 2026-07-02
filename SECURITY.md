# Security Policy

## Secretos

Nunca subir al repositorio:

- contraseñas
- tokens JWT
- claves R2
- credenciales RDS
- archivos `.env`
- certificados privados

## Producción

- RDS privado.
- R2 privado.
- Preview mediante Signed URL temporal.
- NATS no público.
- OCR Worker no público.
- Traefik como punto de entrada HTTP/HTTPS.
