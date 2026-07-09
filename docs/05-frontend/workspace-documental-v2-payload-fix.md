# Sprint 1.6H — Ajuste de lectura del payload Workspace V2

## Motivo

La ruta `Workspace Documental V2` ya era visible con usuario administrador, pero los bloques mostraban datos vacíos.

La causa no era permisos ni Gateway. El frontend asumía una forma plana del payload, mientras que el contrato real del backend V2 devuelve entidades envueltas con esta forma:

```ts
{
  estadoPersistencia: 'persistido' | 'no_persistido',
  vista: { ... },
  persistido: { ... } | null
}
```

Ejemplos:

```ts
contenedorOperativo.vista

documentosOperativosPrincipales[0].vista

gruposFactura[0].vista

gruposFactura[0].documentos[0].vista
```

## Ajuste aplicado

Se actualiza `workspace-v2-utils.ts` para leer siempre la propiedad `vista` cuando exista.

No se modifica backend.
No se modifica Gateway.
No se crea ningún endpoint.
No se persiste información V2 desde frontend.

## Regla de Documento Principal

El frontend sigue sin inferir principalidad por `tipoRelacion`.

Para el contrato V2 se acepta:

```ts
esPrincipal === true
es_principal === true
esPrincipalActivo === true
```

`esPrincipalActivo` es un dato explícito del payload V2, calculado por backend desde el modelo de compatibilidad. No es una inferencia visual por `tipoRelacion`.

## Resultado esperado

La pantalla debe mostrar datos reales de:

- Contexto Operativo
- Documento Operativo Principal
- Grupo de Factura
- Adjuntos del grupo
- Documentos pendientes de clasificación
- Advertencias
