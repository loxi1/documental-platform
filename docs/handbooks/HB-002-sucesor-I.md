# HB-002
# Handbook del Maestro Sucesor I

Versión:
1.0

Responsable:
Motor Documental

---

# Misión

Construir y mantener el Motor Documental de la plataforma.

El Motor Documental no pertenece únicamente a Gestión Documental.

Es una capacidad compartida que será utilizada por:

- Gestión Documental
- Caja Chica
- Rendiciones
- RRHH
- Portal de Proveedores
- futuros sistemas

---

# Responsabilidades

Documento lógico

Archivos

Versionado

OCR

Clave documental

Duplicados

Preview

Metadatos

Enriquecimiento

APIs documentales

Servicios reutilizables

---

# No es responsable de

Login

Workspace

JWT

Sidebar

UX

React

Layouts

Componentes

Migraciones Baseline

Infraestructura

Deploy

Cloud

---

# Principio principal

El frontend propone.

El backend dispone.

Toda decisión documental pertenece al backend.

---

# Documento lógico

Existe una única entidad oficial.

Ejemplos:

Factura

OC

OS

Guía

Nota de ingreso

Transferencia

Detracción

RH

Nunca duplicar un documento lógico.

---

# Archivo físico

Representa únicamente una evidencia.

Puede existir:

Original

Firmado

Escaneado

Sustento

Reemplazo

Nunca reemplazar físicamente un archivo.

Siempre versionar.

---

# OCR

El OCR propone.

Nunca confirma.

Debe:

Clasificar

Extraer

Detectar

Normalizar

Nunca tomar decisiones contables.

---

# Clave documental

Siempre calculada por backend.

Nunca confiar en:

metadata.claveDocumental

enviada por frontend.

Ejemplos:

FACTURA

CLIENTE|FACTURA|RUC|SERIE|NUMERO

OC

CLIENTE|OC|NUMERO

OS

CLIENTE|OS|NUMERO

---

# Duplicados

Si existe la misma clave documental:

No crear documento nuevo.

Responder:

409

DOCUMENTO_DUPLICADO_EN_EXPEDIENTE

suggestedAction

AGREGAR_VERSION

---

# Versionado

El documento nunca cambia.

Cambian únicamente sus versiones.

Mantener historial completo.

Nunca sobrescribir.

---

# Confirmar con expediente

Es la operación oficial del Motor Documental.

Debe realizar:

Validar Workspace

↓

Validar Empresa

↓

Validar Permisos

↓

Validar Expediente

↓

Recalcular Clave

↓

Actualizar Documento

↓

Actualizar OCR

↓

Vincular Expediente

↓

Auditar

Todo en una única transacción.

---

# Preview

Nunca entregar URLs públicas.

Siempre generar Signed URL temporal.

Validar:

Workspace

Empresa

Permisos

Archivo

---

# Metadatos

Los metadatos representan información documental.

Nunca deben convertirse en la fuente oficial.

Los campos oficiales viven en:

documentos.documentos

---

# Fecha oficial

La fecha oficial del expediente es:

fecha_emision

de la FACTURA confirmada.

Nunca usar:

fecha OCR

fecha upload

fecha confirmación

---

# Enriquecimiento

Cuando exista RUC:

Buscar primero:

core.proveedores

Si no existe:

Consultar servicio externo

Registrar proveedor

Completar metadata

---

# APIs

Todo endpoint debe ser reutilizable.

No crear endpoints exclusivos para una pantalla.

Pensar siempre en:

Caja Chica

Rendiciones

RRHH

Portal

---

# Transacciones

Toda operación documental importante debe ser atómica.

Si falla un paso:

Rollback completo.

---

# Auditoría

Registrar:

workspaceId

usuario

requestId

acción

resultado

antes

después

---

# Calidad

Cada nuevo tipo documental debe incluir:

Extractor

Validaciones

Clave documental

Pruebas

Casos duplicados

Casos de versión

---

# Testing

Antes de liberar un nuevo extractor validar:

Documento digital

Documento escaneado

Documento firmado

Documento borroso

Documento repetido

Documento inválido

---

# Objetivo permanente

Construir un Motor Documental reutilizable.

No desarrollar soluciones específicas para una pantalla.

Todo debe servir para cualquier módulo futuro.