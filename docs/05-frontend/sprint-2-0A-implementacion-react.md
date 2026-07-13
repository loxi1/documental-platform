# Sprint 2.0A — Implementación React asociación Documento Principal V2

## Estado

Implementación frontend preparada para Web Admin sobre la rama `feat/documental-v2-operacion-2-0A`.

## Alcance implementado

- Estado vacío `Sin Documento Operativo Principal`.
- Acción `Asociar documento principal`.
- Panel lateral de búsqueda de candidatos.
- Consumo Gateway `GET /api/v1/documental-v2/documentos-candidatos-principal`.
- Selección de OC candidata.
- Resumen antes de confirmar.
- Consumo Gateway `POST /api/v1/documental-v2/documentos-operativos-principales/asociar`.
- Manejo de `idempotente`.
- Manejo de `workspaceDebeRefrescar`.
- Mensajes humanos para errores funcionales.

## Restricciones respetadas

- No backend.
- No Gateway.
- No OCR.
- No R2.
- No carga guiada.
- No reemplazo de principal.
- No desasociación.
- No creación automática de grupos factura.
- No edición del documento.
- No lectura directa de ms-documentos.
- No lectura de metadata OCR.

## Validación sugerida

```bash
pnpm --filter web-admin build
git diff --check
git status --short
```

## Smoke test manual

```text
Workspace sin principal
→ Asociar documento principal
→ buscar OC candidata
→ seleccionar OC
→ confirmar
→ si workspaceDebeRefrescar=true, refrescar Workspace
→ principal visible
→ repetir operación
→ idempotente=true
→ mostrar “El documento ya estaba asociado como principal.”
```
