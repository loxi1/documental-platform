# GO-UX-2-1C-FINAL-C1 — Actualización de estados y mensajes

## Motivo

Durante la evidencia visual del harness temporal se detectó que el escenario `UNKNOWN_ERROR` se presentaba como `dependency_unavailable`.

El Maestro Intermedio autorizó el subcontrol correctivo:

```text
GO-UX-2-1C-FINAL-C1
```

## Regla final

```text
INTERNAL_SERVER_ERROR
→ unknown_error
```

`unknown_error` representa un error inesperado no clasificado.

No debe presentarse como:

- dependencia;
- storage;
- persistencia;
- servicio temporal;
- error recuperable confirmado.

## Copy final validado

```text
No se pudo determinar el resultado.
Ocurrió un error no identificado.
Conserve la referencia para solicitar soporte.
```

## Política de retry

```text
unknown_error:
sin reintento manual por defecto

dependency_unavailable:
reintento manual permitido
```

## Diferencia con dependency_unavailable

`dependency_unavailable` mantiene su semántica original:

```text
dependencia temporal no disponible;
storage, persistencia o servicio temporal;
reintento manual permitido;
misma intención si el payload no cambia.
```

Códigos que se mantienen como dependencia:

```text
CARGA_SEGURA_STORAGE_FAILED
CARGA_SEGURA_PERSISTENCE_FAILED
CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED
```

Código que se presenta como error inesperado:

```text
INTERNAL_SERVER_ERROR
```
