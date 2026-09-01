# Sprint 2.1C — Roadmap Técnico
# Carga Documental Segura MVP

## Estado oficial

```text
Sprint 2.1C:
ABIERTO EN FASE DE REVISIÓN TÉCNICA

Roadmap técnico:
AUTORIZADO

Runtime de observación:
AUTORIZADO

Consultas SQL solo lectura:
AUTORIZADAS

Contrato técnico:
PENDIENTE HASTA EVIDENCIA

Implementación:
NO AUTORIZADA
```

## 1. Objetivo

Verificar el flujo real de carga documental segura existente y congelar evidencia antes de proponer un contrato técnico definitivo.

El Sprint 2.1C no debe reconstruir upload desde cero. Debe revisar, observar y clasificar la infraestructura existente de carga guiada para determinar qué parte ya sirve para el MVP y qué brechas deben implementarse posteriormente.

Flujo a verificar:

```text
React
→ API Gateway
→ ms-documentos
→ prevalidaciones
→ SHA-256
→ detección de duplicado físico
→ R2
→ documentos.documentos
→ documentos.documentos_archivos
→ evento archivo.subido
→ documento disponible para asociación V2 posterior
```

## 2. Alcance autorizado

Durante esta fase se autoriza únicamente:

- lectura e inspección de código;
- consultas SQL de solo lectura;
- pruebas runtime controladas de observación;
- verificación de permisos;
- verificación de trazabilidad;
- documentación del flujo observado;
- confirmación o descarte de brechas;
- clasificación formal de hallazgos;
- preparación posterior de propuesta de contrato técnico.

## 3. Exclusiones obligatorias

Quedan fuera de alcance:

- OCR automático;
- ejecución o reprocesamiento OCR;
- IA documental;
- clasificación automática;
- extracción automática de datos;
- asociación V2;
- Grupo Factura;
- revisión contable;
- alertas;
- Caja Chica;
- Rendiciones;
- Requerimientos;
- reemplazo del Documento Operativo Principal;
- versionado avanzado;
- modificaciones de React;
- nuevos endpoints;
- cambios en DTO públicos;
- modificación de estados;
- cambios de permisos;
- cambios de tablas;
- migraciones;
- refactorizaciones;
- cambios en R2 o infraestructura cloud.

## 4. Inventario técnico preliminar

### 4.1 Backend — ms-documentos

Archivo identificado:

```text
apps/ms-documentos/src/documentos/documentos-upload.service.ts
```

Capacidades observadas en código:

- `prevalidarCarga()`;
- `cargaGuiada()`;
- validación de archivo requerido;
- cálculo de SHA-256;
- búsqueda de duplicados por hash;
- validación de expediente;
- validación de principal activo;
- creación de documento contenedor;
- subida a R2;
- inserción en `documentos.documentos_archivos`;
- registro del evento `archivo.subido`.

### 4.2 API Gateway

Archivo identificado:

```text
apps/api-gateway/src/documentos/documentos.controller.ts
```

Endpoints observados:

```http
POST /api/v1/documentos/carga-guiada/prevalidar
POST /api/v1/documentos/carga-guiada
GET  /api/v1/documentos/archivos/:archivoId/preview-url
```

Responsabilidades observadas:

- validar token;
- exigir permiso `documentos.subir`;
- recibir multipart;
- ignorar `cliente`, `clienteAbreviatura`, `empresa`, `empresaCodigo` enviados por body;
- inyectar empresa desde el contexto autenticado;
- reenviar multipart a `ms-documentos`;
- no exponer credenciales de R2 a React.

### 4.3 Web Admin

Archivos/componentes a revisar:

```text
apps/web-admin/src/services/carga-guiada.ts
apps/web-admin/src/hooks/useCargaGuiada.ts
NuevoExpedienteWizard
CompraExpedienteEditor
AlmacenExpedienteEditor
FinanzasExpedienteEditor
```

Debe documentarse qué componente:

- selecciona archivo;
- ejecuta prevalidación;
- envía multipart;
- interpreta duplicados;
- encadena OCR;
- actualiza interfaz;
- maneja errores.

### 4.4 PostgreSQL

Tablas confirmadas:

```text
documentos.documentos
documentos.documentos_archivos
documentos.documentos_origenes
documentos.expediente_documentos
documentos.ocr_resultados
```

Columnas relevantes de `documentos.documentos_archivos`:

```text
documento_id
nombre_archivo
ruta_archivo
hash_sha256
tipo_version
area_origen
estado
origen_archivo
metadata
storage_provider
storage_bucket
storage_key
public_url
version
es_version_actual
```

## 5. Flujo observado en código

### 5.1 Prevalidación

Flujo observado:

```text
recibir archivo
→ validar clienteAbreviatura
→ normalizar tipoEsperado
→ calcular SHA-256
→ buscar duplicados por hash
→ consultar expediente si aplica
→ consultar documento por clave documental si aplica
→ devolver acción sugerida
→ no persistir
→ no subir a R2
```

Clasificación inicial:

```text
Estado: Riesgo inferido del código hasta confirmación runtime.
```

### 5.2 Carga guiada

Flujo observado:

```text
recibir archivo
→ validar clienteAbreviatura
→ calcular SHA-256
→ buscar duplicados por hash
→ si duplicado, lanzar conflicto antes de R2
→ validar principal activo si corresponde
→ resolver bucket
→ crear documento contenedor si no se envía documentoId
→ subir a R2
→ insertar documentos.documentos_archivos
→ registrar archivo.subido
→ responder documentoId y archivoId
```

Clasificación inicial:

```text
Estado: Riesgo inferido del código hasta confirmación runtime.
```

## 6. Orden de operaciones a confirmar

Debe confirmarse con evidencia runtime el orden real:

```text
recibir archivo
→ calcular hash
→ buscar duplicado
→ validar reglas
→ recién después subir a R2
```

Criterio:

```text
Si el servicio sube primero y valida después, existe brecha crítica.
```

## 7. Modelo de duplicados

El roadmap debe distinguir:

```text
Duplicado físico
≠ Documento lógico existente
≠ Archivo ya asociado
≠ Nueva versión
≠ Reintento técnico
```

Preguntas obligatorias:

- ¿El mismo hash devuelve conflicto?
- ¿Reutiliza el archivo existente?
- ¿Crea un nuevo documento apuntando al mismo archivo?
- ¿Evita también OCR duplicado?
- ¿Cómo informa React?
- ¿El duplicado se busca globalmente, por empresa, por workspace o por expediente?

## 8. Consistencia R2 / PostgreSQL

Casos a diagnosticar:

### Caso A — BD crea documento y R2 falla

Riesgo:

```text
documento lógico sin archivo físico.
```

### Caso B — R2 sube y falla INSERT en BD

Riesgo:

```text
objeto R2 huérfano sin registro en documentos_archivos.
```

### Caso C — evento falla después de persistir archivo

Riesgo:

```text
archivo persistido sin trazabilidad completa de evento.
```

No se exige transacción distribuida, pero el futuro contrato debe definir comportamiento determinista, auditable y recuperable.

## 9. Creación de documentos.documentos

Debe documentarse:

- en qué punto se crea;
- con qué estado inicial;
- qué campos obligatorios se completan;
- si requiere identidad documental antes del upload;
- si puede existir sin archivo;
- si puede tener múltiples archivos/versiones;
- quién asigna `tipo_documental`;
- qué empresa y cliente destino se toman del contexto autenticado.

Observación inicial:

```text
El servicio crea documento contenedor si no recibe documentoId.
El estado observado en código es pendiente_ocr.
```

Clasificación inicial:

```text
Estado pendiente_ocr debe revisarse porque OCR está fuera de 2.1C.
No se autoriza cambio de estado durante esta revisión.
```

## 10. Creación de documentos.documentos_archivos

Debe verificarse:

- significado real de `version`;
- regla de `es_version_actual`;
- si el upload inicial siempre usa versión 1;
- si existe unicidad o índice sobre `hash_sha256`;
- si `public_url` debe usarse o evitarse;
- cómo se genera `storage_key`;
- si bucket depende de empresa, fecha o tipo documental.

Observación inicial:

```text
El upload inicial inserta version=1 y es_version_actual=true.
El storage_key incluye año, mes, clienteAbreviatura y UUID.
```

## 11. Contrato público Gateway observado

Debe inventariarse formalmente:

- ruta;
- método;
- multipart fields;
- headers;
- campos body aceptados;
- campos body ignorados;
- campos inyectados desde token;
- tipos MIME;
- tamaño máximo;
- respuesta exitosa;
- errores funcionales.

Regla objetivo:

```text
React no recibe credenciales R2.
React no sube directo a R2.
React no define empresa real por body.
Gateway inyecta empresa desde workspace autenticado.
```

## 12. Permisos

Permiso mínimo observado:

```text
documentos.subir
```

Matriz requerida:

```text
Workspace | Perfil | documentos.subir | Endpoint accesible | Resultado esperado | Resultado real
```

Áreas a revisar según configuración real:

- Compras;
- Almacén;
- Finanzas;
- Contabilidad;
- Administración.

## 13. Evento archivo.subido

Debe confirmarse:

- tabla destino;
- momento exacto de emisión;
- si ocurre después de persistir BD;
- actor;
- requestId;
- correlationId;
- documentoId;
- archivoId;
- si una llamada duplicada genera evento adicional.

Nota:

```text
archivo.subido no debe confundirse con auditoría operativa V2.
```

## 14. Respuesta mínima para 2.1D

La respuesta exitosa observada debe permitir identificar:

```text
documentoId
archivoId
hashSha256
nombreArchivo
estadoDocumento o estadoArchivo
duplicado
eventoRegistrado
```

Para 2.1D, como mínimo conceptual, se necesita:

```text
documentoId
archivoId
```

La asociación V2 no se realizará en 2.1C.

## 15. Brechas preliminares a confirmar o descartar

```text
B1. Consistencia R2/BD no cerrada.
B2. documentos.documentos puede crearse antes de confirmar R2.
B3. Objeto R2 puede quedar sin registro si falla BD.
B4. Estado pendiente_ocr no calza completamente con 2.1C sin OCR.
B5. React/Web Admin puede estar acoplado a procesar OCR.
B6. Falta evidencia runtime del caso duplicado.
B7. Falta evidencia de permisos reales por perfil.
B8. Falta revisar índice sobre hash_sha256.
B9. Falta confirmar si la respuesta actual basta para 2.1D.
B10. Falta confirmar comportamiento ante reintento y concurrencia.
```

## 16. Clasificación obligatoria de evidencias

Cada prueba o hallazgo deberá clasificarse como:

```text
Confirmada
No reproducida
Inconclusa
Bloqueada por entorno
Riesgo inferido del código
Brecha comprobada
```

No se podrá declarar una brecha runtime únicamente por lectura estática.

No se podrá declarar segura una capacidad únicamente porque exista un bloque de código.

## 17. Pruebas runtime necesarias

### 17.1 Prevalidación válida

```text
POST /api/v1/documentos/carga-guiada/prevalidar
→ success
→ hashSha256
→ persistido=false
→ storageProvider=null
```

### 17.2 Archivo permitido

```text
POST /api/v1/documentos/carga-guiada
→ documentoId
→ archivoId
→ storageProvider=r2
→ hashSha256
```

### 17.3 Reenvío del mismo archivo

```text
POST mismo archivo nuevamente
→ conflicto o respuesta controlada
→ no nueva carga física a R2
→ no nuevo documentos_archivos funcional
```

### 17.4 Carga sin OCR

```text
Carga exitosa
→ no ejecutar OCR
→ documento y archivo consultables
→ documento disponible para operación posterior
```

### 17.5 Usuario sin permiso

```text
Usuario sin documentos.subir
→ endpoint bloqueado por Gateway
→ no llega a ms-documentos
```

### 17.6 Evento archivo.subido

```text
Consultar evento
→ documentoId
→ archivoId
→ usuario/contexto si disponible
```

### 17.7 Preview seguro

```text
GET /api/v1/documentos/archivos/:archivoId/preview-url
→ Gateway valida acceso
→ signed URL temporal
```

## 18. Consultas SQL autorizadas

Solo lectura:

```sql
SELECT
information_schema
pg_catalog
```

Prohibido:

```sql
INSERT
UPDATE
DELETE
ALTER
DROP
TRUNCATE
CREATE INDEX
migraciones
```

## 19. Condiciones para pasar a contrato técnico

El contrato técnico solo podrá redactarse cuando exista evidencia suficiente sobre:

1. flujo real documentado;
2. brechas clasificadas;
3. consistencia R2/PostgreSQL definida conceptualmente;
4. semántica de duplicado definida;
5. estado inicial aprobado;
6. independencia de OCR demostrada;
7. respuesta mínima para 2.1D;
8. permisos reales verificados;
9. no exposición de persistencia como contrato público;
10. dictamen técnico posterior.

## 20. Relación con Sprint 2.1D

Sprint 2.1D deberá consumir documentos reales ingresados por 2.1C:

```text
Documento Principal real
→ Factura real
→ Grupo Factura
→ Guía
→ Nota de Ingreso
→ Transferencia
→ Detracción
→ Workspace
```

2.1D no debe depender de fixtures manuales ni INSERT SQL de sandbox.

## 21. Decisión actual

```text
Roadmap:
EN PREPARACIÓN

Runtime de observación:
AUTORIZADO

Contrato técnico:
PENDIENTE HASTA EVIDENCIA

Implementación:
NO AUTORIZADA
```

## 22. Resolución

```text
Sprint 2.1C:
ABIERTO EN FASE DE REVISIÓN TÉCNICA

Siguiente entregable:
docs/06-arquitectura-operativa/sprint-2-1C-roadmap-carga-documental-segura.md

Regla:
Verificar antes de diseñar.
Documentar antes de proponer.
No modificar código.
```
