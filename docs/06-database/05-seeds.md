**Estado:** Base inicial  
**Responsable:** Viejo Maestro

---
# Seeds

Usar ON CONFLICT DO NOTHING.

No depender de IDs locales.


## Aprovisionamiento administrativo focal

El [procedimiento BBTI/BBTEC R1](../../packages/database/admin/auth-users-r1/README.md)
implementa cuatro usuarios y ocho workspaces con validación de conflictos, transacción e
integridad SHA-256 propia. Es un artefacto administrativo en revisión G2, no una migración
ni el seed mínimo genérico; no registra versiones en `core.schema_migrations`. Su puesta
en producción requiere aprobación operativa del canal privado de credenciales y
autorización independiente. No sobrescribe contraseñas o asignaciones existentes.
