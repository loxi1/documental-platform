ALTER TABLE documentos.documentos_operativos_principales
  ADD COLUMN IF NOT EXISTS proveedor_id bigint,
  ADD COLUMN IF NOT EXISTS ruc_proveedor varchar(20),
  ADD COLUMN IF NOT EXISTS razon_social_proveedor varchar(250);
