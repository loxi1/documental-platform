# Sprint 2.0B — Diseño React Grupo de Factura V2

## Reporte de alineación — Maestro Sucesor II

**Rama activa:**

```text
feat/documental-v2-operacion-2-0B
```

**Sprint:**

```text
Sprint 2.0B — Alta operativa de Grupo de Factura V2
```

**Objetivo funcional aprobado:**

```text
Documento Operativo Principal
→ Factura existente
→ Grupo Factura persistido
→ Workspace actualizado
```

---

## 1. Confirmación recibida desde Maestro Sucesor I

Desde Maestro Sucesor I se confirma la recepción y validación de las observaciones de Maestro Sucesor II.

La interpretación de frontend queda aceptada:

- React consumirá únicamente Gateway.
- React no enviará identidad ni contexto operativo sensible.
- React usará el patrón `grupoFactura + idempotente + workspaceDebeRefrescar`.
- React refrescará Workspace usando el endpoint oficial.
- React distinguirá grupos V2 mediante `estadoPersistencia = persistido`.
- Los grupos legacy/adaptador V1 permanecerán como `estadoPersistencia = no_persistido`.
- `documentosGrupoFactura = 0` es correcto en Sprint 2.0B.
- La Factura fundadora vive en `vista` del Grupo.
- Los errores funcionales vienen anidados y React podrá usar extractor profundo.

---

## 2. Regla central del Sprint 2.0B

La Factura es el documento fundador del Grupo de Factura, pero no será el único documento futuro del Grupo.

En Sprint 2.0B solo se implementa:

```text
Documento Operativo Principal
→ Factura existente
→ Grupo Factura persistido
```

En Sprint 2.0C se incorporarán documentos secundarios:

```text
Grupo Factura
  ├── Factura fundadora
  ├── Guías
  ├── Notas de Ingreso
  ├── Transferencias
  ├── Detracciones
  ├── Notas de Crédito
  ├── Notas de Débito
  └── Otros documentos secundarios
```

---

## 3. Contrato Gateway consumido por React

### 3.1 Buscar Facturas candidatas

```http
GET /api/v1/documental-v2/facturas-candidatas
```

Parámetros mínimos:

```text
documentoOperativoPrincipalId
texto
pagina
limite
```

Ejemplo:

```http
GET /api/v1/documental-v2/facturas-candidatas?documentoOperativoPrincipalId=3&texto=F001&pagina=1&limite=20
```

Respuesta runtime validada:

```json
{
  "success": true,
  "data": [
    {
      "documentoId": 910002,
      "tipoDocumental": "FACTURA",
      "tipoDocumentalLabel": "Factura",
      "numeroDocumento": "00009001",
      "facturaLabel": "Factura F001-00009001",
      "proveedorNombre": "PROVEEDOR SANDBOX FACTURA A S.A.C.",
      "proveedorRuc": "20100022222",
      "fechaEmision": "2026-07-02",
      "importeTotal": 1500,
      "moneda": "PEN",
      "estado": "confirmado",
      "nombreArchivo": "FACTURA_F001_00009001.pdf",
      "yaTieneGrupoFacturaV2": true
    }
  ]
}
```

---

### 3.2 Crear / asociar Grupo Factura

```http
POST /api/v1/documental-v2/grupos-factura/asociar
```

Payload oficial:

```json
{
  "documentoOperativoPrincipalId": 3,
  "facturaDocumentoId": 910002
}
```

React **no debe enviar**:

```text
usuarioId
usuarioEmail
empresaCodigo
workspaceId
clienteDestinoId
contenedorOperativoId
metadata
datos del proveedor
datos del archivo
```

Toda identidad y contexto operativo vienen desde JWT/Gateway.

---

## 4. Respuesta de creación

```json
{
  "success": true,
  "data": {
    "grupoFactura": {
      "id": 2,
      "contenedorOperativoId": 2,
      "documentoOperativoPrincipalId": 3,
      "facturaDocumentoId": 910002,
      "estado": "pendiente_revision",
      "vista": {
        "facturaLabel": "Factura F001-00009001",
        "facturaSerie": "F001",
        "facturaNumero": "00009001",
        "proveedorNombre": "PROVEEDOR SANDBOX FACTURA A S.A.C.",
        "proveedorRuc": "20100022222",
        "fechaEmision": "2026-07-02",
        "importeTotal": 1500,
        "moneda": "PEN",
        "nombreArchivo": "FACTURA_F001_00009001.pdf",
        "estadoRevisionLabel": "Pendiente de revisión"
      }
    },
    "idempotente": false,
    "workspaceDebeRefrescar": true
  }
}
```

Regla React:

```text
Si workspaceDebeRefrescar = true,
React debe refrescar el Workspace usando el endpoint oficial del Workspace.
```

React no debe reconstruir el Workspace desde la respuesta del POST.

---

## 5. Respuesta idempotente

```json
{
  "success": true,
  "data": {
    "grupoFactura": {
      "id": 2,
      "contenedorOperativoId": 2,
      "documentoOperativoPrincipalId": 3,
      "facturaDocumentoId": 910002,
      "estado": "pendiente_revision"
    },
    "idempotente": true,
    "workspaceDebeRefrescar": false
  }
}
```

Regla React:

```text
Si idempotente = true:
- mostrar mensaje informativo;
- no tratar como error;
- no forzar recarga pesada si workspaceDebeRefrescar = false.
```

---

## 6. Forma estable del objeto Workspace para gruposFactura

Maestro Sucesor I acepta incorporar al contrato final backend la forma estable del objeto `gruposFactura` en:

```text
docs/04-backend/sprint-2-0B-contrato-grupo-factura.md
```

Debe incluir explícitamente:

```text
grupoFactura.estadoPersistencia
grupoFactura.persistido.id
grupoFactura.persistido.documentoOperativoPrincipalId
grupoFactura.persistido.facturaDocumentoId
grupoFactura.vista.facturaLabel
grupoFactura.vista.estadoRevisionLabel
grupoFactura.vista.documentos
grupoFactura.documentos
```

Interpretación:

```text
estadoPersistencia = persistido
→ Grupo Factura V2 operativo.

estadoPersistencia = no_persistido
→ Grupo legacy/adaptador V1 en modo lectura.
```

En Sprint 2.0B:

```text
grupoFactura.vista.documentos = []
grupoFactura.documentos = []
```

Eso es correcto, porque los documentos secundarios se asociarán recién en Sprint 2.0C.

---

## 7. Workspace posterior esperado

Después del POST y posterior refresh, el Workspace debe mostrar:

```text
Contexto Operativo
→ Documento Operativo Principal
→ Grupo Factura persistido
→ Factura fundadora
→ Adjuntos = 0
```

Resumen backend esperado:

```text
documentosOperativosPrincipales = 1
documentosOperativosPrincipalesPersistidos = 1
gruposFactura >= 1
gruposFacturaPersistidos >= 1
documentosGrupoFactura = 0
documentosGrupoFacturaPersistidos = 0
adjuntosNoClasificados = 0
advertencias = 0
```

React no debe calcular el resumen.

---

## 8. Consideración sandbox 900003

En el sandbox `900003` puede existir:

```text
1 grupo no_persistido proveniente del adaptador V1.
1 grupo persistido creado por operación V2.
```

La UI debe distinguirlos visualmente:

```text
estadoPersistencia = no_persistido
→ Grupo legacy/adaptador V1.
→ Solo lectura.
→ No representa operación V2 persistida.

estadoPersistencia = persistido
→ Grupo Factura V2 real.
→ Creado por operación 2.0B.
→ Base para Sprint 2.0C.
```

---

## 9. Fuente correcta del ID operativo principal

React debe usar:

```text
documentosOperativosPrincipales[].persistido.id
```

como:

```text
documentoOperativoPrincipalId
```

No debe usar:

```text
documentosOperativosPrincipales[].vista.documentoId
```

Ese es el ID del documento documental existente, no el ID operativo V2.

Ejemplo correcto:

```json
{
  "documentoOperativoPrincipalId": 3,
  "facturaDocumentoId": 910002
}
```

---

## 10. Componentes React sugeridos

### 10.1 GrupoFacturaCard

Responsable de mostrar un Grupo Factura.

Debe leer:

```text
grupo.estadoPersistencia
grupo.persistido
grupo.vista
grupo.documentos
```

Campos mínimos:

```text
facturaLabel
proveedorNombre
proveedorRuc
fechaEmision
importeTotal
moneda
nombreArchivo
estadoRevisionLabel
Adjuntos = 0
```

---

### 10.2 CrearGrupoFacturaPanel

Responsable de búsqueda, selección y confirmación.

Debe permitir:

```text
buscar factura por texto
listar candidatas
seleccionar factura
mostrar resumen
confirmar
manejar loading
manejar errores
manejar idempotencia
```

---

### 10.3 FacturaCandidataItem

Responsable de mostrar cada factura candidata.

Campos:

```text
facturaLabel
proveedorNombre
proveedorRuc
fechaEmision
importeTotal
moneda
estado
nombreArchivo
yaTieneGrupoFacturaV2
```

Si `yaTieneGrupoFacturaV2 = true`, debe mostrar advertencia o deshabilitar confirmación.

---

## 11. Estados visuales mínimos

```text
Sin Grupo Factura persistido
Grupo Factura persistido
Grupo legacy/no_persistido
Buscando facturas
Sin resultados
Factura candidata seleccionada
Factura ya asociada
Confirmando asociación
Asociación creada
Operación idempotente
Error funcional
```

---

## 12. Errores funcionales

Errores validados por Gateway:

```text
FACTURA_NO_ENCONTRADA
DOCUMENTO_NO_ES_FACTURA
DOCUMENTO_OPERATIVO_PRINCIPAL_NO_ENCONTRADO
FACTURA_YA_TIENE_GRUPO_ACTIVO
```

Mensajes sugeridos:

```text
FACTURA_NO_ENCONTRADA
→ La factura seleccionada no existe o ya no está disponible.

DOCUMENTO_NO_ES_FACTURA
→ El documento seleccionado no es una factura válida.

DOCUMENTO_OPERATIVO_PRINCIPAL_NO_ENCONTRADO
→ El Documento Operativo Principal no existe o ya no está disponible.

FACTURA_YA_TIENE_GRUPO_ACTIVO
→ La factura ya pertenece a un Grupo de Factura persistido.
```

Los errores vienen anidados desde Gateway.

React debe usar extractor profundo, igual que en Sprint 2.0A:

```text
error.code
error.details.code
error.details.details.code
error.upstream.error.details.code
```

No basta leer solamente `error.code`.

---

## 13. Restricciones frontend obligatorias

React no debe:

```text
consumir ms-documentos directo
calcular resumen
reconstruir Workspace
inferir reglas desde metadata
inventar estados
modificar V1
asociar Guías
asociar Notas de Ingreso
asociar Transferencias
asociar Detracciones
asociar Notas de Crédito
asociar Notas de Débito
enviar identidad en payload
duplicar lógica de validación backend
```

---

## 14. Flujo React esperado

```text
1. Usuario abre Workspace 900003.
2. React lee Workspace desde Gateway.
3. React identifica Documento Operativo Principal persistido.
4. React muestra sección Grupo Factura.
5. Si aplica, muestra acción Crear Grupo Factura.
6. Usuario abre panel.
7. Usuario busca factura.
8. React llama GET /facturas-candidatas.
9. Usuario selecciona factura.
10. React muestra resumen.
11. Usuario confirma.
12. React llama POST /grupos-factura/asociar.
13. Si workspaceDebeRefrescar=true, React refresca Workspace.
14. Grupo persistido se muestra desde Workspace.
15. Si idempotente=true, React muestra mensaje informativo.
```

---

## 15. Criterio de aceptación frontend

```text
web-admin build OK
git diff --check OK
React consume solo Gateway
Payload sin identidad ni contexto
Usa documentoOperativoPrincipal.persistido.id
No usa documentoId de OC como ID operativo
Lista facturas candidatas
Muestra yaTieneGrupoFacturaV2
Bloquea o advierte factura ya asociada
POST maneja idempotencia
workspaceDebeRefrescar refresca Workspace
Grupo persistido se pinta desde GET Workspace
Grupo no_persistido se distingue como legacy/lectura
Adjuntos = 0 se muestra sin interpretarlo como error
Errores funcionales anidados tienen mensaje humano
```

---

## 16. Estado actual de autorización

React queda habilitado para **análisis y diseño**.

React sigue bloqueado para **cierre final de implementación y aprobación** hasta que Maestro Sucesor I entregue:

```text
build ms-documentos OK
tests ms-documentos OK
build api-gateway OK
tests gateway OK
git diff --check OK
git status limpio
contrato final documentado
```

---

## 17. Dictamen Maestro Sucesor II

```text
La observación de Sucesor II queda aceptada e incorporada al contrato final 2.0B.

El diseño React puede prepararse bajo el contrato validado.

No se debe cerrar implementación React hasta recibir cierre técnico completo de Backend/Gateway.
```