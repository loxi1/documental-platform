# Despliegue

**Estado:** Base aprobada  
**Responsable:** Viejo Maestro  

---

## Arquitectura objetivo

```text
Cloudflare
  ↓
EC2 t3a.large
  ↓
Traefik
  ↓
Docker Compose
  ↓
Gateway / Auth / Documentos / Web
  ↓
AWS RDS PostgreSQL db.m6g.large
  ↓
Cloudflare R2
```

---

## Reglas

- PostgreSQL vive en RDS, no en Docker.
- Los documentos viven en R2.
- Traefik expone web y APIs.
- NATS y servicios internos no se exponen públicamente.
- OCR Worker puede depender de binarios instalados en el sistema operativo.

---

## Validaciones

- EC2 puede conectarse a RDS.
- RDS no debe estar expuesto públicamente salvo decisión controlada.
- R2 debe ser privado.
- Variables de entorno no deben versionarse.

---

## Ver también

- `Deployment-AWS.md`
- `../18-runbooks/deploy-produccion.md`
- `../29-operations-manual/04-configuracion-produccion.md`
