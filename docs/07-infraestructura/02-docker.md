# Docker

**Estado:** Base aprobada  
**Responsable:** Viejo Maestro  

---

## Objetivo

Ejecutar aplicaciones y servicios internos en contenedores.

---

## Servicios esperados

- web-admin
- api-gateway
- ms-auth
- ms-documentos
- NATS
- Traefik
- otros workers internos

---

## No contenerizar

PostgreSQL no vive en Docker en producción.

La base oficial vive en AWS RDS.

---

## Regla

Docker debe ser reproducible y no contener datos críticos persistentes fuera de volúmenes controlados.

---

## Ver también

- `01-despliegue.md`
- `03-traefik.md`
- `../21-standards/03-database.md`
