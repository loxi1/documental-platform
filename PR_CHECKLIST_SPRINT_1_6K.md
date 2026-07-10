# PR Checklist — Sprint 1.6K

## Alcance

- [ ] No se implementan funcionalidades nuevas.
- [ ] No se toca backend desde Maestro Sucesor II.
- [ ] No se toca Gateway.
- [ ] No se toca PostgreSQL desde frontend.
- [ ] No se toca OCR.
- [ ] No se toca R2.
- [ ] No se toca NATS.
- [ ] No se crean eventos.
- [ ] No se crean alertas.
- [ ] No se modifica expediente 41.
- [ ] No se hace merge a main todavía.

## Sandbox

- [ ] Los casos sandbox usan `empresa_codigo = BBTI`.
- [ ] Los casos sandbox usan códigos `900001–900006`.
- [ ] Los casos sandbox incluyen `metadata.sandbox = true`.
- [ ] Los casos sandbox incluyen `metadata.sprint = "1.6K"`.
- [ ] Los casos sandbox incluyen `metadata.origen = "SEED_CONTROLADO_WORKSPACE_V2"`.
- [ ] No queda `BBTI_DEV|` en `clave_documental`.

## Validación frontend

- [ ] 900001 validado visualmente.
- [ ] 900002 validado visualmente.
- [ ] 900003 validado visualmente.
- [ ] 900004 validado visualmente.
- [ ] 900005 validado visualmente.
- [ ] 900006 validado visualmente.
- [ ] 999999 validado como error controlado.

## Reglas UX

- [ ] No se lee metadata OCR para mostrar datos.
- [ ] No se infieren proveedor, fecha, monto, serie ni número.
- [ ] Se usan labels/títulos normalizados cuando existen.
- [ ] No se usan IDs técnicos como título si existe label.
- [ ] Los campos null se muestran como `—` o `No informado`.
- [ ] Las advertencias no bloquean la vista.
- [ ] Se mantiene jerarquía V2.
