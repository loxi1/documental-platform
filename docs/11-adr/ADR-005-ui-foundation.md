# ADR-005
# Backend como Autoridad de la Información

Estado:
Aprobado

Fecha:
2026-06

Responsable:
Arquitectura Backend

---

# Contexto

Durante el desarrollo del Motor Documental se identificó un riesgo
importante.

El frontend permitía editar información obtenida por OCR:

- tipo documental
- serie
- número
- RUC
- razón social
- fecha
- importe

Inicialmente se evaluó permitir que el frontend enviara toda la
información final ya calculada.

Sin embargo esto producía inconsistencias y riesgos de seguridad.

Ejemplo:

El frontend podía enviar:

claveDocumental

tipoRelacion

empresa

clienteDestinoId

estado

sin que el backend validara su coherencia.

---

# Problema

El frontend no posee el contexto completo del negocio.

No conoce:

- reglas documentales
- duplicados
- expediente
- proveedor
- empresa
- período contable
- restricciones de seguridad

Por lo tanto no puede ser considerado la fuente oficial de verdad.

---

# Decisión

El backend será la única autoridad para calcular y persistir la
información oficial del sistema.

El frontend únicamente enviará datos capturados o corregidos por el
usuario.

Toda información derivada será recalculada por el backend.

---

# Responsabilidades del Frontend

El frontend puede:

- capturar datos
- mostrar información
- permitir correcciones
- validar formatos básicos
- mostrar vistas previas

El frontend NO decide reglas de negocio.

---

# Responsabilidades del Backend

El backend debe:

- validar permisos
- validar Workspace
- validar empresa
- validar expediente
- validar relaciones documentales
- validar duplicados
- recalcular claves
- persistir datos oficiales
- generar auditoría

---

# Clave documental

La clave documental nunca será aceptada como fuente oficial si proviene
del frontend.

Siempre será recalculada.

Ejemplo:

FACTURA

BBTI|FACTURA|10804262119|E001|162

OC

BBTI|OC|007950

OS

BBTI|OS|000486

---

# Tipo documental

El usuario puede corregir el tipo documental.

Ejemplo:

OCR:

OS

Usuario:

FACTURA

El backend decidirá:

tipo_documental

tipo_relacion

clave_documental

estado

Nunca el frontend.

---

# Workspace

El frontend nunca enviará:

empresa oficial

clienteDestinoId oficial

perfil oficial

Workspace oficial

Toda esa información será obtenida desde el JWT.

---

# Seguridad

Nunca confiar en:

empresa enviada por query

empresa enviada por body

workspace enviado por frontend

tipoRelacion enviada sin validar

claveDocumental enviada

estado enviado

---

# Validaciones obligatorias

Antes de persistir cualquier documento el backend deberá validar:

Workspace

↓

Empresa

↓

Expediente

↓

Documento

↓

Permisos

↓

Duplicados

↓

Versionado

↓

Persistencia

---

# Preview

El frontend solicita:

preview-url

El backend verifica:

Workspace

Empresa

Permisos

Documento

Archivo

Recién entonces genera una Signed URL.

Nunca entregar una URL firmada sin autorización previa.

---

# OCR

El OCR propone información.

Nunca confirma información.

La confirmación siempre pertenece al backend.

---

# Confirmar con expediente

El endpoint:

POST /ocr-resultados/{id}/confirmar-con-expediente

es la operación oficial del sistema.

Debe realizar en una única transacción:

- validar Workspace
- validar expediente
- validar documento
- recalcular clave
- actualizar documento
- actualizar OCR
- vincular expediente
- validar duplicados
- registrar auditoría

Si cualquier paso falla:

ROLLBACK completo.

---

# Auditoría

Toda modificación importante deberá registrar:

usuario

workspace

requestId

antes

después

resultado

fecha

---

# Beneficios

Mayor seguridad.

Menor riesgo de manipulación.

Consistencia documental.

Reglas centralizadas.

Facilidad para auditoría.

---

# Consecuencias

El frontend nunca debe implementar reglas documentales.

Las reglas viven exclusivamente en el backend.

Todos los sistemas consumidores
(Caja Chica, Rendiciones, RRHH, Portal Proveedores)

deberán respetar exactamente el mismo contrato.

---

# Estado

Aprobado.