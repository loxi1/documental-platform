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


## 2026-11-25 — Política NUEVOS permanente explícita (G4, despliegue HOLD)

Extensión compatible de política versión1: `modo:"NUEVOS"` con `permanente:true` y sin propiedad `hasta`. Solo esta combinación expresa permanencia; omitir `hasta` sin `permanente:true`, indicar false/null/string, combinar permanencia con `hasta` o usarla con EXACTO falla cerrado. Las políticas temporales anteriores siguen exigiendo `hasta` UTC válido y vigente. No se usan fechas lejanas ni renovaciones para la modalidad permanente.

Se conservan `decisionId`, protección/aceptación PO, pares empresa/clienteId y `desde` UTC; la autorización se revoca mediante `R2_NAS_PRODUCTION_DELETE_ENABLED=false`. El runtime registra `permanente:true` en su evidencia de autorización, sin inventar vencimiento. No cambian NAS, integridad, exclusión, reserva durable, referencias, If-Match, maxAttempts1 ni acreditación DELETE+HEAD404 del mismo intento.

Representación preparada para autorización posterior de activación (NO aplicada por esta corrección):
```json
{"version":1,"decisionId":"PO-NAS-PROD-NUEVOS-PERMANENTE-20261125-R1","proteccion":{"tipo":"RIESGO_COPIA_UNICA_ACEPTADO_PO","referencia":"HYPER_BACKUP_BBTI_DOCUMENTAL_PROD_BACKUP_INTERVALO_DIARIO_PO_20261125"},"modo":"NUEVOS","permanente":true,"desde":"2026-11-25T20:00:00Z","contextos":[{"empresa":"BBTEC","clienteId":1},{"empresa":"BBTI","clienteId":2}]}
```

Inicio DELETE inalterable20:00Z (15:00PET); cutoff NAS independiente `2026-11-24T22:48:35.970Z`. OC003211/archivo503/reserva6/documento511, confirmada19:28:36.199Z, permanece excluida sin intervención ni adopción retroactiva. Hyper Backup CLOSED_PASS_PO; recuperación SHA256 acreditada, riesgo mismo volumen aceptado y ventana entre copias diarias documentada; no se afirma respaldo previo de cada documento nuevo.

La política temporal efectiva en EC2 se preserva intacta; esta ingeniería no modifica configuración ni runtime productivos. EC2_DEPLOYMENT=HOLD; PERMANENT_DELETE_ACTIVATION=HOLD. Publicación integral SOURCE→Enterprise→GHCR all autorizada por mandato ejecutivo; aceptación física y cierre G4 posteriores, no anticipados.


---

## 2026-11-25 — Cierre físico productivo DELETE permanente y continuidad institucional

ACTION=BBTI_PRODUCTION_R2_SAFE_DELETE_AND_FINAL_CLOSURE_R1; NORMAL/R1, colecciónR3, ONE_INTEGRATED_RELEASE. G1/G2/G3 cerrados. PO autoriza activación permanente y recuperación institucional exclusivamente reserva7/archivo504, más automatismo ordinario NUEVOS en BBTEC/cliente1 y BBTI/cliente2. Mandatos y declaracionesPO preservados en `/home/loxi1/bbti-evidence/nas-production-safe-delete-20261125-r1/final-physical-documentary-closure-r1`. No nueva ingeniería, build, migración ni publicaciónGHCR.

### Identidad de release y configuración efectiva

GHCRrun45698872132 SUCCESS4/4, constructorEnterprise `1e1377a83fea4811f93b19628aed4b2d0dcd7279`, checkout previoEC2 `0d8f4cb139ce13fe4f37c88f03ab3e973b363d9f`. Deploy integral y validación técnica PASS acreditados por MSE3.1, sin repetición. Releaseactiva `/home/ubuntu/releases/documental-platform-bbti/integrated-45698872132-1e1377a8-r1`. Cuatro digests linux/amd64 preservados:

- api-gateway:`sha256:55b04235af79c484fe2bc2c6ec9a2a1ecf2d09b373a89b7533c36b9b4ee60e34`
- ms-auth:`sha256:2bf72bdff09ed42508c739cbb0c4f09b9f192500d85c588885c21e72a507f80f`
- ms-documentos:`sha256:e830168139d3a550a871f48f72b7f628d3eccaf6696a26df433530c7368c81ea`
- web-admin:`sha256:bba959ab197ec890d2fed429a4857feff800a1d197ee94232589a362d0a4e75c`

Configuración aplicada por autorizaciónPO:versión1,modoNUEVOS,permanente:true,sin propiedad hasta. DELETE_FROM=`2026-11-25T20:00:00Z`; cutoffNASindependiente=`2026-11-24T22:48:35.970Z`;contextosBBTEC:1 yBBTI:2. DELETEPROD=true,DELETEDEV=false,visoraceptado=true. SoloDocumentos recreado porconfiguración con mismo digest; demáscontenedores preservados,health/ready200 PostgreSQL/NATS UP. No renovación ni fecha artificial. Revocación:deshabilitar flag productivo en últimooverride efectivo,validarCompose yrecrear soloDocumentos mismo digest; editar archivo no cambia el proceso yaejecutado. Preservar evidencia yno rollbackautomático.

### Recuperación institucional504 y aceptaciónPO

Archivo504/documento512/reserva7 UUID8618824d-9781-825a-a45b-6e0a06f7234b,v1,expediente3,BBTEC/cliente1. Ruta `documentos/2026/04/BBTEC/OC_003211__FACTURA_F001-7164_20600211618.pdf`. Única invocación de recuperarPendientesExactosProduccion bajoNUEVOS,sin ampliarEXACTO ni repetirconfirmación. NAS522007bytes/SHA256`d18207ca73ce7c8ff92d2b202d399f1538ac7298b9e40ec46c6781b89789f8b7`. DELETE204yHEAD404,autorización durable ymismaintención/respuesta/ausencia `4c304057-2005-4c98-b231-b2b8481bbbd5`,estadoELIMINADO_ACREDITADO/COMPLETADO,documentoconfirmado yrelaciónpreservada. PO confirmó explícitamentevisualizaciónPASS,descargaPASS ycontenidocorrecto;previewPOproveedorNAS, sin persistir ni reutilizar ticket compartido.

### Testigo nuevo automático505:GuíaTEO1-329

Archivo505/documento513/reserva8 UUID587e84b2-b2e6-8b76-a135-381fe52402a1,v1,BBTEC/cliente1/expediente3,adjunto_guia. Confirmación25/11 21:57:33.768334Z (16:57:33PET),CLAIM21:57:33.805812Z. PO confirmóflujoordinario yvisualización/descargaPASS. No recuperaciónmanual505 porCodex ni nueva confirmación provocada por la verificación. Cadena postcommitexistente:confirmación→NASverificado/lecturavisor→autorizaciónpermanente→DELETEcondicional204→ausencia acreditada yHEAD404. Mismointento `722ddaae-2ebb-40d0-8d33-6f79abfc5250`. If-Match exigido poradaptadorpublicado yETagopaco registrado; sin afirmar captura independiente de paquetes.

RutaR2/NASidéntica `documentos/2026/04/BBTEC/OC_003211__GUIA_TEO1-329_20600211618.pdf`;NASindependiente452079bytes/SHA256`a34797c1ff772c9fdded951528f448bcca24ec9a3ae70546f0b63934b9c1962d`,estadoCOMPLETADO/ELIMINADO_ACREDITADO,documentoconfirmado. DescargaHTTPindependiente desde endpointpúblicoautorizadoHTTP200(application/pdf) coincideexactamente en452079bytes ySHA256 conNAS/RDS. Ticket generado mediante lógica existente permaneció solo enmemoria, sin exposición nipersistencia.

### Conciliación de copias locales y exclusiones

507.pdf local1819732bytes/hash2ef7cd7b5d6e1f0cc05e1fd53bd8ce2eed0270dc550a51103428d945c3b88b93 no corresponde aarchivo507 enRDS;POidentificóelpreview504. Copiaslocales505.pdf y505-original.pdf también sonPDFgeneradosporvisor/navegador(CreatorFirefox,ProducerSkia/PDFm149),conbytes/hashesdistintos. No se declaran idénticas aNAS ni se usan comoprueba deidentidadalmacenada. La igualdadacreditada corresponde aloriginal recibido porHTTPpúblico yNAS, separada dePASS_PO. No fallodeintegridadservidoracreditado.

Reservas1–6/archivos498–503 quedanexcluidos porconfirmaciónanteriora20Z. Filascompletas conservanSHA256idénticos antes/después;ningunaintervención físicaenobjetosexcluidos. OC003211principal503/documento511 sigue enR2;su exclusión no afecta nuevosadjuntoselegibles. Losobjetosanterioresno se adoptanretroactivamente.

HyperBackupCLOSED_PASS_PO;recuperaciónhashPASS;riesgomismovolumenBASIC eintervaloentrebackupsdiarios aceptados. No se atribuyebackup previoacadanuevodocumento. Sinreaperturabackup,OCR/R2/NAS/periodos/migraciones/infraestructura, sinDELETEdirecto,cron,timersni nuevosservicios.

Cierre técnico/funcional físico acreditado; este incremento esexclusivamentedocumental. Commit/pushSOURCE→adendaspropiasEnterprise→sincronizaciónEC2 documental, sinrebuild nirecreate. SHAfinales ypreservaciónruntime se registran enrecibosexternos tras ejecución, evitandoautorreferencia. EntregaMSEActual paraactualizaciónincrementalR3,Bibliotecario,legadosucesoryresolucióndefinitivaG4;noafirmar indexaciónoaprobaciónexternanorecibida.
