# GO-UX-2-1C-FINAL — Matriz de evidencia visual

## Contexto

La evidencia visual fue obtenida mediante harness temporal autorizado por Maestro Intermedio.

Ruta temporal usada durante la sesión:

```text
apps/web-admin/src/app/go-ux-evidence/carga-segura/page.tsx
```

El harness:

- no es productivo;
- no está enlazado al sidebar;
- no integra Auth real;
- no integra Gateway;
- no llama ms-documentos;
- no usa R2;
- no usa fetch;
- no usa Axios;
- usa únicamente fixtures y mock client.

## Evidencias

| Archivo | Estado / escenario | Resultado |
|---|---|---|
| 01-idle.png | idle / en espera | Aprobado |
| 02-file-selected.png | archivo seleccionado | Aprobado |
| 03-validation-error.png | validation_error | Aprobado |
| 04-payload-too-large.png | payload_too_large | Aprobado |
| 05-unsupported-media.png | unsupported_media | Aprobado |
| 06-uploading.png | uploading | Aprobado |
| 07-created.png | created | Aprobado |
| 08-replayed.png | replayed | Aprobado |
| 09-duplicate.png | duplicate | Aprobado |
| 10-idempotency-conflict.png | idempotency_conflict | Aprobado |
| 11-operation-in-progress.png | operation_in_progress | Aprobado |
| 12-reconciliation-required.png | reconciliation_required | Aprobado |
| 13-dependency-unavailable.png | dependency_unavailable | Aprobado |
| 14-feature-disabled.png | feature_disabled | Aprobado |
| 15-unknown-error.png | unknown_error | Aprobado después de GO-UX-2-1C-FINAL-C1 |
| 16-request-id-copy.png | requestId visible | Aprobado |
| 17-keyboard-focus.png | foco visible por teclado | Aprobado |

## Corrección C1

Durante la primera captura de `UNKNOWN_ERROR`, el estado se mostró como `dependency_unavailable`.

Se aplicó corrección UX mínima autorizada en `GO-UX-2-1C-FINAL-C1` para asegurar:

```text
INTERNAL_SERVER_ERROR
→ unknown_error
```

y conservar:

```text
CARGA_SEGURA_STORAGE_FAILED
CARGA_SEGURA_PERSISTENCE_FAILED
CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED
→ dependency_unavailable
```

## Validación final de unknown_error

La evidencia `15-unknown-error.png` muestra:

```text
Badge:
Error inesperado

Mensaje:
Ocurrió un error no identificado.
Conserve la referencia para solicitar soporte.

requestId:
visible

Reintento manual:
ausente
```

## Validación de requestId

La evidencia `16-request-id-copy.png` demuestra requestId visible en escenario de reconciliación.

Nota:
No se implementó un botón de copiado explícito. La evidencia valida disponibilidad visual de la referencia técnica.

## Validación de foco

La evidencia `17-keyboard-focus.png` demuestra foco visible sobre control interactivo mediante navegación por teclado.

## Dictamen

Evidencia visual completa obtenida con harness temporal.

El harness debe eliminarse antes del HEAD final.
