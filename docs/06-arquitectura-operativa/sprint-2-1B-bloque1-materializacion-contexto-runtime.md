# Sprint 2.1B — Bloque 1
# Materialización del Contexto Operativo — Evidencia runtime

## Estado

Bloque 1 implementado y validado en runtime.

Rama:

```text
feat/documental-v2-operacion-2-1B
```

Commits:

```text
714c3abc feat(documental-v2): add idempotent contexto repository insert
e301f55d chore: remove obsolete docs archive
114081d7 feat(documental-v2): implement materializar contexto use case
89fe96a9 feat(documental-v2): expose materializar contexto internal endpoint
3dc8a544 feat(documental-v2): expose materializar contexto gateway endpoint
431d8978 fix(documental-v2): normalize contexto cliente destino comparison
```

## ¿Qué se agregó?

- Inserción idempotente física en `ContenedorOperativoRepository`.
- Use Case `MaterializarContextoOperativoV2UseCase`.
- Endpoint interno en `ms-documentos`.
- Endpoint público en `api-gateway`.
- Auditoría `MATERIALIZAR_CONTEXTO_OPERATIVO`.
- Tests unitarios y de controller.
- Validación runtime completa.

## ¿Qué no se modificó?

- React.
- Upload.
- R2.
- OCR.
- Adjuntos.
- Grupos de factura.
- Documento Operativo Principal.
- Candidatos.
- Asociación de principal.
- Revisión contable.
- Migraciones PostgreSQL.

## ¿Qué riesgos elimina?

- Evita duplicar Contextos Operativos por reintentos.
- Maneja carrera concurrente usando inserción idempotente sobre la clave física.
- Evita acceso cruzado por empresa y cliente destino.
- Evita auditoría duplicada en retornos idempotentes.
- Mantiene el Workspace como fuente canónica.

## ¿Qué habilita para el siguiente bloque?

Habilita que el Bloque 2 pueda asociar un Documento Operativo Principal existente a un Contexto Operativo ya persistido, previa autorización formal.

## Validaciones técnicas

### Tests

```text
pnpm --filter @documental/ms-documentos test -- contenedor-operativo.repository.spec.ts
Resultado: 4 passed

pnpm --filter @documental/ms-documentos test -- materializar-contexto-operativo-v2.usecase.spec.ts
Resultado: 6 passed

pnpm --filter @documental/ms-documentos test -- documental-v2.controller.spec.ts
Resultado: 12 passed

pnpm --filter @documental/api-gateway test -- documental-v2-gateway.controller.spec.ts
Resultado: 12 passed
```

### Builds

```text
pnpm --filter @documental/ms-documentos build
Resultado: OK

pnpm --filter @documental/api-gateway build
Resultado: OK
```

### Git

```text
git diff --check
Resultado: OK

git status --short
Resultado: limpio
```

## Smoke test runtime

Expediente usado:

```text
id: 17
empresa_codigo: BBTI
codigo_expediente: 050106
cliente_destino_id: 2
descripcion: ALMACEN Y LOGISTICA
```

### Workspace antes

```text
estadoPersistencia = no_persistido
persistido = null
```

### POST creación

Endpoint:

```http
POST /api/v1/documental-v2/workspace/expedientes-v1/17/materializar-contenedor
```

Resultado:

```json
{
  "success": true,
  "data": {
    "expedienteId": 17,
    "contenedorOperativo": {
      "id": 4,
      "empresaCodigo": "BBTI",
      "clienteDestinoId": "2",
      "tipoContexto": "expediente_v1",
      "codigo": "050106",
      "estado": "activo"
    },
    "idempotente": false,
    "workspaceDebeRefrescar": true
  }
}
```

### POST idempotente

Resultado:

```json
{
  "success": true,
  "data": {
    "expedienteId": 17,
    "contenedorOperativo": {
      "id": 4,
      "empresaCodigo": "BBTI",
      "clienteDestinoId": "2",
      "tipoContexto": "expediente_v1",
      "codigo": "050106",
      "estado": "activo"
    },
    "idempotente": true,
    "workspaceDebeRefrescar": true
  }
}
```

### Auditoría

```text
accion = MATERIALIZAR_CONTEXTO_OPERATIVO
entidad = contenedor_operativo
entidad_id = 4
request_id = 33333333-3333-4333-8333-333333333333
```

La llamada idempotente no duplicó auditoría funcional.

### Workspace después

```text
estadoPersistencia = persistido
persistido.id = 4
persistido.estado = activo
```

## Corrección aplicada durante runtime

Primer smoke test con expediente 16 detectó comparación incorrecta entre:

```text
clienteDestinoIdContenedor = 2
clienteDestinoIdEsperado = "2"
```

Se corrigió normalizando ambos valores antes de comparar.

Commit:

```text
431d8978 fix(documental-v2): normalize contexto cliente destino comparison
```

## Conclusión

```text
Sprint 2.1B — Bloque 1:
IMPLEMENTADO Y VALIDADO EN RUNTIME

Bloque 2:
NO AUTORIZADO TODAVÍA
```
