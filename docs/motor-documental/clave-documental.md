# Clave Documental

## Qué representa

La clave documental identifica un documento lógico de negocio de forma única dentro del cliente/empresa.

## Autoridad

La clave documental siempre se calcula en backend. El frontend no es autoridad.

## Formatos aprobados

### FACTURA

```text
CLIENTE|FACTURA|RUC_EMISOR|SERIE|NUMERO
```

Ejemplo:

```text
BBTI|FACTURA|20603430248|F001|00017434
```

### OC

```text
CLIENTE|OC|NUMERO
```

Ejemplo:

```text
BBTI|OC|007950
```

### OS

```text
CLIENTE|OS|NUMERO
```

### GUÍA DE REMISIÓN

```text
CLIENTE|GUIA_REMISION|RUC_EMISOR|SERIE|NUMERO
```

Ejemplo:

```text
BBTI|GUIA_REMISION|20612122416|EG07|00000163
```

### NOTA DE INGRESO

```text
CLIENTE|NOTA_INGRESO|NUMERO
```

Ejemplo:

```text
BBTI|NOTA_INGRESO|0000011712
```

### PAGO_TRANSFERENCIA

```text
CLIENTE|PAGO_TRANSFERENCIA|NUMERO_OPERACION
```

Ejemplo:

```text
BBTI|PAGO_TRANSFERENCIA|0050267
```

### PAGO_DETRACCION

```text
CLIENTE|PAGO_DETRACCION|NUMERO_CONSTANCIA_O_OPERACION
```

Ejemplo:

```text
BBTI|PAGO_DETRACCION|296801526
```

## Reglas

- La clave se guarda en `documentos.documentos.clave_documental`.
- La clave confirmada se replica en `documentos.ocr_resultados.clave_documental`.
- También puede quedar en `metadata.claveDocumental` como evidencia.
- Si no hay datos suficientes, el OCR queda `pendiente_validacion`.
