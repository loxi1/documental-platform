# Cookbook Versionado

## Agregar archivo como versión

```bash
curl -X POST "http://localhost:3000/api/v1/documentos/3756/archivos/3820/agregar-version" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoVersion":"escaneado",
    "observacion":"Archivo duplicado agregado como versión",
    "marcarComoActual":true
  }'
```

## Ver historial

```bash
curl "http://localhost:3000/api/v1/documentos/3756/archivos"
```

## Regla

Agregar versión no debe crear otro documento lógico.
