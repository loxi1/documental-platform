# Production Environment

## Crear `.env.production`

```bash
bash deployment/scripts/bootstrap-production-env.sh
```

## Validar variables

```bash
bash deployment/scripts/check-production-env.sh
```

## Regla

Nunca subir `.env.production` al repositorio.


---

## 2026-11-25 — Cierre institucional documental NAS R1

Repository=SOURCE. Esta adenda prevalece únicamente sobre estados históricos incompatibles de NAS; no reescribe antecedentes ni autoriza acciones por su lectura.

SOURCE conserva excluidos los scripts locales de recuperación no rastreados.

### Configuración productiva acreditada (referencia, no ejecutar)

```ini
NODE_ENV=production
R2_NAS_ACTIVATION_FROM=2026-11-24T22:48:35.970Z
R2_NAS_ARCHIVE_ENABLED=true
R2_NAS_AUTO_ENABLED=true
R2_NAS_NEW_DOCUMENTS_ENABLED=true
R2_NAS_VIEWER_ENABLED=true
R2_NAS_VIEWER_ACCEPTED=false
R2_NAS_DEV_DELETE_ENABLED=false
R2_NAS_DESTINATION=SYNOLOGY_PROD
R2_NAS_SMB_HOST=10.77.26.2
R2_NAS_SMB_SHARE=GESTION-DOCUMENTARIA
R2_NAS_SMB_ROOT=PLATAFORMA_DOCUMENTAL
R2_NAS_SMB_USER=documental_platform_dev
R2_NAS_SMB_AUTH_FILE=/run/secrets/nas-smb.auth
R2_NAS_PUBLIC_GATEWAY_URL=https://api.bbtecnologia.com
R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS=https://api.bbtecnologia.com
```

Autenticación host `/etc/documental-platform/nas-prod.auth`, root:root, modo 0600, montaje read-only. R2_ACCOUNT_ID, credenciales R2 y preview secret existentes configurados; valores excluidos. No regenerar cutoff/secretos ni reactivar NAS. `R2_NAS_VIEWER_ACCEPTED=false` es el último flag runtime acreditado; aceptación PO PASS_PO es otro hecho y no cambia dicho flag por esta edición. La allowlist API valida URLs generadas, no frame ancestors.
### Visor NAS y CSP corregidos

Incidencia histórica `NS_ERROR_CSP_FRAME_ANCESTOR_VIOLATION`: la excepción Gateway anterior solo operaba en development. SOURCE `4776f2e907e64e3eaaacf5d6cff2874a907a3785` corrigió `apps/api-gateway/src/documentos/documentos.controller.ts` y `documentos.archivado-csp.spec.ts`; equivalencia Enterprise 2/2 blobs y modos PASS. Pruebas13/13 y build Gateway PASS_REPORTED, no repetidos.
Solo en preview NAS exitoso `/api/v1/documentos/archivado/preview/:archivoId`, tras validar MIME PDF/PNG/JPEG y con CSP existente, production sustituye exclusivamente `frame-ancestors https://bbtecnologia.com` y retira X-Frame-Options en esa respuesta. Otras directivas/rutas mantienen seguridad. DEV conserva `'self' http://localhost:3005`. No derivar autorización de Origin, Referer ni R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS; sin comodines. Tickets firmados, expiración, autorización contextual y aislamiento preservados.
No se capturaron en esta intervención cabeceras productivas HTTP200; el cierre funcional del navegador es PASS_PO. Un401 sin ticket conserva protecciones y no representa la respuesta autorizada del visor.


---

## 2026-11-25 — Ampliación focal DELETE productivo, ingeniería local R1

### Contrato implementado para la autorización productiva

`R2_NAS_PRODUCTION_DELETE_ENABLED` está deshabilitado por defecto. No sustituye ni reutiliza `R2_NAS_DEV_DELETE_ENABLED`; en PROD este último permanece false. Se requiere adicionalmente `R2_NAS_PRODUCTION_DELETE_POLICY`, JSON de una decisión PO acreditada, nunca una autorización inferida del código.

La política versión 1 contiene `decisionId`, `proteccion.tipo` (`BACKUP_RECUPERABLE` o `RIESGO_COPIA_UNICA_ACEPTADO_PO`) y `proteccion.referencia`, `modo`, `desde`, `hasta`, y `contextos` con pares empresa/clienteId. La referencia no demuestra por sí sola un backup: antes de configurarla debe existir evidencia/decisión humana correspondiente. Fechas UTC estrictas, vigencia acotada, desde no anterior al cutoff original.

Modo `EXACTO`: lista de 1 a 20 identidades completas `{reservaId,archivoId,documentoId,version,empresa,clienteId,expedienteId}`; sin duplicados ni cruces de contexto. Es el mecanismo de piloto y recuperación B expresamente autorizada; ningún otro archivo se borra por activar el flag. Método interno `recuperarPendientesExactosProduccion()` reutiliza reserva/MOVE y no crea endpoint público de borrado. El lote entero se valida antes de reclamar trabajo. No usar scripts históricos ni barridos de prefijos.

Modo `NUEVOS`: sin lista de archivos y solo confirmaciones individuales desde `policy.desde`, dentro de los contextos autorizados. Así no adopta candidatos B ya confirmados. No impone las listas DEV como requisito de la operación ordinaria productiva. La elegibilidad documental existente mantiene sus verificaciones de archivo nuevo/fecha/contexto, más confirmación individual posterior al corte. No se usa la fecha de la OC/OS padre como autorización de borrado.

Se exige NODE_ENV=production, destino SYNOLOGY_PROD, host 10.77.26.2, share GESTION-DOCUMENTARIA, raíz PLATAFORMA_DOCUMENTAL, archivador/automatismo/nuevos/visor activos y aceptación de visor explícita. `R2_NAS_VIEWER_ACCEPTED=false` sigue siendo el flag productivo acreditado; PASS_PO anterior no lo cambia. No activar estos valores hasta autorización específica y protección/decisión de riesgo. Cutoff original preservado: `2026-11-24T22:48:35.970Z`.

Antes de DELETE: documento confirmado, reserva/tenant/contexto/versión y ruta definitiva coincidentes, lectura NAS independiente con tamaño/SHA256, disponibilidad por el camino de visor y ausencia de referencias incompatibles. Revalidar política; registrar durablemente decisión, protección e identidad R2/ETag antes de la intención DELETE, mediante la tabla 0026 y auditoría aditiva existentes.

El adaptador vuelve a hashear los bytes R2 y comprueba la cuenta contra el endpoint real del SDK. ETag es un token opaco, no SHA256. Con exclusión compartida y reserva permanente, el DELETE productivo envía `If-Match` del objeto verificado y no dispone de fallback incondicional. El cliente DELETE usa maxAttempts=1. Si la API rechaza la condición o existe sustitución/fallo/ambigüedad, no atribuir eliminación ni repetir DELETE automáticamente.

Los escritores genéricos y directos no pueden recrear o eliminar por fuera del archivador una clave reservada confirmada o incierta. Se conservan publicación NAS sin reemplazo, lease/CAS, protección del origen previo y reconciliación. Respuesta perdida+HEAD404 no acredita autoría; respuesta previa exitosa y ausencia posterior solo se acreditan para el mismo intento. Un intento incierto todavía presente tampoco se repite automáticamente. Fallos de NAS/DELETE no revierten la confirmación de negocio.

Las exclusiones numéricas 546/552/553 y autorizaciones 554/555 pertenecen a DEV y no se trasladan a identidades PROD por coincidencia de número. No se intervinieron esos objetos. Sin renombrar, recalcular periodo, modificar TEMP/OCR, esquemas, SQL 0025/0026 ni credenciales.
