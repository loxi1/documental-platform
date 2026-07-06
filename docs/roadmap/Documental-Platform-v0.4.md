# Documental Platform v0.4

## Estado del hito

Este hito marca el cierre de la fase de estabilización inicial de infraestructura, backend base, frontend productivo y diseño documental.

A partir de este punto, el proyecto queda listo para iniciar la implementación incremental del historial documental mediante el módulo `documento-eventos`.

---

## Infraestructura

```text
✓ Docker Production
✓ Traefik
✓ NATS
✓ OCR Host
✓ AWS RDS
```

## Backend

```text
✓ Health
✓ Live
✓ Ready
✓ Version
✓ Swagger cerrado en producción
✓ Validación productiva del stack
```

## Frontend

```text
✓ Web Admin Production
✓ Routing por Traefik
✓ Variables productivas validadas
✓ Guard contra URLs locales en build productivo
```

## Dominio documental

```text
✓ Eventos documentales — diseño funcional
✓ Versionado documental — diseño funcional
✓ Alertas documentales — diseño funcional
✓ Reglas documentales — diseño funcional
```

Documentos principales:

```text
docs/17-domain/documento-eventos.md
docs/17-domain/documento-versiones.md
docs/17-domain/alertas.md
docs/17-domain/reglas-documentales.md
docs/04-backend/documento-eventos-implementacion.md
```

## PostgreSQL

```text
✓ Scripts PostgreSQL reorganizados
✓ init/
✓ migrations/
✓ baseline/
✓ ops/
✓ reference/
```

Estructura oficial:

```text
infra/postgres/init/        Scripts de inicialización base
infra/postgres/migrations/  Migraciones controladas e incrementales
infra/postgres/baseline/    Baseline o dump estructural de referencia
infra/postgres/ops/         Scripts operativos/manuales
infra/postgres/reference/   Dumps o seeds de referencia, no ejecución automática
```

---

## Arquitectura consolidada

Arquitectura validada al cierre de v0.4:

```text
Cliente
   │
   ▼
Traefik
   │
   ├────────► Web Admin (Next.js)
   │
   └────────► API Gateway
                    │
          ┌─────────┴─────────┐
          │                   │
      ms-auth          ms-documentos
          │                   │
          ├──────────┐        │
          ▼          ▼        ▼
      PostgreSQL    NATS   OCR Worker
```

Esta arquitectura confirma la separación entre:

```text
entrada pública
frontend
gateway
microservicios
base de datos
mensajería
OCR host
```

---

## Estado visual del proyecto

```text
Infraestructura     ██████████ 100%
Backend base        ██████████ 100%
Frontend base       ██████████ 100%
Dominio             ██████████ 100%

Eventos             ░░░░░░░░░░   0%
Timeline            ░░░░░░░░░░   0%
Versionado          ░░░░░░░░░░   0%
Alertas             ░░░░░░░░░░   0%
IA documental       ░░░░░░░░░░   0%
```

---

## Historial de hitos

### v0.1

```text
✓ Arquitectura inicial
✓ Separación conceptual de dominios
✓ Primer diseño documental
```

### v0.2

```text
✓ Backend base
✓ OCR
✓ AWS RDS
✓ NATS
```

### v0.3

```text
✓ Producción Docker
✓ Traefik
✓ Web Admin productivo
✓ Routing web/API
```

### v0.4

```text
✓ Observabilidad backend
✓ Health / Live / Ready / Version
✓ Swagger cerrado en producción
✓ Dominio documental formalizado
✓ PostgreSQL reorganizado
✓ Roadmap del núcleo documental
```

### v0.5 próximo

```text
□ documento_eventos
□ timeline documental inicial
```

---

## Pendiente posterior al hito

```text
□ Implementación documento_eventos
□ Timeline documental
□ Versionado documental
□ Alertas documentales
□ Reglas de completitud/revisión contable
□ Vista backend consolidada del expediente
□ IA documental
```

---

## Evolución posterior del motor documental

### Sprint 1.3C — Documento Eventos MVP

```text
✓ documento_eventos
✓ repository
✓ service
✓ endpoint por documento
✓ expediente.vinculado
```

### Sprint 1.3D — Integración progresiva de eventos

```text
□ documento.creado
□ archivo.subido
□ ocr.procesado
```

### Sprint 1.4 — Timeline Documental

```text
□ GET /documentos/:id/timeline
□ línea temporal funcional
□ eventos ordenados y normalizados
```

### Sprint 1.5 — Versionado documental

```text
□ documento_versiones
□ historial de archivos
□ version.agregada
```

### Sprint 1.6 — Alertas documentales

```text
□ documento_alertas
□ alertas manuales
□ resolución y descarte
```

### Sprint 1.7 — Reglas documentales

```text
□ expediente incompleto
□ factura sin guía
□ guía sin OC
□ detracción pendiente
□ OCR rechazado
□ duplicados
```

### Sprint 1.8 — Motor de validación documental

```text
□ ejecución automática de reglas
□ generación de eventos
□ generación de alertas
□ validación documental consolidada
```

---

## Restricciones mantenidas

Estas capacidades quedan fuera hasta consolidar el núcleo documental:

```text
No IA documental
No embeddings
No búsqueda semántica
No NATS publisher
No Event Sourcing
No CQRS
No Kafka
No ElasticSearch
```

---

## Próximo sprint

```text
Sprint Maestro Sucesor I — Sprint 1.3C
Implementación inicial del módulo documento-eventos
```

Alcance recomendado:

```text
1. Crear migración 0006_documento_eventos.sql
2. Crear módulo documento-eventos en ms-documentos
3. Implementar Types, Repository y Service
4. Registrar solo expediente.vinculado
5. Exponer GET /api/v1/documentos/:id/eventos
6. Validar build backend
```

Regla crítica:

```text
El registro de eventos debe ser best-effort.
Si falla registrar el evento, no debe romper la vinculación documental.
```

## Criterio de cierre

El hito v0.4 queda cerrado cuando:

```text
✓ El commit documental fue registrado
✓ El roadmap v0.4 fue agregado
✓ El repositorio queda limpio
✓ Se hace push a origin/main
```