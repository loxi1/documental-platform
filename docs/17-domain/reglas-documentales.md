# Documento de diseño — Reglas documentales

## Objetivo

Definir reglas funcionales base para la gestión documental, agrupación, vinculación a expedientes, OCR, validación y trazabilidad.

Este documento es una especificación de dominio. No crea migraciones, no modifica runtime y no implementa endpoints.

## Clave documental oficial

La clave documental oficial es:

```text
CLIENTE|TIPO|RUC|SERIE|NUMERO
```

Ejemplo:

```text
BBTI|OC|20370146994|OC|007950
```

La clave debe ser estable y servir para:

- detectar duplicados
- asociar documentos
- buscar documentos
- agrupar evidencias
- facilitar trazabilidad

## Tipos documentales sugeridos

```text
OC
OS
FACTURA
GUIA
NOTA_INGRESO
TRANSFERENCIA
DETRACCION
RECIBO_HONORARIO
OTRO
```

## Regla 1 — Documento creado

Cuando se crea un registro en `documentos.documentos`, debe considerarse creado el documento funcional.

Evento asociado futuro:

```text
documento.creado
```

## Regla 2 — Archivo subido

Cuando se registra un archivo en `documentos.documentos_archivos`, debe considerarse que el archivo fue subido o asociado.

Evento asociado futuro:

```text
archivo.subido
```

## Regla 3 — Documento principal de expediente

Un expediente puede tener documentos principales.

Relaciones sugeridas:

```text
principal_factura
principal_oc
principal_os
```

En `documentos.expediente_documentos`, un documento principal debe usar:

```text
es_principal = true
```

## Regla 4 — Documentos adjuntos

Relaciones sugeridas:

```text
adjunto_factura
adjunto_guia
adjunto_nota_ingreso
adjunto_transferencia
adjunto_detraccion
adjunto_recibo_honorario
```

## Regla 5 — Vinculación a expediente

Un documento puede vincularse a expediente por:

- acción manual
- código de expediente
- OC/OS
- regla de negocio
- validación de usuario
- procesamiento documental

Evento asociado futuro:

```text
expediente.vinculado
```

## Regla 6 — OCR procesado

El OCR procesado no significa documento validado.

Cuando OCR termina:

```text
estado = pendiente_validacion
```

Evento asociado futuro:

```text
ocr.procesado
```

## Regla 7 — OCR confirmado

Un OCR confirmado representa validación humana o funcional del resultado extraído.

Evento asociado futuro:

```text
ocr.confirmado
```

## Regla 8 — OCR rechazado

Un OCR rechazado debe conservar motivo.

Evento asociado futuro:

```text
ocr.rechazado
```

Ejemplos de motivo:

```text
Documento ilegible.
Datos incompletos.
RUC incorrecto.
Serie o número no coincide.
No corresponde al expediente.
```

## Regla 9 — Completitud documental por expediente

La completitud debe evaluarse por expediente y tipo de operación.

Ejemplo para flujo compras:

```text
OC/OS
Factura
Guía
Nota de ingreso
Transferencia
Detracción, si aplica
```

## Regla 10 — No perder trazabilidad

No se debe eliminar evidencia funcional para corregir errores.

Preferencias:

- agregar nueva versión
- registrar evento
- cerrar alerta
- descartar alerta si fue creada por error

## Regla 11 — Estados sugeridos

Estados documentales sugeridos:

```text
borrador
pendiente_validacion
validado
observado
rechazado
vinculado
archivado
```

## Regla 12 — Origen

Valores sugeridos para origen de acciones:

```text
web
api
ocr
n8n
sistema
migracion
```

## Regla 13 — Metadata

`metadata` debe guardar datos complementarios, no reemplazar columnas principales.

Debe evitarse guardar:

- contenido completo de OCR si es muy grande
- datos sensibles innecesarios
- archivos completos
- información duplicada sin valor funcional

## Regla 14 — Orden visual

El campo `orden` en `documentos.expediente_documentos` controla visualización.

Orden funcional sugerido:

```text
1. OC / OS
2. Factura
3. Guía
4. Nota de ingreso
5. Transferencia
6. Detracción
7. Otros adjuntos
```

## Regla 15 — Duplicados

Si se detecta documento duplicado por clave documental:

- no eliminar automáticamente
- marcar para revisión
- vincular como versión si corresponde
- generar alerta futura si aplica

## Endpoints futuros relacionados

```http
GET /api/v1/documentos/:id
GET /api/v1/documentos/:id/eventos
GET /api/v1/documentos/:id/versiones
GET /api/v1/documentos/:id/alertas
GET /api/v1/expedientes/:id/documentos
GET /api/v1/expedientes/:id/eventos
GET /api/v1/expedientes/:id/alertas
```

## Exclusiones de este documento

Este documento no crea:

- migraciones
- repositorios
- servicios
- controllers
- endpoints
- cambios Docker
- cambios Traefik
- cambios RDS
- cambios frontend
- cambios OCR
