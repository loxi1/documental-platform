# Backend Standard

**Responsable:** Maestro Sucesor I

## Reglas

- Las reglas de negocio viven en Services.
- Los Controllers no contienen lógica de negocio.
- Toda operación documental crítica debe ser transaccional.
- Nunca confiar en clave documental enviada por frontend.
- Validar Workspace, empresa y permisos antes de acceder a recursos.
