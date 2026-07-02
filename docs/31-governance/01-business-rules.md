# Business Rules

## BR-001 — Workspace define el contexto operativo

Toda operación funcional se ejecuta dentro de un Workspace.

## BR-002 — Documento lógico y archivo físico son conceptos distintos

Un archivo subido no necesariamente crea un nuevo documento lógico.

## BR-003 — La clave documental la calcula el backend

El frontend nunca es fuente oficial de clave documental.

## BR-004 — Los archivos físicos nunca se sobrescriben

Toda corrección o reemplazo genera versión.

## BR-005 — OCR original nunca se pierde

Debe conservarse OCR original, editado y confirmado.

## BR-006 — Factura confirmada es ancla contable

La fecha_emision de la FACTURA confirmada define el período contable.

## BR-007 — Revisión Contable nace desde facturas confirmadas

No lista expedientes sin factura confirmada.

## BR-008 — Frontend representa el dominio

No implementa reglas documentales ni contables.

## BR-009 — Backend gobierna el dominio

Reglas, claves, validaciones y relaciones finales se resuelven en backend.

## BR-010 — Handbook es fuente oficial

Las decisiones en chats no son oficiales hasta estar en el repositorio.
