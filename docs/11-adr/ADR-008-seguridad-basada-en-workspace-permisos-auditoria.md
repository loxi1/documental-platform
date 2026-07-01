# ADR-008
# Seguridad Basada en Workspace

Estado:
Aprobado

Fecha:
2026-06

Responsable:
Arquitectura de Plataforma

---

# Contexto

La Plataforma Empresarial administrará múltiples sistemas:

- Gestión Documental
- Caja Chica
- Rendiciones
- RRHH
- Portal de Proveedores
- futuros módulos

Todos compartirán un único sistema de autenticación.

Inicialmente se evaluó trabajar únicamente con:

Empresa Activa

Sin embargo, esa aproximación resultó insuficiente.

Un usuario puede desempeñar distintos roles dentro de una misma empresa.

Ejemplo:

José

↓

BBTI

↓

Finanzas

no representa el mismo contexto que:

José

↓

BBTI

↓

Contabilidad

Aunque pertenezcan a la misma empresa.

---

# Problema

La autorización no depende únicamente del usuario.

También depende de:

empresa

perfil

sistema

permisos

vigencia

sesión

Por lo tanto, la empresa no puede ser el eje del modelo.

---

# Decisión

La unidad oficial de autorización será el Workspace.

Workspace representa:

Usuario

+

Empresa

+

Sistema

+

Perfil

Cada Workspace representa un contexto de trabajo independiente.

---

# Modelo

Tabla principal:

auth.usuario_workspaces

Campos mínimos:

id

usuario_id

empresa_codigo

cliente_destino_id

sistema_id

perfil_id

estado

es_favorito

ultimo_uso_en

vigencia_desde

vigencia_hasta

permission_version

permisos jsonb

creado_en

actualizado_en

---

# Login

El login únicamente valida identidad.

No genera todavía un contexto de trabajo.

Flujo:

POST /auth/login

↓

identityToken temporal

↓

GET /auth/workspaces

↓

POST /auth/workspaces/select

↓

Access Token definitivo

---

# Identity Token

Duración corta.

Recomendado:

5 minutos.

Objetivo:

permitir seleccionar Workspace.

No permite operar sobre módulos.

---

# Access Token

Representa un Workspace activo.

Contiene:

sub

workspaceId

empresa

clienteDestinoId

sistema

perfilId

perfil

permissionVersion

sessionContextId

permisos

---

# Permisos

Para el MVP permanecerán embebidos en el Workspace.

Formato:

{
  "menus": [
    "compras",
    "almacen",
    "finanzas",
    "revision_contable"
  ],
  "actions": [
    "documentos.subir",
    "ocr.procesar",
    "alertas.crear"
  ]
}

En futuras versiones podrán normalizarse.

---

# Selección de Workspace

Endpoint:

POST /auth/workspaces/select

Entrada:

identityToken

workspaceId

Salida:

Access Token

No requiere volver a ingresar usuario y contraseña.

---

# Cambio de Workspace

El usuario podrá cambiar de Workspace durante la sesión.

Ejemplo:

BBTI · Finanzas

↓

BBTI · Contabilidad

↓

Caja Chica · Administrador

↓

Rendiciones · Supervisor

Sin necesidad de autenticarse nuevamente.

---

# Empresa

La empresa oficial siempre proviene del Workspace.

Nunca del frontend.

Nunca del query string.

Nunca del body.

---

# Backend

Todo endpoint deberá obtener:

empresa

clienteDestinoId

perfil

Workspace

directamente desde el JWT.

---

# Seguridad

Nunca confiar en:

empresa enviada por frontend

workspace enviado por frontend

perfil enviado por frontend

clienteDestinoId enviado por frontend

Toda esa información proviene exclusivamente del token.

---

# Preview de documentos

Antes de generar una Signed URL el backend deberá validar:

Workspace

↓

Empresa

↓

Permisos

↓

Documento

↓

Archivo

Solo entonces generar la URL temporal.

---

# OCR

Procesar OCR requiere:

Workspace válido

+

Permiso:

ocr.procesar

---

# Auditoría

Toda operación deberá registrar:

workspaceId

sessionContextId

usuarioId

empresa

perfil

requestId

acción

resultado

fecha

---

# Mi Perfil

Cada usuario podrá consultar:

Datos personales

Workspace actual

Workspaces disponibles

Workspace favorito

Último acceso

Cambio de contraseña

Sesiones activas (futuro)

---

# Sistemas

Los Workspaces referencian:

core.sistemas

Ejemplos:

DOCUMENTAL

CAJA_CHICA

RENDICIONES

RRHH

PORTAL_PROVEEDORES

---

# Vigencias

Cada Workspace podrá tener:

vigencia_desde

vigencia_hasta

permitiendo:

usuarios temporales

consultores

auditores

proveedores

---

# Beneficios

Seguridad consistente.

Multiempresa.

Multisistema.

Escalable.

Preparado para crecimiento.

Sin duplicar autenticación.

---

# Restricciones

No existe Empresa Activa independiente.

No existen permisos globales.

Toda autorización depende del Workspace.

---

# Evolución futura

Cuando el número de permisos crezca:

auth.permisos

auth.perfil_permisos

auth.usuario_workspace_permisos_override

podrán sustituir gradualmente el JSON del Workspace.

Sin romper el contrato del JWT.

---

# Estado

Aprobado.