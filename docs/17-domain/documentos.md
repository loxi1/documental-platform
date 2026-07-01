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
