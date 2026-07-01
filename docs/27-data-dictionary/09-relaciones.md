# Relaciones del dominio documental

## Documento lógico a archivos

```text
documentos.documentos.id
↓
documentos.documentos_archivos.documento_id
```

## Expediente a documento

```text
documentos.expedientes.id
↓
documentos.expediente_documentos.expediente_id
```

```text
documentos.documentos.id
↓
documentos.expediente_documentos.documento_id
```

## OCR a archivo/documento

```text
documentos.ocr_resultados.archivo_id
↓
documentos.documentos_archivos.id
```

```text
documentos.ocr_resultados.documento_id
↓
documentos.documentos.id
```

## Proveedor

```text
documentos.documentos.ruc_emisor
↓
core.proveedores.ruc
```

## Cliente destino

```text
documentos.expedientes.cliente_destino_id
↓
core.clientes_destino.id
```
