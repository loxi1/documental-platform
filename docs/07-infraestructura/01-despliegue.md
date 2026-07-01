# Despliegue

Cloudflare → EC2 t3a.large → Traefik → Docker Compose → Gateway/Auth/Documentos/Web → AWS RDS db.m6g.large → Cloudflare R2.

Reglas:
- PostgreSQL solo en RDS.
- RDS privado.
- R2 privado.
- HTTPS obligatorio.
