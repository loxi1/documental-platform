# Workspace Flow

```mermaid
flowchart LR
    Login[Login]
    Identity[Identity Token]
    Workspaces[Listar Workspaces]
    Select[Seleccionar Workspace]
    Access[Access Token contextual]
    App[Aplicación]

    Login --> Identity
    Identity --> Workspaces
    Workspaces --> Select
    Select --> Access
    Access --> App
```

## Referencias

- `../02-arquitectura/03-workspace.md`
- `../08-seguridad/01-workspace.md`
- `../11-adr/ADR-001-workspace.md`
