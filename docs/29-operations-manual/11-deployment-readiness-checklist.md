# Deployment Readiness Checklist

## Objetivo

Validar que Documental Platform está lista para primer despliegue en AWS.

## Infraestructura objetivo

| Componente | Decisión |
|---|---|
| Aplicación | EC2 t3a.large |
| Base de datos | AWS RDS PostgreSQL db.m6g.large |
| Archivos | Cloudflare R2 privado |
| Reverse proxy | Traefik |
| Contenedores | Docker Compose |
| Entrada pública | HTTPS vía Traefik/Cloudflare |

## Checklist EC2

- [ ] EC2 comprada.
- [ ] Ubuntu 24.04 instalado.
- [ ] Acceso SSH validado.
- [ ] Docker instalado.
- [ ] Docker Compose instalado.
- [ ] Usuario deploy configurado.
- [ ] Firewall revisado.
- [ ] Disco monitoreado.

## Checklist RDS

- [ ] RDS creado.
- [ ] PostgreSQL accesible desde EC2.
- [ ] RDS privado.
- [ ] Security Group permite solo EC2 → RDS:5432.
- [ ] Usuario app creado.
- [ ] Base creada.
- [ ] SSL definido.
- [ ] Backup automático activo.
- [ ] Snapshot manual antes de migraciones.

## Checklist R2

- [ ] Bucket privado creado.
- [ ] Access Key creada.
- [ ] Secret Key guardada.
- [ ] Variables configuradas.
- [ ] Prueba de subida realizada.
- [ ] Prueba de signed URL realizada.

## Checklist Docker

- [ ] web-admin.
- [ ] api-gateway.
- [ ] ms-auth.
- [ ] ms-documentos.
- [ ] OCR Worker.
- [ ] NATS.
- [ ] Traefik.

## Checklist aplicación

- [ ] Variables `.env.production` completas.
- [ ] Migraciones aplicadas.
- [ ] Login funciona.
- [ ] Workspace funciona.
- [ ] Preview seguro funciona.
- [ ] OCR procesa archivo de prueba.
- [ ] Bandeja contable responde.
- [ ] Logs visibles.

## Checklist seguridad

- [ ] No exponer RDS públicamente.
- [ ] No exponer NATS públicamente.
- [ ] No exponer OCR Worker públicamente.
- [ ] No subir `.env`.
- [ ] HTTPS activo.
- [ ] R2 privado.
- [ ] JWT secret fuerte.
- [ ] Rotación de secretos documentada.

## Criterio Go / No-Go

### Go

- Login, Workspace, RDS, R2 y Gateway funcionan.
- Servicios levantan con healthcheck.
- No hay secretos en repositorio.
- Backup RDS activo.
- Restore plan documentado.

### No-Go

- RDS público sin justificación.
- R2 público.
- OCR Worker expuesto.
- Migraciones no validadas.
- Sin snapshot previo.
