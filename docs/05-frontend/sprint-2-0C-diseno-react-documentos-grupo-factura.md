# Sprint 2.0C — Diseño React para Documentos del Grupo de Factura

## Rol

Maestro Sucesor II — React/Web Admin, UX/UI, Workspace Documental V2 e integración frontend-Gateway.

React no define reglas de negocio, no calcula resumen, no reconstruye Workspace y no consume `ms-documentos` directamente.

## Estado del sprint

```text
Sprint 2.0C — Alta operativa de Documentos del Grupo de Factura
Backend/Gateway: implementado y validado en runtime
React/Web Admin: autorizado para implementación visual
Merge a main: todavía no
Rama: feat/documental-v2-operacion-2-0C
Backend base: 48f2580a feat(documental-v2): associate documents to invoice groups
```

## Objetivo

Permitir desde el Workspace Documental V2 asociar documentos existentes a un Grupo de Factura V2 persistido.

Flujo visual esperado:

```text
Grupo de Factura persistido
  -> buscar documento candidato
  -> seleccionar documento
  -> confirmar asociación
  -> refrescar Workspace
  -> mostrar documento dentro del grupo
```

Jerarquía esperada:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Factura fundadora
          -> Guía
          -> Nota de ingreso
          -> Transferencia
          -> Detracción
```

## Contrato Gateway consumido

React consume exclusivamente Gateway.

### Candidatos

```http
GET /api/v1/documental-v2/documentos-candidatos-grupo
```

Parámetros:

```text
grupoFacturaId       obligatorio
tipoDocumental       opcional
texto                opcional
pagina               opcional
limite               opcional
```

Campos esperados:

```json
{
  "documentoId": 910007,
  "tipoDocumental": "GUIA_REMISION",
  "tipoDocumentalLabel": "Guía de remisión",
  "tipoRelacion": "adjunto_guia",
  "numeroDocumento": "T001-00000077",
  "proveedorNombre": "PROVEEDOR S.A.C.",
  "proveedorRuc": "20100000001",
  "fecha": "2026-07-07",
  "estado": "confirmado",
  "nombreArchivo": "GUIA_T001-00000077.pdf",
  "yaAsociadoGrupoV2": false
}
```

### Asociación

```http
POST /api/v1/documental-v2/grupos-factura/documentos/asociar
```

Payload enviado por React:

```json
{
  "grupoFacturaId": 2,
  "documentoId": 910007,
  "tipoRelacion": "adjunto_guia"
}
```

React toma los datos desde:

```text
grupoFacturaId = grupoFactura.persistido.id
documentoId = candidato.documentoId
tipoRelacion = candidato.tipoRelacion
```

React no infiere `tipoRelacion`.

El backend garantiza que `candidato.tipoRelacion` corresponde al catálogo oficial aprobado.

## Tipos documentales permitidos

```text
GUIA_REMISION
NOTA_INGRESO
TRANSFERENCIA
DETRACCION
```

Mapeo oficial backend:

```text
GUIA_REMISION  -> adjunto_guia
NOTA_INGRESO   -> adjunto_nota_ingreso
TRANSFERENCIA  -> adjunto_transferencia
DETRACCION     -> adjunto_detraccion
```

React usa `tipoDocumentalLabel` para pintar la UI.

## Reglas frontend

- Consumir solo Gateway.
- Operar solo sobre `grupoFactura.persistido.id`.
- No operar grupos `no_persistido`.
- No mostrar etiquetas técnicas como `legacy`, `adapter`, `persistido` o `no_persistido`.
- No inferir `tipoRelacion`.
- Usar `candidato.tipoRelacion` entregado por Gateway.
- No permitir que el usuario escriba libremente `tipoRelacion`.
- No usar `metadata` como fuente visual.
- No calcular resumen.
- No reconstruir Workspace.
- No consumir `ms-documentos` directo.
- No enviar identidad, empresa, workspace, clienteDestinoId ni auditoría.
- Refrescar Workspace cuando `workspaceDebeRefrescar=true`.
- Pintar documentos asociados desde `grupoFactura.documentos[].vista`.

## Flujo UX

1. Mostrar acción “Agregar documento” únicamente en grupos V2 persistidos.
2. No mostrar acción operativa en grupos `no_persistido`.
3. Abrir panel o modal de asociación.
4. Consultar candidatos exclusivamente por Gateway.
5. Mostrar información funcional del candidato:
   - `tipoDocumentalLabel`
   - `numeroDocumento`
   - `proveedorNombre`
   - `proveedorRuc`
   - `fecha`
   - `estado`
   - `nombreArchivo`, cuando exista
6. Permitir seleccionar un documento candidato.
7. Mostrar confirmación antes de asociar.
8. Enviar solo `grupoFacturaId`, `documentoId` y `tipoRelacion`.
9. Si `idempotente=false` y `workspaceDebeRefrescar=true`, mostrar éxito y refrescar Workspace.
10. Si `idempotente=true` y `workspaceDebeRefrescar=false`, mostrar mensaje informativo:

```text
El documento ya estaba asociado a este Grupo de Factura.
```

11. No reconstruir optimistamente el documento dentro del grupo.
12. Después del refresco, el documento debe aparecer debajo del Grupo de Factura correcto.
13. El resumen debe venir actualizado desde backend.

## Componentes modificados

```text
apps/web-admin/src/types/documental-v2-workspace.ts
apps/web-admin/src/services/documental-v2-workspace.ts
apps/web-admin/src/components/documental-v2/AsociarDocumentoGrupoFacturaPanel.tsx
apps/web-admin/src/components/documental-v2/GrupoFacturaCard.tsx
apps/web-admin/src/components/documental-v2/AdjuntosList.tsx
apps/web-admin/src/components/documental-v2/WorkspaceDocumentalV2.tsx
```

## Errores funcionales considerados

React debe mapear estos errores con extractor profundo porque Gateway puede anidar el código funcional.

```text
GRUPO_FACTURA_NO_ENCONTRADO
GRUPO_FACTURA_NO_PERSISTIDO
GRUPO_FACTURA_NO_ACTIVO
GRUPO_FACTURA_NO_AUTORIZADO
DOCUMENTO_NO_ENCONTRADO
TIPO_DOCUMENTAL_NO_PERMITIDO_EN_GRUPO
TIPO_RELACION_NO_PERMITIDO
TIPO_RELACION_NO_COINCIDE_CON_DOCUMENTO
DOCUMENTO_YA_ASOCIADO_AL_GRUPO_CON_OTRA_RELACION
DOCUMENTO_YA_ASOCIADO_A_OTRO_GRUPO
```

Mensajes UX sugeridos:

```text
GRUPO_FACTURA_NO_ENCONTRADO: El Grupo de Factura ya no está disponible.
GRUPO_FACTURA_NO_PERSISTIDO: Este Grupo de Factura solo está disponible para consulta.
GRUPO_FACTURA_NO_ACTIVO: Este Grupo de Factura no está activo.
GRUPO_FACTURA_NO_AUTORIZADO: No tienes autorización para operar este Grupo de Factura.
DOCUMENTO_NO_ENCONTRADO: El documento seleccionado ya no está disponible.
TIPO_DOCUMENTAL_NO_PERMITIDO_EN_GRUPO: El tipo documental no está permitido para este Grupo de Factura.
TIPO_RELACION_NO_PERMITIDO: El tipo de relación no está permitido.
TIPO_RELACION_NO_COINCIDE_CON_DOCUMENTO: El documento no coincide con el tipo de relación esperado.
DOCUMENTO_YA_ASOCIADO_AL_GRUPO_CON_OTRA_RELACION: El documento ya está asociado a este grupo con otra relación.
DOCUMENTO_YA_ASOCIADO_A_OTRO_GRUPO: El documento ya está asociado a otro Grupo de Factura.
```

## Validación visual esperada

URL sandbox:

```text
/workspace/expedientes-v1/900003
```

Debe verse:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura persistido
          -> Factura fundadora
          -> Guía de remisión
          -> Nota de ingreso
          -> Transferencia
          -> Detracción
```

## Smoke test obligatorio

```text
Grupo persistido
  -> abrir “Agregar documento”
  -> buscar Guía
  -> seleccionar candidato
  -> POST usando candidato.tipoRelacion
  -> refrescar Workspace
  -> Guía visible

  -> buscar Nota de ingreso
  -> seleccionar candidato
  -> POST usando candidato.tipoRelacion
  -> refrescar Workspace
  -> Nota de ingreso visible

  -> buscar Transferencia
  -> seleccionar candidato
  -> POST usando candidato.tipoRelacion
  -> refrescar Workspace
  -> Transferencia visible

  -> buscar Detracción
  -> seleccionar candidato
  -> POST usando candidato.tipoRelacion
  -> refrescar Workspace
  -> Detracción visible

Luego repetir una asociación:
  -> respuesta idempotente=true
  -> workspaceDebeRefrescar=false
  -> mostrar mensaje informativo
```

## Validación técnica frontend

Antes de commit:

```bash
pnpm --filter web-admin build
git diff --check
git status --short
```

## Restricciones

- No backend.
- No Gateway.
- No OCR.
- No R2.
- No carga guiada.
- No NATS.
- No eventos.
- No timeline.
- No alertas.
- No edición.
- No eliminación.
- No mover documentos.
- No operar sobre grupos no persistidos.
- No usar metadata OCR.
- No calcular resumen localmente.

## Estado

Diseño React preparado para Sprint 2.0C.

Vista final del Workspace: aprobada preliminarmente.

Flujo interactivo completo: pendiente de evidencia antes de recomendar merge a `main`.
