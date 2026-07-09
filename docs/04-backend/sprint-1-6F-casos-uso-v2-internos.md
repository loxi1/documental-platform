# Sprint 1.6F — Casos de uso V2 internos

## Objetivo

Construir una respuesta interna tipo Workspace Documental V2 usando:

- Adaptadores V1 ↔ V2.
- Services V2 en modo lectura.

El caso de uso no activa flujos operativos, no escribe datos y no integra Web Admin.

## Alcance permitido

- Leer V1 mediante `V1V2CompatibilityAdapter`.
- Construir la vista V2 en memoria.
- Consultar Services V2 solo para conocer si la representación ya existe persistida.
- Devolver una respuesta interna consolidada desde `ms-documentos`.

## Alcance prohibido

- No Gateway.
- No Frontend.
- No OCR.
- No R2.
- No NATS.
- No eventos.
- No alertas.
- No modificación de V1.
- No escritura automática en V2.

## Caso de uso

Archivo principal:

```text
apps/ms-documentos/src/documental-v2/use-cases/workspace-documental-v2.usecase.ts
```

Responsabilidad:

```text
Expediente V1
  -> Adapter V1 ↔ V2
      -> Vista V2 en memoria
          -> Consulta read-only de Services V2
              -> WorkspaceDocumentalV2View
```

## Endpoint interno de validación

Base real del servicio por prefijo global:

```text
/api/v1/documental-v2/workspace/expedientes-v1/:expedienteId
```

Ejemplo:

```bash
curl http://localhost:3002/api/v1/documental-v2/workspace/expedientes-v1/41
```

En Docker local, si el puerto 3002 no está publicado al host:

```bash
docker exec dp_ms_documentos node -e "
fetch('http://127.0.0.1:3002/api/v1/documental-v2/workspace/expedientes-v1/41')
  .then(async r => {
    console.log('STATUS', r.status);
    console.log(await r.text());
  });
"
```

## Criterio de validación

Para expediente V1 41 se espera:

```text
documentosOperativosPrincipales = 1
gruposFactura = 1
adjuntosNoClasificados = 0
advertencias = 0
```

Si el smoke test anterior de Sprint 1.6D dejó filas V2 persistidas, también se espera:

```text
documentosOperativosPrincipalesPersistidos = 1
gruposFacturaPersistidos = 1
```

## Regla de seguridad

Este caso de uso puede consultar Services V2, pero no llama métodos `crear`, `actualizar` ni `anular`.
