# Auditoría

**Estado:** Aprobado  
**Responsable:** Arquitectura de Plataforma  

---

## Objetivo

Registrar acciones relevantes para trazabilidad, seguridad y soporte.

---

## Datos mínimos

- requestId
- workspaceId
- sessionContextId
- usuarioId
- empresa
- perfil
- acción
- entidad
- entidadId
- resultado
- fecha
- antes
- después

---

## Eventos iniciales

- LOGIN_OK
- LOGIN_FAIL
- SELECT_WORKSPACE
- DENIED_ACCESS
- PREVIEW_URL_GENERATED
- OCR_CONFIRMADO
- OCR_RECHAZADO
- ALERTA_CREADA
- ALERTA_RESUELTA
- REVISION_CONTABLE_CONFIRMADA

---

## Regla

Toda acción sensible debe ser auditable.

---

## Ver también

- `../08-seguridad/07-auditoria.md`
- `../21-standards/05-logging.md`
