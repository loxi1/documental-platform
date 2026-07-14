# Instrumentación real de auditoría operativa V2

## Sprint

Sprint 2.0D.1A — Instrumentación real de auditoría operativa V2.

## Objetivo

Registrar físicamente en `core.auditoria_eventos` las operaciones V2:

- `ASOCIAR_DOCUMENTO_PRINCIPAL`;
- `GRUPO_FACTURA_CREADO`;
- `DOCUMENTO_GRUPO_FACTURA_ASOCIADO`.

## Fuente elegida

La fuente inicial para esta subfase es `core.auditoria_eventos`.

No se escribirá todavía en `documentos.documento_eventos`.

## Reglas

- Auditoría desde contexto autenticado.
- Nunca desde payload React.
- Una fila por creación real.
- Llamada idempotente no duplica auditoría funcional.
- No auditar rechazos todavía.
- No crear migraciones.
- No modificar contratos funcionales 2.0A–2.0C.
- No endpoint.
- No React.
- No Timeline Visual.
- No Auditoría Visual.

## Columnas físicas usadas

- `workspace_id`
- `session_context_id`
- `request_id`
- `usuario_id`
- `empresa_codigo`
- `sistema_codigo`
- `perfil_codigo`
- `modulo`
- `entidad`
- `entidad_id`
- `accion`
- `descripcion`
- `antes`
- `despues`

## Columnas no usadas porque no existen

- `usuario_email`
- `correlation_id`
- `tipo_operacion`
- `resultado_operacion`
- `origen`
- `metadata`

Cuando sean útiles, esos valores pueden quedar dentro de `despues`, sin convertirse en contrato público.

## Validación SQL

```sql
SELECT
  id,
  workspace_id,
  request_id,
  usuario_id,
  empresa_codigo,
  modulo,
  entidad,
  entidad_id,
  accion,
  descripcion,
  antes,
  despues,
  creado_en
FROM core.auditoria_eventos
WHERE accion IN (
  'ASOCIAR_DOCUMENTO_PRINCIPAL',
  'GRUPO_FACTURA_CREADO',
  'DOCUMENTO_GRUPO_FACTURA_ASOCIADO'
)
ORDER BY creado_en;
```
