# O2 — Propuesta histórica, fuera del alcance del cierre R1

Estado vigente: HISTORICAL_REFERENCE. La orden PO `BBTI_AUTH_USERS_FINALIZE_PROVISIONING_R1`
excluye expresamente implementar esta propuesta o introducir modificaciones estructurales.
Se conserva el diseño siguiente como antecedente; no es un bloqueo funcional del alcance
actual de cuatro usuarios/ocho workspaces. La rotación administrativa requiere aprobación
expresa posterior. No se modificó autenticación compartida, esquema ni migraciones.

El contrato actual emite un identityToken tras bcrypt.compare y permite seleccionar
workspace para obtener acceso normal. No hay endpoint de rotación inicial ni persistencia
de una obligación de cambio. El aprovisionamiento no puede imponerla por sí solo.

## Cambio mínimo propuesto

- Persistir `password_change_required` en `auth.usuarios`, por defecto false para mantener
  históricos; true únicamente al crear los cuatro objetivos con credencial inicial.
  Requiere diseño de migración, sin número reservado ni SQL creado en esta entrega.
- `apps/ms-auth/src/auth/auth.repository.ts`: recuperar ese estado y efectuar cambio bcrypt
  con control transaccional/concurrente; incrementar una versión de credencial o invalidar
  la autorización de rotación para impedir reutilización del token anterior.
- `apps/ms-auth/src/auth/auth.service.ts`: login inicial solo emite autorización breve de
  propósito `password-change`, nunca identity/accessToken normal. Denegar listWorkspaces,
  selectWorkspace, select-context y validateToken mientras la obligación siga vigente.
  Comprobar persistencia vigente, no confiar solo en claims de un token antiguo.
- Nuevo endpoint focal en `auth.controller.ts`/`auth.nats.controller.ts`, schema de entrada
  para contraseña nueva, autenticación restringida, política de contraseña aprobada y
  auditoría sin secretos. Tras cambio, exigir nuevo login normal.
- `apps/api-gateway/src/auth/auth.controller.ts`: proxy limitado; contratos de token/login
  y cliente `apps/web-admin/src/services/auth-api.ts`/flujo de login requieren revisión
  transversal y una pantalla de cambio antes de navegación ordinaria.
- Eliminar obligación solo junto al cambio confirmado de hash. No marcar manualmente
  los cinco históricos ni sustituir sus contraseñas.

## Pruebas focales preparadas para aprobación

| Caso | Aserción requerida |
|---|---|
| Cada uno de los cuatro nuevos | Temporal correcta produce solo token de cambio. |
| Antes de rotar | Listado/selección workspace, contexto legacy y acceso ordinario denegados. |
| Cambio válido | Nuevo bcrypt y bandera false en la misma transacción; nuevo login permite acceso. |
| Password incorrecta, débil o token vencido | Sin cambios de hash/bandera ni acceso normal. |
| Concurrencia/replay | Un solo cambio autorizado; token de rotación usado queda inválido. |
| Fallo de persistencia | Rollback; obligación permanece y acceso ordinario sigue denegado. |
| Cinco históricos | Login/credenciales/asignaciones intactos; rotación forzada false. |
| Seguridad | Sin passwords, hashes o tokens en respuestas/logs/evidencias. |

Estas especificaciones históricas no son resultados PASS ni requisitos del cierre actual.
Una futura reactivación de este diseño requeriría aprobación específica y pruebas reales.
La producción permanece sin autorización de ejecución por esta entrega.
