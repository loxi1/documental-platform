# Deployment Readiness Checklist

## Objetivo

Validar que Documental Platform está lista para su primer despliegue en AWS.

Este checklist valida readiness de infraestructura y plataforma. El procedimiento de release se gobierna por `docs/31-governance/07-release-process.md`.

## Infraestructura objetivo

| Componente | Decisión |
|---|---|
| Aplicación | EC2 t3a.large |
| Base de datos | AWS RDS PostgreSQL db.m6g.large |
| Archivos | Cloudflare R2 privado |
| Reverse proxy | Traefik |
| Servicios de aplicación | Docker Compose |
| OCR productivo | Ubuntu host + Python venv + systemd |
| Entrada pública | HTTPS vía Traefik/Cloudflare |

## Checklist EC2

- [ ] EC2 creada y accesible.
- [ ] Ubuntu 24.04 instalado.
- [ ] Acceso SSH validado.
- [ ] Docker instalado.
- [ ] Docker Compose instalado.
- [ ] Usuario operativo configurado.
- [ ] Firewall revisado.
- [ ] Disco monitoreado.
- [ ] PostgreSQL productivo no instalado localmente en EC2.

## Checklist RDS

- [ ] RDS creado.
- [ ] PostgreSQL accesible desde EC2.
- [ ] RDS privado.
- [ ] Security Group permite únicamente el acceso autorizado a PostgreSQL.
- [ ] Usuario de aplicación creado.
- [ ] Base productiva creada.
- [ ] SSL definido.
- [ ] Backup automático activo.
- [ ] Snapshot manual realizado cuando el control de migración lo requiera.
- [ ] Restore plan documentado.

## Checklist R2

- [ ] Bucket privado creado.
- [ ] Access Key creada.
- [ ] Secret Key almacenada de forma segura.
- [ ] Variables configuradas.
- [ ] Prueba de subida realizada.
- [ ] Prueba de signed URL realizada.
- [ ] Credenciales no almacenadas en el repositorio.

## Checklist Docker de aplicación

- [ ] web-admin.
- [ ] api-gateway.
- [ ] ms-auth.
- [ ] ms-documentos.
- [ ] NATS.
- [ ] Traefik.
- [ ] OCR Worker no incorporado al stack Docker productivo.
- [ ] MinIO no incorporado al entorno productivo.

## Checklist OCR productivo

La autoridad operativa es `docs/18-runbooks/ocr-worker-host.md`.

- [ ] OCR Worker instalado nativamente en Ubuntu.
- [ ] Python venv operativo.
- [ ] `documental-ocr-worker.service` instalado.
- [ ] servicio systemd activo.
- [ ] logs accesibles mediante journalctl.
- [ ] dependencias OCR del host validadas.
- [ ] conectividad con NATS validada.
- [ ] OCR procesa un archivo witness.

## Checklist release inicial

- [ ] entregable integrado y validado en SOURCE main.
- [ ] commit SOURCE main identificado.
- [ ] composición materializada y validada en Enterprise main.
- [ ] commit Enterprise identificado.
- [ ] Enterprise main publicado.
- [ ] CI asociado al commit Enterprise = PASS.
- [ ] imágenes GHCR correspondientes identificadas.
- [ ] tags registrados.
- [ ] digest registrado cuando esté disponible.
- [ ] checkout EC2 configurado para consumir Enterprise main.

## Checklist aplicación

- [ ] Variables `.env.production` completas.
- [ ] `.env.production` no almacenado en Git.
- [ ] Migraciones autorizadas aplicadas y verificadas.
- [ ] Login funciona.
- [ ] Workspace funciona.
- [ ] Preview seguro funciona.
- [ ] OCR procesa archivo de prueba.
- [ ] Bandeja contable responde.
- [ ] Logs visibles.

## Checklist seguridad

- [ ] RDS no expuesto públicamente.
- [ ] NATS no expuesto públicamente.
- [ ] OCR Worker no expuesto públicamente.
- [ ] `.env` y secretos fuera del repositorio.
- [ ] HTTPS activo.
- [ ] R2 privado.
- [ ] JWT secret fuerte.
- [ ] Rotación de secretos documentada.

## Criterio Go / No-Go

### Go

- infraestructura requerida validada;
- RDS y R2 operativos y privados;
- servicios Docker de aplicación preparados;
- OCR host/systemd operativo;
- release Enterprise/GHCR trazable;
- backups y restore plan acreditados;
- secretos fuera del repositorio.

### No-Go

- release sin provenance Enterprise → CI/GHCR;
- RDS público sin justificación autorizada;
- R2 público;
- OCR Worker expuesto o tratado como contenedor productivo;
- MinIO introducido en producción;
- migraciones requeridas no validadas;
- backup/snapshot requerido ausente;
- secretos almacenados en el repositorio.

Superar este checklist habilita el primer deploy; no sustituye el runtime witness ni el checklist de go-live posterior.
