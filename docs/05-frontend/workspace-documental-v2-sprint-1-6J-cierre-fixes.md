# Sprint 1.6J — Fixes finales de cierre

## Objetivo

Aplicar los ajustes visuales menores detectados en la validación final del Workspace Documental V2 enriquecido.

## Cambios

### 1. Formato de fecha documental

Se corrigió el formateo de fechas con formato `YYYY-MM-DD` para evitar que el navegador las convierta con zona horaria local y retroceda un día.

Ejemplos esperados:

```text
2026-04-23 -> 23/04/2026
2026-05-04 -> 04/05/2026
```

Regla aplicada:

- Si el valor viene como fecha documental simple `YYYY-MM-DD`, se formatea como string puro.
- No se usa `new Date()` para ese caso.
- Para otros formatos con hora, se mantiene el formateo estándar.

### 2. Etiqueta Cliente destino

Se dejó explícita la etiqueta correcta:

```text
Cliente destino
```

## Alcance respetado

- No toca backend.
- No toca Gateway.
- No crea endpoints.
- No modifica PostgreSQL.
- No toca OCR.
- No lee metadata OCR.
- No infiere proveedor, fecha, monto, serie ni número.
- No agrega acciones nuevas.
- No modifica flujos de carga.

## Resultado esperado

La vista enriquecida mantiene los campos normalizados de `vista` y corrige únicamente presentación:

- OC `2026-04-23` se muestra como `23/04/2026`.
- Factura `2026-05-04` se muestra como `04/05/2026`.
- La tarjeta de Contexto Operativo muestra `Cliente destino` como etiqueta correcta.
