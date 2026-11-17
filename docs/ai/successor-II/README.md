# Maestro Sucesor II — Frontend, Workspace Visual y UX

## Continuidad vigente — 11/11/2026

Acción `MSI_CODEX_GIT_MANIFEST_CONTINUITY_RECONCILIATION_R4`. Esta sección prevalece sobre la prioridad NAS de 05/11 conservada abajo; el alcance frontend/UX del rol no concede autoridad sobre backend, JWT o migraciones.

Todo sucesor MI/MSII/MSI lee: [Operations Manual](../../29-operations-manual/README.md#continuidad-vigente--11112026), [estándar SOURCE/release R1](../../23-standards/11-source-development-and-release.md) y [Git](../../23-standards/07-git.md); después el [inventario Git](../../31-governance/BRANCH_INVENTORY.md#continuidad-git-reconciliada--11112026) y solo contratos necesarios. Los contextos/prompt antiguos no prevalecen sobre esta continuidad.

- MVP aceptado05/11: ACCEPTED_WITH_OBSERVATIONS; no reabrir 101 archivos ni repetir aceptación.
- Enterprise f80d05e8 / GHCR#34: BUILT_NOT_DEPLOYED; no sumar commits posteriores a sus digests ni asumir despliegue por SUCCESS.
- SOURCE main89cd4c6e: corrección Almacén integrada/publicada; LAB históricamente reportado, no Enterprise ni producción. No reintroducir el segundo filtrado frontend.
- UX Compras OC/OS y Subir Facturas: INTEGRATED_SOURCE_AND_ENTERPRISE (`1ebdbf4f82ec3cae84b6a6caafc979353af2172a` → `7323e1b0ae62584c08714d06ab5bbf6bbd036292`); no requiere reintegración. La terminología aprobada y la simplificación del modal para OC/OS/FACTURA ya existen: Cancelar/X cierran sin persistir ni descartar el temporal, frente a Guardar y confirmar; Ocultar creación manual solo contrae su formulario. Véanse el [Manual operativo](../../29-operations-manual/README.md) para acciones y modos y el [Inventario Git](../../31-governance/BRANCH_INVENTORY.md) para commits. Su inclusión en imágenes GHCR no acredita despliegue; no confundir con Mi Perfil o G2-B.
- Mi Perfil UX: dos archivos locales pendientes en el candidato existente (page.tsx y AppHeader.tsx), IMPLEMENTED_NOT_INTEGRATED; preservar y confirmar alcance/acta PO antes de integración.
- G2-B: exportación aislada, hashes Auth/Gateway verificados; validación técnica MSE 19/19 y401 recibida en R4, PENDING_E2E de cambio de contraseña y revocación JWT. No confundir UX con aceptación funcional completa.
- P3/R3: PARTIAL_HOLD; PRE_PUT no cerrado funcionalmente; encargo de preparación posterior conservado, no ejecutarlo ahora.
- APISPERU privado, respaldo remoto OCR, cambio OCR systemd y despliegue productivo: PENDING. No solicitar secretos ni intervenir producción desde esta continuidad.
- Migración G2-B: autorización separada, SQL+SHA256+runner; no crear 0025 ni cambiar auth_version/conexiones/bases en R4.

Las novedades documentales actuales están sin commit, con SOURCE dirty original preservado y sin cambios de ramas. Revisar el diff mediante MSI/PO; no promover automáticamente ni ejecutar limpieza. Estados y pruebas declarados se distinguen de las verificaciones realizadas, que fueron Git, documentos, hashes y consulta de lectura del run existente.

---


**Estado:** continuidad aprobada  
**Responsable:** Maestro Sucesor II  
**Alcance:** `apps/web-admin` y documentación de experiencia de usuario  
**No tocar:** backend documental, OCR, migraciones funcionales, JWT backend ni permisos backend.

---

## Continuidad vigente — 05/11/2026

Acción `POST_MVP_SUCCESSOR_CONTINUITY_UPDATE_R1`. Las responsabilidades de frontend y UX de este documento permanecen vigentes; el orden de trabajo histórico inferior no constituye autorización para reabrir el MVP aceptado.

Todo nuevo chat de MI, MSII o MSI comienza por:

1. [Operations Manual](../../29-operations-manual/README.md).
2. [Estándar SOURCE y release R1](../../23-standards/11-source-development-and-release.md).
3. [Estándar Git](../../23-standards/07-git.md).

Después, consultar sólo los contratos necesarios para su misión. La continuidad actual y sus identidades están en el Operations Manual y el [manifest rector](../../31-governance/RELEASE_MANIFEST.md); los documentos de contexto/prompt relacionados conservan su función, sin prevalecer sobre este estado.

```ini
MVP_STATUS=ACCEPTED_WITH_OBSERVATIONS
MVP_DEPLOYMENT=PASS
PO_ACCEPTANCE=APPROVED
DOCUMENTARY_CLOSURE=PASS
RELEASE_RECONCILIATION=NOT_REQUIRED
NEXT_WORKSTREAM=NAS_PREPARATION
```

El PO declaró aceptación funcional productiva el **05/11/2026**: Compras PASS (carga R2 TEMP y promoción definitiva), Almacén PASS (carga y validación de Guía), Finanzas/Regularización PASS (TEMP y promoción definitiva) y Contabilidad PASS (visualización de registros de los demás módulos). Son resultados declarados por el PO, diferenciados de las pruebas automatizadas y verificaciones técnicas del despliegue.

Observaciones abiertas: recuperación OCR tardía sin E2E productivo completo; expiración TEMP sin verificación productiva; referencia histórica R2 con HTTP 403; 16 errores globales de tipado conocidos. Se preservan como límites/antecedentes, no como defectos nuevos del despliegue; esta continuidad no los corrige ni reabre el release.

**Siguiente entregable: preparación NAS**, responsable MSI, supervisión MSII y autoridad Product Owner. Debe mantenerse aislada del MVP productivo; no se presume que NAS sustituya Cloudflare R2 y esta orden no autoriza cambios de infraestructura.

No repetir aceptación, reconciliación de 101 archivos, builds ni despliegue. Preservar SOURCE dirty y el MVP productivo.

---

## Misión

Convertir Documental Platform en una plataforma coherente, profesional y lista para uso desde la experiencia de usuario, sin modificar contratos backend innecesariamente.

El objetivo no es agregar más reglas de negocio, sino consolidar:

- Workspace visual.
- Sidebar y navegación.
- Mi Perfil.
- Componentes reutilizables.
- Estados visuales.
- Revisión Contable UI.
- Expediente 360 UI.
- Loading, empty states y accesibilidad.

---

## Regla principal

```text
Primero componentes comunes.
Después pantallas.
No al revés.
```

El motivo es evitar duplicar badges, colores, estados, formatos y layouts en cada módulo.

---

## Responsabilidades

El Maestro Sucesor II puede trabajar en:

```text
Frontend
Workspace visual
Sidebar / Header
Mi Perfil
Experiencia de usuario
Componentes reutilizables
Estados visuales
Loading / Empty / Skeleton states
Accesibilidad
Responsive
Refactor visual
```

Principalmente en:

```text
apps/web-admin/src/app
apps/web-admin/src/components
apps/web-admin/src/layout
apps/web-admin/src/lib
apps/web-admin/src/constants
apps/web-admin/src/types
```

---

## Fuera de alcance

No tocar:

```text
Backend documental
OCR Worker
Extractores
Versionado documental
Duplicados
Clave documental
Migraciones
JWT backend
Permisos backend
APIs documentales
Usuarios / perfiles backend
Caja Chica
Rendiciones
```

Si el frontend necesita un dato o endpoint nuevo, se documenta como requerimiento para el Maestro Sucesor I. No se implementa desde este rol.

---

## Orden de trabajo aprobado

1. Crear base visual reutilizable.
2. Aplicar la base a Revisión Contable.
3. Aplicar la base a Expediente 360.
4. Aplicar la base a Mi Perfil.
5. Aplicar la base a Compras.
6. Aplicar la base a Almacén.
7. Aplicar la base a Finanzas.

---

Para iniciar un requerimiento, seguir la [entrada operativa común](../../29-operations-manual/README.md), que remite al estándar R1.

## Archivos relacionados

- `context.md`: estado real del proyecto y decisiones ya validadas.
- `prompt.md`: prompt listo para abrir un nuevo chat del Maestro Sucesor II.
- `docs/05-frontend/README.md`: guía del área frontend.
- `docs/03-producto/02-ui-foundation.md`: criterios de UI Foundation.
- `docs/11-adr/ADR-005-ui-foundation.md`: decisión arquitectónica de UI Foundation.
- `docs/09-equipo/04-maestro-sucesor-II.md`: rol resumido dentro del equipo.


## Actualización posterior para sucesores — 11/11/2026

Acción: MSE_UNIFIED_MANIFEST_CONTINUITY_G2B_APPLY_R1.

Consultar la adenda del RELEASE_MANIFEST: Documentos/Web GHCR#34 observados ejecutándose en EC2; aceptación funcional posterior al MVP NOT_VERIFIED. Conservar aceptación05/11. No repetir integración26+3, MVP101 ni publicación de las mismas imágenes por este registro.

G2-B backend E2E y revocación multicontexto PASS; mínimo8 probado focalmente y máximo72bytesUTF8 preservado. El PENDING_E2E anterior queda superado para backend, no para UX3005. Nueve archivos candidatos; delta final NOT_ESTABLISHED, ampliable por interceptor/UX; producción G2-B NOT_EXECUTED.

Pendientes: activación selectiva segura, tratamiento401, éxito visible, aceptación UX y trazabilidad versionada auth_version antes de promoción. R4 documental publicado en SOURCE `d343a1bfb9ecc4f933ea425486de892fe74009b1` / Enterprise `85b6486ecbf7ae2c652cafd84f2217b0e43590a2`; las menciones históricas sin commit no representan este cierre.

Evidencias durables: `/home/loxi1/bbti-evidence/unified-manifest-continuity-g2b-r2/{ec2-ghcr-identity.json,g2b-backend-e2e.json,g2b-candidate-inventory.json}`. Sin aceptación UX ni despliegue G2-B por inferencia.


---

## Relevo vigente MSII — aceptación SOURCE LAB 17/11/2026

ACTION: BBTI_SOURCE_DOCUMENTARY_CONTINUITY_R1.

SOURCE_NATIVE_RUNTIME=CLOSED_PASS.
SOURCE_FUNCTIONAL_ACCEPTANCE=CLOSED_PASS_WITH_OBSERVATIONS.
CONTABILIDAD_UX=PASS_PO.
CUSTODY_RELEASE=CLOSED_PASS.

SOURCE main baseline anterior a esta adenda:
`9359b9720328d0bb4c429e90330c997269be5dc3`.

El PO aceptó el entorno nativo puerto 3005 y sus
servicios SOURCE. No repetir las pruebas testigo
ni volver a cargar documentos por el cambio de sucesor.

### Alcance funcional acreditado

| Frente | Testigo |
|---|---|
| Login/workspace y Mi Perfil | PASS PO |
| Cambio de contraseña y lectura R2 | PASS PO |
| Compras OC TEMP | temp366, doc530, archivo533 |
| Factura OC | doc531, archivo vigente535 |
| Guía | doc532, archivo536, OCR514 |
| Versión Guía | archivo538, versión 2 |
| Nota de Ingreso | doc533, archivo537, OCR515 |
| Sustento OC | doc534, archivo539, OCR516 |
| Sustento OP172 | doc537, archivo542, OCR518 |
| Factura OP172 | temp374, doc538, archivo543, OCR519 |
| RH OP173 | temp376, doc540, archivo545, OCR520 |
| Contabilidad | OC mayo; OP172 y OP173 noviembre 2026 |

Los identificadores corresponden a registros testigo
LAB; no son identificadores productivos ni instrucciones
para modificar datos.

### Observaciones conservadas

- Guía y NI: ruta R2 mayo frente a campos internos
  noviembre; Contabilidad presenta correctamente mayo.
  Contrastar el contrato antes de modificar metadata.
- NI requirió revisión manual por OCR incompleto.
  La versión Guía fue agregada sin OCR nuevo. No se
  acredita fallback raster ni recuperación OCR tardía
  de Guía mediante esa prueba.
- Sustento OC: documento sintético de S/1000 frente al
  importe registrado S/3350.73 y proveedor Moneda.
  La aceptación funcional no certifica exactitud financiera.
- Factura OP172: datos OCR de comprador/emisor y
  beneficiario requieren contraste; importe manual S/50.
  Sustento OP reportó contexto COMPRAS_EDITAR_MODAL.
- Versión Guía538: columnas de contexto nulas pese a
  metadata y vínculo existentes; contrato pendiente.
- No acreditados integralmente: caso OS independiente,
  expiración TEMP real de 24 horas, revocación JWT y
  auditoría authVersion, rutas finales TEMP de ambos
  regularizadores y aislamiento exhaustivo.

No extender la aceptación a P3/PRE_PUT, TEMP334 u otros
casos no cubiertos específicamente.

### Próxima continuidad

Conservar SOURCE nativo, R2 DEV y OCR systemd.
No reabrir recuperación de runtime ni custodias.

Completar reconciliación documental SOURCE/Enterprise
y guías externas. No atribuir a producción la aceptación
LAB. G4-A tiene publicación GHCR y cierre histórico RDS
0025 acreditados, pero EC2 y UX productiva no acreditados.

Volver al ciclo NORMAL para nuevos requerimientos según
los estándares institucionales aprobados. Solo abrir
una nueva intervención funcional conforme a alcance PO.


---

## Ratificación funcional y arquitectónica PO — 17/11/2026

La presente ratificación prevalece sobre las clasificaciones
históricas incompatibles de P3/R3, TEMP328/334 y NAS.

- Aceptación funcional PO: PASS para SOURCE LAB,
  Compras, Almacén, Finanzas y Contabilidad.
- P3/R3: la propuesta universal TEMP fue sustituida.
  Respetar el canal de carga existente según origen y
  tipo documental: TEMP o carga directa al periodo.
- Incidencia Almacén: regularizada mediante intervención
  en base de datos, según PO.
- Modal OCR Almacén: mantener visibles únicamente
  Guardar y confirmar y Cancelar. Ocultar los demás
  botones, no eliminarlos ni suprimir capacidades backend.
  Cancelar únicamente cierra el modal.
- TEMP328/334: incidencia operativa resuelta según PO.
  El diseño especial de recuperación queda histórico;
  no reabrirlo ni inferir eliminación física en R2.
- Compras: OC regularizada y APISPERU configurado,
  según PO, para corregir la selección del RUC emisor.
- RDS 0025: ejecutada en producción desde Enterprise
  según PO. Evidencia SQL aportada: gestion_documental,
  usuario postgres, auth_version integer NOT NULL
  DEFAULT 1. No repetir migración.
- G2-A residual: alcance no identificado suficientemente;
  no constituye un bloqueo acreditado.
- NAS DEV y archivado definitivo: entregable independiente,
  fuera del alcance de este cierre.

La ratificación funcional no acredita por sí misma
nuevas identidades de imágenes, despliegues EC2,
borrados físicos ni nuevas pruebas automatizadas.

### Manuales técnicos permanentes

Colección instalada por el PO el 17/11/2026:

`~/Documentos/importantesProyectos/Documentacion_tecnica/BBTI_MANUALES_2026-11-17/`

Punto de entrada: `00_LEER_PRIMERO_BBTI.md`.

Nueve manuales cubren arquitectura, operación SOURCE,
Git y releases, R2/OCR, producción, aceptación,
autonomía y custodia de los 48 archivos históricos.

No repetir investigaciones cerradas. Consultar el manual
específico y la documentación institucional vigente.
Las referencias Git de los manuales se actualizarán
después de la publicación SOURCE y Enterprise.
