# 16-api — APIs Documentales

Endpoints documentales aprobados para el Motor Documental.

## Convenciones

- Todos los endpoints públicos pasan por `api-gateway` con prefijo `/api/v1`.
- Las respuestas se envuelven como `{ success, requestId, timestamp, data | error }`.
- Algunos endpoints requieren token JWT.
- R2 no se expone públicamente; se usa signed URL.
