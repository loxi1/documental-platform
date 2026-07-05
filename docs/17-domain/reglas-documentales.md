# Documento de diseño — Reglas documentales

## Objetivo

Definir las reglas funcionales base del dominio documental de Documental Platform.

Este documento es solo diseño de dominio. No implementa migraciones, runtime ni cambios de infraestructura.

## Principio general

Las reglas documentales definen cómo se crean, identifican, agrupan, validan y vinculan documentos dentro de la plataforma.

Estas reglas buscan asegurar trazabilidad, consistencia y control documental.

## Clave documental oficial

La clave documental funcional recomendada es:

```text
CLIENTE|TIPO|RUC|SERIE|NUMERO