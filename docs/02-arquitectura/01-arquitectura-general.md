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


---

## 2026-11-25 — Cierre institucional documental NAS R1

Repository=SOURCE. Esta adenda prevalece únicamente sobre estados históricos incompatibles de NAS; no reescribe antecedentes ni autoriza acciones por su lectura.

SOURCE conserva excluidos los scripts locales de recuperación no rastreados.

### SOURCE nativo y dependencias existentes

Gateway3000, Auth3001, Documentos3002, Web3005; pnpm/monorepositorio vigente y paquetes compartidos; OCR Python systemd existente, NATS existente y R2 DEV directo. MinIO y contenedores LAB ancestrales son historia preservada, no requisitos del circuito NAS vigente. No crear LAB, PID, temporizadores administrativos, supervisores ni consumidores OCR paralelos. No ejecutar recetas de arranque/build por leer el cierre. Cambios docs-only no requieren builds ni reinicios. Mantener lockfile y contratos DEV/PROD; NAS DEV distinto de raíz PROD.
### Persistencia vigente

PostgreSQL/RDS mantiene identidad, autorización, asociaciones y auditoría. R2 conserva TEMP y documentos definitivos materializados; NAS verificado es proveedor de visualización para archivados. Producción retiene R2 por bloqueoDEV-onlyDELETE. Conexión NAS mediante OpenVPN/SMB existente, sin nuevos microservicios. OCR host systemd separado de las cuatro imágenes aplicativas; NATS/Traefik/APISPERU preservados.
### Seguridad, retención y recuperación

`PRODUCTION_R2_DELETE=DISABLED_BY_DESIGN`; `DEV_ONLY_DELETE_RESTRICTION=PRESERVED`; `PRODUCTION_R2_RETENTION=ACTIVE`. El código exige NODE_ENV=development, destino SYNOLOGY_DEV, autorización exacta y demás controles; cambiar solo una variable no habilita DELETE productivo. La permanencia en R2 de Factura/Guía/NI OC003214 y facturaOS000262 citadas arriba es esperada y no invalida NAS ni visor.

`NAS_BACKUP_RESTORE=NOT_ACCREDITED`. Hyper Backup y Snapshot Replication diferidos a consulta PO. Synology BASIC/BTRFS sin redundancia acreditada; BTRFS no es backup. Cuota técnica compartida de 500 GiB. Usuario SMB `documental_platform_dev` compartido entre DEV/PROD: separación por raíces/destino/configuración, no credenciales independientes.
DEV: `GESTION-DOCUMENTARIA/_DEV_DOCUMENTAL_PLATFORM`; PROD: `GESTION-DOCUMENTARIA/PLATAFORMA_DOCUMENTAL`. VPN/OpenVPN y SMB existentes preservados.

RDS snapshot automático aceptado: `rds:database-1-2026-11-24-08-42`; sin snapshot manual adicional; restore no probado. Respaldo RDS no protege archivos NAS. Cualquier futura eliminación productiva exige autorización independiente, protección NAS, revisión del bloqueo de código, integridad y auditoría; no está autorizada por este cierre.

Rollback de aplicación condicionado a compatibilidad de 0025/0026, authVersion global, JWT contextual, contraseñas actuales y auditoría; no reducir auth_version, no revivir JWT ni restaurar Auth legacy incompatible. No restaurar RDS ni borrar reservas/archivos como rollback automático. Preservar evidencia e imágenes anteriores; si no existe destino acreditado compatible, STOP y decisión PO/roll-forward.
