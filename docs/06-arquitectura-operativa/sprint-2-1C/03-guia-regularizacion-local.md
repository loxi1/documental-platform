# Guía de regularización local — Sprint 2.1C

## Referencias

```text
Rama documental: docs/sprint-2-1C-contrato-carga-documental-segura
Base: 4217af70
Rama funcional: feat/conf-ocr-aud-01
Respaldo: backup/regularizacion-2-1C-0f5117fc
```

## Reglas

- No aplicar el patch histórico completo.
- No trasladar documentación OCR a Sprint 2.1C.
- No declarar cierre.
- No crear commit hasta validar el diff.
- No ejecutar `git clean`.
- No eliminar el respaldo.
- No hacer push.
- No integrar ramas.
- No modificar código.

## Validación previa al commit

```bash
git status --short
git diff --check
git diff --stat
git diff
git log --oneline --decorate --graph --all -12
git branch -vv
git worktree list
```

El diff debe contener solo Markdown de Carga Documental Segura, mantener el Sprint abierto y excluir OCR, asociación V2, push e integración.
