# ADR-001
# La Plataforma se organiza por Capacidades Compartidas y no por Módulos

Estado:
Aprobado

Fecha:
2026-06

---

# Contexto

Durante los primeros sprints el desarrollo estuvo centrado en el módulo de Gestión Documental.

Inicialmente la planificación seguía una organización tradicional basada en módulos:

- Compras
- Almacén
- Finanzas
- Revisión Contable

Sin embargo, conforme evolucionó el proyecto aparecieron nuevos requerimientos para:

- Caja Chica
- Rendiciones
- Gestión de Proyectos
- GIS
- RRHH
- Portales externos

Esto evidenció que muchos componentes eran comunes entre todos los sistemas y que continuar desarrollando módulos independientes produciría duplicación de código, reglas de negocio inconsistentes y mayores costos de mantenimiento.

---

# Problema

Organizar la plataforma por módulos provoca duplicación de capacidades como:

- autenticación
- OCR
- almacenamiento documental
- auditoría
- permisos
- componentes UI

Cada nuevo sistema tendría que implementar nuevamente funcionalidades que ya existen.

---

# Decisión

La plataforma se organizará alrededor de capacidades compartidas.

Los módulos funcionales serán únicamente consumidores de dichas capacidades.

La arquitectura queda dividida en dos niveles.

## Capacidades compartidas

Son servicios reutilizables por toda la plataforma.

Actualmente se reconocen las siguientes capacidades:

- Workspace
- Seguridad
- Motor Documental
- OCR
- Versionado Documental
- Auditoría
- Catálogos
- UI Foundation
- Notificaciones (futuro)

Estas capacidades evolucionan independientemente de los módulos.

---

## Sistemas consumidores

Los sistemas únicamente consumen capacidades.

Actualmente:

- Gestión Documental

Próximamente:

- Caja Chica
- Rendiciones
- Gestión de Proyectos
- GIS
- RRHH
- Portal Proveedores

Ninguno implementará nuevamente:

- login
- OCR
- versionado
- preview
- auditoría
- permisos

---

# Arquitectura conceptual

                    Plataforma Empresarial

         Workspace
              │
         Seguridad
              │
    ┌─────────┼─────────┐
    │         │         │
Motor OCR  UI Foundation Auditoría
    │         │         │
    └─────────┼─────────┘
              │
    ┌─────────┼──────────────┐
    │         │              │
Documental Caja Chica Rendiciones GIS ...

---

# Consecuencias

## Positivas

- Reutilización de componentes.
- Menor duplicación.
- Menor costo de mantenimiento.
- Arquitectura escalable.
- Integración sencilla entre sistemas.
- Consistencia funcional.

## Negativas

Requiere mayor disciplina arquitectónica.

Las capacidades compartidas deben evolucionar cuidadosamente porque afectan varios consumidores.

---

# Responsabilidades

## Viejo Maestro

Responsable de capacidades estructurales:

- Infraestructura
- Deploy
- Migraciones
- Seguridad
- Arquitectura

---

## Maestro Sucesor I

Responsable de capacidades backend:

- Motor Documental
- OCR
- APIs
- Versionado
- Clave documental
- Servicios reutilizables

---

## Maestro Sucesor II

Responsable de capacidades frontend:

- UI Foundation
- Workspace visual
- Componentes
- Layouts
- UX
- Patrones reutilizables

---

## Product Owner

Responsable de:

- reglas de negocio
- priorización
- aceptación funcional
- integración entre capacidades

---

# Principio

Todo nuevo desarrollo debe responder primero a la pregunta:

"¿Esto pertenece a una capacidad compartida o solamente a un módulo?"

Si pertenece a una capacidad compartida, debe implementarse una única vez y reutilizarse.

Si pertenece únicamente al negocio del módulo, puede implementarse dentro de dicho módulo.

---

# Estado

Aprobado.