# Sprint 1.6H — Payload Fix Syntax Correction

## Motivo

Durante `next build` con Turbopack se detectó un error de sintaxis en `workspace-v2-utils.ts` por mezclar `??` con `&&` sin paréntesis.

## Corrección

Se reemplazó la lectura inline de `compatibilidad` por una variable previa:

```ts
const compatibilidad = asRecord((workspace as AnyRecord).compatibilidad);
```

Luego se aplica la cadena `??` sin operadores lógicos mezclados.

## Alcance

- No toca backend.
- No toca Gateway.
- No modifica contratos.
- No cambia reglas de negocio.
- Solo corrige sintaxis frontend para permitir build.
