# Web Admin en producción — bbtecnologia.com

## Propósito

Definir la configuración mínima para publicar `apps/web-admin` en producción bajo:

```text
https://bbtecnologia.com
```

El API público esperado es:

```text
https://api.bbtecnologia.com/api/v1
```

## Owner

Maestro Sucesor II — Producto y UI Foundation.

## Source of Truth

- `apps/web-admin/.env.production.example`
- `apps/web-admin/src/services/env.ts`
- `apps/web-admin/package.json`
- `deployment/env/.env.production.example`

## Variables frontend

```env
NODE_ENV=production
PORT=3005
NEXT_PUBLIC_APP_URL=https://bbtecnologia.com
NEXT_PUBLIC_APP_NAME=Documental Platform
NEXT_PUBLIC_API_URL=https://api.bbtecnologia.com/api/v1
```

`NEXT_PUBLIC_AUTH_API_URL` es opcional. Si no existe, Auth usa `NEXT_PUBLIC_API_URL`.

## Regla de API pública

En producción el frontend no debe consumir:

```text
localhost
127.0.0.1
192.168.*
http://
```

`NEXT_PUBLIC_API_URL` debe apuntar siempre al API Gateway público con HTTPS.

## Puerto oficial

`web-admin` escucha en:

```text
PORT=3005
```

Comandos:

```bash
pnpm --filter web-admin build
PORT=3005 pnpm --filter web-admin start
```

Validación local en servidor:

```bash
curl -I http://127.0.0.1:3005/login
```

## Flujo de login y workspace

El flujo esperado es:

```text
/login
↓
POST /auth/login
↓
GET /auth/workspaces
↓
POST /auth/workspaces/select
↓
accessToken contextual
↓
navegación por permisos
```

## Rutas incompletas

Las rutas incompletas no deben aparecer en navegación productiva. Si existen en código, deben quedar ocultas por permisos, feature flag o route guard.

Regla visual:

```text
No mostrar módulos no disponibles en sidebar, dashboard ni accesos rápidos.
```

## Componentes reutilizables documentales

La UI Foundation reconoce estos componentes para documentos:

- `VerDocumento`
- `AdjuntarDocumento`
- `PreviewDocumento`
- `DocumentCard`
- `DocumentStatusBadge`

Regla:

```text
No construir URLs R2 en frontend.
PreviewDocumento usa /documentos/archivos/:archivoId/preview-url.
```

## Smoke test frontend

### Build

```bash
pnpm --filter web-admin build
```

### Start

```bash
PORT=3005 pnpm --filter web-admin start
```

### Login

- `/login` carga.
- Credenciales válidas ingresan.
- Credenciales inválidas muestran error claro.

### Workspace

- Lista workspaces.
- Selecciona `BBTI · Admin`.
- Selecciona `BBTI · Contabilidad`.
- Cambio de workspace no requiere cerrar sesión.

### Sidebar

Con Contabilidad:

- muestra Documentos;
- muestra Revisión Contable;
- muestra Mi Perfil;
- oculta Compras, Almacén, Finanzas y OCR.

### Empresa bloqueada

- La empresa visible corresponde al Workspace activo.
- No se puede cambiar manualmente a otra empresa desde el frontend.

### Preview documental

- Abrir documento.
- Abrir evidencia.
- `preview-url` responde.
- PDF/imagen carga.
- La URL firmada expira.

### Consola navegador

No debe mostrar:

- errores de hidratación;
- fetch a `localhost`;
- fetch a `192.168.*`;
- `Router action dispatched before initialization`.

## Última revisión

2026-07-03.
