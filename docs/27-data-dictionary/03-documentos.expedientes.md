# Tabla: documentos.expedientes

## Qué representa

Agrupador de documentos relacionados a una operación, proyecto o centro de costo.

## Campos principales

| Campo | Descripción |
|---|---|
| `id` | Identificador del expediente. |
| `empresa_codigo` | Empresa, ejemplo BBTI. |
| `codigo_expediente` | Código operativo, ejemplo 050201. |
| `descripcion` | Descripción del expediente. |
| `cliente_destino_id` | Relación con `core.clientes_destino`. |
| `estado` | Estado operativo si existe. |

## Reglas

- Puede existir sin factura.
- Puede contener documentos de varias áreas.
- No define período contable.
- Revisión Contable lo lista solo si tiene factura confirmada del período.

## Caso real

```text
id = 41
empresa_codigo = BBTI
codigo_expediente = 050201
descripcion = PRODUCCION C X DISTRIBUIR
```
