# Evidencia de duplicado secuencial — Sprint 2.1C

**Proyecto:** Documental Platform ERP
**Sprint:** 2.1C — Carga Documental Segura MVP
**Evidencia:** EVID-2.1C-018
**Fecha de ejecución:** 2026-07-17
**Tipo de prueba:** Duplicado físico secuencial
**Estado:** EJECUTADA Y VALIDADA
**Concurrencia:** FUERA DE ALCANCE
**Implementación:** NO AUTORIZADA

## 1. Objetivo

Validar el comportamiento de la carga guiada cuando se intenta cargar secuencialmente el mismo archivo binario, con el mismo SHA-256, dentro del mismo expediente y contexto autorizado.

La prueba debía comprobar:

1. rechazo explícito del duplicado;
2. referencia al archivo y documento existentes;
3. ausencia de un nuevo documento lógico;
4. ausencia de una nueva fila en `documentos.documentos_archivos`;
5. ausencia de nuevos eventos `documento.creado` y `archivo.subido`;
6. ausencia de un nuevo `storageKey`;
7. propagación del nuevo `requestId`;
8. comportamiento declarado respecto a R2.

## 2. Baseline y entorno

```text
Baseline oficial integrada:
main / origin/main
→ ffc6ca62

Baseline funcional de referencia:
feat/documental-v2-operacion-2-1B
→ 178cf9db

Baseline documental 2.1C:
docs/sprint-2-1C-contrato-carga-documental-segura
→ a3f4e8e9
```

```text
Entorno:
Producción controlada

Cliente:
BBTI

Expediente:
17

Tipo esperado:
OC

Tipo de relación sugerida:
principal_oc

Canal de ingreso:
COMPRAS_UPLOAD_PRINCIPAL
```

## 3. Archivo utilizado

```text
Archivo:
/tmp/dp-upload-test/test-2-1C-upload.pdf

SHA-256:
bcc17bbe1f7428c39a0b8c2b5a3408fbd27d3d39cb60179143dcb79def8cea2c
```

Validación previa:

```text
Token de Compras:
DISPONIBLE

Hash local:
COINCIDE CON LA EVIDENCIA ORIGINAL
```

## 4. Estado anterior a la prueba

### 4.1 Documento lógico existente

```text
documentoId:
3

cliente_abreviatura:
BBTI

tipo_documental:
OC

estado observado antes del duplicado:
confirmado

creado_en:
2026-07-16 21:42:21.901973
```

Precisión temporal:

```text
Estado inicial inmediatamente después del upload original:
pendiente_ocr

Estado observado antes de la prueba duplicada:
confirmado

Evento posterior identificado:
ocr.procesado
```

Por tanto, `pendiente_ocr` corresponde al estado inicial post-upload y no al estado actual del documento.

### 4.2 Archivo existente

```text
archivoId:
33

documentoId:
3

nombre_archivo:
test-2-1C-upload.pdf

estado:
subido

storage_provider:
r2

storage_bucket:
data-prod

storage_key:
documentos/2026/07/BBTI/1c529071-6de1-4e60-9586-b06a7d06beab__test-2-1C-upload.pdf

creado_en:
2026-07-16 21:42:25.693708
```

Antes del intento duplicado existía una sola fila con el mismo SHA-256.

### 4.3 Eventos existentes

```text
1  documento.creado
2  archivo.subido
3  ocr.procesado
```

Los eventos originales tenían:

```text
usuario_id:
null

request_id:
null

correlation_id:
null
```

## 5. Solicitud duplicada

Se utilizó un `requestId` nuevo:

```text
23333333-3333-4333-8333-333333333333
```

Solicitud ejecutada:

```bash
curl -k -sS \
  -o /tmp/2-1C-duplicado-response.json \
  -w "\nHTTP_STATUS=%{http_code}\n" \
  -X POST \
  https://api.bbtecnologia.com/api/v1/documentos/carga-guiada \
  -H "Authorization: Bearer <TOKEN_SANITIZADO>" \
  -H "x-request-id: 23333333-3333-4333-8333-333333333333" \
  -F "archivo=@/tmp/dp-upload-test/test-2-1C-upload.pdf;type=application/pdf" \
  -F "expedienteId=17" \
  -F "tipoEsperado=OC" \
  -F "tipoRelacionSugerida=principal_oc" \
  -F "canalIngreso=COMPRAS_UPLOAD_PRINCIPAL" \
  -F "observacion=Prueba controlada Sprint 2.1C duplicado runtime"
```

## 6. Respuesta HTTP

```text
HTTP status:
409

Código público:
CONFLICT

Código específico:
ARCHIVO_DUPLICADO_EN_CARGA_GUIADA

Mensaje:
Ya existe un archivo equivalente. No se subió nuevamente a R2.

Request ID:
23333333-3333-4333-8333-333333333333

Acción sugerida:
abrir_existente
```

Referencia existente devuelta:

```text
archivoId:
33

documentoId:
3

nombreArchivo:
test-2-1C-upload.pdf

expedienteId:
17

tipoRelacion:
principal_oc

esPrincipal:
true
```

## 7. Verificación SQL posterior

### 7.1 Nuevo documento lógico

La consulta temporal desde `2026-07-17 17:43:40` devolvió:

```text
0 filas
```

Clasificación:

```text
Nuevo documento lógico:
DESCARTADO POR SQL
```

### 7.2 Nueva fila en `documentos_archivos`

La consulta por SHA-256 devolvió una sola fila:

```text
archivoId:
33

documentoId:
3

total_archivos_mismo_hash:
1
```

Clasificación:

```text
Nueva fila documentos_archivos:
DESCARTADA POR SQL
```

### 7.3 Nuevos eventos

La consulta por el `requestId` del intento duplicado devolvió:

```text
0 filas
```

La consulta posterior conservó exactamente:

```text
1  documento.creado
2  archivo.subido
3  ocr.procesado
```

Clasificación:

```text
Nuevo evento documento.creado:
DESCARTADO POR SQL

Nuevo evento archivo.subido:
DESCARTADO POR SQL

Evento asociado al requestId duplicado:
DESCARTADO POR SQL
```

## 8. Evidencia sobre R2

La respuesta del backend declaró:

```text
Ya existe un archivo equivalente. No se subió nuevamente a R2.
```

Además:

```text
No apareció una nueva fila en documentos_archivos.
No apareció un nuevo storageKey.
No apareció un nuevo evento archivo.subido.
```

Clasificación:

```text
Nueva subida R2:
NO OBSERVADA

Mensaje de retorno previo:
CONFIRMADO POR RUNTIME

Nueva llamada PutObject:
DESCARTADA POR CÓDIGO

Fundamento:
La búsqueda por SHA-256 y el lanzamiento de ConflictException ocurren antes de continuar hacia subirAR2(). El envío físico a R2 se realiza mediante S3Client.send(new PutObjectCommand(...)), ruta que no se alcanza cuando existe un duplicado previo.
```


## 9. Resultado consolidado

| Comprobación | Resultado | Clasificación |
|---|---|---|
| Duplicado secuencial detectado | Sí | CONFIRMADO POR RUNTIME |
| HTTP 409 | Sí | CONFIRMADO POR RUNTIME |
| `ARCHIVO_DUPLICADO_EN_CARGA_GUIADA` | Sí | CONFIRMADO POR RUNTIME |
| SHA-256 coincidente | Sí | CONFIRMADO POR RUNTIME |
| Referencia a `archivoId = 33` | Sí | CONFIRMADO POR RUNTIME |
| Referencia a `documentoId = 3` | Sí | CONFIRMADO POR RUNTIME |
| `accionSugerida = abrir_existente` | Sí | CONFIRMADO POR RUNTIME |
| Propagación del `requestId` en respuesta | Sí | CONFIRMADO POR RUNTIME |
| Nuevo documento lógico | No | DESCARTADO POR SQL |
| Nueva fila `documentos_archivos` | No | DESCARTADO POR SQL |
| Nuevo `documento.creado` | No | DESCARTADO POR SQL |
| Nuevo `archivo.subido` | No | DESCARTADO POR SQL |
| Evento con request ID duplicado | No | DESCARTADO POR SQL |
| Nuevo `storageKey` | No observado | CONFIRMADO POR SQL |
| Nueva subida R2 | No observada | CONFIRMADO POR RUNTIME + SQL |
| Nueva llamada `PutObject` | No | DESCARTADA POR CÓDIGO |
| Concurrencia | No probada | FUERA DE ALCANCE |

## 9.1 Alcance efectivo de la búsqueda por SHA-256

La consulta implementada es:

```sql
WHERE da.hash_sha256 = ${params.sha256}
  AND da.estado <> 'duplicado_absorbido'
  AND (
    ${params.documentoId}::bigint IS NULL
    OR da.documento_id = ${params.documentoId}::bigint
    OR ${params.expedienteId}::bigint IS NULL
    OR ed.expediente_id = ${params.expedienteId}::bigint
  )
```

Comportamiento efectivo:

| Parámetros recibidos | Alcance |
|---|---|
| `documentoId = null`, `expedienteId` informado | Global por SHA-256 |
| `documentoId` informado, `expedienteId = null` | Global por SHA-256 |
| Ambos valores nulos | Global por SHA-256 |
| Ambos valores informados | Mismo documento o mismo expediente |

No existen filtros por cliente, empresa, workspace ni cliente destino.

Clasificación:

- Alcance general: **GLOBAL POR SHA-256**.
- Exclusión: archivos con estado `duplicado_absorbido`.
- Restricción condicional: solo cuando `documentoId` y `expedienteId` tienen ambos valor.
- `EVID-2.1C-021`: **CONFIRMADO POR CÓDIGO**.

## 10. Impacto contractual

La prueba demuestra que el comportamiento actual es:

```text
1. Detecta el mismo contenido mediante SHA-256.
2. Rechaza la carga con HTTP 409.
3. Devuelve un código específico de duplicado.
4. Devuelve referencias al archivo y documento existentes.
5. Sugiere abrir el documento existente.
6. No crea un nuevo documento lógico.
7. No crea una nueva fila de archivo.
8. No crea eventos adicionales.
9. No genera un nuevo storageKey observable.
```

Queda pendiente definir contractualmente:

```text
Política definitiva de deduplicación:
confirmar si se mantiene el alcance global por SHA-256 observado en código

Forma pública definitiva del error:
CONFLICT + código específico

Semántica del campo duplicado:
error HTTP o respuesta exitosa idempotente

Exposición de storageKey:
no recomendada en contrato público

Auditoría del intento rechazado:
sin evento actualmente

Garantía de no invocación a R2 en el duplicado secuencial:
confirmada por control de flujo del código

Concurrencia:
pendiente de plan y GO separados
```

## 11. Dictamen de evidencia

```text
EVID-2.1C-018:
EJECUTADA

Duplicado secuencial:
CONFIRMADO POR RUNTIME

Ausencia de nuevo documento:
DESCARTADO POR SQL

Ausencia de nuevo archivo:
DESCARTADA POR SQL

Ausencia de nuevos eventos:
DESCARTADA POR SQL

Nueva subida R2:
NO OBSERVADA

Nueva llamada PutObject:
DESCARTADA POR CÓDIGO

Concurrencia:
FUERA DE ALCANCE
```

## 12. Estado Git al inicio de la prueba

```text
Rama:
docs/sprint-2-1C-contrato-carga-documental-segura

Commit de matriz maestra:
a3f4e8e9

Push:
NO REALIZADO

Merge:
NO REALIZADO
```

## 13. Siguiente acción

1. Presentar `EVID-2.1C-018` y `EVID-2.1C-021` al Maestro Intermedio.
2. Presentar al Maestro Intermedio la evidencia de retorno previo a `PutObject`.
3. Clasificar el alcance real de la búsqueda por SHA-256.
4. Presentar matriz y evidencia al Maestro Intermedio.
5. No ejecutar prueba concurrente.
6. No implementar cambios.
7. No hacer push ni merge sin dictamen.
