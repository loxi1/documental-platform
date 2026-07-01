# Tabla: documentos.documentos

## Qué representa

Documento lógico de negocio.

## Ejemplos

- OC 007950.
- Factura F001-00017434.
- Guía EG07-00000163.
- Transferencia 0050267.
- Detracción 296801526.

## Campos principales

| Campo | Descripción |
|---|---|
| `id` | Identificador del documento lógico. |
| `cliente_abreviatura` | Empresa/cliente asociado, ejemplo BBTI. |
| `tipo_documental` | Tipo oficial: FACTURA, OC, GUIA_REMISION, etc. |
| `ruc_emisor` | RUC del proveedor/emisor si aplica. |
| `razon_social_emisor` | Razón social del proveedor/emisor. |
| `serie` | Serie documental si aplica. |
| `numero` | Número documental u operación. |
| `clave_documental` | Identificador único calculado por backend. |
| `estado` | Estado oficial del documento. |
| `fecha_emision` | Fecha oficial confirmada. En factura define período contable. |
| `moneda` | Moneda oficial: SOLES o DOLARES AMERICANOS. |
| `monto_total` | Monto confirmado si aplica. |
| `metadata` | JSONB con OCR, auditoría y campos extendidos. |

## Reglas

- Es documento lógico, no archivo físico.
- Puede tener múltiples archivos en `documentos_archivos`.
- `clave_documental` debe ser calculada por backend.
- Para `FACTURA`, `fecha_emision` es obligatoria para Revisión Contable.

## APIs relacionadas

- Confirmar OCR.
- Editar documento.
- Consultar documentos del expediente.
- Versionado.
