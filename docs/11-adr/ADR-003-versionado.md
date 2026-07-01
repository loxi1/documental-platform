# ADR-003
# Documento Lógico vs Archivo Físico

Estado:
Aprobado

Fecha:
2026-06

Responsable:
Arquitectura de Plataforma

---

# Contexto

Durante el desarrollo del Motor Documental surgió un problema recurrente.

Un mismo documento de negocio podía existir en diferentes representaciones físicas.

Ejemplos:

Factura electrónica PDF

↓

Factura firmada

↓

Factura escaneada

↓

Factura con sello de recepción

Todas representan exactamente la misma factura.

Sin embargo, inicialmente el sistema intentaba crear un documento nuevo por cada archivo recibido.

Esto producía:

- duplicados
- pérdida de trazabilidad
- múltiples documentos para una misma factura
- dificultad para la revisión contable

---

# Problema

El archivo físico no representa el documento de negocio.

El documento de negocio es único.

Lo que cambia es la evidencia física.

Ejemplo:

Factura F001-125

es una sola.

Puede existir como:

PDF original

PDF firmado

Escaneo

Imagen

Todos representan la misma factura.

---

# Decisión

Se separan dos conceptos:

## Documento Lógico

Representa la entidad de negocio.

Ejemplos:

Factura

Orden de Compra

Orden de Servicio

Guía

Nota de Ingreso

Transferencia

Detracción

Recibo por Honorarios

El documento lógico contiene la información oficial del negocio.

---

## Archivo Físico

Representa una evidencia.

Puede existir más de un archivo para un mismo documento lógico.

Ejemplos:

PDF original

PDF firmado

PDF escaneado

Imagen

Reemplazo

Sustento adicional

---

# Modelo

documentos.documentos

↓

Documento lógico

↓

1

↓

N

↓

documentos.documentos_archivos

---

# Responsabilidades

## documentos.documentos

Contiene la información oficial.

Ejemplo:

tipo_documental

serie

numero

fecha_emision

ruc_emisor

razon_social_emisor

moneda

monto_total

clave_documental

estado

metadata

---

## documentos.documentos_archivos

Contiene la evidencia física.

Ejemplo:

storage_provider

storage_bucket

storage_key

nombre_archivo

hash_sha256

tipo_version

version

es_version_actual

metadata

---

# Versionado

Nunca se reemplaza físicamente un archivo.

Cada nueva evidencia genera una nueva versión.

Ejemplo:

Factura F001-125

↓

Versión 1

PDF original

↓

Versión 2

PDF firmado

↓

Versión 3

Escaneo sellado

Todas pertenecen al mismo documento lógico.

---

# OCR

El OCR procesa archivos.

No procesa documentos.

El resultado del OCR podrá:

crear un documento nuevo

o

vincular un archivo a un documento existente.

---

# Duplicados

Cuando el backend detecte una clave documental existente dentro del mismo expediente:

No deberá crear un nuevo documento lógico.

Debe responder:

409 DOCUMENTO_DUPLICADO_EN_EXPEDIENTE

incluyendo:

documento existente

clave documental

acción sugerida

Ejemplo:

{
  "code": "DOCUMENTO_DUPLICADO_EN_EXPEDIENTE",
  "suggestedAction": "AGREGAR_VERSION"
}

---

# Agregar versión

Cuando el usuario confirme que el archivo pertenece al mismo documento:

El backend deberá:

- mantener documento_id
- registrar nuevo archivo
- incrementar versión
- actualizar versión vigente si corresponde

Nunca deberá crear un nuevo documento lógico.

---

# Eliminación

No se eliminarán documentos físicos desde el flujo normal.

Las operaciones permitidas serán:

agregar versión

marcar versión vigente

desactivar vínculo

anular documento

La eliminación física queda reservada para tareas administrativas excepcionales.

---

# Revisión Contable

La revisión contable trabaja sobre documentos lógicos.

Nunca sobre archivos individuales.

Cuando existan varias versiones:

Debe visualizar:

Documento

↓

Versiones

↓

v1

v2

v3

Pero el expediente sigue teniendo un único documento.

---

# Beneficios

Evita duplicados.

Permite múltiples evidencias.

Conserva historial.

Facilita auditoría.

Mantiene trazabilidad.

Simplifica la revisión contable.

---

# Consecuencias

Todo el Motor Documental deberá trabajar utilizando documento_id como entidad principal.

Los archivos serán únicamente representaciones físicas.

Ningún módulo podrá asumir que un archivo representa un documento diferente.

---

# Aplicación

Este ADR aplica a todos los tipos documentales:

Factura

Orden de Compra

Orden de Servicio

Guía

Nota de Ingreso

Transferencia

Detracción

Recibo por Honorarios

Anexos

Evidencias

---

# Estado

Aprobado.