# PR Checklist — Sprint 2.0A UX actualizado con runtime ms-documentos

## Alcance

- [ ] Solo documentación UX.
- [ ] No React todavía.
- [ ] No backend.
- [ ] No Gateway.
- [ ] No PostgreSQL.
- [ ] No OCR.
- [ ] No R2.
- [ ] No NATS.
- [ ] No eventos.
- [ ] No carga guiada.
- [ ] No reemplazo de principal.
- [ ] No creación automática de Grupo de Factura.
- [ ] No modificación V1.
- [ ] No creación de documento físico.

## Contrato

- [ ] Endpoint asociación documentado.
- [ ] Endpoint candidatos documentado.
- [ ] Payload usa `contenedorOperativoId`.
- [ ] Payload usa `documentoId`.
- [ ] Payload usa `tipoPrincipal`.
- [ ] Payload no incluye `usuarioId`.
- [ ] Solo `OC` aparece como tipo activo inicial.
- [ ] Idempotencia documentada.
- [ ] `workspaceDebeRefrescar` documentado.

## Runtime ms-documentos

- [ ] Candidatos validado.
- [ ] Creación validada.
- [ ] Idempotencia validada.
- [ ] `workspaceDebeRefrescar=true` validado.
- [ ] `workspaceDebeRefrescar=false` validado.
- [ ] `DOCUMENTO_NO_ENCONTRADO` validado.
- [ ] `TIPO_PRINCIPAL_NO_COINCIDE_CON_DOCUMENTO` validado.
- [ ] `CONTEXTO_OPERATIVO_NO_AUTORIZADO` validado.

## Pendiente antes de React

- [ ] Gateway candidatos validado.
- [ ] Gateway asociación validado.
- [ ] Gateway idempotencia validada.
- [ ] Gateway errores funcionales validado.
- [ ] Build/tests finales backend.
- [ ] Cierre técnico backend 2.0A.
