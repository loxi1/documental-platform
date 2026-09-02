# Plan arquitectónico — Upload temporal

**Estado:** propuesta de continuidad; no implementada  
**Restricción:** sin código, migraciones ni cambios de base de datos

## 1. Objetivo

Permitir recibir y conservar un archivo en un área temporal segura antes de convertirlo en documento definitivo. El usuario debe poder cargar, validar contexto y archivo, ejecutar/revisar OCR y confirmar o descartar sin contaminar el inventario documental oficial.

Invariantes:

- objeto físico ≠ archivo registrado ≠ documento lógico ≠ asociación documental;
- carga completada ≠ OCR completado ≠ documento confirmado;
- OCR propone datos; una regla explícita de negocio o un usuario autorizado confirma;
- reintentos no deben duplicar objetos ni documentos;
- un temporal nunca debe aparecer como definitivo por inferencia del frontend.

## 2. Flujo actual de carga segura

La documentación vigente describe este camino:

```text
contexto autenticado + archivo multipart + Idempotency-Key
  -> validación de tipo/tamaño/contexto
  -> SHA-256 y deduplicación por workspace + empresa + hash
  -> reserva técnica de operación
  -> escritura privada en R2
  -> transacción de archivo/documento/asociación
  -> resultado de carga independiente del OCR
  -> publicación/procesamiento OCR por NATS
```

El contrato de carga segura usa `workspaceId + empresaCodigo + SHA-256` como ámbito de deduplicación y separa `requestId` de `Idempotency-Key`. Antes de implementar el temporal se debe comprobar el comportamiento efectivo de producción contra ese contrato.

## 3. Flujo propuesto

```text
1. Crear sesión temporal
   -> identidad canónica desde JWT/contexto
   -> estado RECIBIENDO

2. Recibir y validar archivo
   -> tamaño, MIME real, extensión, integridad, malware si se incorpora
   -> SHA-256
   -> objeto R2 bajo prefijo temporal no público
   -> estado CARGADO o RECHAZADO

3. Validar contexto
   -> workspace, empresa, módulo, tipo esperado y permisos
   -> deduplicación/idempotencia
   -> estado VALIDADO o REQUIERE_CORRECCION

4. Procesar OCR de forma asíncrona
   -> evento NATS con ID temporal, no con autoridad final
   -> conservar salida original
   -> estado OCR_PENDIENTE / OCR_LISTO / OCR_FALLIDO

5. Revisión
   -> mostrar archivo y propuesta OCR
   -> usuario autorizado corrige o rechaza
   -> no crear aún asociaciones oficiales

6. Confirmación atómica
   -> bloquear/consumir temporal
   -> crear o enlazar documento lógico definitivo
   -> registrar archivo definitivo y asociaciones del módulo
   -> conservar trazabilidad temporal -> definitivo
   -> estado CONFIRMADO

7. Expiración/descarte
   -> marcar EXPIRADO o DESCARTADO
   -> limpieza física diferida, auditable y reintentable
```

La “promoción” del objeto puede ser lógica (reutilizar una key inmutable y cambiar su clasificación en DB) o física (copiar a prefijo definitivo y verificar antes de retirar el temporal). Se recomienda promoción lógica si R2, retención y permisos permiten que la key definitiva sea inmutable; evita dobles escrituras. La decisión requiere una prueba de amenazas y recuperación.

### 3.1. Compatibilidad con carga segura

El upload temporal no debe reemplazar directamente el endpoint ni el comportamiento de `/carga-segura` actual. Debe implementarse como un flujo paralelo, con endpoints separados y feature flags desactivados por defecto. El flujo vigente permanece disponible hasta completar piloto, observabilidad, pruebas de los cuatro módulos y rollback.

Endpoints candidatos, sujetos a contrato API y autorización:

```text
POST /api/v1/documentos/carga-temporal
GET  /api/v1/documentos/carga-temporal/:id
POST /api/v1/documentos/carga-temporal/:id/procesar-ocr
POST /api/v1/documentos/carga-temporal/:id/confirmar
POST /api/v1/documentos/carga-temporal/:id/descartar
```

Feature flags propuestas —nombres contractuales, no variables actualmente configuradas—:

```bash
DOCUMENTOS_UPLOAD_TEMPORAL_ENABLED=false
DOCUMENTOS_UPLOAD_TEMPORAL_CONFIRM_ENABLED=false
DOCUMENTOS_UPLOAD_TEMPORAL_OCR_ENABLED=false
```

Orden de habilitación recomendado: creación/consulta, luego OCR y finalmente confirmación. La confirmación nunca debe quedar activa si la creación o los controles de autorización, reconciliación y auditoría no están en `PASS`.

Prefijo R2 temporal candidato:

```text
temporal/{empresa}/{workspace}/{yyyy}/{mm}/{uuid}.pdf
```

`empresa` y `workspace` deben provenir de identidades canónicas normalizadas por backend; `uuid` no debe revelar datos de negocio. La extensión debe derivarse del tipo validado y no asumirse siempre PDF. El bucket permanece privado y el prefijo no constituye por sí solo una frontera de autorización.

Los temporales no deben aparecer en bandejas, expedientes, búsquedas, reportes, revisión contable ni métricas oficiales. Solo una confirmación exitosa y auditable puede materializar el documento definitivo y hacerlo visible en los flujos oficiales.

## 4. Modelo candidato, no DDL aprobado

| Entidad candidata | Propósito | Relación posible |
|---|---|---|
| `carga_temporales` | Ciclo de vida previo a confirmación | Complementa `documentos.carga_operaciones` |
| `carga_temporal_archivos` | Metadatos físicos, hash y key R2 temporal | Precursor de `documentos.documentos_archivos` |
| `carga_temporal_ocr` | Resultado OCR original y propuesta editable | Precursor/referencia de `documentos.ocr_resultados` |
| `carga_temporal_eventos` | Auditoría append-only del ciclo | Puede usar outbox/eventos compartidos |
| `documentos.carga_operaciones` | Idempotencia, reserva y reconciliación | Ya documentada conceptualmente en carga segura |

Alternativa conservadora: ampliar conceptualmente `carga_operaciones` con una entidad temporal claramente separada, sin convertir `documentos.documentos` en “temporal”. Antes de decidir, inventariar tablas, constraints, estados, consumidores NATS y queries existentes. No ejecutar el DDL conceptual de documentos anteriores.

Campos mínimos a evaluar: ID opaco, workspace/empresa canónicos, módulo origen, actor, idempotency key, fingerprint, SHA-256, MIME/tamaño/nombre seguro, key R2, estados separados de upload y OCR, timestamps, expiración, documento/archivo final, error interno sanitizado, versión y marca de reconciliación.

## 5. Reglas de seguridad y consistencia

- Derivar workspace, empresa y actor del contexto autenticado; no confiar en multipart/body.
- Autorizar carga, lectura, confirmación y descarte por separado.
- Objetos privados; preview únicamente mediante URL firmada corta y autorizada.
- Validar contenido real, no solo extensión o `Content-Type` declarado.
- Limitar tamaño, cantidad, concurrencia y frecuencia por usuario/tenant.
- Cifrar en tránsito y mediante controles del proveedor en reposo.
- Nunca registrar bytes, tokens, URLs firmadas ni OCR completo en logs generales.
- Confirmación con compare-and-set/lock: un temporal se consume una sola vez.
- Idempotencia para creación, upload, solicitud OCR y confirmación.
- Outbox/reconciliación para evitar DB confirmada con evento perdido u objeto huérfano.
- Política explícita de retención y limpieza con métricas, cuarentena y auditoría.

## 6. Riesgos

| Riesgo | Impacto | Mitigación/validación previa |
|---|---|---|
| Duplicado por reintento/concurrencia | Documentos u objetos múltiples | Idempotencia persistida, índice por ámbito y prueba concurrente |
| Objeto R2 huérfano | Costo y exposición | Reserva, reconciliador, expiración y borrado diferido |
| DB apunta a objeto inexistente | Documento inutilizable | Verificación de objeto/hash antes de confirmar |
| OCR confunde temporal con definitivo | Datos oficiales incorrectos | IDs/tópicos/estados separados y confirmación explícita |
| Cruce de tenant/módulo | Fuga de información | Identidad canónica backend y pruebas negativas |
| Limpieza prematura | Pérdida irreversible | Retención, cuarentena, legal hold y doble validación |
| Confirmación parcial | Inconsistencia transversal | Transacción DB + outbox + operación reconciliable |
| Cambio rompe MVP actual | Interrupción productiva | Feature flag, compatibilidad, canary y rollback lógico |
| Acumulación temporal | Degradación/costo | TTL lógico, métricas y job idempotente controlado |

## 7. Plan por fases

| Fase | Entregable | Puerta de salida |
|---|---|---|
| 0. Inventario | Contrato actual, esquema real, tópicos, R2 y métricas | Brechas y baseline aprobadas |
| 1. Contrato | Estados, endpoints, permisos, errores, TTL e idempotencia | ADR y matriz de amenazas aprobados |
| 2. Persistencia | Migración reversible y reconciliación diseñadas | Restore ensayado en entorno no productivo |
| 3. Backend | Sesión/upload/consulta/descarte tras feature flag | Tests unitarios e integración `PASS` |
| 4. OCR temporal | Mensajes y resultados aislados | Fallos/reintentos/DLQ `PASS` |
| 5. Confirmación | Promoción atómica y auditoría | Concurrencia y compensación `PASS` |
| 6. UI piloto | Revisión y confirmación explícitas | Accesibilidad y permisos `PASS` |
| 7. Rollout | Un módulo/tenant controlado, luego expansión | SLO, huérfanos y rollback validados |

## 8. Pruebas mínimas por módulo

Pruebas comunes: archivo válido, tipo/tamaño inválido, duplicado, reintento con misma clave, conflicto con misma clave y payload distinto, OCR exitoso/fallido, corrección manual, confirmación doble, descarte, expiración, aislamiento entre empresas y recuperación tras caída de R2/NATS/RDS.

| Módulo | Caso mínimo de negocio | Criterio `PASS` |
|---|---|---|
| Compras | OC, factura y guía; validar emisor/serie/número y relación esperada | Solo confirmación crea documento/asociación oficial; duplicados controlados |
| Almacén | Guía o nota de ingreso vinculada al contexto de almacén | Temporal no afecta stock/expediente; confirmación enlaza una vez |
| Finanzas | Transferencia o detracción con monto/moneda/operación | OCR no autoriza pago; acceso y asociación correctos |
| Contabilidad | Factura con fecha de emisión y período/revisión | Sin fecha válida no se confirma; temporal no entra a revisión contable |

En cada caso registrar `PASS/FAIL`, request ID, IDs temporales/finales no sensibles, timestamps, hash anonimizado y evidencia de que el objeto es privado.

## 9. Rollback lógico

1. Desactivar creación de nuevos temporales mediante feature flag.
2. Mantener lectura/revisión de temporales existentes; no cortar acceso abruptamente.
3. Detener consumo OCR temporal sin detener OCR del flujo vigente.
4. Marcar operaciones en curso como pausadas/reconciliables, sin borrarlas.
5. Volver la UI al endpoint estable de carga segura.
6. Reconciliar cada temporal: confirmado, pendiente, huérfano o descartable.
7. Restaurar versión de aplicación compatible; no revertir una migración destructiva.
8. Limpiar objetos solo después de retención, inventario y aprobación operativa.

El rollback debe ser practicado antes del rollout. Ningún rollback debe borrar `documentos`, resultados OCR originales ni objetos sin una lista exacta y recuperable.
