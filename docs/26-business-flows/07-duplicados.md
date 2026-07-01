# Flujo: Duplicados

## Flujo

```text
Confirmación o carga detecta clave existente
↓
Backend responde 409
↓
Frontend ofrece agregar versión
↓
Usuario confirma
↓
Archivo se agrega al documento existente
```

## Regla

Duplicado documental se resuelve con versionado, no con borrado.
