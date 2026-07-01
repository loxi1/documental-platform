# Database Standard

**Responsable:** Viejo Maestro

## Reglas

- Toda modificación estructural requiere migración.
- Nunca modificar producción manualmente.
- Nunca editar una migración ya aplicada.
- No usar DROP destructivo.
- PostgreSQL vive en AWS RDS, no en Docker.
