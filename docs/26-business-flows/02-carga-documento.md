# Flujo: Carga de Documento

## Flujo

```text
Usuario selecciona caja/tipo
↓
Sube archivo
↓
R2 privado
↓
documentos_archivos
↓
documento temporal
↓
Procesar OCR
```

## Reglas

- El archivo se conserva aunque OCR falle.
- La carga no confirma el documento.
- La metadata de contexto debe incluir área y tipo esperado.

## Casos

- Compras sube OC/factura/guía.
- Almacén sube guía o nota ingreso.
- Finanzas sube transferencia o detracción.
