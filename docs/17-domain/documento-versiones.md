# Documento de diseño — Versionado documental

## Objetivo

Definir el modelo funcional para manejar versiones de documentos y archivos dentro de Documental Platform.

Este documento es solo diseño de dominio. No implementa migraciones, runtime ni cambios de infraestructura.

## Principio general

El versionado documental permite conservar el historial de cambios de un documento o archivo sin perder trazabilidad.

Una nueva versión no debe sobrescribir silenciosamente la anterior.

Toda versión agregada debe poder relacionarse con:

- documento principal
- archivo anterior
- archivo nuevo
- usuario o proceso que originó el cambio
- motivo funcional o técnico
- evento documental asociado

## Alcance funcional

El versionado aplica principalmente cuando:

- se reemplaza un archivo PDF
- se sube una corrección
- se corrige un documento mal cargado
- se recibe una nueva copia del mismo documento
- se conserva una versión previa por auditoría
- se actualiza un archivo luego de OCR o validación

## Tabla propuesta futura

Nombre sugerido:

```sql
documentos.documento_versiones