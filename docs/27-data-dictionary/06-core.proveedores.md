# Tabla: core.proveedores

## Qué representa

Catálogo de proveedores por RUC.

## Campos principales

| Campo | Descripción |
|---|---|
| `id` | Identificador. |
| `ruc` | RUC único. |
| `razon_social` | Razón social oficial. |
| `direccion` | Dirección si existe. |
| `tipo_persona` | Natural/Jurídica si existe. |
| `creado_en` | Fecha creación. |
| `actualizado_en` | Fecha actualización. |

## Reglas

- Usar para enriquecer documentos por RUC.
- Si no existe, consumir API externa aprobada y hacer upsert.
- El frontend no debe obligar a digitar razón social si el RUC permite resolverla.
