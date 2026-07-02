# Business Rules Index

## BR-000 — El repositorio es la fuente oficial

ChatGPT, reuniones y correos no son fuente oficial hasta que el conocimiento esté en el repositorio.

## BR-001 — Workspace define contexto operativo

Toda operación ocurre dentro de un Workspace.

## BR-002 — Documento lógico ≠ archivo físico

Un archivo físico puede ser versión, evidencia o reemplazo de un documento lógico.

## BR-003 — Backend calcula clave documental

El frontend nunca define la clave final.

## BR-004 — Archivos físicos nunca se sobrescriben

Toda corrección o reemplazo genera una versión.

## BR-005 — OCR original nunca se pierde

Se conserva OCR original, editado y confirmado.

## BR-006 — Factura confirmada es ancla contable

La fecha_emision de la FACTURA confirmada define el período contable.

## BR-007 — Revisión Contable nace desde facturas confirmadas

No desde expedientes sin factura.

## BR-008 — UI Foundation gobierna pantallas

Primero componente común; luego pantalla.

## BR-009 — RDS no vive en Docker en producción

PostgreSQL productivo vive en AWS RDS.

## BR-010 — R2 privado

Los documentos se visualizan solo mediante Signed URL.
