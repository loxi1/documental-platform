# Tabla: core.bancos

## Qué representa

Catálogo de bancos/medios de pago usados en Finanzas.

## Valores actuales

| codigo | nombre | orden |
|---|---|---|
| BANCO_NACION | BANCO DE LA NACION | 1 |
| INTERBANK | INTERBANK | 2 |
| BCP | BCP | 3 |
| BBVA | BBVA | 4 |
| SCOTIABANK | SCOTIABANK | 5 |
| YAPE | YAPE | 6 |
| PLIN | PLIN | 7 |
| OTRO | OTRO | 99 |

## Reglas

- El frontend debe usar select.
- Actualmente se guarda `banco` como texto.
- Futuro posible: guardar `banco_codigo`.
