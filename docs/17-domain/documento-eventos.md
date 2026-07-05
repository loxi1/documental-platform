# Documento de diseño — Eventos documentales oficiales

## Objetivo

Definir el modelo funcional y técnico para registrar eventos documentales dentro de Documental Platform.

Este documento es solo diseño de dominio. No implementa migraciones, runtime ni cambios de infraestructura.

## Principio general

Los eventos documentales se manejarán como un historial append-only.

Un evento representa un hecho ocurrido dentro del ciclo de vida documental, por ejemplo:

- documento creado
- archivo subido
- OCR procesado
- OCR confirmado
- OCR rechazado
- documento vinculado a expediente
- versión agregada

La tabla propuesta será transaccional, no maestra.

## Tabla propuesta

Nombre propuesto:

```sql
documentos.documento_eventos