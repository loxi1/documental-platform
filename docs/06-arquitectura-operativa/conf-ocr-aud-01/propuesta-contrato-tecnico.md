# Propuesta de contrato técnico — CONF-OCR-AUD-01

## Estado

```text
PROPUESTA
PENDIENTE DE VALIDACIÓN
NO IMPLEMENTAR AJUSTES ADICIONALES
```

## Principios

1. La identidad proviene del contexto autenticado.
2. `usuarioId` no es autoridad desde el body.
3. Gateway propaga identidad y trazabilidad.
4. Cada solicitud tiene `requestId`.
5. `correlationId` requiere regla explícita.
6. Se registra al usuario validador.
7. Los eventos conservan trazabilidad.

## Headers conceptuales

```text
x-user-id
x-user-email
x-workspace-id
x-empresa-codigo
x-cliente-destino-id
x-request-id
x-correlation-id
```

## Decisiones pendientes

- relación entre request y correlation ID;
- frontera confiable de headers;
- nombres y payloads canónicos de eventos;
- atomicidad y recuperación;
- idempotencia;
- regresión requerida.

## Integración

```text
Contrato: NO APROBADO
Integración: NO AUTORIZADA
```
