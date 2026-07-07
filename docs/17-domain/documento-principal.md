# Regla de dominio: Documento principal activo

## Definición

Un expediente puede tener muchos documentos relacionados.

OC, OS y Factura son candidatos a documento principal, pero solo un documento puede ser el principal activo del expediente.

## Verdad funcional

El documento principal activo se determina únicamente por:

```text
expediente_documentos.es_principal = true
```

No se debe usar como verdad funcional:

```text
tipo_relacion startsWith("principal_")
```

`tipo_relacion` sirve como clasificación documental (`principal_oc`, `principal_os`, `principal_factura`, `adjunto_factura`, etc.), pero no indica por sí solo que el documento sea el principal activo.

## Reglas oficiales

1. Un expediente puede tener muchos documentos relacionados.
2. OC, OS y Factura pueden ser candidatos a principal.
3. Solo un documento puede tener `es_principal = true` por expediente.
4. Un documento no debe duplicarse en `expediente_documentos`.
5. Si un documento ya está vinculado al mismo expediente, la operación debe actualizar la relación existente.
6. Si un documento ya está vinculado a otro expediente, debe bloquearse con 409.
7. Si `metadata.codigoExpediente` no coincide con el expediente seleccionado, debe bloquearse con 409.
8. No se debe reemplazar el documento principal activo de forma silenciosa.
9. El reemplazo explícito de principal queda para un sprint posterior.

## Códigos de error

### `CODIGO_EXPEDIENTE_NO_COINCIDE`

El código detectado en el documento no coincide con el expediente seleccionado.

### `DOCUMENTO_YA_VINCULADO_A_OTRO_EXPEDIENTE`

El documento ya está vinculado a otro expediente y no debe moverse silenciosamente.

### `EXPEDIENTE_YA_TIENE_DOCUMENTO_PRINCIPAL`

El expediente ya tiene un documento principal activo y no se permite crear otro sin reemplazo explícito.

### `ARCHIVO_DUPLICADO_EN_CARGA_GUIADA`

Ya existe un archivo equivalente por hash SHA-256 para el documento o expediente, por lo que no se debe volver a subir a R2.

## Regla visual para frontend

La UI debe mostrar el badge `Principal` solo cuando:

```ts
doc.esPrincipal === true
```

No debe usar:

```ts
doc.tipoRelacion.startsWith('principal_')
```

## Pendiente futuro

Implementar flujo explícito y auditado de reemplazo:

```text
documento_principal.reemplazado
```

El documento principal anterior no debe eliminarse; debe quedar vinculado como no principal.
