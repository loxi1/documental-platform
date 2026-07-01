# Estrategia de Migraciones

- SQL versionado.
- Sin ORM Sync en producción.
- Orden: Schemas → Tablas → Índices → Constraints → Datos Maestros → Vistas → Funciones → Seeds.
- Registro en `core.schema_migrations(version, descripcion, checksum, ejecutado_en, ejecutado_por)`.
- Validar siempre en Staging antes de Producción.
