# Cookbook Documentos

## Editar documento confirmado

```bash
TOKEN="<access-token>"

curl -X PATCH "http://localhost:3000/api/v1/documentos/3779/editar" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoDocumental":"PAGO_DETRACCION",
    "metadata":{
      "numero":"296801526",
      "fechaEmision":"2026-02-05",
      "moneda":"SOLES",
      "montoTotal":"240"
    },
    "observacion":"Corrección de moneda desde Finanzas"
  }'
```

## Reglas

- No reprocesa OCR.
- No sube archivo.
- Mantiene auditoría.


---

## R3 Factura TEMP — contrato contextual y estado G3 — 19/11/2026

Ámbito: Compras, rama SOURCE `feat/compras-factura-temp-recovery-r1`, base `8807b4a9a99870396ec35a7ef1011cec1402c745`; cambios sin commit. Aceptación PO/MSE SOURCE con observaciones. Recuperación por cargador PASS; recuperación entre usuarios FAIL y diferida expresamente. Las capacidades implementadas siguientes no acreditan despliegue Enterprise/PROD.

### Reserva y persistencia

`POST /api/v1/documentos/tmp` admite `archivo` y, opcionalmente, el campo multipart JSON `comprasFactura={"expedienteId":121,"documentoBaseId":541}` (IDs ilustran el testigo, no instrucciones de escritura). El servidor valida y deriva origen COMPRAS, tipo FACTURA y relación adjunto_factura. Ámbito y actor se obtienen de autenticación, nunca del body.

Se conserva `documentos.carga_operaciones`, `operacion_tipo=tmp`, identidad, archivo, `actor_id`, ámbito e idempotencia existentes. La asociación se inserta en `metadata.comprasFactura`; OCR en `metadata.ocrCandidate` y borrador en `metadata.borradorDocumental`. No se añaden tablas, columnas ni migraciones. El contexto forma parte del fingerprint de reservas nuevas contextuales. TEMP históricos sin contexto acreditado no se incluyen retrospectivamente por nombre, hash o cercanía temporal.

### Rutas contextuales implementadas

Prefijo común: `/api/v1/documentos/tmp/compras-facturas/:expedienteId/:documentoBaseId`.

| Método / sufijo | Contrato |
| --- | --- |
| GET raíz | `{contexto,data:[{tempId,nombreOriginal,actorId,creadoEn,ocrEstado,tieneBorrador,reservada}]}` dentro del envelope HTTP vigente. Solo almacenados, vigentes y no materializados; no selecciona automáticamente el último. |
| GET `/:tempId` | Consulta del TEMP seleccionado y datos persistidos. |
| GET `/:tempId/preview-url` | Preview autorizado con identidad y storage persistidos; no recibe bucket/key arbitrarios del cliente. |
| POST `/:tempId/promover` | Exactamente `confirmacionDocumental` o `borradorDocumental` según contrato existente. No admite destino arbitrario ni otra identidad de promoción. |

La recuperación frontend por ID consulta y obtiene preview; no llama a `procesar-ocr`. OCR inicial y callback existente permanecen. El borrador persistido prevalece sobre extracción, con campos editables incluso sin OCR. Contexto de OC/OS y datos propios de factura se mantienen separados. Cerrar no materializa ni guarda automáticamente las ediciones.

### Autorización y confirmación

Gateway exige JWT vigente/contextual, sistema DOCUMENTAL, menú `compras`, `documentos.subir` y `documentos.vincular_expediente`; valida empresa/cliente del expediente y empresa del documento. Confirmación/borrador exigen además `documentos.confirmar_ocr` u `ocr.confirmar`.

Documentos revalida JWT por Auth, coincidencia actor/workspace/empresa/cliente con identidad forward y permisos. El repositorio restringe la rama compartida por workspace, empresa, cliente y contexto JSON exacto; revalida expediente y principal OC/OS confirmado vinculado. Rechaza regularización OP/integración ajena. La autorización compartida se representa internamente por un Symbol, no aceptado desde HTTP. Las rutas TEMP generales conservan el filtro `actor_id` y no reciben esa marca.

En confirmación el body debe coincidir con expediente/principal persistidos; se conserva la clave idempotente original internamente y el destino reservado. No se cambia el cargador; el actor real validador se transmite a auditoría y materialización. Se reutilizan bloqueo por TEMP, fingerprint, transacción de materialización y controles V2 existentes. Esta revisión es estática, no prueba nueva de concurrencia real ni recuperación exitosa entre usuarios.

El contexto OCR legacy FINANZAS/TEMP_REGULARIZACION_OP no otorga acceso ni decide expediente/principal; el contexto persistido de Compras y las validaciones de confirmación son los controles del flujo R3. La discrepancia intermedia `principalActivo` se conserva como observación, sin afirmar causa resuelta o asociación indebida. No se modifica OCR, periodos, R2, materializadores ni caducidad de 24h.

Referencia de aceptación y límites: [manual operativo](../29-operations-manual/README.md#r3-factura-temp--cierre-g3-source-con-observaciones--19112026) y [delta técnico](../../DELTA_TECNICO_MSE3_A_MSE_ACTUAL.md). No publicar credenciales/JWT ni ejecutar recetas autenticadas por leer este contrato.


### Precisión de autorización cross-user — 19/11/2026

Estado: **CROSS_USER_RECOVERY=FIX_IMPLEMENTED_PENDING_PO_VALIDATION**; la observación anterior FAIL/diferida no se borra. `workspaceId` proviene de `auth.usuario_workspaces.id` y corresponde a una asignación por usuario. La igualdad numérica entre workspace del cargador y del operador no es un criterio válido para compartir entre usuarios distintos.

En las dos consultas compartidas de TmpRepository se conserva workspace_id/actor_id del TEMP como origen y se verifica mediante EXISTS: origen.id=workspace_id del TEMP y origen.usuario_id=actor_id de la carga; acceso.id=workspaceId autenticado y acceso.usuario_id=actor autenticado; ambas asignaciones tienen mismo sistema, empresa y cliente; sistema DOCUMENTAL activo y asignación receptora activa/vigente. Se conservan filtros empresa/cliente/contexto persistido, validación de expediente/principal y todas las condiciones de vigencia/estado del TEMP. No se elimina la autorización del workspace de sesión ni se suplanta el original. JWT/menú/acciones siguen validados previamente; el acceso genérico continúa exigiendo propietario y su workspace exacto.

No cambian endpoints ni cuerpos, preview, idempotencia, auditoría, OCR, almacenamiento o materialización. 27 pruebas focales PASS y typecheck Documentos PASS son evidencia offline, no validación PostgreSQL real. Nuevas lecturas de auth.usuario_workspaces/core.sistemas sin cambio de roles/privilegios: si el runtime no dispone de SELECT, detener y elevar a MSE/PO, no conceder permisos automáticamente. Únicamente Documentos requiere actualización de runtime coordinada por MSE; aceptación PO entre usuarios pendiente.


---

## R3 Factura TEMP - consolidacion documental G3 - 19/11/2026

ACTION: BBTI_FACTURA_TEMP_G3_DOCUMENTARY_FINALIZATION_R1

- Base SOURCE: `8807b4a9a99870396ec35a7ef1011cec1402c745`.
- Rama focal: `feat/compras-factura-temp-recovery-r1`.
- Commit funcional SOURCE local: `793152d3cdc9ab752cfb699839358255a1db25c5`.
- Inventario funcional: 12 archivos, +593/-45.
- Commit documental e integracion SOURCE main: pendientes.
- Publicacion remota de R3: pendiente.

### Aceptacion SOURCE LAB y precedencia

Esta entrada actualiza el estado vigente de R3 Factura TEMP.
Conserva el FAIL, HOLD y diferimiento anteriores como
antecedentes historicos.

- CROSS_USER_RECOVERY=PASS_PO.
- CROSS_USER_CONFIRMATION=NOT_ACCREDITED.
- DOCUMENTOS_BUILD=PASS, exit 0.
- DOCUMENTOS_RESTART=PASS_PO.
- SOURCE_FUNCTIONAL_ACCEPTANCE=PASS_WITH_OBSERVATIONS.

El PO confirma que, despues de actualizar Documentos3002,
puede recuperar una factura cargada por otro usuario.
Este resultado acredita el recorrido funcional observado,
no una auditoria SQL, de seguridad o concurrencia integral.

Se conservan las aceptaciones anteriores: recuperacion
por cargador y despues de refrescar, OCR parcial editable,
confirmacion ordinaria, pendientes simultaneos, aislamiento
OC/OS y regresion OC/OS.

No inferir confirmacion cruzada, nueva materializacion,
verificacion fisica independiente R2 ni aceptacion PROD.

### Vigencia del contrato

Prevalece la precision de autorizacion cross-user
de la adenda precedente. Las cuatro rutas contextuales,
los cuerpos, la identidad TEMP y las reglas de
confirmacion permanecen sin cambios adicionales.

Compartir por asignaciones validas al mismo ambito
DOCUMENTAL, empresa y cliente, nunca por igualdad
del workspaceId personal de dos usuarios.

Conservar owner en rutas generales, permisos y
contexto documental exacto. La recuperacion no solicita
nuevo OCR. No confundir contrato implementado con
confirmacion cruzada acreditada o despliegue PROD.
