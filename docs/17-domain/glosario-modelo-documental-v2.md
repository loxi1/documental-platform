# Glosario del Modelo Documental V2

## Propósito

Este documento define el vocabulario oficial del **Modelo Documental V2**.

No es un documento técnico de implementación. No define tablas, endpoints, migraciones ni componentes frontend.

Su objetivo es evitar que cada módulo use nombres distintos para el mismo concepto y asegurar que Compras, Almacén, Finanzas, Contabilidad, Auditoría, Backend y Frontend compartan el mismo lenguaje de dominio.

Documento arquitectónico raíz de referencia:

```text
docs/17-domain/contenedor-operativo.md
```

## Principio rector

La regla de negocio gobierna al modelo de datos.

Las tablas, endpoints, repositorios y componentes deben adaptarse al dominio definido, no al revés.

---

## Contenedor Operativo

Entidad conceptual superior que identifica una operación documental.

No constituye necesariamente el nombre visible para el usuario final.

Durante la validación funcional podrá representarse como:

- Expediente
- Centro de costo
- Orden de Producción
- Proyecto
- PR
- u otra entidad de negocio equivalente

El Contenedor Operativo agrupa bajo una misma trazabilidad:

- Documentos Operativos Principales
- Grupos de Factura
- Adjuntos
- eventos documentales
- alertas
- auditoría
- historial de cambios

El nombre visible será definido por negocio. El modelo interno usa “Contenedor Operativo” para no acoplarse prematuramente a una denominación específica.

---

## Documento Operativo Principal

Documento que abre, soporta o formaliza una operación dentro de un Contenedor Operativo.

Es el concepto estable del dominio.

Actualmente puede materializarse como:

- OC
- OS
- Requerimiento de Compra

Esta lista podrá ampliarse mediante decisiones futuras de negocio. Ejemplos posibles:

- Contrato
- Convenio
- Orden de Servicio Externa
- Acta de Inicio
- Orden de Trabajo

La Factura no es Documento Operativo Principal formal en el Modelo Documental V2.

---

## Grupo de Factura

Unidad documental secundaria que nace alrededor de una Factura.

Un Grupo de Factura contiene la factura y sus documentos derivados o complementarios.

Puede incluir:

- Factura
- Guía
- Nota de ingreso
- Transferencia
- Detracción
- Recibo
- otros documentos asociados

Contabilidad debe revisar principalmente por Grupo de Factura, porque este agrupa los documentos necesarios para validar una obligación, recepción, pago o sustento.

---

## Documento Relacionado

Documento vinculado a una operación, a un Documento Operativo Principal o a un Grupo de Factura.

Puede ser un documento de soporte, sustento, recepción, pago, validación o trazabilidad.

No todo Documento Relacionado es principal.

Ejemplos:

- Guía
- Nota de ingreso
- Transferencia
- Detracción
- constancia
- sustento adicional

---

## Documento Principal Activo

Documento marcado explícitamente como principal dentro de un contexto operativo.

La verdad funcional no debe inferirse solo por el tipo de relación ni por el nombre del documento.

Regla vigente heredada del modelo actual:

```text
Documento Principal Activo = es_principal === true
```

En el Modelo V2, el concepto debe mantenerse explícito y auditable.

La existencia de uno o varios Documentos Operativos Principales por Contenedor Operativo queda como decisión pendiente de negocio y arquitectura.

---

## Adjunto

Documento que acompaña a una Factura dentro de un Grupo de Factura.

En el flujo formal, los adjuntos no deben colgar directamente del Contenedor Operativo, sino del Grupo de Factura correspondiente.

Ejemplos:

- Guía
- Nota de ingreso
- Transferencia
- Detracción
- Recibo
- otros sustentos

Pueden existir excepciones, pero deberán tratarse como casos controlados, no como regla principal.

---

## Evento Documental

Registro de un hecho ocurrido dentro del ciclo de vida documental.

Ejemplos:

- documento cargado
- OCR procesado
- documento validado
- documento vinculado
- grupo de factura creado
- adjunto agregado
- alerta emitida
- documento anulado
- principal reemplazado

Los eventos documentales sirven para trazabilidad, auditoría y reconstrucción histórica del proceso.

---

## Alerta Documental

Aviso funcional generado para señalar una condición que requiere atención.

Puede estar relacionada con:

- documento faltante
- duplicidad
- inconsistencia
- vencimiento
- falta de validación
- observación contable
- documento sin grupo
- factura sin adjuntos mínimos

Las alertas no sustituyen la auditoría. Son señales operativas para los usuarios.

---

## Workspace Documental

Contexto de trabajo del usuario dentro del sistema documental.

Combina información como:

- usuario
- empresa
- sistema
- perfil
- permisos
- cliente o contexto operativo autorizado

El Workspace Documental determina qué puede ver y hacer un usuario dentro del modelo.

---

## Contexto Operativo

Conjunto de datos que ubican funcionalmente una acción documental.

Puede incluir:

- empresa
- cliente destino
- Contenedor Operativo
- Documento Operativo Principal
- Grupo de Factura
- perfil del usuario
- módulo desde donde actúa

El contexto operativo evita acciones ambiguas, como cargar un adjunto sin saber a qué factura pertenece.

---

## Legacy

Modelo o proceso anterior que conserva valor histórico, pero no gobierna el Modelo Documental V2.

En este proyecto, Legacy se refiere principalmente al proyecto Python:

```text
https://github.com/loxi1/Gestion_Documental_Emisores/
```

Ese proyecto clasificó y renombró documentos históricos por empresa y mes, con trazabilidad local y en base de datos.

Principio oficial:

```text
El histórico se consulta.
El Modelo Documental V2 gobierna.
```

Toda integración con Legacy deberá realizarse mediante adaptadores o servicios de consulta.

El dominio V2 nunca deberá depender funcionalmente del modelo Legacy.

---

## Histórico

Información documental proveniente de procesos anteriores, cargas masivas, archivos locales o reglas previas al Modelo Documental V2.

El histórico puede consultarse, auditarse y usarse como referencia, pero no debe condicionar las reglas nuevas.

No se debe adaptar el Modelo V2 para replicar limitaciones del histórico.

---

## Regla de uso del glosario

Cuando exista duda sobre un término, este glosario debe prevalecer sobre nombres de tablas, nombres de componentes, rutas frontend o convenciones heredadas.

Si un nuevo concepto aparece en futuros sprints, debe agregarse aquí antes de convertirse en regla transversal del sistema.
