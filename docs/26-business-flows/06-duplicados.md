# Duplicados

```mermaid
flowchart LR
Documento-->ClaveDocumental
ClaveDocumental-->Existe?
Existe?--Sí-->409
Existe?--No-->Registrar
```
