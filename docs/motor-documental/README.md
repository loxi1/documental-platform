# Motor Documental

## Qué representa

El Motor Documental es el núcleo reutilizable de Documental Platform para registrar, procesar, validar, versionar y consultar documentos de negocio.

Sirve a Compras, Almacén, Finanzas, Revisión Contable y futuros módulos como Caja Chica, Rendiciones, Comunicaciones y RRHH.

## Responsabilidades

- Registrar documentos lógicos.
- Registrar archivos físicos en Cloudflare R2.
- Procesar OCR mediante worker Python/NATS.
- Guardar OCR original, editado y confirmado.
- Recalcular clave documental.
- Confirmar documentos contra expediente.
- Manejar duplicados por clave documental.
- Agregar versiones sin sobrescribir archivos.
- Enriquecer datos por RUC desde `core.proveedores`.
- Exponer APIs reutilizables.
- Entregar signed URLs para preview.

## Fuera de alcance

- Frontend/UX.
- Workspace visual.
- Login/JWT.
- Infraestructura.
- Docker/Traefik.
- Migraciones baseline.

## Principios

1. Documento lógico y archivo físico son entidades distintas.
2. Nunca se sobrescribe un archivo físico.
3. El backend recalcula la clave documental.
4. El OCR nunca es autoridad final; el usuario valida.
5. La factura es el ancla contable para Revisión Contable.
6. R2 es privado; la visualización usa signed URLs.
7. Los duplicados deben resolverse como versionado, no como error 500.
8. Quitar un documento de un expediente no debe borrar el archivo físico.
