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
