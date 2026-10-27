**Estado:** Base inicial  
**Responsable:** Viejo Maestro

---
# Seeds

Usar ON CONFLICT DO NOTHING.

No depender de IDs locales.


## Aprovisionamiento administrativo focal

El [procedimiento BBTI/BBTEC R1](../../packages/database/admin/auth-users-r1/README.md)
implementa cuatro usuarios y ocho workspaces con validación de conflictos, transacción e
integridad SHA-256 propia. Es un artefacto administrativo promovido a SOURCE/Enterprise/EC2, no una migración
ni el seed mínimo genérico; no registra versiones en `core.schema_migrations`. Su puesta
en producción requiere aprobación operativa del canal privado de credenciales y
autorización independiente. No sobrescribe contraseñas o asignaciones existentes.


## Cierre y continuidad — 26/10/2026

El aprovisionamiento 4 usuarios/8 workspaces y la preservación de 5 históricos/11 relaciones están reportados completos por MI/PO; no se ejecutaron ni consultaron aquí. Resolución de contraseñas REPORTED_COMPLETE; acuses firmados NOT_YET_VERIFIED. **No volver a ejecutar el aprovisionador, el seed ni una migración para recrear estas cuentas.** Estado rector y límites de evidencia en [continuidad operativa](../29-operations-manual/README.md#continuidad-vigente--26102026); identidad administrativa en el [manifiesto único](../31-governance/RELEASE_MANIFEST.md). No hay cambio de esquema ni actualización del ledger.
