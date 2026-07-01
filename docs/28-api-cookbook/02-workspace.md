# Cookbook Workspace

## Qué representa

El Workspace es el contexto de uso de la plataforma. El Motor Documental no administra Workspace visual, pero sus APIs reciben contexto de empresa, cliente y expediente.

## Datos usados por el Motor Documental

- `empresa_codigo`
- `clienteAbreviatura`
- `clienteDestinoId`
- `rucComprador`
- `expedienteId`

## Regla

El backend debe validar que un documento se confirme contra un expediente compatible con el RUC comprador detectado o confirmado.
