# Tabla: core.monedas

## Qué representa

Catálogo de monedas permitidas.

## Estructura aprobada

```sql
CREATE TABLE IF NOT EXISTS core.monedas (
  id serial PRIMARY KEY,
  codigo varchar(10) NOT NULL UNIQUE,
  nombre varchar(50) NOT NULL,
  simbolo varchar(10),
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0
);
```

## Valores actuales

| codigo | nombre | simbolo |
|---|---|---|
| PEN | SOLES | S/ |
| USD | DOLARES AMERICANOS | US$ |

## Reglas

- El frontend debe usar select, no input libre.
- Actualmente se guarda `moneda` como texto (`SOLES`, `DOLARES AMERICANOS`).
- Futuro posible: guardar `moneda_codigo`.
