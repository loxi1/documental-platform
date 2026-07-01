# ADR-004
# La Factura como Ancla del Período Contable

Estado:
Aprobado

Fecha:
2026-06

Responsable:
Arquitectura Funcional

---

# Contexto

Durante el desarrollo del módulo Revisión Contable surgió una pregunta
fundamental:

¿Cómo determinar el período contable de un expediente?

Inicialmente se evaluaron varias alternativas:

- Fecha de creación del expediente.
- Fecha de carga del documento.
- Fecha del OCR.
- Fecha de confirmación.
- Fecha manual seleccionada por el usuario.

Ninguna representaba correctamente la realidad del proceso contable.

Se observó que el documento que realmente determina el período
es la FACTURA confirmada.

---

# Problema

Un expediente puede contener documentos emitidos en fechas distintas.

Ejemplo:

OC
20/04/2026

Guía
23/04/2026

Nota de ingreso
24/04/2026

Transferencia
05/05/2026

Detracción
06/05/2026

Factura
30/04/2026

Si se utilizara la fecha de cualquier documento,
el expediente podría aparecer en períodos diferentes,
rompiendo la consistencia contable.

---

# Decisión

El período contable del expediente será determinado
únicamente por la FACTURA confirmada.

La fecha oficial será:

documentos.documentos.fecha_emision

cuando:

tipo_documental = FACTURA

estado = confirmado

---

# Regla principal

Existe una única factura principal por expediente.

Esa factura define:

- año contable
- mes contable
- período contable

Todos los demás documentos heredan ese período.

---

# Ejemplo

Expediente:

050201

Documentos:

OC

20/04/2026

Factura

30/04/2026

Transferencia

05/05/2026

Detracción

06/05/2026

Resultado:

Período contable:

Abril 2026

La transferencia y la detracción pertenecen al expediente,
pero no modifican el período.

---

# Justificación

La factura representa el comprobante tributario oficial.

Es el documento utilizado por Contabilidad para:

- registro contable
- declaración tributaria
- control del período

Por esta razón se convierte en el documento ancla del expediente.

---

# Revisión Contable

La bandeja principal deberá organizarse por:

Empresa

↓

Período Contable

↓

Expediente

↓

Documentos relacionados

Nunca por fecha de carga.

Nunca por fecha OCR.

Nunca por fecha de confirmación.

---

# Consecuencia para Compras

Cuando Compras confirma una factura:

el backend deberá actualizar:

fecha_emision

tipo_documental

clave_documental

estado

y registrar la factura como principal del expediente.

---

# Consecuencia para Finanzas

Transferencias y detracciones no modifican
el período contable.

Únicamente complementan el expediente.

---

# Consecuencia para Almacén

Guías y notas de ingreso tampoco modifican
el período.

Son documentos de soporte.

---

# Consecuencia para OCR

El OCR únicamente extrae la fecha.

La decisión oficial del período ocurre
cuando la factura es confirmada.

---

# Backend

El backend será el responsable de calcular
el período contable.

Nunca deberá confiar en:

- período enviado por frontend
- año enviado por query
- mes enviado manualmente

La fuente oficial será:

fecha_emision de la FACTURA confirmada.

---

# Consultas

Las bandejas contables deberán consultar:

Empresa

+

Período

↓

Facturas confirmadas

↓

Expedientes relacionados

↓

Documentos relacionados

No deberán iniciar la búsqueda por transferencias,
guías o detracciones.

---

# Versionado

Si una factura cambia de versión
(PDF firmado, escaneo, etc.)

el período contable no cambia.

Solo cambiará si cambia oficialmente
la fecha_emision confirmada del documento lógico.

---

# Beneficios

Un único criterio contable.

Consultas simples.

Coherencia tributaria.

Menor riesgo de inconsistencias.

Mejor rendimiento en consultas.

Revisión Contable más intuitiva.

---

# Restricciones

Un expediente no puede cerrarse contablemente
si no existe una FACTURA confirmada.

Mientras no exista:

No existe período contable definitivo.

El expediente permanecerá en estado:

Pendiente de regularización.

---

# Aplicación

Este ADR aplica a:

Compras

Almacén

Finanzas

Revisión Contable

Motor Documental

OCR

Auditoría

---

# Estado

Aprobado.