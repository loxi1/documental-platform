# Propuesta contractual ajustada — Carga Documental Segura Sprint 2.1C

**Proyecto:** Documental Platform ERP
**Sprint:** 2.1C — Carga Documental Segura MVP
**Estado:** PROPUESTA CONTRACTUAL AJUSTADA
**Pendiente:** APROBACIÓN FINAL
**Implementación:** NO AUTORIZADA
**Prueba concurrente:** NO AUTORIZADA
**Push / merge / PR / rebase:** NO AUTORIZADOS
**Rama documental:** `docs/sprint-2-1C-contrato-carga-documental-segura`
**Commit base de la propuesta:** `77f660e0`
**Referencia funcional V2:** `feat/documental-v2-operacion-2-1B @ 178cf9db`

---

## 1. Objetivo

Definir el contrato ajustado de Carga Documental Segura para el Sprint 2.1C, incorporando las decisiones emitidas por el Maestro Intermedio y manteniendo separadas las siguientes entidades:

```text
objeto físico
≠
archivo registrado
≠
documento lógico
≠
asociación documental
```

Este documento consolida decisiones contractuales. No autoriza implementación, migraciones, cambios productivos, pruebas concurrentes ni integración de ramas.

---

## 2. Resolución del Maestro Intermedio

```text
PROPUESTA CONTRACTUAL:
APROBADA CON AJUSTES OBLIGATORIOS

DEDUPLICACIÓN GLOBAL:
NO APROBADA PARA EL MVP

DEDUPLICACIÓN POR WORKSPACE Y EMPRESA:
APROBADA

REUTILIZACIÓN FÍSICA GLOBAL:
DIFERIDA

DUPLICADO:
HTTP 409 PARA UNA NUEVA OPERACIÓN

IDEMPOTENCIA:
POR IDEMPOTENCY-KEY

R2 / POSTGRESQL:
RESERVA TÉCNICA
→ R2
→ TRANSACCIÓN DOCUMENTAL
→ COMPENSACIÓN

OCR:
SEPARADO

TEMPORALES:
DIRECTORIO EXCLUSIVO CONFIGURABLE
LIMPIEZA INMEDIATA Y RESIDUAL

STORAGE KEY:
UUID + EXTENSIÓN VALIDADA

RESPUESTA MÍNIMA:
SIN ESTADO TÉCNICO NI URL DE PREVIEW

IMPLEMENTACIÓN:
BLOQUEADA

SPRINT:
ABIERTO
```

---

## 3. Matriz de decisiones incorporadas

| ID | Tema | Decisión Maestro Intermedio | Ajuste incorporado | Estado |
|---|---|---|---|---|
| DEC-2.1C-001 | Modelo conceptual | Separar objeto, archivo, documento y asociación | Definiciones diferenciadas | INCORPORADO |
| DEC-2.1C-002 | Dedupe MVP | `workspaceId + empresaCodigo + SHA-256` | Regla contractual del MVP | INCORPORADO |
| DEC-2.1C-003 | Dedupe global | No aprobada para el MVP | Eliminada como recomendación objetivo | INCORPORADO |
| DEC-2.1C-004 | Reutilización cruzada | Fuera del MVP | No se reutiliza entre workspaces/empresas | INCORPORADO |
| DEC-2.1C-005 | Duplicado | HTTP 409 | Contrato público fijado | INCORPORADO |
| DEC-2.1C-006 | Idempotencia | `Idempotency-Key` | Separada de `requestId` | INCORPORADO |
| DEC-2.1C-007 | Flujo R2/DB | Reserva técnica → R2 → transacción | Orden ajustado | INCORPORADO |
| DEC-2.1C-008 | Compensación | `DeleteObject` cuando corresponda | Regla incluida | INCORPORADO |
| DEC-2.1C-009 | Auditoría | Técnica y obligatoria | Separada del timeline funcional | INCORPORADO |
| DEC-2.1C-010 | Estados | Concepto aprobado, enums pendientes | Catálogos reducidos a mínimos conceptuales | INCORPORADO |
| DEC-2.1C-011 | OCR | Separación obligatoria | Upload independiente de OCR | INCORPORADO |
| DEC-2.1C-012 | Respuesta mínima | Sin `estadoCarga` | Campo retirado | INCORPORADO |
| DEC-2.1C-013 | Storage key | UUID + extensión | Nombre original retirado de la clave objetivo | INCORPORADO |
| DEC-2.1C-014 | Nombre original | Columna canónica | Metadata queda como complemento | INCORPORADO |
| DEC-2.1C-015 | Temporales | Configuración operativa | Se introduce `UPLOAD_TMP_DIR` | INCORPORADO |
| DEC-2.1C-016 | Implementación actual | Confirmar memoria o disco | Se declara pendiente de verificación | INCORPORADO |
| DEC-2.1C-017 | Código hash | Reemplazar `ARCHIVO_HASH_INVALIDO` | Se usa `ARCHIVO_HASH_CALCULO_FALLIDO` | INCORPORADO |
| DEC-2.1C-018 | Reconciliación pública | No exponer detalle interno | Se usa `ARCHIVO_OPERACION_INCONSISTENTE` | INCORPORADO |
| DEC-2.1C-019 | Aislamiento | Casos por empresa/workspace | Casos mínimos agregados | INCORPORADO |
| DEC-2.1C-020 | Concurrencia | Fuera de alcance | Permanece no autorizada | INCORPORADO |

---

## 4. Alcance

El contrato cubre:

- recepción de archivos;
- autenticación, autorización y contexto;
- validación de tamaño y MIME;
- cálculo de SHA-256;
- idempotencia;
- deduplicación dentro del ámbito autorizado;
- reserva de operación técnica;
- generación de storage key;
- persistencia en R2;
- persistencia documental en PostgreSQL;
- compensación;
- auditoría;
- limpieza de recursos temporales;
- respuesta pública;
- separación del procesamiento OCR.

Quedan fuera del MVP:

- deduplicación física global;
- reutilización física entre workspaces o empresas;
- nuevas asociaciones V2;
- streaming directo a R2;
- prueba concurrente;
- implementación;
- migraciones;
- cambios productivos;
- push, merge, PR, rebase o cherry-pick.

---

## 5. Modelo conceptual contractual

### 5.1 Objeto físico

Representa únicamente el binario almacenado en R2.

No constituye:

- documento de negocio;
- expediente;
- asociación;
- autorización;
- ownership funcional;
- visibilidad para el usuario.

### 5.2 Archivo registrado

Representa una instancia técnica del archivo dentro del ámbito autorizado.

Debe quedar ligado, directamente o mediante identidades canónicas equivalentes, a:

```text
workspace
+
empresa
+
contexto documental autorizado
```

Debe contener como mínimo:

- hash SHA-256;
- nombre original visible;
- content type validado;
- tamaño;
- proveedor;
- bucket;
- storage key;
- estado vigente;
- timestamps;
- metadata técnica complementaria.

### 5.3 Documento lógico

Representa la entidad funcional del dominio documental.

No debe identificarse únicamente por el SHA-256 del binario.

### 5.4 Asociación documental

Relaciona un documento lógico con su contexto funcional.

Sprint 2.1C no amplía asociaciones V2.

La carga solo podrá conservar la relación legacy estrictamente necesaria si ya forma parte del flujo vigente.

---

## 6. Principio rector

```text
Deduplicación física del objeto
≠
unicidad del documento lógico
≠
asociación repetida
```

Sin embargo, para el MVP no se autoriza la reutilización física global del mismo objeto entre ámbitos distintos.

---

## 7. Alcance definitivo de deduplicación

### 7.1 Regla del MVP

La deduplicación se evalúa dentro del ámbito mínimo:

```text
workspaceId
+
empresaCodigo
+
SHA-256
```

Cuando el modelo real no exponga directamente ambos valores en persistencia, se usará la identidad canónica equivalente aprobada por Auth y dominio.

Regla contractual:

```text
Un archivo solo puede considerarse duplicado
dentro del mismo workspace y empresa autorizados.
```

### 7.2 Otro workspace o empresa

```text
Mismo hash en otro workspace o empresa:
NO devolver referencia cruzada
NO revelar existencia
NO devolver documentoId
NO devolver archivoId
NO devolver nombre
NO devolver storageKey
```

Para el MVP, el mismo binario en otro ámbito puede producir otro objeto físico y otro archivo registrado.

### 7.3 Mismo ámbito, intención diferente

Dentro del mismo workspace y empresa:

```text
archivo físico repetido
≠
asociación repetida
≠
documento lógico repetido
```

El upload no creará automáticamente una asociación nueva cuando detecte el archivo.

Devolverá conflicto HTTP 409 y la eventual reutilización lógica deberá resolverse mediante una operación posterior autorizada.

### 7.4 Comportamiento legacy observado

La consulta vigente puede operar globalmente por SHA-256 cuando ciertos identificadores son nulos.

```text
COMPORTAMIENTO ACTUAL:
CONFIRMADO

POLÍTICA DEL MVP:
NO APROBADA EN SU FORMA GLOBAL
```

---

## 8. Seguridad y aislamiento

La identidad debe derivarse del contexto autenticado del Gateway.

No se aceptará desde el body:

- `usuarioId`;
- `workspaceId`;
- empresa;
- cliente destino manipulable;
- ámbito de deduplicación;
- ownership.

Antes de devolver referencias existentes deben validarse:

- acceso al documento;
- mismo workspace;
- misma empresa;
- estado accesible;
- visibilidad vigente;
- permisos del usuario.

---

## 9. Semántica pública del duplicado

### 9.1 Nueva operación con archivo duplicado

Respuesta:

```text
HTTP 409 Conflict
```

Código:

```text
ARCHIVO_DUPLICADO_EN_CARGA_GUIADA
```

Contrato:

```json
{
  "code": "ARCHIVO_DUPLICADO_EN_CARGA_GUIADA",
  "message": "Ya existe un archivo equivalente en el ámbito autorizado.",
  "duplicado": true,
  "creado": false,
  "accionSugerida": "abrir_existente",
  "referenciaExistente": {
    "documentoId": 3,
    "archivoId": 33
  },
  "requestId": "..."
}
```

`referenciaExistente` solo se incluye si la autorización lo permite.

### 9.2 Misma operación lógica

Cuando una `Idempotency-Key` válida identifica exactamente la misma operación:

```text
reproducir el resultado original
```

Esto no convierte todos los duplicados en respuestas HTTP 200.

### 9.3 Regla consolidada

```text
Misma operación lógica:
reproducir resultado original

Nueva operación con mismo archivo:
HTTP 409
```

---

## 10. Idempotencia y request ID

### 10.1 Diferencia contractual

```text
requestId:
identifica una solicitud técnica

Idempotency-Key:
identifica una operación lógica repetible
```

Un reintento de red puede tener un `requestId` distinto y conservar la misma `Idempotency-Key`.

### 10.2 Ámbito

```text
workspaceId
+
empresaCodigo
+
Idempotency-Key
```

### 10.3 Reglas

```text
Misma Idempotency-Key + mismo ámbito + mismo payload:
devolver resultado registrado

Misma Idempotency-Key + payload diferente:
rechazar

Nueva Idempotency-Key + mismo hash:
aplicar política de duplicado

Idempotency-Key de otro workspace:
no tiene efecto
```

### 10.4 Persistencia técnica

Se aprueba conceptualmente un registro técnico de idempotencia.

Quedan pendientes del diseño posterior:

- tabla;
- esquema;
- columnas;
- índices;
- retención;
- migración;
- limpieza;
- estrategia de concurrencia.

---

## 11. Nombres y storage key

### 11.1 Nombre original

El nombre original debe conservarse en un campo o columna canónica del archivo:

```text
nombre_archivo:
nombre original visible
```

Metadata puede guardar información adicional, pero no debe ser la única fuente del nombre original.

### 11.2 Storage key del MVP

Formato contractual:

```text
<ambito>/<año>/<mes>/<uuid>.<extension-validada>
```

Ejemplo conceptual:

```text
documentos/BBTI/2026/07/1c529071-6de1-4e60-9586-b06a7d06beab.pdf
```

El segmento de ámbito:

- es ilustrativo;
- debe derivarse del contexto autenticado;
- no debe confiar en valores manipulables enviados por el cliente.

### 11.3 Regla aprobada

```text
UUID + extensión validada:
APROBADO

UUID + nombre original completo:
NO RECOMENDADO COMO REGLA OBJETIVO
```

El nombre original se utilizará para descarga mediante `Content-Disposition` o una respuesta autorizada.

### 11.4 Sanitización

Aunque el nombre original no forme parte de la clave física objetivo, debe sanitizarse para visualización y descarga:

- eliminar rutas relativas;
- normalizar `/` y `\`;
- eliminar caracteres de control;
- impedir nombres reservados;
- normalizar espacios;
- validar extensión;
- evitar secuencias peligrosas.

---

## 12. Flujo contractual PostgreSQL / R2

### 12.1 Secuencia aprobada

```text
1. recibir archivo
2. validar autenticación, permiso y contexto
3. validar tamaño y MIME
4. calcular SHA-256
5. verificar idempotencia
6. verificar duplicado dentro del ámbito
7. registrar o reservar operación técnica
8. generar storageKey
9. ejecutar PutObject
10. verificar resultado de almacenamiento
11. persistir documento y archivo en transacción PostgreSQL
12. registrar relación legacy estrictamente necesaria, si ya existe
13. registrar auditoría obligatoria
14. marcar operación técnica como completada
15. eliminar temporal, si existe
16. responder
```

### 12.2 Reserva técnica

La reserva no es el documento lógico definitivo.

Debe permitir registrar:

- operación iniciada;
- actor;
- workspace;
- empresa;
- SHA-256;
- `Idempotency-Key`;
- storage key prevista;
- resultado;
- error;
- necesidad de reconciliación.

El modelo exacto permanece pendiente de diseño.

### 12.3 Restricción

No crear primero el documento funcional definitivo y después intentar R2.

---

## 13. Consistencia y compensación

### 13.1 Fallo antes de R2

```text
no crear documento definitivo
no crear archivo registrado
marcar operación fallida
eliminar temporal, si existe
registrar auditoría
```

### 13.2 Fallo de R2

```text
no persistir documento definitivo
no persistir archivo como subido
marcar operación fallida
eliminar o retener temporal según reintento interno controlado
registrar auditoría
```

### 13.3 R2 exitoso y fallo PostgreSQL

Ejecutar intento de:

```text
DeleteObject
```

solo si:

- el objeto fue creado por esa operación;
- no fue reutilizado;
- no tiene referencias;
- se identifica con certeza.

Si la eliminación falla:

```text
marcar requiere_reconciliacion
registrar storageKey interno
registrar error
no ocultar la causa original
```

### 13.4 Reconciliación

Debe poder identificar:

- objetos sin registro;
- registros sin objeto;
- operaciones incompletas;
- temporales vencidos;
- eventos pendientes.

`requiere_reconciliacion` es un estado interno. No se expone como código público.

---

## 14. Auditoría y eventos

### 14.1 Auditoría obligatoria

Debe registrar:

- intento de carga;
- actor;
- workspace;
- empresa;
- request ID;
- `Idempotency-Key`;
- SHA-256;
- resultado;
- duplicado;
- referencia existente autorizada;
- error R2;
- error PostgreSQL;
- compensación;
- reconciliación;
- limpieza del temporal.

### 14.2 Intentos rechazados

Los duplicados deben producir auditoría técnica.

No se aprueba agregarlos automáticamente al timeline funcional.

### 14.3 Garantía

La auditoría obligatoria:

- no debe perderse silenciosamente;
- debe participar de una garantía transaccional;
- puede usar outbox u otro mecanismo aprobado posteriormente.

Eventos derivados o notificaciones pueden procesarse después.

---

## 15. Estados

### 15.1 Operación de carga

Estados conceptuales mínimos recomendados:

```text
iniciada
almacenada
completada
fallida
requiere_reconciliacion
```

No se aprueban como enum definitivo todos los estados intermedios propuestos anteriormente.

### 15.2 Archivo

Estados conceptuales mínimos:

```text
subido
fallido
anulado
```

El catálogo definitivo debe validarse contra la base vigente.

### 15.3 Documento

No se modifica todavía el catálogo documental existente.

`pendiente_ocr` queda documentado como:

```text
COMPORTAMIENTO LEGACY OBSERVADO
```

No se aprueba como estado contractual definitivo del upload.

### 15.4 OCR

```text
Carga completada
≠
OCR completado
≠
documento validado
```

La carga puede completarse aunque:

- OCR no se ejecute;
- OCR falle;
- OCR quede pendiente;
- OCR no sea requerido.

---

## 16. Respuesta pública mínima

### 16.1 Creación exitosa

```json
{
  "documentoId": 3,
  "archivoId": 33,
  "hashSha256": "...",
  "duplicado": false,
  "creado": true,
  "requestId": "..."
}
```

### 16.2 Duplicado

Se utiliza la estructura definida en la sección 9.

### 16.3 Campo excluido por ahora

No se incluye:

```text
estadoCarga
```

El catálogo técnico todavía no está aprobado y no debe filtrarse como contrato público.

### 16.4 Campos excluidos

- `storageKey`;
- bucket;
- provider;
- ruta temporal;
- URL firmada;
- metadata cruda;
- JSONB;
- estado OCR;
- asociación V2;
- detalles internos de compensación;
- estado de reconciliación.

### 16.5 Preview

La URL temporal de preview debe resolverse mediante un endpoint separado y autorizado.

---

## 17. Gestión de temporales

### 17.1 Configuración operativa

La ruta exacta no forma parte del contrato de dominio.

Debe configurarse mediante:

```text
UPLOAD_TMP_DIR
```

Ejemplos operativos:

```text
Producción tradicional:
/var/lib/documental-platform/upload-tmp/

Desarrollo local:
/tmp/documental-platform-upload/

Contenedores:
volumen temporal exclusivo de ms-documentos
```

### 17.2 Requisitos

- no compartir con otros servicios;
- propietario: usuario del servicio;
- permisos restrictivos;
- límite de tamaño;
- política de expiración;
- protección contra symlinks;
- exclusión de archivos activos;
- logging;
- dry run inicial para limpieza residual.

### 17.3 Retención

```text
eliminación inmediata:
cuando la operación tiene resultado definitivo

limpieza residual:
cada 24 horas

antigüedad máxima:
48 horas
```

No conservar temporales para reintentos externos.

Solo se permite retención para un reintento interno controlado con operación registrada y expiración.

### 17.4 Implementación actual

Debe confirmarse si la carga vigente utiliza realmente disco temporal.

La implementación observada recibe:

```text
file.buffer
```

Por tanto debe distinguirse:

```text
implementación actual:
posible procesamiento en memoria

política futura:
temporal configurable o streaming
```

No se implementará limpieza de temporales inexistentes.

### 17.5 Comandos operativos

Los comandos de limpieza son ejemplos de despliegue, no parte del contrato de dominio.

Se mantiene prohibido:

```bash
rm -rf /tmp/*
```

---

## 18. Streaming

```text
FUERA DEL MVP 2.1C
```

No autorizado.

Requeriría:

- hash incremental;
- control de tamaño;
- abort multipart;
- backpressure;
- reintentos;
- seguridad;
- pruebas de carga.

---

## 19. Códigos funcionales

Candidatos:

```text
ARCHIVO_DUPLICADO_EN_CARGA_GUIADA
ARCHIVO_TIPO_NO_PERMITIDO
ARCHIVO_TAMANO_EXCEDIDO
ARCHIVO_HASH_CALCULO_FALLIDO
ARCHIVO_UPLOAD_R2_FALLIDO
ARCHIVO_PERSISTENCIA_FALLIDA
ARCHIVO_OPERACION_INCONSISTENTE
ARCHIVO_REQUEST_ID_REUTILIZADO_CON_PAYLOAD_DISTINTO
```

No exponer:

```text
ARCHIVO_REQUIERE_RECONCILIACION
```

La reconciliación es un detalle interno y auditable.

---

## 20. Casos mínimos de aceptación

1. Upload nominal.
2. Duplicado secuencial en el mismo ámbito.
3. Mismo hash en otra empresa.
4. Mismo hash en otro workspace.
5. Misma `Idempotency-Key` y mismo payload.
6. Misma `Idempotency-Key` y payload distinto.
7. Timeout y recuperación del resultado.
8. Fallo R2.
9. Fallo PostgreSQL posterior a R2.
10. Fallo de auditoría.
11. Compensación exitosa.
12. Compensación fallida.
13. Temporal eliminado tras éxito, si existe.
14. Temporal eliminado tras duplicado, si existe.
15. Acceso no autorizado.
16. Manipulación de empresa por body.
17. Archivo con nombre peligroso.
18. Archivo sobre límite.
19. MIME no permitido.
20. Carga completada sin OCR.

La concurrencia exige un plan separado antes de su ejecución.

---

## 21. Baseline 2.1B

```text
Sprint 2.1B:
cerrado funcionalmente en ramas

Integración a baseline:
pendiente
```

La implementación de 2.1C no podrá comenzar hasta que:

```text
A. Sprint 2.1B sea integrado de forma controlada

o

B. se apruebe expresamente una rama base
con el delta completo y validado de 2.1B
```

---

## 22. Separación de CONF-OCR-AUD-01

Permanece fuera de 2.1C:

- `x-user-id` específico de confirmación OCR;
- `validado_por`;
- `ocr.confirmado`;
- `expediente.vinculado`;
- atomicidad de confirmación OCR.

La auditoría de carga se diseña de forma independiente.

---

## 23. Criterios previos a implementación

No iniciar implementación hasta contar con:

- aprobación final del contrato;
- baseline 2.1B resuelta;
- diseño de la operación técnica;
- persistencia de `Idempotency-Key`;
- aislamiento confirmado;
- respuesta mínima aprobada;
- estrategia R2/PostgreSQL aprobada;
- compensación aprobada;
- auditoría aprobada;
- validación del catálogo vigente;
- confirmación memoria/disco;
- plan de pruebas;
- plan de rollback;
- autorización expresa.

---

## 24. Estado del entregable

```text
Propuesta contractual:
AJUSTADA

Pendiente:
APROBACIÓN FINAL

EVID-2.1C-018:
CERRADA

EVID-2.1C-021:
CERRADA

Sprint 2.1C:
ABIERTO

Contrato para implementación:
NO APROBADO TODAVÍA

Implementación:
BLOQUEADA

Concurrencia:
NO AUTORIZADA

Push:
NO AUTORIZADO
```

---

## 25. Solicitud de aprobación final

Se solicita al Maestro Intermedio:

1. verificar la incorporación de las 20 decisiones;
2. validar el ámbito `workspace + empresa + SHA-256`;
3. validar HTTP 409 para nuevas operaciones duplicadas;
4. validar `Idempotency-Key`;
5. validar el orden reserva → R2 → transacción;
6. validar compensación con `DeleteObject`;
7. validar auditoría técnica;
8. validar storage key UUID + extensión;
9. validar la política configurable de temporales;
10. emitir aprobación final o nuevas observaciones.

No se solicita autorización de implementación.
