# CONF-OCR-AUD-01 — Auditoría y correlación de confirmación OCR

## Estado

```text
Bloque: SEPARADO LOCALMENTE
Contrato: PENDIENTE DE VALIDACIÓN
Implementación: PENDIENTE DE DISPOSICIÓN TÉCNICA
Integración: NO AUTORIZADA
Push: NO REALIZADO
```

## Rama

```text
feat/conf-ocr-aud-01
```

## Commits

```text
2eec1920 feat(documentos): propagar identidad y correlación en confirmación OCR
302e1769 test(documentos): validar auditoría de confirmación OCR
```

## Alcance identificado

```text
confirmación OCR con expediente
→ identidad autenticada
→ usuario validador
→ requestId/correlationId
→ eventos ocr.confirmado y expediente.vinculado
→ pruebas de Gateway, Controller y Service
```

Este bloque no pertenece al Sprint 2.1C.
