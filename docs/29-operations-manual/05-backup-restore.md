# Backup y Restore

Respaldos automáticos de RDS, restauración y validaciones posteriores.


---

## 2026-11-25 — Cierre institucional documental NAS R1

Repository=SOURCE. Esta adenda prevalece únicamente sobre estados históricos incompatibles de NAS; no reescribe antecedentes ni autoriza acciones por su lectura.

SOURCE conserva excluidos los scripts locales de recuperación no rastreados.

### Seguridad, retención y recuperación

`PRODUCTION_R2_DELETE=DISABLED_BY_DESIGN`; `DEV_ONLY_DELETE_RESTRICTION=PRESERVED`; `PRODUCTION_R2_RETENTION=ACTIVE`. El código exige NODE_ENV=development, destino SYNOLOGY_DEV, autorización exacta y demás controles; cambiar solo una variable no habilita DELETE productivo. La permanencia en R2 de Factura/Guía/NI OC003214 y facturaOS000262 citadas arriba es esperada y no invalida NAS ni visor.

`NAS_BACKUP_RESTORE=NOT_ACCREDITED`. Hyper Backup y Snapshot Replication diferidos a consulta PO. Synology BASIC/BTRFS sin redundancia acreditada; BTRFS no es backup. Cuota técnica compartida de 500 GiB. Usuario SMB `documental_platform_dev` compartido entre DEV/PROD: separación por raíces/destino/configuración, no credenciales independientes.
DEV: `GESTION-DOCUMENTARIA/_DEV_DOCUMENTAL_PLATFORM`; PROD: `GESTION-DOCUMENTARIA/PLATAFORMA_DOCUMENTAL`. VPN/OpenVPN y SMB existentes preservados.

RDS snapshot automático aceptado: `rds:database-1-2026-11-24-08-42`; sin snapshot manual adicional; restore no probado. Respaldo RDS no protege archivos NAS. Cualquier futura eliminación productiva exige autorización independiente, protección NAS, revisión del bloqueo de código, integridad y auditoría; no está autorizada por este cierre.

Rollback de aplicación condicionado a compatibilidad de 0025/0026, authVersion global, JWT contextual, contraseñas actuales y auditoría; no reducir auth_version, no revivir JWT ni restaurar Auth legacy incompatible. No restaurar RDS ni borrar reservas/archivos como rollback automático. Preservar evidencia e imágenes anteriores; si no existe destino acreditado compatible, STOP y decisión PO/roll-forward.
### Migraciones cerradas y regla vigente de ejecución

0025 auth_version aplicada y preservada. 0026 `infra/postgres/migrations/0026_archivados_documentales.sql`, SHA256 `609bb06532b8bcc745a0caff695bd60e20eb98079e33436b542c9aae0343aae6`, aplicada DEV/PROD. RDS 24/11: ejecución ENTERPRISE_LOCAL, ledger 0→1, tabla documentos.archivados_documentales, owner document_platform, cuatro índices y dos triggers acreditados; CREATE temporal revocado. `RDS_MIGRATION_0026=CLOSED_PASS`, esquema PASS y seguridad restaurada PASS (evidencia heredada, no SQL nuevo).
Precedencia sobre recetas históricas que mandan ejecutar desde EC2: runner institucional `@documental/database`, DEV exclusivamente desde SOURCE local y PROD exclusivamente desde Enterprise local, con autorización DB_WRITE específica, checksum, transacción, advisory lock y ledger. EC2 no es origen de ejecución de migraciones. No repetir 0025/0026 ni editar SQL aplicado/manifest.sha256/ledger. GIS/gis_db excluidos. La publicación documental no ejecuta migraciones.
