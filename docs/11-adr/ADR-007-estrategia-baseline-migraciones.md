# ADR-007
# Estrategia de Baseline y Migraciones

Estado:
Aprobado

Fecha:
2026-06

Responsable:
Arquitectura de Plataforma

---

# Contexto

Durante el desarrollo del MVP la base de datos evolucionó de forma
iterativa.

Muchas mejoras fueron implementadas directamente sobre la base de
desarrollo para acelerar la validación funcional.

Posteriormente fue necesario reconciliar:

- Base de datos real
- Repositorio Git
- Migraciones SQL
- Ambientes futuros (QA / Producción)

Se decidió establecer una estrategia oficial para evitar divergencias.

---

# Problema

Modificar directamente una base de datos genera varios riesgos:

- pérdida del historial de cambios
- diferencias entre ambientes
- despliegues inconsistentes
- dificultad para reproducir errores
- conflictos entre desarrolladores

La plataforma necesita una única fuente oficial de evolución del esquema.

---

# Decisión

Toda evolución del esquema deberá realizarse mediante migraciones
versionadas.

El repositorio será la fuente oficial del esquema.

La base de datos de desarrollo no será considerada la referencia
arquitectónica permanente.

---

# Baseline

El proyecto tendrá un Baseline único.

El Baseline representa el estado inicial oficialmente aprobado del
modelo de datos.

Debe contener únicamente:

- schemas
- tablas estructurales
- claves primarias
- claves foráneas
- constraints
- índices esenciales
- catálogos mínimos

No debe contener:

- datos de prueba
- registros temporales
- configuraciones personales

---

# Baseline estructural

Se consideran estructurales únicamente las entidades que representan el
modelo permanente del negocio.

Ejemplos:

core.clientes_destino

core.proveedores

core.sistemas

auth.usuarios

auth.perfiles

auth.usuario_workspaces

documentos.expedientes

documentos.documentos

documentos.documentos_archivos

documentos.expediente_documentos

documentos.ocr_resultados

Estas migraciones nunca deberán modificarse una vez aplicadas.

---

# Migraciones evolutivas

Todo cambio posterior deberá implementarse mediante nuevas migraciones.

Ejemplos:

- nuevos índices
- nuevas columnas
- nuevas tablas auxiliares
- auditoría
- alertas
- observaciones
- bancos
- monedas
- nuevos catálogos
- optimizaciones

Nunca modificar una migración ya publicada.

Siempre crear una nueva.

---

# Idempotencia

Las migraciones deberán poder ejecutarse de forma segura más de una vez.

Utilizar:

CREATE TABLE IF NOT EXISTS

CREATE INDEX IF NOT EXISTS

ALTER TABLE ... ADD COLUMN IF NOT EXISTS

CREATE SCHEMA IF NOT EXISTS

Siempre que PostgreSQL lo permita.

---

# Seeds

Los datos mínimos deberán mantenerse separados del esquema.

Ejemplos:

- sistemas
- perfiles
- clientes destino
- estados
- tipos documentales

Las inserciones deberán utilizar:

ON CONFLICT DO NOTHING

Nunca asumir IDs específicos de desarrollo.

---

# Identificadores

No utilizar IDs "quemados".

Incorrecto:

UPDATE perfiles SET ...

WHERE id = 3;

Correcto:

UPDATE perfiles

WHERE codigo = 'CONTABILIDAD';

Los códigos funcionales son la referencia oficial.

---

# Rollback

Las migraciones no deberán depender de DROP destructivos.

En caso de error:

- documentar rollback manual
- preservar información
- evitar pérdida de datos

La seguridad de la información tiene prioridad sobre la simplicidad del rollback.

---

# Control de versiones

La plataforma deberá mantener un historial de migraciones aplicadas.

Tabla recomendada:

core.schema_migrations

Campos mínimos:

version

nombre

checksum

aplicado_en

usuario

---

# Desarrollo

Durante desarrollo podrán realizarse cambios rápidos para validar una
funcionalidad.

Sin embargo, antes de integrarse al repositorio oficial:

todo cambio deberá convertirse en una migración reproducible.

---

# Producción

Producción nunca deberá modificarse manualmente.

Todo cambio deberá provenir exclusivamente de:

Repositorio

↓

Migraciones

↓

Pipeline de despliegue

---

# Reconciliación

Cuando exista una diferencia entre:

Base real

y

Repositorio

se seguirá el siguiente proceso:

1.

Identificar diferencias.

2.

Clasificar:

estructural

o

evolutiva.

3.

Generar migración correspondiente.

4.

Validar sobre base limpia.

5.

Aplicar en desarrollo.

6.

Aplicar posteriormente en producción.

Nunca modificar manualmente producción para "igualarla".

---

# Responsabilidades

Viejo Maestro

- Baseline
- Migraciones
- Despliegue
- Infraestructura

Maestro Sucesor I

- Solicitar migraciones derivadas del backend

Maestro Sucesor II

- Nunca modificar estructura de base de datos

Product Owner

- Aprobar cambios estructurales
- Priorizar evoluciones

---

# Beneficios

Repositorio reproducible.

Producción controlada.

Historial completo.

Menor riesgo.

Integración sencilla entre equipos.

Escalabilidad.

---

# Restricciones

Nunca editar una migración ya aplicada.

Nunca eliminar tablas estructurales.

Nunca asumir IDs locales.

Nunca usar DROP destructivos como mecanismo habitual.

Toda evolución debe ser hacia adelante.

---

# Estado

Aprobado.