# Workspace Documental V2 — Casos oficiales de validación

## Propósito

Este documento consolida los casos oficiales del Sandbox Documental para validar el Workspace Documental V2.

Estos datos sirven para:

```text
validación manual
regresión funcional
validación del contrato Gateway
validación UX/Web Admin
futuras pruebas automatizadas
```

---

## Regla de aislamiento

Los casos sandbox usan la empresa autorizada por el workspace actual:

```text
empresa_codigo = BBTI
cliente_abreviatura = BBTI
```

La separación funcional se realiza mediante:

```text
codigo_expediente = 900001–900006
metadata.sandbox = true
metadata.sprint = "1.6K"
metadata.origen = "SEED_CONTROLADO_WORKSPACE_V2"
```

No se usa `BBTI_DEV` como empresa activa porque el token actual no tiene permisos para esa empresa.

---

## No permitido

Estos datos no deben crearse mediante:

```text
OCR
carga guiada
R2
Gateway
Frontend
NATS
eventos
alertas
migración productiva
```

Se crean exclusivamente con seed SQL controlado:

```text
infra/postgres/seeds/documental_v2_workspace_cases.sql
```

---

## Casos oficiales

| Caso | Expediente | Nombre | Resultado esperado |
|---|---:|---|---|
| Base real | 41 | OC + Factura real | Caso real de referencia. No modificar. |
| A | 900001 | SANDBOX V2 - OC + FACTURA | 1 Documento Operativo Principal, 1 Grupo de Factura. |
| B | 900002 | SANDBOX V2 - OC SIN FACTURA | 1 Documento Principal, 0 grupos factura, advertencia sin factura. |
| C | 900003 | SANDBOX V2 - FACTURA SIN PRINCIPAL | 0 Documento Principal, 1 Grupo Factura, advertencia sin principal. |
| D | 900004 | SANDBOX V2 - CASO COMPLETO CON ADJUNTOS | 1 Documento Principal, 1 Grupo Factura, Guía, NI, Transferencia y Detracción. |
| E | 900005 | SANDBOX V2 - OC CON MULTIPLES FACTURAS | 1 Documento Principal, 3 Grupos Factura, advertencia de múltiples facturas. |
| F | 900006 | SANDBOX V2 - EXPEDIENTE VACIO | 0 Documento Principal, 0 Grupos Factura, advertencias de vacío. |
| G | 999999 | No existe | Debe responder `NOT_FOUND`. |

---

## Resultados backend reportados

### 900001

```text
success = true
principales = 1
gruposFactura = 1
adjuntosNoClasificados = 0
advertencias = []
```

### 900002

```text
success = true
principales = 1
gruposFactura = 0
advertencias = ["EXPEDIENTE_V1_SIN_FACTURA"]
```

### 900003

```text
success = true
principales = 0
gruposFactura = 1
advertencias = ["EXPEDIENTE_V1_SIN_DOCUMENTO_PRINCIPAL"]
```

### 900004

```text
success = true
principales = 1
gruposFactura = 1
documentosGrupoFactura = 4
advertencias = []
```

Adjuntos esperados:

```text
Guía de remisión T001-00000077
Nota de ingreso NI-00009004
Transferencia TR-900004
Detracción DT-900004
```

### 900005

```text
success = true
principales = 1
gruposFactura = 3
advertencias = ["EXPEDIENTE_V1_CON_MULTIPLES_FACTURAS_REQUIERE_ASIGNACION_EXPLICITA"]
```

### 900006

```text
success = true
principales = 0
gruposFactura = 0
advertencias = [
  "EXPEDIENTE_V1_SIN_DOCUMENTO_PRINCIPAL",
  "EXPEDIENTE_V1_SIN_FACTURA"
]
```

### 999999

```text
success = false
error.code = NOT_FOUND
message = Expediente V1 999999 no encontrado
```

---

## Estado

Pendiente de completar con validación visual del Maestro Sucesor II.
