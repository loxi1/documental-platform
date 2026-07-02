# API Map

```mermaid
flowchart TD
    Auth[Auth / Login]
    Workspace[Select Workspace]
    Carga[Carga Guiada]
    OCR[Procesar OCR]
    Confirmar[Confirmar con Expediente]
    Preview[Preview URL]
    Versionar[Agregar Versión]
    Revision[Revision Contable]

    Auth --> Workspace
    Workspace --> Carga
    Carga --> OCR
    OCR --> Confirmar
    Confirmar --> Preview
    Confirmar --> Versionar
    Confirmar --> Revision
```

## Endpoints relacionados

- `16-api/auth.md`
- `16-api/carga-guiada.md`
- `16-api/procesar-ocr.md`
- `16-api/confirmar-con-expediente.md`
- `16-api/preview-url.md`
- `16-api/versionado.md`
- `16-api/revision-contable.md`
