# Sprint 1.3E - Backend Administración de Accesos Fase 1

## Estado

**Cerrado funcionalmente en ambiente local/demo.**

El objetivo fue desbloquear el módulo frontend de Administración de Accesos, que ya consumía endpoints solo lectura pero recibía 404 desde API Gateway.

## Problema inicial

Frontend tenía implementadas las vistas de administración de accesos, pero estos endpoints no existían o no estaban expuestos:

```http
GET /api/v1/auth/usuarios
GET /api/v1/auth/perfiles
GET /api/v1/auth/usuario-workspaces
```

## Alcance implementado

Se habilitaron endpoints solo lectura para:

- Usuarios sanitizados.
- Perfiles del sistema.
- Espacios de trabajo de usuario.

El objetivo fue permitir visualización administrativa sin edición de permisos desde UI.

## Reglas de seguridad

- Solo perfil `admin` puede consumir estos endpoints.
- No se devuelve `password_hash`.
- No se devuelven tokens.
- No se devuelven secretos.
- No se exponen variables de entorno.

## Endpoints validados

### Usuarios

```http
GET /api/v1/auth/usuarios
```

Devuelve:

- id
- nombres
- apellidos
- email
- estado
- creadoEn
- actualizadoEn

### Perfiles

```http
GET /api/v1/auth/perfiles
```

Devuelve:

- id
- codigo
- nombre
- sistemaId
- sistemaCodigo
- sistemaNombre
- estado

### Usuario workspaces

```http
GET /api/v1/auth/usuario-workspaces
```

Devuelve:

- workspaceId
- usuarioId
- nombres
- apellidos
- email
- empresaCodigo
- clienteDestinoId
- sistema
- sistemaNombre
- perfil
- perfilNombre
- estado
- esFavorito
- ultimoUsoEn
- permissionVersion
- permisos.menus
- permisos.actions

## Usuarios demo validados

- compras@documental.local
- almacen@documental.local
- finanzas@documental.local
- contabilidad@documental.local

Todos fueron creados en base local y vinculados a sus workspaces correspondientes.

## Observación técnica importante

Durante la validación se detectó que los servicios inicialmente estaban leyendo RDS por variables de entorno de producción. Se corrigió el entorno local con override persistente para que los servicios usen `dp_postgres`.

## Criterios de cierre

- Los endpoints dejaron de responder 404.
- El frontend pudo cargar la Fase 1 de Administración de Accesos.
- La data se expone sanitizada.
- El acceso queda restringido a admin.
- Se evita exponer datos sensibles.

## Commit sugerido

```bash
git commit -m "feat(auth): add read-only access administration endpoints"
```
