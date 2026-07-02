# Documentos

## Qué representa

Un documento es una evidencia formal de negocio: OC, factura, guía, nota ingreso, pago, detracción, etc.

## Tipos oficiales

- `OC`
- `OS`
- `FACTURA`
- `GUIA_REMISION`
- `NOTA_INGRESO`
- `PAGO_TRANSFERENCIA`
- `PAGO_DETRACCION`
- `RECIBO_HONORARIO`
- `OTRO`

## Relaciones con expediente

Tipos de relación aprobados:

- `principal_oc`
- `principal_os`
- `principal_factura`
- `adjunto_factura`
- `adjunto_guia`
- `adjunto_nota_ingreso`
- `adjunto_transferencia`
- `adjunto_detraccion`
- `adjunto_recibo_honorario`
- `adjunto_otro`

## Documento principal

Solo puede existir un principal activo por expediente:

- OC principal, o
- OS principal, o
- Factura directa principal.

## Documento contable ancla

La factura confirmada es el ancla del período contable, aunque no sea principal.

## Referencias

### Arquitectura

- 02-arquitectura/04-motor-documental.md

### ADR

- ADR-002 Documento Lógico

### Backend

- 04-backend/02-document-engine.md

### API

- 16-api/documentos.md

### Business Flow

- 26-business-flows/02-carga-documento.md

### Data Dictionary

- 27-data-dictionary/01-documentos.documentos.md
