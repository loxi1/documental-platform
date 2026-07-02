# Motor Documental Architecture

## 1. ¿Qué es el Motor Documental?

El **Motor Documental** es el núcleo backend reutilizable de Documental Platform encargado de transformar archivos documentales en documentos de negocio confiables, versionados, trazables y vinculables a distintos módulos de la plataforma.

No es una pantalla, no es un flujo de usuario y no pertenece a un módulo específico. Es una capa transversal que sirve a Compras, Almacén, Finanzas, Revisión Contable, Caja Chica, Rendiciones y futuros módulos.

Su responsabilidad principal es mantener una separación clara entre:

```text
Archivo físico
↓
documentos.documentos_archivos
```

Y:

```text
Documento lógico de negocio
↓
documentos.documentos
```

Un documento lógico puede tener uno o varios archivos físicos asociados como versiones, evidencias, reemplazos o sustentos.

Ejemplo:

```text
Documento lógico:
GUIA_REMISION EG07-00000163

Archivos físicos:
v1 original
v2 escaneado
v3 firmado / corregido
```

El Motor Documental garantiza que los documentos tengan identidad, clave documental, trazabilidad, versiones, metadata validada, relación con expedientes y posibilidad de revisión posterior.

---

## 2. ¿Qué problemas resuelve?

El Motor Documental resuelve problemas estructurales comunes en plataformas documentales empresariales.

### 2.1. Evita duplicidad documental

Sin un motor central, cada módulo podría crear documentos repetidos para la misma factura, guía, OC, transferencia o detracción.

El motor resuelve esto mediante una **clave documental única** por tipo documental.

Ejemplos:

```text
FACTURA:
CLIENTE|FACTURA|RUC|SERIE|NUMERO

OC:
CLIENTE|OC|NUMERO

GUIA_REMISION:
CLIENTE|GUIA_REMISION|RUC|SERIE|NUMERO

PAGO_DETRACCION:
CLIENTE|PAGO_DETRACCION|NUMERO_OPERACION
```

Si existe la misma clave documental, el backend no debe crear otro documento lógico. Debe responder conflicto controlado y sugerir agregar una nueva versión.

---

### 2.2. Separa documento lógico de archivo físico

Un error común es tratar cada PDF como un documento nuevo. El motor evita eso.

```text
PDF subido ≠ documento nuevo necesariamente
```

Un archivo subido puede ser:

```text
Nuevo documento lógico
Nueva versión de documento existente
Reemplazo
Evidencia adicional
Archivo pendiente de revisión
Archivo rechazado
```

---

### 2.3. Centraliza OCR y validación

El OCR no debe estar duplicado en Compras, Almacén o Finanzas. Todos los módulos usan el mismo flujo:

```text
Upload
↓
R2
↓
documentos_archivos
↓
OCR Worker
↓
ocr_resultados
↓
Validación usuario
↓
Confirmación
↓
Documento oficial
```

---

### 2.4. Reduce dependencia del frontend

El frontend puede proponer datos, pero no es autoridad.

El backend siempre debe recalcular:

```text
claveDocumental
clienteAbreviatura
rucComprador
codigoExpediente
tipoRelacion
datos derivados del expediente
```

Esto evita que un usuario o una pantalla defectuosa cree documentos inconsistentes.

---

### 2.5. Permite trazabilidad y auditoría

El motor conserva:

```text
OCR original
OCR editado
OCR confirmado
Cambios manuales
Versiones de archivo
Vínculos con expedientes
Usuarios y fechas de validación
```

Esto permite reconstruir qué pasó con cada documento.

---

### 2.6. Permite reutilización futura

El mismo motor debe servir para:

```text
Compras
Almacén
Finanzas
Revisión Contable
Caja Chica
Rendiciones
RRHH
Comunicaciones
```

Por eso no debe programarse pensando solo en un módulo.

---

## 3. ¿Qué responsabilidades tiene?

El Motor Documental tiene las siguientes responsabilidades.

### 3.1. Registro de archivos físicos

Registrar cada archivo subido en:

```text
documentos.documentos_archivos
```

Con datos como:

```text
storageProvider
storageBucket
storageKey
nombreArchivo
contentType
hashSha256
estado
tipoVersion
version
esVersionActual
```

---

### 3.2. Integración con almacenamiento privado

Los archivos se almacenan en Cloudflare R2 privado.

El motor debe usar signed URLs para vista previa, evitando que los documentos sean públicos.

```text
R2 privado
↓
Signed URL temporal
↓
Vista previa PDF/imagen
```

---

### 3.3. Orquestación OCR

El backend publica solicitudes de OCR mediante NATS.

```text
ms-documentos
↓
NATS subject: ocr.procesar-archivo
↓
OCR Worker
↓
Resultado OCR
```

El motor debe manejar correctamente casos donde el worker no responde o no hay suscriptores, evitando errores genéricos no controlados.

---

### 3.4. Normalización de tipo documental

El motor debe transformar variaciones del texto detectado a tipos documentales oficiales.

Ejemplo:

```text
Factura Electrónica
FACTURA ELECTRONICA
Factura
```

Debe normalizarse a:

```text
FACTURA
```

Lo mismo para:

```text
GUIA
GUIA DE REMISION
GUIA_REMISION
```

Debe normalizarse a:

```text
GUIA_REMISION
```

---

### 3.5. Extracción de metadata documental

Cada tipo documental debe tener extractor propio.

Estructura sugerida:

```text
core/extractors/factura.py
core/extractors/guia.py
core/extractors/nota_ingreso.py
core/extractors/oc.py
core/extractors/os.py
core/extractors/transferencia.py
core/extractors/detraccion.py
core/extractors/recibo_honorario.py
```

Todos los extractores deben devolver una estructura común:

```json
{
  "metadata": {},
  "metadataSource": {},
  "confidence": 0.0,
  "camposDetectados": [],
  "camposFaltantes": []
}
```

---

### 3.6. Generación de clave documental

La clave documental es responsabilidad exclusiva del backend.

El frontend nunca debe ser fuente de verdad.

Reglas base:

```text
FACTURA:
CLIENTE|FACTURA|RUC_EMISOR|SERIE|NUMERO

OC:
CLIENTE|OC|NUMERO

OS:
CLIENTE|OS|NUMERO

GUIA_REMISION:
CLIENTE|GUIA_REMISION|RUC_EMISOR|SERIE|NUMERO

NOTA_INGRESO:
CLIENTE|NOTA_INGRESO|NUMERO

PAGO_TRANSFERENCIA:
CLIENTE|PAGO_TRANSFERENCIA|NUMERO_OPERACION

PAGO_DETRACCION:
CLIENTE|PAGO_DETRACCION|NUMERO_CONSTANCIA_O_OPERACION
```

---

### 3.7. Confirmación documental

Cuando un usuario confirma un OCR, el motor debe:

```text
1. Leer OCR resultado.
2. Leer archivo físico.
3. Leer expediente.
4. Resolver cliente destino.
5. Completar metadata de contexto.
6. Recalcular clave documental.
7. Validar duplicados.
8. Actualizar documento lógico.
9. Actualizar OCR resultado.
10. Vincular documento al expediente.
11. Registrar auditoría.
12. Confirmar transacción.
```

Todo debe ejecutarse de forma transaccional.

---

### 3.8. Vinculación con expedientes

El motor vincula documentos a expedientes mediante:

```text
documentos.expediente_documentos
```

Relaciones principales:

```text
principal_oc
principal_os
principal_factura
```

Adjuntos:

```text
adjunto_factura
adjunto_guia
adjunto_nota_ingreso
adjunto_transferencia
adjunto_detraccion
adjunto_recibo_honorario
adjunto_otro
```

Debe garantizar que exista un solo principal activo por expediente.

---

### 3.9. Versionado documental

El motor debe permitir:

```text
Agregar versión
Reemplazar archivo lógico con nueva versión
Marcar versión actual
Consultar historial
Mantener versiones antiguas
```

Nunca debe sobrescribir físicamente un archivo.

---

### 3.10. Manejo de duplicados

Cuando se detecta una clave documental existente, el motor debe responder conflicto controlado.

Respuesta esperada:

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENTO_DUPLICADO",
    "message": "Ya existe un documento con la misma clave documental.",
    "details": {
      "documentoExistenteId": 123,
      "claveDocumental": "BBTI|FACTURA|20603430248|F001|00017434",
      "suggestedAction": "AGREGAR_VERSION"
    }
  }
}
```

Nunca debe devolver `500` por duplicado esperado.

---

### 3.11. Enriquecimiento documental

El motor debe enriquecer documentos usando catálogos internos.

Ejemplo:

```text
RUC proveedor
↓
core.proveedores
↓
razon_social
```

Si no existe, se puede consultar API externa y hacer upsert.

Este enriquecimiento debe ser reutilizable por todos los documentos.

---

### 3.12. Métricas OCR

El motor debe registrar métricas para evaluar calidad.

Ejemplos:

```text
confidence promedio
campos detectados
campos faltantes
campos editados manualmente
campos provenientes de OCR
campos provenientes de catálogo
campos confirmados sin cambios
```

Estas métricas permitirán mejorar los extractores y priorizar automatización.

---

## 4. ¿Qué no hace?

El Motor Documental no debe asumir responsabilidades que pertenecen a otras capas.

### 4.1. No define UX ni pantallas

No decide cómo se ve:

```text
Workspace
Sidebar
Modales
Tablas
Cards
Formularios
```

Eso pertenece al frontend y al equipo de UX.

---

### 4.2. No administra login, usuarios ni permisos visuales

No implementa:

```text
Login
JWT
Perfiles
Roles visuales
Navegación
Seguridad de interfaz
```

Puede recibir `usuarioId` para auditoría, pero no debe mezclar lógica documental con autenticación.

---

### 4.3. No decide reglas contables de cierre

El motor conserva documentos y metadata. La Revisión Contable usa esa información para decidir cierre, observación o regularización.

El motor no debe cerrar períodos contables por sí mismo.

---

### 4.4. No edita geometrías ni procesos GIS

GIS queda fuera de Documental Platform. Si en el futuro existe una integración documental, será mediante contrato externo, sin que el Motor Documental administre geometrías, capas, PostGIS, mapas ni sincronización CAD.

---

### 4.5. No borra físicamente documentos en flujos normales

El motor no debe eliminar archivos físicos por acciones comunes del usuario.

Debe preferir:

```text
Desvincular
Anular
Marcar como removido
Auditar
```

El borrado físico debe quedar reservado para mantenimiento técnico controlado.

---

## 5. ¿Cuáles son sus componentes?

### 5.1. API Gateway

Expone endpoints públicos internos de la plataforma y enruta hacia `ms-documentos`.

Ejemplos:

```text
POST /api/v1/documentos/carga-guiada
POST /api/v1/documentos/archivos/:archivoId/procesar-ocr
POST /api/v1/documentos/ocr-resultados/:id/confirmar-con-expediente
PATCH /api/v1/documentos/:id/editar
GET /api/v1/documentos/archivos/:archivoId/preview-url
```

---

### 5.2. ms-documentos

Servicio principal del Motor Documental.

Responsable de:

```text
Documentos lógicos
Archivos físicos
OCR resultados
Confirmación
Expedientes
Vínculos
Versiones
Duplicados
Enriquecimiento
Signed URLs
```

---

### 5.3. OCR Worker

Servicio Python que procesa archivos PDF o imágenes.

Responsable de:

```text
Leer archivo
Extraer texto
Clasificar tipo documental
Ejecutar extractor específico
Retornar metadata estructurada
```

Se comunica con `ms-documentos` por NATS.

---

### 5.4. NATS

Bus de mensajería para desacoplar OCR del backend.

Permite que `ms-documentos` no ejecute OCR pesado directamente.

---

### 5.5. PostgreSQL

Base de datos principal.

Schemas relevantes:

```text
documentos
core
```

Tablas principales:

```text
documentos.documentos
documentos.documentos_archivos
documentos.ocr_resultados
documentos.expedientes
documentos.expediente_documentos
core.proveedores
core.monedas
core.bancos
```

---

### 5.6. Cloudflare R2

Almacenamiento privado de archivos físicos.

El motor guarda en base datos la referencia al archivo:

```text
storageProvider
storageBucket
storageKey
```

Y genera signed URLs para vista temporal.

---

### 5.7. Extractores documentales

Módulos especializados por tipo documental.

Ejemplo:

```text
factura extractor
oc extractor
guia extractor
nota ingreso extractor
transferencia extractor
detraccion extractor
recibo honorario extractor
```

---

### 5.8. Normalizador documental

Componente encargado de mapear variaciones a tipos oficiales.

```text
Factura electrónica → FACTURA
Guía → GUIA_REMISION
Depósito de detracción → PAGO_DETRACCION
Transferencia bancaria → PAGO_TRANSFERENCIA
```

---

### 5.9. Generador de clave documental

Función única backend encargada de generar claves documentales.

Debe ser reutilizada por todos los módulos.

---

### 5.10. Servicio de enriquecimiento

Servicio encargado de completar datos desde catálogos.

```text
RUC → core.proveedores → razón social
moneda → core.monedas
banco → core.bancos
```

---

### 5.11. Servicio de versionado

Servicio encargado de manejar versiones de archivos físicos por documento lógico.

---

### 5.12. Servicio de auditoría documental

Componente encargado de registrar eventos como:

```text
OCR procesado
OCR editado
Documento confirmado
Documento versionado
Documento desvinculado
Documento anulado
```

---

## 6. ¿Cómo interactúan?

### 6.1. Flujo de carga y OCR

```text
Frontend
↓
API Gateway
↓
ms-documentos
↓
Cloudflare R2
↓
documentos.documentos_archivos
↓
NATS
↓
OCR Worker
↓
ms-documentos
↓
documentos.ocr_resultados
↓
Frontend OcrValidationModal
```

---

### 6.2. Flujo de confirmación

```text
OcrValidationModal
↓
API Gateway
↓
ms-documentos
↓
Validar expediente
↓
Resolver cliente destino
↓
Normalizar tipo documental
↓
Enriquecer metadata
↓
Generar clave documental
↓
Validar duplicado
↓
Actualizar documento lógico
↓
Actualizar OCR resultado
↓
Vincular expediente-documento
↓
Registrar auditoría
```

---

### 6.3. Flujo de versión documental

```text
Archivo nuevo
↓
Detectar misma clave documental
↓
Responder 409 suggestedAction=AGREGAR_VERSION
↓
Usuario confirma agregar versión
↓
Actualizar documentos_archivos
↓
Marcar versión actual
↓
Conservar versiones anteriores
```

---

### 6.4. Flujo de revisión contable

La Revisión Contable no crea documentos.

Consume documentos confirmados.

Regla:

```text
FACTURA confirmada
↓
fecha_emision
↓
periodo contable
↓
expediente
↓
matriz documental
```

El Motor Documental provee los datos, pero la decisión contable pertenece al módulo de Revisión Contable.

---

## 7. ¿Cuáles son sus invariantes?

Los invariantes son reglas que no deben romperse.

### 7.1. El backend es autoridad de clave documental

El frontend nunca define la clave documental final.

---

### 7.2. Documento lógico y archivo físico son conceptos distintos

Un nuevo archivo no implica necesariamente un nuevo documento.

---

### 7.3. No se sobrescriben archivos físicos

Cada archivo subido se conserva.

Las correcciones se manejan como versiones.

---

### 7.4. Solo una versión actual por documento lógico

Para cada documento lógico debe existir como máximo una versión actual.

---

### 7.5. Un expediente tiene un solo documento principal activo

Solo uno de estos puede quedar como principal activo:

```text
principal_oc
principal_os
principal_factura
```

---

### 7.6. La factura es ancla contable

Para Revisión Contable, el período contable se define por:

```text
fecha_emision de FACTURA confirmada
```

No por fecha de OC, guía, pago, carga u OCR.

---

### 7.7. Un expediente sin factura confirmada no participa del cierre contable

Puede existir en Compras, Almacén o Finanzas, pero no debe aparecer en Revisión Contable.

---

### 7.8. Los duplicados son conflictos controlados

Una clave documental duplicada debe devolver 409 con acción sugerida.

Nunca debe ser 500.

---

### 7.9. OCR original no se pierde

Deben conservarse:

```text
OCR original
OCR editado
OCR confirmado
```

---

### 7.10. Los catálogos son fuente de normalización

Datos como bancos, monedas y proveedores deben normalizarse desde catálogos.

```text
core.bancos
core.monedas
core.proveedores
```

---

### 7.11. Quitar no es eliminar físico

Las acciones de usuario deben desvincular o anular, no borrar físicamente.

---

### 7.12. Los módulos consumen el motor, no lo duplican

Compras, Almacén, Finanzas, Revisión Contable y futuros módulos no deben tener lógica documental propia duplicada.

---

## 8. ¿Cuáles son las ADR relacionadas?

### ADR-001: Separar documento lógico de archivo físico

**Decisión:** usar `documentos.documentos` para el documento de negocio y `documentos.documentos_archivos` para archivos físicos y versiones.

**Motivo:** un mismo documento puede tener varios archivos físicos.

**Consecuencia:** los módulos trabajan con documentos lógicos; R2 almacena archivos físicos.

---

### ADR-002: Cloudflare R2 privado para almacenamiento documental

**Decisión:** almacenar archivos en R2 privado y acceder mediante signed URLs.

**Motivo:** evitar exposición pública de documentos.

**Consecuencia:** el backend debe generar URLs temporales de visualización.

---

### ADR-003: OCR desacoplado mediante NATS

**Decisión:** OCR Worker no se ejecuta dentro del request principal del backend; se invoca vía NATS.

**Motivo:** OCR es costoso y debe estar desacoplado.

**Consecuencia:** ms-documentos debe manejar errores de timeout o ausencia de suscriptores.

---

### ADR-004: Backend como autoridad de clave documental

**Decisión:** la clave documental se calcula solo en backend.

**Motivo:** evitar inconsistencias o manipulación desde frontend.

**Consecuencia:** todos los módulos deben reutilizar la misma función backend.

---

### ADR-005: Duplicado documental como conflicto controlado

**Decisión:** si existe la misma clave documental, responder 409 y sugerir agregar versión.

**Motivo:** duplicado no es error inesperado.

**Consecuencia:** frontend debe mostrar acción `Agregar como versión`.

---

### ADR-006: Versionado sin sobrescritura

**Decisión:** los archivos físicos nunca se sobrescriben.

**Motivo:** trazabilidad y auditoría.

**Consecuencia:** cada corrección o reemplazo crea nueva versión.

---

### ADR-007: OCR original, editado y confirmado deben conservarse

**Decisión:** almacenar los distintos estados del OCR.

**Motivo:** medir calidad OCR y auditar cambios humanos.

**Consecuencia:** metadata debe incluir auditoría y fuentes de datos.

---

### ADR-008: Catálogos core para normalización

**Decisión:** usar tablas `core.proveedores`, `core.monedas` y `core.bancos`.

**Motivo:** evitar valores libres e inconsistentes.

**Consecuencia:** frontend debe usar selects y backend debe validar/enriquecer.

---

### ADR-009: Factura como ancla contable

**Decisión:** el período contable se define por la fecha de emisión de la factura confirmada.

**Motivo:** Contabilidad trabaja por período de factura, no por creación de expediente ni fecha de OC.

**Consecuencia:** Revisión Contable solo lista expedientes con factura confirmada en el período seleccionado.

---

### ADR-010: Quitar no elimina físicamente

**Decisión:** acciones de usuario no eliminan archivos físicos.

**Motivo:** trazabilidad, seguridad documental y recuperación ante error humano.

**Consecuencia:** se implementa desvinculación/anulación con auditoría.

---

### ADR-011: Motor Documental como servicio transversal

**Decisión:** Compras, Almacén, Finanzas, Revisión Contable, Caja Chica y futuros módulos deben reutilizar el mismo motor.

**Motivo:** evitar duplicación de lógica documental.

**Consecuencia:** el motor debe ser modular, extensible y no acoplado a una pantalla.

---

## 9. Nota de alineación con el Handbook actual

Este documento se incorpora como documento maestro del Motor Documental.

Debe enlazarse desde:

- `docs/motor-documental/README.md`
- `docs/02-arquitectura/04-motor-documental.md`
- `docs/04-backend/02-document-engine.md`
- `docs/17-domain/documentos.md`
- `docs/27-data-dictionary/documentos.md`

### ADR oficiales relacionadas en el repositorio actual

- `ADR-002-documento-logico.md`
- `ADR-003-versionado.md`
- `ADR-004-factura-periodo.md`
- `ADR-006-estrategia-de-versionado-documental.md`
- `ADR-008-seguridad-basada-en-workspace-permisos-auditoria.md`
- `ADR-009-arquitectura-por-capacidades-compartidas.md`

### Corrección importante

La factura es **ancla contable**, no necesariamente documento principal del expediente.

Puede existir:

- `principal_oc`
- `principal_os`
- `principal_factura`

Pero para Revisión Contable, la FACTURA confirmada define el período por `fecha_emision`, incluso si está vinculada como `adjunto_factura`.
