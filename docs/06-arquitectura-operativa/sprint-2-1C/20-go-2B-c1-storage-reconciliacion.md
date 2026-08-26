# GO-2B-C1 — Endurecimiento de storage y reconciliación

## Objetivo

Corregir los dos hallazgos bloqueantes de GO-2B sin modificar migraciones,
Gateway, Web Admin, RDS ni producción.

## Cambios

- `PutObject` condicional con `IfNoneMatch: "*"`.
- eliminación de `HeadObject` como garantía principal de escritura.
- clasificación de HTTP 412 / `PreconditionFailed` como `PREEXISTING`.
- no persistencia documental ni compensación destructiva sobre objetos preexistentes.
- transición a `requiere_reconciliacion` desde `iniciada` o `almacenada`.
- persistencia obligatoria de provider, bucket y key durante reconciliación.
- validación del booleano de transición.
- error tipado `CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED`.
- pruebas focalizadas de storage, servicio, repositorio y compensación.

## Restricciones

```text
Push: NO AUTORIZADO
PR: NO AUTORIZADO
Merge: NO AUTORIZADO
Migraciones: SIN CAMBIOS
Manifest: SIN CAMBIOS
RDS / producción: NO TOCAR
Laboratorio: CONSERVAR
```

## Validación pendiente

La corrección debe aplicarse al worktree y pasar Prettier, build, pruebas
focalizadas, regresión completa y prueba PostgreSQL/storage desechable.
