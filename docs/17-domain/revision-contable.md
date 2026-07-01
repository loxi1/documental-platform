# Revisión Contable

## Qué representa

Pantalla donde Contabilidad revisa la integridad documental antes del cierre.

## Regla actualizada

Revisión Contable trabaja por:

```text
Empresa
↓
Año + Mes
↓
Facturas confirmadas del período
↓
Expedientes asociados
↓
Matriz documental
```

## Factura ancla

La factura define el período contable mediante `fecha_emision`.

## No aparecen

Expedientes sin factura confirmada no participan en Revisión Contable.

## Acciones permitidas

- Ver documento.
- Ver versiones.
- Agregar observación.
- Generar alerta manual.
- Confirmar documentación completa.
- Marcar pendiente de regularización.

## No permitido

- Subir documentos.
- Editar OCR.
- Confirmar OCR.
- Reemplazar archivos.
