# Decisiones Arquitectónicas V2

## Propósito

Registrar decisiones, estados y pendientes del Modelo Documental V2.

Este documento evita que decisiones conceptuales se pierdan durante los siguientes sprints.

## Formato

| Decisión | Estado | Pendiente | Justificación | Impacto | Responsable |
|---|---|---|---|---|---|
| Contenedor Operativo como raíz conceptual del dominio V2 | Aprobada conceptualmente | Validar nombre visible final | Evita acoplar el modelo a Expediente, OP, PR o Centro de costo antes de validar negocio | Dominio, UX, backend, modelo relacional | Maestro Intermedio / Maestro Sucesor I / Negocio |
| `contenedor-operativo.md` como documento arquitectónico raíz | Aprobada | Mantenerlo conceptual | Todos los documentos V2 dependen de esta definición | Todos los sprints posteriores | Maestro Intermedio |
| Factura deja de ser documento principal formal | Aprobada conceptualmente | Definir tratamiento de legacy | La factura debe abrir Grupo de Factura, no gobernar la operación | Compras, Contabilidad, Backend | Maestro Intermedio / Negocio |
| Documento Operativo Principal como concepto estable | Propuesta | Validar materializaciones actuales y futuras con negocio | Actualmente puede materializarse como OC, OS o Requerimiento de Compra, pero la lista podrá ampliarse formalmente | Compras, Almacén, Contabilidad, Backend, UX | Negocio / Maestro Intermedio / Maestro Sucesor I |
| Grupo de Factura como unidad documental | Aprobada conceptualmente | Definir estados y obligatoriedad de adjuntos | Refleja mejor revisión contable | Contabilidad, Finanzas, UX | Maestro Sucesor I / Maestro Sucesor II |
| Legacy Python como histórico | Aprobada | Definir módulo de consulta histórica | Evita que el histórico gobierne V2 | Performance, backend, arquitectura | Maestro Intermedio / Maestro Sucesor I |
| No subida masiva de histórico a R2 | Propuesta aprobada conceptualmente | Validar excepciones futuras | Reduce costo y evita mezclar histórico con operación nueva | Infraestructura, storage, consulta | Maestro Intermedio |
| Integración Legacy mediante adaptadores | Aprobada conceptualmente | Diseñar adaptadores si se requiere | Mantiene independencia del dominio V2 | Backend, performance, histórico | Maestro Sucesor I |
| Si un contenedor admite uno o varios principales | Pendiente negocio/técnico | Analizar casos reales | Afecta cardinalidad y UX | Modelo relacional, auditoría, compras | Negocio / Maestro Intermedio |
| Reemplazo de principal | Pendiente | Definir flujo explícito | No debe hacerse silenciosamente | Auditoría, backend, UX | Maestro Sucesor I / II |
| Distribución por Almacén | Diferida | Sprint 2.x | Puede afectar centros de costo finales | Almacén, costos, contabilidad | Negocio / Maestro Sucesor I |
| Tratamiento de documentos sin Documento Operativo Principal formal | Pendiente negocio | Definir flujo excepcional | Existen casos históricos o informales | Compras, Contabilidad | Negocio |
| Modelo relacional V2 definitivo | Pendiente técnico | Esperar validación UX y dominio | No se deben crear tablas antes del dominio | Backend, DB | Maestro Sucesor I |
| Endpoints V2 | Pendiente técnico | Esperar modelo relacional | API debe reflejar dominio | API Gateway, Frontend | Maestro Sucesor I / II |

## Principios oficiales

1. El negocio gobierna.
2. El Modelo V2 gobierna y el histórico se consulta.
3. Contenedor Operativo es una abstracción de dominio.
4. Grupo de Factura reemplaza la idea simple de Factura como nodo documental.
5. No se programa antes de cerrar dominio y UX.
