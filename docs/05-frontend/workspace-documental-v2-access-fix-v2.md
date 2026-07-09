# Sprint 1.6H — Fix de acceso Workspace Documental V2

## Problema

La vista Workspace Documental V2 ya estaba registrada en `workspace-navigation.ts`, pero podía seguir mostrando:

```text
Acceso restringido
No tienes permiso para acceder a Workspace Documental V2.
```

## Causa

El Web Admin normaliza permisos terminados en `.ver` como menús.

En `auth-storage.ts`, cuando los permisos llegan como arreglo, ocurre:

```ts
menus: values.filter((item) => item.endsWith('.ver')).map((item) => item.replace(/\.ver$/, ''))
actions: values.filter((item) => !item.endsWith('.ver'))
```

Por lo tanto, un permiso como:

```text
documental_v2.workspace.ver
```

queda disponible para el frontend como:

```text
permisos.menus = ["documental_v2.workspace"]
```

y no necesariamente como `actions`.

## Ajuste aplicado

Las rutas experimentales del Workspace V2 ahora aceptan:

```text
permisos.menus:
- documental_v2.workspace
- workspace_documental_v2
```

Y mantienen compatibilidad con acciones explícitas si algún token las trae como `actions`.

## Rutas afectadas

```text
/documental-v2/workspace/:id
/workspace/expedientes-v1/:id
```

## Restricciones respetadas

- No se toca backend.
- No se toca Gateway.
- No se crean endpoints.
- No se modifica PostgreSQL.
- No se abren rutas legacy.
- No se implementa edición ni carga.
