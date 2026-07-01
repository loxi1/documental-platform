# Enriquecimiento por RUC

## Qué representa

Servicio reutilizable para completar proveedor, razón social y datos relacionados a partir de un RUC.

## Fuente principal

Tabla: `core.proveedores`.

## Flujo aprobado

```text
RUC detectado o ingresado
↓
Buscar en core.proveedores
↓
Si existe, completar razón social/proveedor
↓
Si no existe, usar API externa aprobada
↓
Upsert en core.proveedores
↓
Persistir metadata enriquecida
```

## Campos enriquecibles

- `proveedor`
- `razonSocial`
- `razonSocialEmisor`
- `rucProveedor`
- `direccionProveedor`
- `tipoPersonaProveedor`
- `proveedorOrigen`

## Reglas

- El frontend puede capturar RUC.
- El backend completa razón social.
- Si el OCR detecta razón social pero no RUC, se conserva como evidencia pero no reemplaza catálogo.
