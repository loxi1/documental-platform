# Sprint 1.6H — Workspace Documental V2 en Web Admin

## Estado

Implementación frontend propuesta para validación UX en modo solo lectura.

## Objetivo

Crear una vista aislada del Workspace Documental V2 sin reemplazar pantallas legacy ni modificar flujos existentes.

La vista representa la jerarquía aprobada:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

## Ruta frontend

```text
/documental-v2/workspace/:id
```

Caso inicial de validación:

```text
/documental-v2/workspace/41
```

## Contrato consumido

La vista consume exclusivamente el API Gateway mediante el servicio común `api` de Web Admin:

```text
GET /api/v1/documental-v2/workspace/expedientes-v1/:id
```

En el código frontend, al usar `NEXT_PUBLIC_API_URL` con base `/api/v1`, la llamada queda como:

```text
/documental-v2/workspace/expedientes-v1/:id
```

## Archivos agregados

```text
apps/web-admin/src/app/documental-v2/workspace/[id]/page.tsx
apps/web-admin/src/components/documental-v2/WorkspaceDocumentalV2.tsx
apps/web-admin/src/components/documental-v2/WorkspaceHeader.tsx
apps/web-admin/src/components/documental-v2/ContextoOperativoCard.tsx
apps/web-admin/src/components/documental-v2/DocumentoOperativoPrincipalCard.tsx
apps/web-admin/src/components/documental-v2/GrupoFacturaCard.tsx
apps/web-admin/src/components/documental-v2/AdjuntosList.tsx
apps/web-admin/src/components/documental-v2/WorkspaceAlertas.tsx
apps/web-admin/src/components/documental-v2/workspace-v2-utils.ts
apps/web-admin/src/services/documental-v2-workspace.ts
apps/web-admin/src/types/documental-v2-workspace.ts
```

## Componentes

### `WorkspaceDocumentalV2`

Componente orquestador de la vista. Recibe el payload del Gateway y delega la presentación a tarjetas especializadas.

### `WorkspaceHeader`

Cabecera de la vista. Indica que es un Workspace Documental V2 experimental en modo solo lectura.

### `ContextoOperativoCard`

Muestra empresa, código / centro de costo, descripción, cliente destino y estado.

### `DocumentoOperativoPrincipalCard`

Muestra el Documento Operativo Principal devuelto por el Workspace.

Regla obligatoria respetada:

```text
Documento Principal = esPrincipal === true o es_principal === true
```

No se usa `tipoRelacion` para determinar principalidad visual.

### `GrupoFacturaCard`

Muestra cada Grupo de Factura como una tarjeta independiente con factura, proveedor, fecha, estado y adjuntos.

La tarjeta incluye la etiqueta `Agrupación visual` para evitar interpretar el grupo como entidad persistida desde frontend.

### `AdjuntosList`

Lista de documentos adjuntos. Se usa tanto dentro de cada Grupo de Factura como para documentos pendientes de clasificación.

### `WorkspaceAlertas`

Muestra únicamente alertas o advertencias existentes en el payload. No crea reglas nuevas.

## Estados contemplados

La página contempla:

```text
loading
error de autorización / permisos
error de endpoint
sin datos
workspace cargado correctamente
```

## Restricciones respetadas

```text
No toca backend.
No toca Gateway.
No toca ms-documentos.
No crea endpoints.
No modifica PostgreSQL.
No modifica OCR.
No toca R2.
No toca NATS.
No toca Eventos.
No modifica V1.
No modifica V2 físico.
No reemplaza la vista actual de Compras.
No implementa edición.
No implementa carga.
No implementa OCR.
No implementa confirmaciones.
No implementa drag & drop.
No implementa acciones nuevas.
```

## Smoke test manual

1. Levantar Web Admin con `NEXT_PUBLIC_API_URL` apuntando al Gateway.
2. Iniciar sesión y seleccionar workspace válido.
3. Abrir:

```text
/documental-v2/workspace/41
```

4. Validar que la pantalla muestre:

```text
Contexto Operativo
Documento Operativo Principal
Grupos de Factura
Adjuntos
Alertas / Advertencias, solo si existen
```

5. Validar que en DevTools la llamada salga al Gateway:

```text
GET /api/v1/documental-v2/workspace/expedientes-v1/41
```

6. Validar que no existan llamadas directas a ms-documentos ni endpoints internos V2.

## Checklist PR

```text
[ ] No toca backend
[ ] No crea endpoints
[ ] No modifica PostgreSQL
[ ] No persiste grupoFacturaId
[ ] No simula entidades V2 inexistentes
[ ] Principal usa esPrincipal / es_principal
[ ] tipoRelacion no define principal activo
[ ] Grupo de Factura es visual
[ ] No usa Expediente como raíz visual principal
[ ] No muestra periodo si no viene de dato confiable
[ ] No toca wizard
[ ] No reemplaza Workspace V1
```

## Commit sugerido

```bash
git add apps/web-admin/src/app/documental-v2/workspace/[id]/page.tsx \
        apps/web-admin/src/components/documental-v2 \
        apps/web-admin/src/services/documental-v2-workspace.ts \
        apps/web-admin/src/types/documental-v2-workspace.ts \
        docs/05-frontend/workspace-documental-v2-implementacion.md

git commit -m "feat(web): add read-only documental V2 workspace"
```

## Ajuste de acceso controlado

Durante la validación inicial se detectó que la vista podía quedar bloqueada por el guard del Web Admin con el mensaje:

```text
Acceso restringido
No tienes permiso para acceder a este módulo.
```

El endpoint Gateway seguía siendo válido; el bloqueo correspondía a permisos frontend.

Para Sprint 1.6H se habilitan dos rutas controladas hacia la misma vista de solo lectura:

```text
/documental-v2/workspace/:id
/workspace/expedientes-v1/:id
```

La segunda ruta existe como alias práctico para la prueba con el endpoint conceptual `workspace/expedientes-v1/41`.

La regla de acceso queda limitada a:

```text
perfil admin
```

o a un token de workspace que incluya alguna de estas acciones explícitas:

```text
documental_v2.workspace.ver
workspace_documental_v2.ver
```

No se abre el Workspace Documental V2 a todos los perfiles operativos. Un workspace de Compras sin acción explícita debe seguir viendo acceso restringido.

