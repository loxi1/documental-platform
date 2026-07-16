# Sprint 2.1B — Bloque 2
# Asociación del Documento Operativo Principal Existente — Evidencia runtime

## Estado

Bloque 2 autorizado por Maestro Intermedio después del cierre formal del Bloque 1.

Bloque 2 validado en runtime reutilizando el contrato existente consolidado en 2.0A.

No se realizaron cambios de código para este bloque.

Rama:

```text
feat/documental-v2-operacion-2-1B
```

Último estado conocido antes de la validación runtime del Bloque 2:

```text
92efe23c docs(documental-v2): document Sprint 2.1B bloque 1 runtime evidence
431d8978 fix(documental-v2): normalize contexto cliente destino comparison
3dc8a544 feat(documental-v2): expose materializar contexto gateway endpoint
89fe96a9 feat(documental-v2): expose materializar contexto internal endpoint
114081d7 feat(documental-v2): implement materializar contexto use case
e301f55d chore: remove obsolete docs archive
714c3abc feat(documental-v2): add idempotent contexto repository insert
ffc6ca62 docs: close Sprint 2.1A MVP diagnostic
```

## Objetivo del Bloque 2

Validar la asociación de un Documento Operativo Principal existente a un Contexto Operativo ya persistido.

Flujo esperado:

```text
Contexto Operativo persistido
↓
Seleccionar documento candidato existente
↓
POST asociar Documento Operativo Principal
↓
idempotente=false
↓
POST repetido
↓
idempotente=true
↓
auditoría única
↓
GET Workspace
↓
Documento Operativo Principal visible
```

## Alcance autorizado

Incluido:

- selección de documento candidato existente;
- asociación de OC, OS o Requerimiento de Compra según disponibilidad;
- reutilización del contrato existente de 2.0A;
- auditoría funcional;
- idempotencia;
- actualización del Workspace mediante GET canónico.

Fuera de alcance:

- React;
- upload;
- R2;
- hash;
- OCR;
- adjuntos;
- grupos de factura;
- validaciones documentales adicionales;
- revisión contable.

## ¿Qué se agregó?

No se agregó código nuevo.

El Bloque 2 fue validado reutilizando endpoints y contrato existentes:

```http
GET /api/v1/documental-v2/documentos-candidatos-principal
POST /api/v1/documental-v2/documentos-operativos-principales/asociar
GET /api/v1/documental-v2/workspace/expedientes-v1/:expedienteId
```

## ¿Qué no se modificó?

- React.
- Upload.
- R2.
- OCR.
- Adjuntos.
- Grupos de factura.
- Revisión contable.
- Migraciones PostgreSQL.
- Contrato de carga documental.
- Contrato de asociación de documentos a Grupo de Factura.

## ¿Qué riesgos elimina?

- Verifica que el Contexto Operativo materializado en Bloque 1 puede ser usado como raíz persistida.
- Verifica que un Documento Operativo Principal existente puede asociarse sin crear documentos nuevos.
- Verifica que la segunda llamada no duplica asociación ni auditoría.
- Verifica que el GET Workspace refleja la asociación mediante la vista canónica.
- Verifica que el flujo 2.0A sigue funcionando sobre el contexto creado por 2.1B.

## ¿Qué habilita para el siguiente bloque?

Habilita continuar hacia el siguiente bloque funcional del Sprint 2.1B, manteniendo fuera de alcance adjuntos, grupos de factura, OCR, R2 y React hasta autorización formal.

## Contexto Operativo usado

Se usó el Contexto Operativo creado durante el Bloque 1:

```text
contenedorOperativoId: 4
empresa_codigo: BBTI
cliente_destino_id: 2
tipo_contexto: expediente_v1
codigo: 050106
estado: activo
expedienteId: 17
```

Validación SQL:

```sql
SELECT
  id,
  empresa_codigo,
  cliente_destino_id,
  tipo_contexto,
  codigo,
  estado,
  creado_en
FROM documentos.contenedores_operativos
WHERE id = 4;
```

Resultado:

```text
id | empresa_codigo | cliente_destino_id | tipo_contexto | codigo | estado
4  | BBTI           | 2                  | expediente_v1 | 050106 | activo
```

## Candidatos consultados

Endpoint:

```http
GET /api/v1/documental-v2/documentos-candidatos-principal?empresaCodigo=BBTI&tipoPrincipal=OC&estado=confirmado&limit=20
```

Resultado relevante:

```json
{
  "documentoId": 910011,
  "tipoDocumental": "OC",
  "tipoDocumentalLabel": "Orden de compra",
  "numeroDocumento": "OC-900005",
  "titulo": "OC OC-900005",
  "proveedorNombre": "PROVEEDOR SANDBOX MULTIFACTURA S.A.C.",
  "proveedorRuc": "20100066666",
  "fechaEmision": "2026-07-11",
  "montoTotal": 6000,
  "moneda": "PEN",
  "estado": "confirmado",
  "nombreArchivo": "OC_OC-900005.pdf",
  "yaEsPrincipalV2": false
}
```

Se eligió `documentoId=910011` porque estaba confirmado y no era principal V2 previamente.

## POST creación

Endpoint:

```http
POST /api/v1/documental-v2/documentos-operativos-principales/asociar
```

Request:

```json
{
  "contenedorOperativoId": 4,
  "documentoId": 910011,
  "tipoPrincipal": "OC"
}
```

Request ID:

```text
55555555-5555-4555-8555-555555555555
```

Resultado:

```json
{
  "success": true,
  "requestId": "55555555-5555-4555-8555-555555555555",
  "data": {
    "documentoOperativoPrincipal": {
      "id": "5",
      "contenedorOperativoId": "4",
      "documentoId": "910011",
      "tipoPrincipal": "OC",
      "esPrincipalActivo": true,
      "estado": "activo",
      "vista": {
        "titulo": "OC OC-900005",
        "tipoDocumentalLabel": "Orden de compra",
        "numeroDocumento": "OC-900005",
        "proveedorNombre": "PROVEEDOR SANDBOX MULTIFACTURA S.A.C.",
        "proveedorRuc": "20100066666",
        "fechaEmision": "2026-07-11",
        "montoTotal": 6000,
        "moneda": "PEN",
        "nombreArchivo": "OC_OC-900005.pdf"
      }
    },
    "idempotente": false,
    "workspaceDebeRefrescar": true
  }
}
```

## POST idempotente

Se repitió el mismo request con otro request id.

Request ID:

```text
66666666-6666-4666-8666-666666666666
```

Resultado:

```json
{
  "success": true,
  "requestId": "66666666-6666-4666-8666-666666666666",
  "data": {
    "documentoOperativoPrincipal": {
      "id": "5",
      "contenedorOperativoId": "4",
      "documentoId": "910011",
      "tipoPrincipal": "OC",
      "esPrincipalActivo": true,
      "estado": "activo"
    },
    "idempotente": true,
    "workspaceDebeRefrescar": false
  }
}
```

La respuesta idempotente no requiere refresco obligatorio porque no hubo cambio real.

## Auditoría

Consulta:

```sql
SELECT
  id,
  accion,
  entidad,
  entidad_id,
  empresa_codigo,
  request_id,
  creado_en,
  despues
FROM core.auditoria_eventos
WHERE accion IN (
  'MATERIALIZAR_CONTEXTO_OPERATIVO',
  'ASOCIAR_DOCUMENTO_PRINCIPAL'
)
ORDER BY id DESC
LIMIT 20;
```

Resultado relevante:

```text
id: 373
accion: ASOCIAR_DOCUMENTO_PRINCIPAL
entidad: documento_operativo_principal
entidad_id: 5
empresa_codigo: BBTI
request_id: 55555555-5555-4555-8555-555555555555
```

Contenido funcional de auditoría:

```json
{
  "codigo": "050106",
  "origen": "api-gateway",
  "documentoId": 910011,
  "tipoContexto": "expediente_v1",
  "usuarioEmail": "admin@documental.local",
  "correlationId": "55555555-5555-4555-8555-555555555555",
  "empresaCodigo": "BBTI",
  "tipoPrincipal": "OC",
  "resultadoOperacion": "CREADO",
  "contenedorOperativoId": 4,
  "documentoOperativoPrincipalId": "5"
}
```

La llamada idempotente no generó una segunda auditoría funcional.

## GET Workspace después

Endpoint:

```http
GET /api/v1/documental-v2/workspace/expedientes-v1/17
```

Resultado relevante:

```json
{
  "documentosOperativosPrincipales": [
    {
      "estadoPersistencia": "persistido",
      "vista": {
        "documentoId": 910011,
        "tipoPrincipal": "OC",
        "esPrincipalActivo": true,
        "estado": "confirmado",
        "numeroDocumento": "OC-900005",
        "titulo": "OC OC-900005",
        "proveedorNombre": "PROVEEDOR SANDBOX MULTIFACTURA S.A.C.",
        "proveedorRuc": "20100066666",
        "fechaEmision": "2026-07-11",
        "montoTotal": 6000,
        "moneda": "PEN",
        "nombreArchivo": "OC_OC-900005.pdf",
        "tipoDocumentalLabel": "Orden de compra"
      },
      "persistido": {
        "id": "5",
        "contenedorOperativoId": "4",
        "documentoId": "910011",
        "tipoPrincipal": "OC",
        "esPrincipalActivo": true,
        "estado": "activo"
      }
    }
  ],
  "resumen": {
    "documentosOperativosPrincipales": 1,
    "documentosOperativosPrincipalesPersistidos": 1,
    "gruposFactura": 0,
    "gruposFacturaPersistidos": 0,
    "documentosGrupoFactura": 0,
    "documentosGrupoFacturaPersistidos": 0,
    "adjuntosNoClasificados": 0,
    "advertencias": 1
  }
}
```

## Resultado del smoke test

```text
Contexto Operativo persistido:
OK

Documento candidato existente:
OK

POST creación:
OK — idempotente=false, workspaceDebeRefrescar=true

POST repetido:
OK — idempotente=true, workspaceDebeRefrescar=false

Auditoría única:
OK

GET Workspace:
OK — Documento Operativo Principal visible
```

## Observaciones

- No se modificó código para este bloque.
- Se reutilizó el contrato existente de 2.0A.
- La asociación quedó visible en el Workspace canónico.
- La advertencia de falta de Documento Principal desapareció.
- Queda una advertencia relacionada con falta de factura, fuera del alcance del Bloque 2.
- Se mantiene la observación general sobre tipos numéricos expuestos como string en algunos campos de respuesta, no bloqueante para 2.1B.

## Conclusión

```text
Sprint 2.1B — Bloque 2:
VALIDADO EN RUNTIME

Código:
SIN CAMBIOS

Contrato 2.0A:
REUTILIZADO CORRECTAMENTE

Bloque 3:
NO AUTORIZADO TODAVÍA
```
