# Checklist de Validación - Sprint 1.3D

## Infraestructura local/demo

- [x] Docker stack levantado
- [x] API Gateway operativo
- [x] `ms-documentos` operativo
- [x] PostgreSQL operativo
- [x] NATS operativo
- [x] R2 configurado correctamente
- [x] OCR Worker conectado a NATS

## Eventos documentales

- [x] `documento.creado`
- [x] `archivo.subido`
- [x] `ocr.procesado`
- [x] `ocr.confirmado`
- [x] `ocr.rechazado`

## OCR y validación documental

- [x] Procesar OCR de OC digital
- [x] Confirmar OC como principal
- [x] Procesar y confirmar factura
- [x] Procesar y confirmar nota de ingreso
- [x] Procesar y confirmar guía de remisión
- [x] Procesar y confirmar pago por transferencia
- [x] Procesar y confirmar pago detracción

## Expediente 41

- [x] Expediente existe
- [x] Código expediente `050201`
- [x] Empresa `BBTI`
- [x] Documento principal visible
- [x] Adjuntos visibles
- [x] Preview por cada archivo disponible desde R2

## Revisión contable

- [x] Bandeja contable filtra por fecha de emisión de factura
- [x] `empresa=BBTI`
- [x] `anio=2026`
- [x] `mes=5`
- [x] La bandeja retorna expediente 41 por factura emitida el `2026-05-04`
- [x] Al abrir el expediente se cargan todos los documentos relacionados

## Observaciones para siguiente sprint

- [ ] Mejorar UI por tipo documental
- [ ] Mostrar claramente código de expediente en todos los documentos
- [ ] Mostrar estado OCR / confirmado / revisión manual
- [ ] Mejorar tarjetas de Nota de Ingreso, Detracción y Pagos
- [ ] Evaluar OCR asíncrono para PDFs escaneados
