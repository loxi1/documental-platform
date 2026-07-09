# Glosario del Modelo Documental V2

## Contenedor Operativo

Concepto de dominio que representa la operación documental superior.

Puede materializarse como Expediente, Centro de costo, OP, Proyecto, Consorcio, Obra, Requerimiento de Fondo u otra entidad equivalente según el módulo y empresa.

No necesariamente es el nombre visible para el usuario.

## Contexto Operativo

Conjunto de datos que determinan cómo se identifica y gobierna una operación documental.

Puede depender de:

- empresa.
- workspace.
- módulo.
- centro de costo.
- OP.
- consorcio.
- obra.
- tipo de operación.

## Documento Operativo Principal

Documento que abre o gobierna una operación documental dentro del flujo operativo.

Actualmente puede materializarse como OC, OS o Requerimiento de Compra.

Esta lista no es cerrada y podrá ampliarse por decisión de negocio.

## Grupo de Factura

Agrupación documental que nace alrededor de una Factura.

Incluye la factura y los documentos asociados a su revisión, sustento, recepción y pago.

## Documento Relacionado

Documento vinculado a una operación, Documento Operativo Principal, Grupo de Factura u otro documento, según la regla del dominio.

## Documento Principal Activo

Documento marcado explícitamente como principal activo dentro de una relación documental.

No debe inferirse únicamente por el tipo de relación.

## Adjunto

Documento que complementa o sustenta un Grupo de Factura u otro grupo documental.

Ejemplos:

- Guía.
- Nota de ingreso.
- Transferencia.
- Detracción.
- Recibo.

## Evento Documental

Registro de un hecho ocurrido sobre un documento o grupo documental.

Ejemplos:

- cargado.
- validado.
- rechazado.
- vinculado.
- anulado.
- observado.

## Alerta Documental

Observación o advertencia funcional relacionada con un documento, grupo documental o contenedor.

Puede ser generada por usuario o por reglas futuras.

## Workspace Documental

Contexto de acceso del usuario que determina empresa, sistema, perfil, permisos y, cuando corresponda, empresa/consorcio/obra activa.

## Requerimiento de Fondo

Documento de apertura para Caja Chica o Rendición de Requerimientos.

Permite iniciar una operación de fondos o rendición, incluso cuando la transferencia bancaria todavía no existe.

## Motor Documental Común

Conjunto de componentes compartidos para almacenamiento, OCR, eventos, alertas, relaciones, trazabilidad y revisión contable.

Debe ser común para Compras, Caja Chica y Rendición de Requerimientos.

## Legacy

Proyecto histórico Python usado para clasificación, OCR/renombrado masivo y trazabilidad de documentos locales por empresa y mes.

No gobierna el Modelo Documental V2.

## Histórico

Información documental previa conservada para consulta, trazabilidad o referencia.

El histórico se consulta; el Modelo Documental V2 gobierna.
