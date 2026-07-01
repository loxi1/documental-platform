# ADR-006
# Estrategia de Versionado Documental

Estado:
Aprobado

Fecha:
2026-06

Responsable:
Arquitectura del Motor Documental

---

# Contexto

Durante el desarrollo del Motor Documental se identificó un escenario
recurrente.

Un mismo documento podía volver a cargarse varias veces debido a:

- PDF firmado posteriormente
- Escaneo físico
- Corrección del documento
- Nueva evidencia
- Sustento adicional

Inicialmente el sistema intentaba crear un nuevo documento lógico.

Esto producía:

- documentos duplicados
- pérdida de trazabilidad
- inconsistencias en expedientes
- problemas en Revisión Contable

---

# Problema

No todo archivo nuevo representa un documento nuevo.

Ejemplo:

GUIA

EG07-00000165

puede existir como:

PDF original

↓

PDF firmado

↓

Escaneo

↓

Fotografía

Todos representan exactamente la misma guía.

---

# Decisión

El sistema separará completamente:

Documento Lógico

↓

Versiones del Documento

El documento lógico nunca se duplica.

Las nuevas evidencias generan versiones.

---

# Documento lógico

Existe una única entidad de negocio.

Ejemplo:

Factura

Guía

OC

OS

Transferencia

Detracción

Nota de Ingreso

Recibo por Honorarios

---

# Archivo físico

Cada archivo representa una versión del documento.

Ejemplo:

Versión 1

PDF original

Versión 2

PDF firmado

Versión 3

Escaneado

Versión 4

Documento corregido

---

# Versionado

Toda nueva evidencia incrementa el número de versión.

Nunca reemplaza físicamente un archivo existente.

Ejemplo

Documento:

Factura F001-125

↓

v1

original

↓

v2

firmado

↓

v3

escaneado

---

# Tipos de versión

Se definen inicialmente:

original

firmado

escaneado

reemplazo

sustento

otro

El catálogo podrá crecer sin modificar el modelo.

---

# Versión vigente

Solamente una versión podrá estar marcada como:

es_version_actual = true

Las demás permanecerán como historial.

---

# Duplicados

Cuando el backend detecte una clave documental existente
dentro del mismo expediente:

No deberá crear un documento lógico nuevo.

Debe responder:

HTTP 409

Código:

DOCUMENTO_DUPLICADO_EN_EXPEDIENTE

Ejemplo:

{
  "code": "DOCUMENTO_DUPLICADO_EN_EXPEDIENTE",
  "documentoIdExistente": 3747,
  "claveDocumental": "...",
  "suggestedAction": "AGREGAR_VERSION"
}

---

# Agregar versión

Si el usuario confirma que el archivo pertenece
al mismo documento:

El backend deberá:

mantener documento_id

registrar nuevo archivo

incrementar versión

actualizar versión vigente si corresponde

registrar auditoría

Nunca crear otro documento lógico.

---

# OCR

El OCR trabaja sobre archivos.

No sobre documentos.

Puede:

proponer documento nuevo

o

identificar un documento existente.

La decisión final pertenece al backend.

---

# Confirmación

confirmar-con-expediente

será responsable de:

validar duplicados

↓

si no existe

crear documento

↓

si existe

devolver 409

↓

frontend ofrece

Agregar versión

---

# Eliminación

No se eliminarán versiones desde el flujo normal.

Las acciones permitidas serán:

Agregar versión

Marcar vigente

Anular documento

Desvincular expediente

La eliminación física queda restringida a procesos
administrativos excepcionales.

---

# Revisión Contable

Revisión Contable trabaja sobre documentos lógicos.

Cuando un documento tenga varias versiones deberá mostrar:

Factura

↓

Versiones

v1

v2

v3

El expediente seguirá mostrando un único documento.

---

# Integración futura

Caja Chica

Rendiciones

RRHH

Portal Proveedores

utilizarán exactamente el mismo modelo.

No crearán mecanismos independientes de versionado.

---

# Beneficios

No existen documentos duplicados.

Se conserva todo el historial.

Las evidencias permanecen disponibles.

Mejora la trazabilidad.

Facilita auditoría.

Simplifica la revisión contable.

Reduce errores de usuario.

---

# Restricciones

Nunca sobrescribir un archivo existente.

Nunca reutilizar un archivo para representar otro documento.

Nunca eliminar historial desde operaciones normales.

---

# Estado

Aprobado.