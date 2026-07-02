# MkDocs Final Pack — Engineering Handbook v1.0 RC

## Objetivo

Dejar listo el portal navegable del Engineering Handbook.

## Incluye

- `mkdocs.yml` final.
- `requirements-docs.txt`.
- GitHub Action para validar build.
- CSS básico.
- notas de publicación.
- checklist de publicación.

## Integración

Desde la raíz del repositorio:

```bash
unzip documental-platform-mkdocs-final-pack.zip
cp -r documental-platform-mkdocs-final-pack/* .
pip install -r requirements-docs.txt
mkdocs serve
```

Luego validar:

```bash
mkdocs build --strict
```
