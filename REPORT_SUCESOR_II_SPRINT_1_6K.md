# Reporte Maestro Sucesor II — Sprint 1.6K

Maestro Intermedio,

Recibido el avance del Maestro Sucesor I y la corrección final del sandbox.

Desde Maestro Sucesor II confirmo que el enfoque queda alineado para la validación UX/Web Admin del Sprint 1.6K.

## 1. Cambio importante validado

El sandbox inicialmente intentó usar:

```text
empresa_codigo = BBTI_DEV
```

pero el Gateway/Web Admin bloqueó esos expedientes con `403 FORBIDDEN`, porque el workspace actual está autorizado para:

```text
empresaCodigo = BBTI
```

La corrección aceptada fue mantener los expedientes sandbox bajo:

```text
empresa_codigo = BBTI
cliente_abreviatura = BBTI
```

y separarlos funcionalmente por:

```text
codigo_expediente = 900001–900006
metadata.sandbox = true
metadata.sprint = "1.6K"
metadata.origen = "SEED_CONTROLADO_WORKSPACE_V2"
```

También se corrigieron las claves documentales para no conservar prefijo `BBTI_DEV|`.

## 2. Estado backend reportado

Maestro Sucesor I reportó endpoints funcionales para:

```text
900001
900002
900003
900004
900005
900006
999999
```

Con resultados esperados:

```text
900001 -> OC + Factura
900002 -> OC sin factura
900003 -> Factura sin Documento Principal
900004 -> OC + Factura + Guía + NI + Transferencia + Detracción
900005 -> OC + múltiples facturas
900006 -> Expediente vacío
999999 -> NOT_FOUND
```

## 3. Entregables preparados por Maestro Sucesor II

Se preparan los documentos:

```text
docs/05-frontend/sprint-1-6K-validacion-workspace-v2.md
docs/testing/workspace-v2-casos-oficiales.md
```

El primero corresponde a la validación UX/Web Admin.

El segundo consolida los casos oficiales del Sandbox Documental para validación futura.

## 4. Trabajo pendiente de Maestro Sucesor II

Validar visualmente en Web Admin:

```text
/workspace/expedientes-v1/900001
/workspace/expedientes-v1/900002
/workspace/expedientes-v1/900003
/workspace/expedientes-v1/900004
/workspace/expedientes-v1/900005
/workspace/expedientes-v1/900006
/workspace/expedientes-v1/999999
```

Y confirmar:

```text
Contexto Operativo visible
Documento Principal visible o empty state correcto
Grupos de Factura visibles o empty state correcto
Adjuntos clasificados bajo el grupo
Advertencias informativas
No IDs técnicos como títulos si hay labels
No inferencia desde metadata OCR
Moneda null sin romper UI
Fechas sin desfase
Error 404 controlado
```

## 5. Dictamen Sucesor II

El Sprint 1.6K queda listo para la fase de validación visual en Web Admin.

No propongo cambios React en este momento.

Si durante la validación aparecen errores visuales reales, se propondrán como fixes menores separados.
