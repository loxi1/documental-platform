CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS documentos;
CREATE SCHEMA IF NOT EXISTS auditoria;

-- Maestros
ALTER TABLE IF EXISTS public.clientes_destino SET SCHEMA core;
ALTER TABLE IF EXISTS public.proveedores SET SCHEMA core;

-- Documentos base
ALTER TABLE IF EXISTS public.documentos SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_archivos SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_origenes SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_relaciones SET SCHEMA documentos;

-- Detalles
ALTER TABLE IF EXISTS public.documentos_factura SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_guia_remision SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_oc SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_os SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_nota_ingreso SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_pago_transferencia SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_pago_detraccion SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_recibo_honorario SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.documentos_otro SET SCHEMA documentos;

-- Grupos y asientos
ALTER TABLE IF EXISTS public.grupos_documentales SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.grupo_documentos SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.asientos_documentales SET SCHEMA documentos;
ALTER TABLE IF EXISTS public.asientos_documentos SET SCHEMA documentos;

-- Quitar dependencia legacy si existe
ALTER TABLE documentos.grupos_documentales
DROP CONSTRAINT IF EXISTS grupos_documentales_lote_id_fkey;

ALTER TABLE documentos.grupos_documentales
ADD COLUMN IF NOT EXISTS origen_migracion VARCHAR(50) DEFAULT 'legacy_mvp';