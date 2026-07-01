# Sistemas Consumidores

**Estado:** Aprobado  
**Responsable:** Product Owner / Arquitectura Funcional  

---

## Objetivo

Definir qué sistemas consumirán las capacidades compartidas de Documental Platform.

---

## Sistemas dentro del ecosistema

### Gestión Documental

Sistema principal actual.

Gestiona:

- compras
- almacén
- finanzas
- revisión contable
- expedientes
- OCR
- versionado

---

### Caja Chica

Sistema futuro para rendición y control de gastos menores.

Consumirá:

- Workspace
- Motor Documental
- OCR
- Versionado
- Auditoría
- UI Foundation

---

### Rendiciones

Sistema futuro para registrar y sustentar requerimientos, gastos o entregables.

Consumirá:

- Workspace
- Motor Documental
- OCR
- Versionado
- Auditoría
- UI Foundation

---

### RRHH

Sistema futuro para documentos laborales.

Ejemplos:

- contratos
- boletas
- certificados
- constancias
- anexos firmados

---

### Portal de Proveedores

Sistema futuro para que terceros carguen documentos de forma controlada.

Debe reutilizar seguridad, auditoría, OCR y versionado.

---

## Fuera del ecosistema

GIS queda fuera de Documental Platform.

Tendrá:

- otra arquitectura
- otra base de datos
- otro roadmap
- otro equipo o consultor

Documental Platform podrá integrarse con GIS en el futuro, pero no lo contiene.

---

## Regla

Ningún sistema consumidor debe implementar su propio OCR, login, auditoría o versionado si ya existe una capacidad compartida.

---

## Ver también

- `02-capacidades-compartidas.md`
- `04-alcance.md`
- `../10-roadmap/04-caja-chica.md`
- `../10-roadmap/05-rendicion.md`
