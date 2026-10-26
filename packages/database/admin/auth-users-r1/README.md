# Aprovisionamiento administrativo BBTI/BBTEC — R1

Owner: Domain Architect. Estado: implementación G2 para revisión; sin aprobación productiva.

Este artefacto administrativo implementa cuatro usuarios y ocho workspaces por correo,
código de sistema/perfil y abreviatura de cliente destino. No es una migración estructural,
no utiliza versiones 0023/0024/0025 ni escribe `core.schema_migrations`.
Se rige por [R1](../../../../docs/23-standards/11-source-development-and-release.md)
y complementa [seeds](../../../../docs/06-database/05-seeds.md).

## Integridad y ejecución

`SHA256SUMS` identifica módulo, suites, adaptador privado, punto de entrada, este documento y la propuesta O2; no contiene
secretos. Desde este directorio: `sha256sum -c SHA256SUMS`. `provision()` y
`recoverDelivery()` lo verifican antes de preparar credenciales o entregar. Contrastar
su digest con el aprobado por PO: el checksum local no es firma ni autorización.
El módulo exporta una API, no conecta automáticamente ni dispone de CLI productivo.

El llamador aporta una conexión `postgres` autorizada sin debug/logging de parámetros,
`expectedDatabase`, el digest aprobado `approvedIntegrity` y un adaptador privado `credentialSink` con `prepare` y `deliver`.
LAB sigue siendo el entorno predeterminado. Producción exige autorización explícita vinculada
al digest, base, rol, servidor y alcance exacto. No basta cambiar `expectedDatabase`.
La habilitación está implementada pero no ejecutada; faltan aprobaciones y configuración
operativa de claves/destinatarios y promoción. O3 está acreditado como evidencia fechada,
no sustituye el preflight de la ejecución futura.

Las identidades maestras ausentes/ambiguas o inactivas abortan antes de escribir.
Los usuarios existentes deben estar activos con correo exacto. Sus workspaces existentes
deben ser un subconjunto compatible de la matriz exacta; extras, permisos adicionales,
vigencias o favoritos distintos abortan toda la transacción. Solo se insertan faltantes;
no se actualizan ni eliminan usuarios/workspaces existentes. Los nombres de usuarios nuevos
son sus identificadores locales del correo, sin inventar nombres legales.
Un bloqueo asesor serializa este procedimiento; las restricciones y locks de filas
preservan consistencia. Un conflicto concurrente produce rollback, nunca sobrescritura.

## Credenciales y entrega privada pendiente

Solo para usuarios nuevos: 32 bytes aleatorios criptográficos por usuario, bcrypt coste 12,
hash transmitido a PostgreSQL por parámetros. Ningún secreto se devuelve en el resultado,
escribe en archivos o registra en consola. Usuarios existentes no consultan ni sustituyen
su hash. Las cadenas en memoria no pueden garantizar borrado físico en JavaScript.

Adaptador OpenPGP implementado; claves, directorios y canal productivos aún no aprobados:

1. Generar `operationId` y credenciales independientes en memoria; insertar solo faltantes.
2. `prepare({operationId, integrity, credentials})` custodia la preparación por un canal
   privado aprobado sin entregar al usuario; debe conservar una referencia recuperable
   fuera de Git, sin secretos en logs/archivos temporales. `private-delivery.mjs` persiste
   únicamente sobres cifrados a usuario y custodio y un journal no sensible. Verifica las
   huellas públicas aprobadas, vigencia y capacidad de cifrado antes de la operación.
3. Registrar `operationId`, digest del artefacto, rol y cantidades en auditoría PostgreSQL,
   sin secreto; confirmar la transacción. Un registro visible acredita persistencia.
4. Solo tras COMMIT confirmado, `recoverDelivery()` verifica base, auditoría y digest antes
   de `deliver({operationId, integrity})`. No transmite passwords en argumentos de entrega.
5. `deliver()` publica cada sobre cifrado en su directorio privado previamente aprobado;
   requiere un acuse individual OpenPGP firmado antes de marcar entrega completa. El acuse
   contiene solo `operationId`, `integrity`, `email` y `envelopeSha256`. La firma separada
   `.ack.json.sig` se verifica contra la huella del usuario. Sin acuse, queda pendiente;
   el adaptador confirma destinatarios individualmente y es idempotente por operación;
   si falla parcialmente, se devuelve `COMMITTED_DELIVERY_PENDING`. Reintentar
   `recoverDelivery()` con la MISMA preparación; no llamar a un reset ni regenerar passwords.
6. Tras acuse completo, añadir evento `ADMIN_DELIVERY_CONFIRMED`. Si se pierde ese acuse o
   falla su escritura, el reintento consulta auditoría y el adaptador evita entregas duplicadas.

No existe atomicidad PostgreSQL/canal externo. Ante resultado de COMMIT desconocido se
retorna `TRANSACTION_OUTCOME_UNKNOWN` con ID: consultar/recuperar esa operación antes de
reintentar. Si no hay registro confirmado, `NOT_COMMITTED` no entrega secretos. Una pérdida
de la preparación privada tras COMMIT exige intervención autorizada; nunca regeneración
silenciosa. Las pruebas usan claves sintéticas y no acreditan el canal de usuarios reales. La futura
aprobación debe definir custodia privada, autenticación del destinatario, retención,
acuse y descarte explícito de preparaciones de transacciones abortadas. No hay borrado
ni rotación automática. Todos los resultados públicos son metadatos sin secretos.

## Decisión PO de cierre R1

La orden `BBTI_AUTH_USERS_FINALIZE_PROVISIONING_R1` excluye `password_change_required`,
`credential_version` y cualquier modificación estructural de autenticación. Se conservan
las credenciales iniciales mediante entrega privada. Una rotación administrativa controlada
requiere aprobación expresa posterior del PO; no se ejecuta ni se automatiza en esta entrega.
La [propuesta O2](rotation-proposal.md) se conserva solo como antecedente fuera del alcance
actual, no como requisito pendiente para aceptar este procedimiento. No se afirma caducidad,
cambio obligatorio al primer ingreso ni bloqueo de acceso ordinario por rotación.

## Preparación de promoción, sin ejecución

Ruta: SOURCE main → Enterprise main → GHCR → EC2. G3 deberá aceptar e integrar únicamente
el procedimiento administrativo, sus pruebas, instrucciones, checksums y la referencia en
`docs/06-database/05-seeds.md`; verificar identidad del artefacto al promover a Enterprise.
La evidencia durable permanece en la ubicación institucional externa, sin secretos.
No se modificó ningún servicio ejecutable: no se requiere construir/publicar imágenes GHCR
ni recrear contenedores de aplicación por este artefacto. No se modifica ms-auth ni su esquema.
La presencia del artefacto en Enterprise/EC2 no autoriza ejecutarlo: verificar primero las
identidades productivas por claves naturales, aprobar el canal privado y obtener autorización
independiente de escritura productiva. Esta orden no permite commits, push, promoción o deploy.

## Validación LAB y reversión

Pruebas de corrección, desde SOURCE y con acceso Docker autorizado:

```bash
BBTI_ISOLATED_TESTS=1 node --test packages/database/admin/auth-users-r1/isolated.test.mjs
BBTI_LAB_TESTS=1 BBTI_USE_ISOLATED_EVIDENCE=1 node --test packages/database/admin/auth-users-r1/provision.test.mjs
```

La primera suite crea un PostgreSQL independiente en red interna sin puertos publicados
y conexión desde el host a su IP privada, bases nuevas y seis tablas institucionales reales. Solo lee el
DDL LAB con pg_dump; no copia filas ni hashes LAB, no ejecuta migraciones ni modifica
la base principal. Genera fixtures propios de cinco históricos y prueba creación inicial
4/8, reejecución 0/0, favoritos/permisos, rollback, entrega parcial y pérdida del acuse COMMIT.
El contenedor y las bases se conservan para inspección, sin eliminar objetos existentes.
Su autenticación trust es exclusiva de este aislamiento de pruebas, nunca plantilla PROD.

La segunda suite reutiliza ese aislamiento para las regresiones previas. Sin
`BBTI_USE_ISOLATED_EVIDENCE=1`, su modo anterior apunta a LAB principal y NO debe usarse
durante el cierre O4. No se requiere reconstruir LAB ni aplicar 0024 pendiente.
El procedimiento administrativo no usa el runner ni escribe el ledger de migraciones.

Evidencia durable en `~/evidencias/documental-platform/auth-users-g2-r1-20261026/evidencias/`
(resuelta desde el directorio personal del operador, fuera de SOURCE): resultados iniciales
preservados; correcciones en `corrections-result.json`, `corrections-output.tap` y
`isolated-regression-result.json`/`isolated-regression-output.tap`. El opt-in omitido
produce SKIP, nunca acredita PASS. No se guardan passwords, hashes de autenticación o URLs.

El rollback previo a COMMIT incluye cuentas, workspaces y auditoría; una preparación
externa puede permanecer pendiente de descarte explícito. Tras COMMIT no se borran
cuentas automáticamente: verificar procedencia/dependencias y obtener autorización para
compensación o reinicialización. No eliminar históricos ni reemplazar sus credenciales.
Esta entrega no habilita producción, integración SOURCE, commits ni push.

Las redirecciones de salidas TAP deben apuntar a esa misma carpeta institucional; no
recrear `docs/testing/evidencias/auth-users-g2-r1/`. Los resultados y copias ya archivados
acreditan la versión anterior de los artefactos: una corrección de rutas cambia su digest,
sin constituir una nueva ejecución de las pruebas LAB.

## Punto de entrada y aprobación externa

`production-entrypoint.mjs` acepta `preflight`, `execute` o `recover --operation UUID`.
Todos requieren `--approval /ruta/privada/approval.json` (archivo 0600 fuera de Git).
No contiene contraseñas: identifica environment=production, database=gestion_documental,
role=document_platform, scope=4_USERS_8_WORKSPACES_ONLY, artifactIntegrity, approvalId,
custodian, operator, dbWriteAuthorized/privateDeliveryApproved/administrativeRotationApproved,
keysApprovalId/deliveryChannelApprovalId/rotationApprovalId, expiresAt, enterpriseRoot,
enterpriseCommit/sourceCommit, expectedHost/expectedServer, sourceRoot, custodyRoot,
gpgHome, custodianFingerprint y cuatro recipients {email,fingerprint,deliveryDirectory}.
Las aprobaciones son referencias operativas suministradas por el PO, no una firma digital
que el software pueda inventar. No se incluye una aprobación productiva rellenada.

Los directorios de custodia, claves y entrega deben ser 0700, reales y fuera de repositorios;
los sobres/journals/acuses deben ser 0600. Preparar e importar SOLO claves públicas ya
verificadas; el adaptador nunca necesita claves privadas ni descifra sobres. Cada usuario
recibe su sobre, lo descifra privadamente y devuelve su acuse firmado por el canal aprobado.
La aprobación del canal incluye el control de acceso efectivo de cada directorio y la
identificación presencial/remota del destinatario. No se propone correo sin cifrar ni chats.
No publicar plaintext ni claves privadas en stdout. Las claves sintéticas de prueba no son
claves productivas ni material aprobable para destinatarios reales.

Futuro, solo después de promoción y autorizaciones, desde el checkout Enterprise aprobado:

```text
node packages/database/admin/auth-users-r1/production-entrypoint.mjs preflight --approval /ruta/privada/approval.json
node packages/database/admin/auth-users-r1/production-entrypoint.mjs execute --approval /ruta/privada/approval.json
node packages/database/admin/auth-users-r1/production-entrypoint.mjs recover --approval /ruta/privada/approval.json --operation UUID
```

El punto de entrada exige rama main limpia, commit Enterprise y ruta de módulo coincidentes;
lee exclusivamente deployment/env/.env.production de ese checkout, valida host RDS, base/rol,
abre READ ONLY y conserva proyección de cinco históricos/once workspaces. `preflight` no
escribe en RDS. `execute`/`recover` requieren autorización de escritura y postcheck read-only
4/8, permisos, favoritos y preservación histórica. Un fallo de acuse de COMMIT se trata como
resultado incierto, nunca como permiso para repetir/resetear. La promoción no autoriza por
sí sola escrituras. No se usa el runner ni se generan imágenes.

Validación nueva, únicamente componentes y conexión simulada (sin LAB/RDS):
`node --test packages/database/admin/auth-users-r1/production.test.mjs`.
Evidencia en `~/evidencias/documental-platform/auth-users-final-components-r1/`.

## Custodia exclusiva PO — ajuste autorizado

`custodyMode: "PO_MANAGED"` selecciona expresamente custodia exclusiva del Product Owner.
Requiere solo `custodianFingerprint`, `custodianDeliveryDirectory`, llavero público y
custodia privada; los cuatro usuarios objetivo conservan exactamente sus identidades y
workspaces, sin exigirles claves OpenPGP. Se cifran cuatro sobres separados exclusivamente
para el PO. La entrega usa `UUID-usuario.gpg` y acuses individuales `UUID-usuario.ack.json`
con firma separada del PO; no hay entrega antes de COMMIT ni regeneración por reintentos.
El journal fija la modalidad para impedir recuperaciones cruzadas entre modos.

En la aprobación externa PO_MANAGED siguen siendo obligatorios alcance, digest, custodio,
operador, autorizaciones DB_WRITE/entrega, huella verificada, canal, commits e identidad RDS.
`administrativeRotationApproved` y `rotationApprovalId` no se exigen en esta modalidad:
rotación y mantenimiento de usuarios están fuera del alcance. No se implementa caducidad
ni cambio obligatorio al primer login. INDIVIDUAL conserva sus controles anteriores.
La clave del PO debe permitir cifrado y firma; las privadas nunca se importan a EC2.

Validación focal sin LAB/RDS, evidencias externas sin sobres productivos:
`BBTI_COMPONENT_EVIDENCE_DIR=~/evidencias/documental-platform/auth-users-po-managed-r1 node --test packages/database/admin/auth-users-r1/production.test.mjs`.
Este ajuste requiere aceptación y promoción antes de ejecutarse en Enterprise/EC2.
