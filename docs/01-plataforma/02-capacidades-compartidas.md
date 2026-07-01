# Capacidades Compartidas

**Estado:** Aprobado  
**Responsable:** Arquitectura de Plataforma  

---

## Objetivo

Documental Platform no se organiza solamente por módulos. Se organiza por capacidades compartidas que pueden ser reutilizadas por distintos sistemas.

Una capacidad compartida es una funcionalidad central que no pertenece a una pantalla ni a un módulo específico.

---

## Capacidades principales

### Workspace

Define el contexto de trabajo del usuario:

```text
Usuario + Empresa + Sistema + Perfil
```

Sirve para autenticación, autorización, filtros por empresa y auditoría.

---

### Motor Documental

Gestiona:

- documento lógico
- archivo físico
- versiones
- OCR
- clave documental
- duplicados
- preview seguro
- relación con expedientes

---

### OCR

Extrae información de documentos digitales o escaneados.

El OCR propone; el backend confirma.

---

### Versionado

Permite conservar múltiples evidencias de un mismo documento lógico:

- original
- firmado
- escaneado
- reemplazo
- sustento

---

### Auditoría

Registra acciones relevantes:

- login
- selección de workspace
- preview de documentos
- OCR confirmado
- cambios documentales
- alertas
- revisión contable

---

### UI Foundation

Base visual reutilizable para que todos los módulos mantengan consistencia.

Incluye:

- layouts
- estados visuales
- badges
- tarjetas
- formularios
- modales
- patrones de revisión

---

## Regla

Antes de crear una funcionalidad nueva, se debe responder:

```text
¿Esto es una capacidad compartida o una regla específica de un módulo?
```

Si es compartida, se implementa una vez y se reutiliza.

---

## Ver también

- `../11-adr/ADR-009-arquitectura-por-capacidades-compartidas.md`
- `../02-arquitectura/02-capacidades-compartidas.md`
- `../motor-documental/README.md`
