# Alcance

**Estado:** Aprobado  
**Responsable:** Product Owner  

---

## Objetivo

Definir con claridad qué pertenece y qué no pertenece a Documental Platform.

---

## Dentro del alcance

| Área | Descripción |
|---|---|
| Workspace | Contexto de trabajo por usuario, empresa, sistema y perfil |
| Usuarios | Gestión de identidad y acceso |
| Perfiles | Permisos por rol funcional |
| Motor Documental | Documento lógico, archivo físico, OCR, versión y clave documental |
| OCR | Clasificación y extracción documental |
| Expedientes | Agrupación documental de negocio |
| Compras | Carga y validación de documentos de compra |
| Almacén | Guías y notas de ingreso |
| Finanzas | Transferencias, detracciones y pagos |
| Revisión Contable | Control final del expediente completo |
| Versionado | Historial de archivos físicos |
| Alertas | Observaciones y comunicación manual |
| Auditoría | Trazabilidad de acciones |
| Caja Chica | Sistema futuro consumidor del motor documental |
| Rendiciones | Sistema futuro consumidor del motor documental |
| RRHH | Sistema futuro consumidor del motor documental |

---

## Fuera del alcance

| Área | Motivo |
|---|---|
| GIS | Proyecto independiente |
| SCADA | No pertenece a la plataforma documental |
| AutoCAD | Herramienta externa de diseño |
| QGIS | Herramienta externa de análisis geoespacial |
| Redes eléctricas | Dominio de otro sistema |
| Motores de mapas | Fuera del MVP documental |
| PostGIS | No forma parte de esta base documental |

---

## Integraciones futuras

Documental Platform puede integrarse con sistemas externos, pero no pretende reemplazarlos.

---

## Regla

Si una funcionalidad no reutiliza Workspace, Motor Documental, Auditoría o UI Foundation, debe evaluarse si realmente pertenece a esta plataforma.

---

## Ver también

- `03-sistemas-consumidores.md`
- `../11-adr/ADR-009-arquitectura-por-capacidades-compartidas.md`
