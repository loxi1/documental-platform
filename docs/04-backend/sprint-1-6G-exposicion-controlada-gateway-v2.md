# Sprint 1.6G — Exposición controlada V2 por API Gateway

## Estado

Entregable para validación.

## Objetivo

Exponer de forma controlada, desde `api-gateway`, la vista interna del Workspace Documental V2 generada por `ms-documentos`.

Ruta expuesta por Gateway:

```http
GET /api/v1/documental-v2/workspace/expedientes-v1/:expedienteId
```

Ruta upstream en `ms-documentos`:

```http
GET /api/v1/documental-v2/workspace/expedientes-v1/:expedienteId
```

## Alcance implementado

- Controller interno en `api-gateway` para `documental-v2`.
- Módulo `DocumentalV2GatewayModule` registrado en `AppModule`.
- Validación de token vía NATS Auth, igual que el resto del Gateway.
- Reenvío controlado a `ms-documentos`.
- Validación del workspace contra empresa y cliente destino del token antes de devolver la respuesta.
- Tests unitarios básicos del controller.

## Restricciones respetadas

- No Frontend.
- No OCR.
- No R2.
- No escritura en V1.
- No escritura automática en V2.
- No eventos nuevos.
- No alertas.
- No integración operativa real.

## Regla funcional

El Gateway solo expone la respuesta interna del Workspace Documental V2. No activa flujos operativos.

## Validaciones sugeridas

```bash
pnpm --filter @documental/api-gateway build
pnpm --filter @documental/api-gateway exec jest documental-v2 --runInBand
pnpm --filter @documental/ms-documentos build
pnpm --filter @documental/ms-documentos exec jest documental-v2 --runInBand
git diff --check
```

Después de reconstruir `api-gateway` y `ms-documentos`, validar runtime vía Gateway con token válido:

```bash
curl -s \
  -H "Authorization: Bearer <TOKEN>" \
  http://127.0.0.1:3000/api/v1/documental-v2/workspace/expedientes-v1/41 | jq
```

Resultado esperado:

- HTTP 200.
- `success: true`.
- `resumen.documentosOperativosPrincipales = 1`.
- `resumen.gruposFactura = 1`.
- `resumen.adjuntosNoClasificados = 0`.
- `resumen.advertencias = 0`.

## Observación

Este sprint solo habilita el paso controlado por Gateway. El Web Admin todavía no debe consumirlo hasta autorización expresa del sprint frontend.
