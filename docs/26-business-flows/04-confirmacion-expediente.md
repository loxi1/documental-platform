# Flujo: Confirmación

## Flujo

```text
OcrValidationModal
↓
Usuario corrige datos
↓
confirmar-con-expediente
↓
Backend valida contexto
↓
Backend recalcula clave
↓
Documento confirmado
↓
Vínculo con expediente
```

## Reglas

- El valor final confirmado por usuario es oficial.
- Para FACTURA, `fecha_emision` define período contable.
- Debe bloquear mismatch de RUC comprador.
