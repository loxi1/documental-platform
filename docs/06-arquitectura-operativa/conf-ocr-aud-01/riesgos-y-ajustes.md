# Riesgos y ajustes pendientes — CONF-OCR-AUD-01

## Estado

```text
Revisión técnica: PENDIENTE
Nueva implementación: NO AUTORIZADA
```

## Riesgos

- fallback `correlationId = requestId` sin decisión contractual;
- suplantación mediante headers no confiables;
- confirmación exitosa con fallo posterior de eventos;
- duplicación de eventos por reintento;
- compatibilidad con consumidores e históricos;
- cobertura de regresión general todavía no definida.

## Ajustes sujetos a GO

No implementar cambios adicionales hasta aprobar contrato, frontera de confianza, correlación, atomicidad, idempotencia y criterios de regresión.
