# Cookbook Expedientes

## Obtener documentos de un expediente

```bash
curl "http://localhost:3000/api/v1/expedientes/41/documentos"
```

## Resultado esperado

Debe devolver documentos vinculados:

- `principal_oc`
- `adjunto_factura`
- `adjunto_guia`
- `adjunto_nota_ingreso`
- `adjunto_transferencia`
- `adjunto_detraccion`

## Regla

La consulta muestra el expediente completo. Revisión Contable no debe usar esta consulta como entrada inicial; debe partir de facturas del período.
