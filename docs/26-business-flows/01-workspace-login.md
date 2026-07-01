# Flujo: Workspace Login

## Qué representa

Ingreso del usuario a la plataforma y selección implícita de contexto de trabajo.

## Relación con Motor Documental

El Motor Documental no implementa login ni workspace visual, pero consume contexto derivado:

- usuario autenticado
- empresa
- rol/área
- permisos
- expediente

## Reglas

- Acciones sensibles requieren token.
- Auditoría debe poder registrar usuario cuando esté disponible.
- El backend no debe confiar en campos visuales manipulables.
