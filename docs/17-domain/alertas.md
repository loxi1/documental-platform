# Documento de diseño — Alertas documentales

## Objetivo

Definir el modelo funcional para alertas documentales dentro de Documental Platform.

Este documento es solo diseño de dominio. No implementa migraciones, runtime ni cambios de infraestructura.

## Principio general

Las alertas documentales representan observaciones, pendientes o incidencias funcionales detectadas sobre documentos, archivos, OCR o expedientes.

Una alerta no reemplaza un evento documental.

Diferencia principal:

```text
evento documental = hecho ocurrido
alerta documental = condición que requiere atención