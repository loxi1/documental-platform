# Autenticación

## Login
POST /api/v1/auth/login

## Flujo
Login -> Identity Token -> Workspaces -> Access Token

Permisos: Público.

# Cookbook Auth

## Qué representa

Autenticación de usuario para endpoints protegidos.

## Regla

Los endpoints de consulta pueden ser públicos internos según configuración, pero edición manual y acciones sensibles requieren token.

## Error común

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token requerido"
  }
}
```

## Uso conceptual

```bash
TOKEN="<access-token>"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/documentos/3779
```
