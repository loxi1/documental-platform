# Propuesta contractual — Carga Documental Segura Sprint 2.1C

**Proyecto:** Documental Platform ERP
**Sprint:** 2.1C — Carga Documental Segura MVP
**Estado:** PROPUESTA CONTRACTUAL EN REVISIÓN
**Implementación:** NO AUTORIZADA
**Prueba concurrente:** NO AUTORIZADA
**Push / merge / PR / rebase:** NO AUTORIZADOS
**Rama documental:** `docs/sprint-2-1C-contrato-carga-documental-segura`
**Baseline documental:** `11d2e56a`
**Referencia funcional V2:** `feat/documental-v2-operacion-2-1B @ 178cf9db`

---

## 1. Objetivo

Definir la propuesta contractual de la Carga Documental Segura para el Sprint 2.1C, separando con claridad:

```text
objeto físico
≠
archivo registrado
≠
documento lógico
≠
asociación documental
```

La propuesta consolida el comportamiento observado y las decisiones pendientes antes de autorizar cualquier implementación.

---

## 2. Alcance

El contrato cubre:

- recepción de archivos;
- validación básica;
- cálculo de SHA-256;
- detección de duplicados;
- persistencia física en R2;
- persistencia lógica en PostgreSQL;
- relación con expediente y documento;
- gestión de temporales;
- respuesta pública;
- auditoría;
- reintentos;
- consistencia y compensación;
- estado post-upload independiente de OCR.

Quedan fuera de alcance en esta fase:

- implementación;
- migraciones;
- pruebas concurrentes;
- cambios productivos;
- nuevos endpoints;
- cambios de modelo sin aprobación;
- eliminación de ramas de respaldo;
- push, merge, PR, rebase o cherry-pick.

---

## 3. Definiciones contractuales

### 3.1 Objeto físico

Binario almacenado en R2.

Características:

- identificado por `storageKey`;
- asociado a SHA-256;
- puede reutilizarse físicamente;
- no representa por sí mismo un documento de negocio;
- no debe depender del nombre original como identificador único.

### 3.2 Archivo registrado

Registro técnico en `documentos.documentos_archivos`.

Debe contener, como mínimo:

- hash SHA-256;
- proveedor de almacenamiento;
- bucket;
- storage key;
- versión;
- estado;
- metadata técnica;
- nombre original;
- content type;
- tamaño.

### 3.3 Documento lógico

Entidad funcional en `documentos.documentos`.

Representa el documento dentro del dominio:

- OC;
- OS;
- factura;
- guía;
- nota de ingreso;
- transferencia;
- detracción;
- u otro tipo documental permitido.

### 3.4 Asociación documental

Relación entre:

- documento;
- expediente;
- contexto operativo;
- grupo documental;
- documento principal;
- adjuntos;
- relaciones funcionales.

La existencia de un objeto físico idéntico no debe implicar automáticamente que una nueva asociación lógica sea inválida.

---

## 4. Principio rector

```text
Deduplicación física del objeto
no equivale a
unicidad del documento lógico
ni a
prohibición de asociar el mismo contenido en contextos distintos.
```

La política contractual deberá decidir de forma explícita:

1. cuándo reutilizar el mismo objeto físico;
2. cuándo crear un nuevo documento lógico;
3. cuándo permitir una nueva asociación;
4. cuándo rechazar una carga;
5. cuándo devolver una referencia existente.

---

## 5. Nomenclatura y nombre del archivo

### 5.1 Nombre original

El nombre original debe conservarse en metadata:

```text
metadata.filenameOriginal
```

No debe usarse como identificador físico único.

### 5.2 Nombre temporal

El archivo temporal debe usar un identificador generado por el servidor:

```text
<uuid>.tmp
```

o:

```text
<uuid>__<nombre-sanitizado>
```

### 5.3 Nombre físico en R2

Propuesta:

```text
documentos/<anio>/<mes>/<cliente>/<uuid>__<nombre-original-sanitizado>
```

Ejemplo:

```text
documentos/2026/07/BBTI/
1c529071-6de1-4e60-9586-b06a7d06beab__test-2-1C-upload.pdf
```

### 5.4 Regla de sanitización

Debe eliminar o normalizar:

- rutas relativas;
- `/` y `\`;
- caracteres de control;
- nombres reservados;
- espacios repetidos;
- caracteres incompatibles;
- secuencias peligrosas;
- extensiones inconsistentes.

### 5.5 Renombrado funcional posterior

El nombre funcional derivado de OCR o validación:

- puede usarse para visualización;
- puede almacenarse en metadata;
- no obliga a renombrar el objeto físico en R2;
- no debe romper referencias existentes.

---

## 6. Alcance de la deduplicación

### 6.1 Comportamiento actual confirmado

La consulta actual puede operar globalmente por SHA-256 cuando `documentoId` o `expedienteId` son nulos.

Estado:

```text
COMPORTAMIENTO ACTUAL CONFIRMADO
POLÍTICA DEFINITIVA NO APROBADA
```

### 6.2 Alternativas contractuales

#### Alternativa A — Deduplicación global física

Un mismo SHA-256 corresponde a un único objeto físico.

Ventajas:

- evita duplicar almacenamiento;
- reduce costos;
- simplifica reconciliación física.

Riesgos:

- posible bloqueo entre contextos;
- riesgo de exposición cruzada;
- acoplamiento entre workspaces;
- complejidad de permisos.

#### Alternativa B — Deduplicación por workspace o empresa

El hash se evalúa dentro de un ámbito:

```text
workspace + empresa + SHA-256
```

Ventajas:

- mayor aislamiento;
- menor riesgo de colisión funcional cruzada.

Riesgos:

- objetos físicos duplicados;
- mayor consumo de almacenamiento.

#### Alternativa C — Reutilización física global con asociaciones lógicas independientes

Propuesta recomendada para evaluación:

```text
objeto físico global por SHA-256
+
archivos/documentos/asociaciones aislados por contexto
```

Esto permitiría:

- reutilizar almacenamiento;
- conservar aislamiento lógico;
- crear asociaciones distintas;
- evitar bloqueo funcional innecesario.

Requiere diseño explícito de:

- permisos;
- ownership;
- referencias;
- auditoría;
- eliminación;
- versionado;
- acceso temporal.

---

## 7. Aislamiento por empresa y workspace

El contrato debe impedir que una respuesta de duplicado revele información de otro ámbito.

Nunca debería exponer sin autorización:

- documentoId de otra empresa;
- archivoId de otro workspace;
- storageKey;
- nombre de proveedor;
- expediente;
- metadata;
- nombre original;
- URL privada.

La respuesta pública debe aplicar controles de acceso antes de devolver referencias existentes.

Regla propuesta:

```text
El hash puede ser global físicamente,
pero la referencia pública debe estar aislada por autorización.
```

---

## 8. Semántica pública del duplicado

### 8.1 Alternativa A — Conflicto funcional

```text
HTTP 409
code = ARCHIVO_DUPLICADO_EN_CARGA_GUIADA
```

Respuesta propuesta:

```json
{
  "code": "ARCHIVO_DUPLICADO_EN_CARGA_GUIADA",
  "message": "Ya existe un archivo equivalente.",
  "duplicado": true,
  "accionSugerida": "abrir_existente",
  "referenciaExistente": {
    "documentoId": 3,
    "archivoId": 33
  }
}
```

Adecuada cuando repetir el archivo se considera una solicitud inválida.

### 8.2 Alternativa B — Respuesta idempotente

```text
HTTP 200
duplicado = true
```

Respuesta propuesta:

```json
{
  "duplicado": true,
  "creado": false,
  "documentoId": 3,
  "archivoId": 33,
  "accionSugerida": "abrir_existente"
}
```

Adecuada cuando repetir la misma solicitud debe devolver el mismo resultado lógico.

### 8.3 Dictamen pendiente

Debe definirse considerando:

- experiencia de frontend;
- reintentos automáticos;
- idempotencia;
- auditoría;
- aislamiento;
- diferencias entre duplicado físico y lógico.

---

## 9. Idempotencia y reintentos

### 9.1 Idempotencia por request ID

Propuesta:

```text
Idempotency-Key o requestId estable por operación lógica
```

Regla:

- mismo request ID y mismo payload: devolver mismo resultado;
- mismo request ID y payload diferente: rechazar;
- request ID nuevo y mismo archivo: aplicar política de duplicado;
- request ID distinto no debe crear duplicados físicos si la política lo evita.

### 9.2 Reintentos técnicos

Deben diferenciarse:

- reintento del cliente por timeout;
- reintento por error de red;
- reintento interno;
- nueva operación funcional;
- carga intencional en otro contexto.

### 9.3 Persistencia de idempotencia

Debe evaluarse una tabla o mecanismo específico que guarde:

- request ID;
- actor;
- workspace;
- hash;
- payload resumido;
- resultado;
- estado;
- timestamps;
- referencia creada o reutilizada.

No autorizado todavía para implementación.

---

## 10. Flujo propuesto PostgreSQL / R2

### 10.1 Objetivo

Evitar:

- documento lógico huérfano;
- objeto R2 huérfano;
- eventos inconsistentes;
- estado ambiguo;
- pérdida de trazabilidad.

### 10.2 Flujo contractual propuesto

```text
1. recibir archivo temporal
2. validar tamaño y tipo
3. calcular SHA-256
4. verificar autorización
5. verificar idempotencia
6. evaluar duplicado
7. reservar operación técnica
8. subir objeto a R2
9. confirmar persistencia física
10. persistir archivo y documento
11. crear asociaciones
12. registrar eventos
13. marcar operación completada
14. eliminar temporal
```

### 10.3 Variante con objeto reutilizado

```text
1. calcular SHA-256
2. encontrar objeto físico autorizado/reutilizable
3. no ejecutar PutObject
4. crear solo las referencias lógicas permitidas
5. registrar auditoría de reutilización
6. eliminar temporal
```

---

## 11. Consistencia y fallos parciales

### 11.1 PostgreSQL antes de R2

Riesgo:

```text
documento lógico sin objeto físico
```

### 11.2 R2 antes de PostgreSQL

Riesgo:

```text
objeto físico sin referencia lógica
```

### 11.3 Propuesta

Usar un estado técnico de operación:

```text
recibido
validado
reservado
subiendo
almacenado
persistiendo
completado
fallido
requiere_reconciliacion
```

El contrato debe diferenciar el estado de la carga del estado OCR.

---

## 12. Compensación y reconciliación

### 12.1 Compensación inmediata

Ante fallo posterior a R2:

- intentar eliminar el objeto recién creado si no tiene referencias;
- registrar resultado;
- no ocultar el error original.

### 12.2 Reconciliación diferida

Debe existir un proceso que detecte:

- objetos R2 sin registro;
- registros sin objeto;
- hashes inconsistentes;
- operaciones incompletas;
- temporales abandonados;
- eventos faltantes.

### 12.3 Criterio de eliminación

Nunca borrar un objeto físico si:

- tiene referencias activas;
- pertenece a otra asociación;
- su ownership no está claro;
- existe una operación en curso.

---

## 13. Gestión de archivos temporales

### 13.1 Directorio exclusivo

No usar directamente `/tmp` de forma indiscriminada.

Propuesta para producción:

```text
/var/lib/documental-platform/upload-tmp/
```

Propuesta para desarrollo local:
```text
/tmp/documental-platform-upload/
```


Propuesta para despliegues con contenedores:

- volumen temporal exclusivo de ms-documentos;
- no compartir con otros servicios;
- aplicar la misma política de expiración.

### 13.2 Eliminación normal

El temporal debe eliminarse inmediatamente cuando el resultado sea definitivo:

```text
upload exitoso → eliminar
duplicado detectado → eliminar
validación rechazada → eliminar
error no recuperable → eliminar
```

### 13.3 Error recuperable

Si existe estrategia de reintento interno, el temporal puede conservarse por un periodo corto y controlado.

Debe registrarse:

- ruta;
- operación;
- expiración;
- motivo;
- contador de reintentos.

### 13.4 Limpieza residual

Propuesta:

```text
frecuencia: diaria
antigüedad: 24 o 48 horas
ámbito: solo directorio exclusivo de ms-documentos
```

Ejemplo operativo futuro para producción:

```bash
find /var/lib/documental-platform/upload-tmp -type f -mmin +2880 -delete
```

No se recomienda:

```bash
rm -rf /tmp/*
```

Tampoco se recomienda depender de un cron mensual o del día 7.

### 13.5 Streaming futuro

Alternativa futura:

- streaming directo a R2;
- cálculo de hash durante el flujo;
- menor uso de disco;
- requiere rediseño y pruebas.

No autorizada todavía.

---

## 14. Estado post-upload independiente de OCR

El resultado del upload no debe quedar representado únicamente por:

```text
pendiente_ocr
```

Propuesta de separación:

### Estado de carga

```text
recibido
validado
almacenado
persistido
completado
fallido
```

### Estado OCR

```text
no_requerido
pendiente
procesando
procesado
fallido
pendiente_validacion
validado
rechazado
```

### Estado documental

```text
borrador
pendiente_validacion
confirmado
observado
anulado
```

Esto evita mezclar:

- almacenamiento;
- OCR;
- validación;
- estado funcional.

---

## 15. Auditoría

Debe auditarse como mínimo:

- intento de carga;
- actor;
- workspace;
- empresa;
- request ID;
- hash;
- duplicado detectado;
- referencia reutilizada;
- rechazo;
- upload exitoso;
- fallo R2;
- fallo PostgreSQL;
- compensación;
- limpieza;
- reconciliación.

### Intento rechazado

Actualmente no se genera evento adicional para el duplicado secuencial.

Decisión pendiente:

```text
auditar sin crear evento documental
o
crear evento técnico específico
```

Propuesta de evento técnico:

```text
archivo.carga_rechazada_duplicado
```

Debe evitar contaminar el timeline funcional si no corresponde.

---

## 16. Respuesta pública mínima

### 16.1 Éxito con creación

```json
{
  "documentoId": 3,
  "archivoId": 33,
  "hashSha256": "…",
  "duplicado": false,
  "creado": true,
  "estadoCarga": "completado"
}
```

### 16.2 Duplicado

```json
{
  "documentoId": 3,
  "archivoId": 33,
  "hashSha256": "…",
  "duplicado": true,
  "creado": false,
  "accionSugerida": "abrir_existente"
}
```

### 16.3 Campos no recomendados

No incluir por defecto:

- `storageKey`;
- bucket;
- proveedor interno;
- rutas temporales;
- detalles internos de R2;
- metadata sensible;
- stack traces.

### 16.4 Preview

La URL temporal de preview no forma parte del contrato mínimo de carga.

Debe resolverse por endpoint separado y autorizado.

---

## 17. Códigos funcionales propuestos

```text
ARCHIVO_DUPLICADO_EN_CARGA_GUIADA
ARCHIVO_TIPO_NO_PERMITIDO
ARCHIVO_TAMANO_EXCEDIDO
ARCHIVO_HASH_INVALIDO
ARCHIVO_UPLOAD_R2_FALLIDO
ARCHIVO_PERSISTENCIA_FALLIDA
ARCHIVO_OPERACION_INCONSISTENTE
ARCHIVO_REQUIERE_RECONCILIACION
ARCHIVO_REQUEST_ID_REUTILIZADO_CON_PAYLOAD_DISTINTO
```

No se consideran aprobados hasta dictamen contractual.

---

## 18. Casos contractuales mínimos

### Caso 1 — Upload nominal

Resultado:

- objeto creado;
- archivo registrado;
- documento registrado;
- asociación creada;
- eventos creados;
- temporal eliminado.

### Caso 2 — Duplicado secuencial en mismo contexto

Resultado observado actual:

- HTTP 409;
- referencias existentes;
- sin nueva persistencia;
- sin PutObject;
- temporal eliminado.

### Caso 3 — Mismo binario en otro contexto

Decisión pendiente:

- bloquear;
- reutilizar objeto;
- crear nueva asociación;
- crear nuevo documento lógico.

### Caso 4 — Falla R2

Debe definir:

- estado técnico;
- persistencia permitida;
- reintento;
- limpieza temporal;
- auditoría.

### Caso 5 — Falla PostgreSQL después de R2

Debe definir:

- compensación;
- reconciliación;
- eliminación segura;
- estado final.

### Caso 6 — Timeout del cliente

Debe permitir recuperar el resultado mediante request ID.

### Caso 7 — Reintento técnico

Debe distinguirse de una nueva carga funcional.

### Caso 8 — Carga concurrente

No autorizada todavía.

Requiere plan específico.

---

## 19. Decisiones pendientes del Maestro Intermedio

1. ¿La deduplicación física será global?
2. ¿El aislamiento lógico será por workspace, empresa o cliente?
3. ¿Se permitirá reutilizar un objeto físico en varios contextos?
4. ¿El duplicado será HTTP 409 o respuesta idempotente?
5. ¿Qué datos de la referencia existente pueden exponerse?
6. ¿Se auditarán intentos rechazados?
7. ¿Cuál será el orden contractual PostgreSQL/R2?
8. ¿Qué mecanismo de compensación se aprobará?
9. ¿Qué estado técnico de carga se utilizará?
10. ¿Cómo se separará de OCR?
11. ¿Cuál será la retención máxima de temporales?
12. ¿Se autorizará streaming directo a R2 en una fase futura?
13. ¿Qué condiciones deberán cumplirse antes de una prueba concurrente?

---

## 20. Recomendación contractual propuesta

Se propone evaluar como opción principal:

```text
Deduplicación física global por SHA-256
+
aislamiento lógico por workspace/empresa
+
asociaciones independientes
+
respuesta idempotente o conflicto según contexto
+
auditoría técnica
+
reconciliación
```

Esta recomendación no constituye aprobación.

---

## 21. Criterios para autorizar implementación

No iniciar implementación hasta contar con:

- contrato aprobado;
- baseline 2.1B integrada o resuelta;
- alcance del hash definido;
- semántica de duplicado definida;
- modelo de aislamiento aprobado;
- respuesta mínima aprobada;
- estrategia R2/PostgreSQL aprobada;
- estados aprobados;
- auditoría aprobada;
- limpieza temporal aprobada;
- plan de pruebas;
- plan de rollback;
- autorización expresa.

---

## 22. Estado del entregable

```text
Propuesta contractual:
PREPARADA PARA REVISIÓN

EVID-2.1C-018:
CERRADA

EVID-2.1C-021:
CERRADA

Sprint 2.1C:
ABIERTO

Contrato:
PENDIENTE DE DICTAMEN

Implementación:
BLOQUEADA

Concurrencia:
NO AUTORIZADA

Push:
NO AUTORIZADO
```

---

## 23. Solicitud de dictamen

Se solicita al Maestro Intermedio:

1. revisar las alternativas;
2. aprobar o corregir la separación físico/lógico;
3. definir el alcance de deduplicación;
4. definir la semántica pública del duplicado;
5. aprobar el tratamiento de temporales;
6. definir el modelo de consistencia;
7. aprobar la respuesta mínima;
8. mantener bloqueada la implementación hasta resolución integral.
