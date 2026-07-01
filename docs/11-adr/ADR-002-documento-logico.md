# ADR-002
# Workspace como Contexto de Trabajo

Estado:
Aprobado

Fecha:
2026-06

Responsable:
Arquitectura de Plataforma

---

# Contexto

Durante los primeros sprints el sistema utilizaba el concepto de
"Empresa Activa" para determinar sobre qué empresa trabajaba el usuario.

Ejemplo:

Empresa activa:
BBTI

Sin embargo, conforme evolucionó la plataforma aparecieron nuevos
requerimientos:

- múltiples perfiles por usuario
- varios sistemas
- cambio de contexto sin volver a autenticarse
- auditoría completa
- permisos por acción
- futuras aplicaciones (Caja Chica, Rendiciones, RRHH)

Se concluyó que "Empresa Activa" no representaba correctamente el
contexto de trabajo del usuario.

---

# Problema

Un usuario no solamente trabaja sobre una empresa.

Trabaja dentro de un contexto compuesto por:

- empresa
- sistema
- perfil
- permisos
- sesión

Ejemplo:

José
↓

BBTI
↓

DOCUMENTAL
↓

CONTABILIDAD

Este conjunto representa un puesto de trabajo funcional.

---

# Decisión

La plataforma utilizará el concepto de Workspace.

Workspace representa el contexto completo de trabajo del usuario.

Un Workspace está compuesto por:

- Usuario
- Empresa
- Cliente Destino
- Sistema
- Perfil
- Permisos
- Vigencia

---

# Modelo

Workspace

↓

Usuario

↓

Empresa

↓

Sistema

↓

Perfil

↓

Permisos

---

# Implementación

Tabla principal:

auth.usuario_workspaces

Contendrá:

- usuario_id
- empresa_codigo
- cliente_destino_id
- sistema_id
- perfil_id
- permisos
- permission_version
- estado
- es_favorito
- ultimo_uso_en
- vigencia_desde
- vigencia_hasta

---

# Flujo de autenticación

1.

POST /auth/login

↓

Identity Token temporal

↓

2.

GET /auth/workspaces

↓

Lista Workspaces disponibles

↓

3.

POST /auth/workspaces/select

↓

Access Token definitivo

---

# JWT

El JWT representa un Workspace activo.

Debe contener:

- workspaceId
- empresa
- clienteDestinoId
- sistema
- perfil
- permissionVersion
- sessionContextId
- permisos

Ejemplo:

{
  "workspaceId": 8,
  "empresa": "BBTI",
  "perfil": "CONTABILIDAD"
}

---

# Cambio de Workspace

Cambiar Workspace NO requiere volver a ingresar usuario y contraseña.

Solamente se genera un nuevo Access Token para el nuevo contexto.

---

# Seguridad

Toda autorización debe realizarse utilizando exclusivamente el
Workspace contenido en el JWT.

Nunca se confiará en:

empresa enviada por query

empresa enviada por body

empresa enviada por frontend

El backend utilizará únicamente:

req.user.workspace

---

# Auditoría

Toda acción registrada deberá almacenar:

workspaceId

sessionContextId

usuarioId

empresaCodigo

perfil

sistema

requestId

Esto permitirá reconstruir exactamente desde qué contexto fue realizada
cada operación.

---

# Beneficios

- Multiempresa
- Multiperfil
- Multisistema
- Mejor auditoría
- Menor complejidad
- Cambio rápido de contexto
- Escalabilidad

---

# Consecuencias

Toda funcionalidad nueva deberá asumir que existe un Workspace activo.

No deberán implementarse nuevamente conceptos como:

Empresa Activa

Perfil Activo

Sistema Activo

Todos ellos forman parte del Workspace.

---

# Estado

Aprobado.