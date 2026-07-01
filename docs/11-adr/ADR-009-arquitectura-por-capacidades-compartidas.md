# ADR-009
# Arquitectura basada en Capacidades Compartidas (Shared Capabilities)

Estado:
Aprobado

Fecha:
2026-06

Responsable:
Arquitectura Empresarial

---

# Contexto

Inicialmente el proyecto nació como un sistema de Gestión Documental.

Sin embargo, durante el análisis funcional se identificó que la empresa
desarrollará otros sistemas relacionados:

- Gestión Documental
- Caja Chica
- Rendiciones
- RRHH
- Portal de Proveedores
- futuros módulos empresariales

Todos comparten funcionalidades similares.

Duplicarlas produciría:

- mayor costo
- mayor mantenimiento
- inconsistencias
- diferentes experiencias de usuario

---

# Problema

Construir aplicaciones independientes provoca que cada sistema implemente
nuevamente:

login

usuarios

auditoría

documentos

OCR

notificaciones

catálogos

permisos

preview

versionado

Esto aumenta considerablemente la deuda técnica.

---

# Decisión

La organización evolucionará desde aplicaciones aisladas hacia una
Plataforma Empresarial basada en capacidades compartidas.

Cada capacidad será reutilizable por múltiples sistemas.

---

# Principio

No desarrollar aplicaciones.

Desarrollar capacidades reutilizables.

---

# Capacidad

Una capacidad representa una funcionalidad de negocio independiente.

Debe poder ser utilizada por cualquier módulo.

---

# Capacidades compartidas

## 1. Auth / Workspace

Responsable de:

usuarios

login

workspace

JWT

permisos

sesiones

auditoría de acceso

Consumidores:

Documental

Caja Chica

Rendiciones

RRHH

Portal Proveedores

---

## 2. Motor Documental

Responsable de:

documento lógico

archivos

versionado

OCR

preview

duplicados

clave documental

Consumidores:

Documental

Caja Chica

Rendiciones

RRHH

Portal Proveedores

---

## 3. Auditoría

Responsable de registrar:

login

workspace

OCR

documentos

alertas

acciones

cambios

Todos los sistemas utilizan la misma auditoría.

---

## 4. Catálogos Maestros

Responsable de:

empresas

clientes destino

proveedores

bancos

monedas

sistemas

tipos documentales

No deben existir catálogos duplicados.

---

## 5. Notificaciones

Responsable de:

correo

alertas

push

eventos

Todos los módulos reutilizan el mismo mecanismo.

---

## 6. UI Foundation

Responsable de:

layouts

componentes

workspace

badges

tablas

modales

empty states

loading states

No pertenece únicamente a Gestión Documental.

Será utilizada por todos los frontends.

---

# Sistemas consumidores

La plataforma podrá contener sistemas como:

Gestión Documental

Caja Chica

Rendiciones

RRHH

Portal Proveedores

Todos consumen las capacidades compartidas.

---

# Responsabilidades

## Viejo Maestro

Arquitectura

Infraestructura

Migraciones

Deploy

CI/CD

Cloud

Seguridad transversal

---

## Maestro Sucesor I

Motor Documental

OCR

Versionado

Backend

Servicios reutilizables

APIs

---

## Maestro Sucesor II

Producto

Frontend

Workspace

UI Foundation

Layouts

Patrones

Experiencia de usuario

Accesibilidad

---

## Product Owner

Roadmap

Reglas de negocio

Arquitectura funcional

QA funcional

Priorización

Integración entre equipos

---

# Reglas

Una capacidad nunca depende de un sistema específico.

Ejemplo:

Motor Documental

NO depende de:

Gestión Documental.

Es Gestión Documental quien depende del Motor.

---

# Ejemplo

Incorrecto

Caja Chica implementa OCR propio.

Correcto

Caja Chica utiliza Motor OCR compartido.

---

Incorrecto

Rendiciones implementa Login propio.

Correcto

Rendiciones utiliza Auth compartido.

---

# Beneficios

Mayor reutilización.

Menor mantenimiento.

Consistencia.

Escalabilidad.

Integración sencilla.

Menor deuda técnica.

Mayor velocidad de desarrollo.

---

# Evolución

Nuevos sistemas deberán consumir capacidades existentes antes de crear
nuevas implementaciones.

Solo podrán crear una nueva capacidad cuando no exista una reutilizable.

---

# Restricciones

No duplicar:

login

OCR

auditoría

documentos

workspace

preview

catálogos

versionado

notificaciones

---

# Estado

Aprobado.