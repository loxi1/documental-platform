-- ============================================================
-- truncate_documental_historico.sql
-- Documental Platform - Sprint 1.1
-- Objetivo:
--   Dejar producción con estructura completa,
--   maestros mínimos y CERO histórico documental.
-- ============================================================

BEGIN;

SELECT current_database() AS database_actual, current_user AS usuario_actual;

-- Limpieza de histórico documental.
-- NO trunca:
--   core.*
--   auth.*
--   documentos.expedientes
--   documentos.documentos_origenes

TRUNCATE TABLE
  documentos.documentos,
  documentos.documentos_archivos,
  documentos.ocr_resultados,
  documentos.expediente_documentos,
  documentos.documento_alertas,
  documentos.documento_relaciones,
  documentos.grupo_documentos,
  documentos.grupos_documentales,
  documentos.asientos_documentos,
  documentos.asientos_documentales,
  documentos.cierres_contables,
  documentos.documentos_factura,
  documentos.documentos_guia_remision,
  documentos.documentos_nota_ingreso,
  documentos.documentos_oc,
  documentos.documentos_os,
  documentos.documentos_otro,
  documentos.documentos_pago_detraccion,
  documentos.documentos_pago_transferencia,
  documentos.documentos_recibo_honorario
RESTART IDENTITY CASCADE;

INSERT INTO core.schema_migrations (version, descripcion, checksum)
VALUES
  ('0005', 'Producción inicial limpia: tablas documentales históricas vacías', NULL)
ON CONFLICT (version) DO NOTHING;

COMMIT;

SELECT 'documentos.documentos' AS tabla, count(*) AS filas FROM documentos.documentos
UNION ALL SELECT 'documentos.documentos_archivos', count(*) FROM documentos.documentos_archivos
UNION ALL SELECT 'documentos.ocr_resultados', count(*) FROM documentos.ocr_resultados
UNION ALL SELECT 'documentos.expediente_documentos', count(*) FROM documentos.expediente_documentos
UNION ALL SELECT 'documentos.documento_alertas', count(*) FROM documentos.documento_alertas
UNION ALL SELECT 'documentos.documento_relaciones', count(*) FROM documentos.documento_relaciones
UNION ALL SELECT 'documentos.grupo_documentos', count(*) FROM documentos.grupo_documentos
UNION ALL SELECT 'documentos.grupos_documentales', count(*) FROM documentos.grupos_documentales
UNION ALL SELECT 'documentos.asientos_documentos', count(*) FROM documentos.asientos_documentos
UNION ALL SELECT 'documentos.asientos_documentales', count(*) FROM documentos.asientos_documentales
UNION ALL SELECT 'documentos.cierres_contables', count(*) FROM documentos.cierres_contables
UNION ALL SELECT 'documentos.documentos_factura', count(*) FROM documentos.documentos_factura
UNION ALL SELECT 'documentos.documentos_guia_remision', count(*) FROM documentos.documentos_guia_remision
UNION ALL SELECT 'documentos.documentos_nota_ingreso', count(*) FROM documentos.documentos_nota_ingreso
UNION ALL SELECT 'documentos.documentos_oc', count(*) FROM documentos.documentos_oc
UNION ALL SELECT 'documentos.documentos_os', count(*) FROM documentos.documentos_os
UNION ALL SELECT 'documentos.documentos_otro', count(*) FROM documentos.documentos_otro
UNION ALL SELECT 'documentos.documentos_pago_detraccion', count(*) FROM documentos.documentos_pago_detraccion
UNION ALL SELECT 'documentos.documentos_pago_transferencia', count(*) FROM documentos.documentos_pago_transferencia
UNION ALL SELECT 'documentos.documentos_recibo_honorario', count(*) FROM documentos.documentos_recibo_honorario
ORDER BY tabla;
