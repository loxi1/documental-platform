# MkDocs Publishing

## Local

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

## Build estricto

```bash
mkdocs build --strict
```

## GitHub Pages

```bash
mkdocs gh-deploy --force
```

## Cloudflare Pages

Configurar:

```text
Build command: mkdocs build
Build output: site
Python version: 3.11
```

## Criterio de publicación

Publicar solo cuando:

- `mkdocs build --strict` no falle.
- La navegación principal funcione.
- Los diagramas Mermaid rendericen.
- No haya documentos vacíos en navegación.
