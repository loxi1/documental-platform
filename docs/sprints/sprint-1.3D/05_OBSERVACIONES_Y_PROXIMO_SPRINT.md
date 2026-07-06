# Observaciones y Próximo Sprint

## Observaciones del Sprint 1.3D

El backend documental quedó estable para la demo local:

- Carga guiada funcionando
- OCR funcionando con NATS y Worker Python
- Eventos documentales básicos registrados
- Confirmación de documentos con expediente funcionando
- Preview seguro desde R2 funcionando
- Bandeja contable filtrando correctamente por fecha de emisión de factura

## Hallazgos

### 1. OCR escaneado requiere más tiempo
Un PDF escaneado demoró aproximadamente 53 segundos en backend. El frontend tenía timeout de 30 segundos.

Recomendación rápida:

```text
Aumentar timeout frontend para operaciones OCR a 90s o 120s.
```

Recomendación arquitectónica:

```text
Convertir OCR pesado a flujo asíncrono:
POST procesar-ocr -> 202 procesando
Worker procesa en segundo plano
Frontend consulta estado
```

### 2. La Nota de Ingreso necesita mejor visualización
La metadata existe, pero visualmente puede verse pobre si faltan campos como razón social, serie o monto.

### 3. Detracción y pagos requieren tarjetas específicas
Los pagos no se leen igual que facturas u OC. La UI debe mostrar banco, número de operación, fecha de pago, monto y moneda.

### 4. Revisión contable funciona, pero requiere vista más clara
La lógica está bien:

```text
Bandeja filtra por fecha de emisión de factura.
Vista del expediente muestra todos los documentos vinculados.
```

Ahora falta mejorar la experiencia visual para contabilidad.

## Próximo sprint recomendado

```text
Sprint 1.4 - Vista documental contable y UX por tipo de documento
```

## Objetivo Sprint 1.4
Mejorar la vista de revisión contable / vista 360 del expediente para que el usuario pueda interpretar rápidamente la trazabilidad documental.

## Alcance sugerido Sprint 1.4

- Tarjeta de documento principal
- Tarjeta de factura
- Tarjeta de guía
- Tarjeta de nota de ingreso
- Tarjeta de transferencia
- Tarjeta de detracción
- Indicador de estado OCR
- Indicador de confirmado / revisión manual
- Código de expediente visible
- Tipo relación visible
- Botón preview por documento
- Ordenamiento por tipo de relación y fecha

## No incluir todavía

- IA avanzada
- Embeddings
- Alertas automáticas
- Cierre contable automático
- Event sourcing
- Versionado avanzado

## Criterio de aceptación Sprint 1.4

```text
Un contador debe poder abrir un expediente y entender, sin entrar al JSON, qué documentos existen, qué falta, qué está confirmado y qué requiere revisión manual.
```
