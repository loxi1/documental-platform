# Security Policy

## Secretos

Nunca subir al repositorio:

- archivos `.env`;
- contraseñas;
- tokens JWT;
- credenciales RDS;
- credenciales R2;
- certificados privados;
- claves API.

## Producción

- RDS debe ser privado.
- R2 debe ser privado.
- NATS no debe exponerse públicamente.
- OCR Worker no debe exponerse públicamente.
- Traefik es el único punto de entrada HTTP/HTTPS.
- Preview documental debe usar Signed URL temporal.

## Incidentes

Ante filtración:

1. revocar secreto;
2. rotar credenciales;
3. revisar logs;
4. documentar incidente;
5. actualizar Runbook.
