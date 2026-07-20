# Sprint 2.1C — Carga Documental Segura MVP

## Estado oficial

```text
Sprint 2.1C: ABIERTO
Roadmap: EN EJECUCIÓN / EVIDENCIA PENDIENTE
Contrato técnico: PENDIENTE
Implementación: NO AUTORIZADA
Integración: BLOQUEADA
Push: BLOQUEADO
```

## Propósito

Consolidar la evidencia disponible sobre el flujo real de carga documental segura y separar con claridad las capacidades observadas, la evidencia pendiente, las brechas de consistencia y la propuesta contractual aún no aprobada.

Este paquete no declara cierre funcional ni autoriza implementación.

## Alcance documental

```text
prevalidación
→ cálculo SHA-256
→ detección de duplicado físico
→ creación o resolución del documento lógico
→ almacenamiento R2
→ registro del archivo físico
→ evento de carga
→ disponibilidad posterior
```

Quedan fuera: OCR, confirmación OCR, asociación V2, Grupo Factura, revisión contable, alertas, cambios de código, migraciones, integración y publicación.

## Documentos

1. `01-evidencia-carga-documental-segura.md`
2. `02-informe-tecnico-sprint-2-1C-abierto.md`
3. `03-guia-regularizacion-local.md`
4. `04-propuesta-contrato-carga-documental-segura-pendiente.md`
5. `05-matriz-maestra-evidencia-sprint-2-1C.md`
6. `06-evidencia-duplicado-secuencial.md`
7. `07-propuesta-contractual-carga-documental-segura.md`
8. `08-diseno-tecnico-implementacion-carga-documental-segura.md`
9. `09-diseno-detallado-persistencia-y-plan-implementacion.md`
10. `10-paquete-go-0-baseline-implementacion.md`
11. `11-paquete-go-1-persistencia.md`
12. `12-evidencia-prevalidacion-go-1-y-ddl-final.md`
13. `13-correcciones-invariantes-go-1C.md`
14. `14-correccion-go-1D-ubicacion-postvalidaciones-0012.md`
15. `15-evidencia-runner-migraciones-go-1e.md`

La evidencia GO-1E documenta una implementación y validación local aislada.
No autoriza aplicación en producción, RDS, integración, merge o push.

El roadmap oficial permanece en:

```text
docs/06-arquitectura-operativa/sprint-2-1C-roadmap-carga-documental-segura.md
```

No debe duplicarse dentro de esta carpeta.
