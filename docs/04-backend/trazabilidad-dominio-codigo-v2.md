# Trazabilidad dominio → código — Modelo Documental V2

## Propósito

Este documento acompaña la implementación de Sprint 1.6C y registra dónde vive cada regla principal del Modelo Documental V2 dentro del código.

No redefine el dominio. No define endpoints. No define frontend.

## Matriz de trazabilidad

| Documento de dominio | Concepto | Implementación inicial |
| --- | --- | --- |
| `docs/17-domain/contenedor-operativo.md` | Contenedor Operativo | `ContenedorOperativoService` |
| `docs/17-domain/jerarquia-documental-v2.md` | Documento Operativo Principal | `DocumentoOperativoPrincipalService` |
| `docs/17-domain/grupos-factura.md` | Grupo de Factura | `GrupoFacturaService` |
| `docs/17-domain/grupos-factura.md` | Adjuntos del Grupo de Factura | `GrupoFacturaDocumentoService` |
| `docs/17-domain/legacy-vs-web.md` | Legacy solo histórico | Ningún Service V2 escribe Legacy |
| `docs/17-domain/contexto-operativo.md` | Contexto operativo por módulo | Pendiente de Services de aplicación |
| `docs/17-domain/glosario-modelo-documental-v2.md` | Lenguaje ubicuo | Nombres de services y repositories V2 |

## Reglas de arquitectura vigentes

1. Service V2 usa Repository V2.
2. Service V2 no habla directo con tablas V1.
3. Service V2 todavía no escribe V1.
4. Service V2 todavía no publica eventos.
5. No OCR.
6. No R2.
7. No NATS.
8. No Controllers.
9. No Gateway.
10. No Frontend.

## Invariantes implementadas en Sprint 1.6C

| Invariante | Service responsable |
| --- | --- |
| Un Contenedor Operativo activo no se duplica por empresa, tipo y código. | `ContenedorOperativoService` |
| Un Documento Operativo Principal debe pertenecer a un Contenedor Operativo activo. | `DocumentoOperativoPrincipalService` |
| Un documento no puede ser Documento Operativo Principal activo duplicado. | `DocumentoOperativoPrincipalService` |
| Una factura pertenece a un único Grupo de Factura activo o vigente. | `GrupoFacturaService` |
| Un Grupo de Factura debe pertenecer a un Documento Operativo Principal activo. | `GrupoFacturaService` |
| Un documento activo no puede pertenecer a varios Grupos de Factura activos. | `GrupoFacturaDocumentoService` |
| Un adjunto debe pertenecer a un Grupo de Factura vigente. | `GrupoFacturaDocumentoService` |

## Pendiente para próximos sprints

- Services de aplicación para flujos completos de Compras V2.
- Controllers V2.
- DTO públicos.
- API Gateway.
- Integración frontend.
- Eventos documentales.
- Alertas documentales.
