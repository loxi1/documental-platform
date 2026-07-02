# Handbook v1.0 RC Checklist

## Producto/UI

- [x] Producto consistente.
- [x] UI Foundation suficiente.
- [x] Componentes reutilizables definidos.
- [x] Regla: primero componente común.
- [x] Ruta oficial Mi Perfil: `/mi-perfil`.
- [ ] Design Tokens con valores finales.

## Motor Documental

- [x] Documento lógico separado de archivo físico.
- [x] Motor Documental Architecture.
- [x] Factura ancla contable.
- [x] OCR original no se pierde.
- [x] Clave documental backend.

## Infraestructura

- [x] EC2 t3a.large.
- [x] RDS PostgreSQL db.m6g.large.
- [x] Cloudflare R2 privado.
- [x] Docker Compose.
- [x] Traefik.
- [x] Runbooks base.

## Deploy

- [x] Checklist deploy creado.
- [ ] docker-compose.production.yml.
- [ ] .env.production.example.
- [ ] Traefik config.
- [ ] Scripts deploy/rollback.
