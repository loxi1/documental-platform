import { ConflictException, NotFoundException } from '@nestjs/common';
import { sql } from '@documental/database';
import type { SqlExecutor } from '../documental-v2/sql-executor';
import { buildClaveDocumental, identidadFacturaPendiente } from './identidad-documental';

export type AlmacenScope = { workspaceId: number; empresa: string; clienteDestinoId: number };
export type AlmacenContexto = { expedienteId: number; grupoFacturaId: number; documentoBaseId: number; facturaDocumentoId: number };
export function identidadAlmacen(empresa: string, tipo: string, fuente: Record<string, any>): string | null {
  if (!['GUIA_REMISION', 'NOTA_INGRESO'].includes(tipo)) return null;
  const metadata = { ...fuente };
  if (tipo === 'GUIA_REMISION') {
    const ruc = String(metadata.rucEmisor ?? metadata.ruc ?? metadata.rucProveedor ?? '').trim();
    if (!/^\d{11}$/.test(ruc)) return null;
    metadata.ruc = ruc;
  }
  return buildClaveDocumental(empresa, tipo, metadata);
}

export class AlmacenRecuperacionRepository {
  async listar(contexto: AlmacenContexto, scope: AlmacenScope, tx: SqlExecutor = sql, interno = false) {
    const rows = await tx`
      WITH contexto AS (
        SELECT gf.id
        FROM documentos.grupos_factura gf
        JOIN documentos.documentos_operativos_principales dop ON dop.id = gf.documento_operativo_principal_id
        JOIN documentos.contenedores_operativos co ON co.id = dop.contenedor_operativo_id
        JOIN documentos.expedientes e ON e.id = co.expediente_v1_id
        JOIN documentos.documentos principal ON principal.id = dop.documento_id
        JOIN documentos.documentos factura ON factura.id = gf.factura_documento_id
        WHERE gf.id = ${contexto.grupoFacturaId} AND gf.estado <> 'anulado'
          AND gf.factura_documento_id = ${contexto.facturaDocumentoId}
          AND factura.estado = 'confirmado' AND factura.tipo_documental = 'FACTURA'
          AND factura.cliente_abreviatura = ${scope.empresa}
          AND dop.documento_id = ${contexto.documentoBaseId} AND dop.estado = 'activo' AND dop.es_principal_activo = true
          AND principal.estado = 'confirmado' AND principal.tipo_documental IN ('OC','OS')
          AND co.estado = 'activo' AND co.tipo_contexto = 'expediente_v1' AND e.id = ${contexto.expedienteId}
          AND co.empresa_codigo = ${scope.empresa} AND co.cliente_destino_id = ${scope.clienteDestinoId}
          AND e.empresa_codigo = ${scope.empresa} AND e.cliente_destino_id = ${scope.clienteDestinoId}
      ), candidatos AS (
        SELECT d.id AS "documentoId", a.id AS "archivoId", d.tipo_documental AS "tipoDocumental",
          d.estado AS "estadoDocumento", a.nombre_archivo AS filename, a.creado_en AS "fechaCarga",
          a.metadata AS "archivoMetadata", d.metadata AS "documentoMetadata",
          (d.tipo_documental = 'FACTURA' AND d.estado = 'confirmado'
            AND d.id = ${contexto.facturaDocumentoId} AND a.estado = 'subido'
            AND a.es_version_actual = false AND a.origen_archivo = 'upload_version_candidata'
            AND a.metadata->>'documentoIdDestino' = d.id::text) AS "versionAdjunta",
          a.workspace_id, a.empresa_codigo, a.cliente_destino_id, a.expediente_id,
          (SELECT COUNT(*)::int FROM documentos.documentos_archivos v
            WHERE v.documento_id = d.id AND v.es_version_actual = true) AS actuales,
          (SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.id), '[]'::jsonb)
            FROM documentos.ocr_resultados o WHERE o.documento_id = d.id AND o.archivo_id = a.id) AS ocr
        FROM documentos.documentos_archivos a JOIN documentos.documentos d ON d.id = a.documento_id
        WHERE EXISTS (SELECT 1 FROM contexto)
          AND (a.metadata->>'grupoFacturaId' = ${String(contexto.grupoFacturaId)}
            OR (d.id = ${contexto.facturaDocumentoId} AND d.tipo_documental = 'FACTURA'
              AND a.origen_archivo = 'upload_version_candidata' AND a.metadata->>'documentoIdDestino' = d.id::text))
          AND d.cliente_abreviatura = ${scope.empresa}
          AND d.tipo_documental IN ('GUIA_REMISION','NOTA_INGRESO','FACTURA')
          AND ((d.estado IN ('pendiente_ocr','pendiente_validacion')
            AND a.es_version_actual = true AND a.tipo_version = 'original')
            OR (d.id = ${contexto.facturaDocumentoId} AND d.tipo_documental = 'FACTURA' AND d.estado = 'confirmado'
              AND a.estado = 'subido' AND a.es_version_actual = false AND a.origen_archivo = 'upload_version_candidata'
              AND a.metadata->>'documentoIdDestino' = d.id::text))
          AND a.estado NOT IN ('anulado','duplicado_absorbido')
          AND NOT EXISTS (SELECT 1 FROM documentos.grupo_factura_documentos m
            WHERE m.documento_id = d.id AND m.estado <> 'anulado')
          AND NOT EXISTS (SELECT 1 FROM documentos.grupos_factura gf
            WHERE gf.factura_documento_id = d.id AND gf.estado <> 'anulado'
              AND (d.id <> ${contexto.facturaDocumentoId} OR gf.id <> ${contexto.grupoFacturaId}))
          AND NOT EXISTS (SELECT 1 FROM documentos.expediente_documentos ed
            WHERE ed.documento_id = d.id AND ed.expediente_id <> ${contexto.expedienteId})
      ), destinos AS (
        SELECT d.id, d.clave_documental, d.tipo_documental, COUNT(*) OVER (PARTITION BY d.id) AS vinculos
        FROM documentos.grupo_factura_documentos m JOIN documentos.documentos d ON d.id = m.documento_id
        WHERE EXISTS (SELECT 1 FROM contexto) AND m.grupo_factura_id = ${contexto.grupoFacturaId}
          AND m.estado <> 'anulado' AND m.tipo_relacion = 'adjunto_guia'
          AND d.estado = 'confirmado' AND d.tipo_documental = 'GUIA_REMISION'
          AND d.cliente_abreviatura = ${scope.empresa}
          AND EXISTS (SELECT 1 FROM documentos.expediente_documentos ed
            WHERE ed.documento_id = d.id AND ed.expediente_id = ${contexto.expedienteId})
          AND NOT EXISTS (SELECT 1 FROM documentos.expediente_documentos ed
            WHERE ed.documento_id = d.id AND ed.expediente_id <> ${contexto.expedienteId})
          AND NOT EXISTS (SELECT 1 FROM documentos.grupo_factura_documentos otro
            WHERE otro.documento_id = d.id AND otro.estado <> 'anulado' AND otro.grupo_factura_id <> ${contexto.grupoFacturaId})
        UNION ALL
        SELECT d.id, d.clave_documental, d.tipo_documental, 1::bigint AS vinculos
        FROM documentos.documentos d
        WHERE EXISTS (SELECT 1 FROM contexto) AND d.id = ${contexto.facturaDocumentoId}
          AND d.estado = 'confirmado' AND d.tipo_documental = 'FACTURA'
          AND d.cliente_abreviatura = ${scope.empresa}
          AND NOT EXISTS (SELECT 1 FROM documentos.grupos_factura gf
            WHERE gf.factura_documento_id = d.id AND gf.estado <> 'anulado' AND gf.id <> ${contexto.grupoFacturaId})
          AND NOT EXISTS (SELECT 1 FROM documentos.grupo_factura_documentos m
            WHERE m.documento_id = d.id AND m.estado <> 'anulado')
          AND EXISTS (SELECT 1 FROM documentos.expediente_documentos ed
            WHERE ed.documento_id = d.id AND ed.expediente_id = ${contexto.expedienteId})
          AND NOT EXISTS (SELECT 1 FROM documentos.expediente_documentos ed
            WHERE ed.documento_id = d.id AND ed.expediente_id <> ${contexto.expedienteId})
      )
      SELECT (SELECT COUNT(*) FROM contexto) AS autorizados,
        COALESCE((SELECT jsonb_agg(candidatos) FROM candidatos), '[]'::jsonb) AS candidatos,
        COALESCE((SELECT jsonb_agg(destinos) FROM destinos), '[]'::jsonb) AS destinos
    `;
    if (Number(rows[0]?.autorizados) !== 1) throw new NotFoundException('Grupo de factura no disponible en el contexto autorizado');
    const data: any[] = []; const conflictos: any[] = [];
    for (const row of rows[0].candidatos) {
      const relacion = row.tipoDocumental === 'FACTURA' ? 'adjunto_factura' : row.tipoDocumental === 'GUIA_REMISION' ? 'adjunto_guia' : 'adjunto_nota_ingreso';
      const esperado: Record<string, any> = { grupoFacturaId: contexto.grupoFacturaId, documentoBaseId: contexto.documentoBaseId,
        expedienteId: contexto.expedienteId, workspaceId: scope.workspaceId, empresaCodigo: scope.empresa, clienteDestinoId: scope.clienteDestinoId };
      const contradice = (source: any) => Object.entries(esperado).some(([k,v]) => source?.[k] != null && source[k] !== '' && String(source[k]) !== String(v));
      const columnas = { workspaceId: row.workspace_id, empresaCodigo: row.empresa_codigo, clienteDestinoId: row.cliente_destino_id, expedienteId: row.expediente_id };
      const relacionArchivo = row.archivoMetadata?.tipoRelacionSugerida ?? row.archivoMetadata?.tipoRelacion ?? (row.versionAdjunta ? 'adjunto_factura' : null);
      const ocr = row.ocr;
      let conflicto = contradice(columnas) || contradice(row.archivoMetadata) || contradice(row.documentoMetadata) || relacionArchivo !== relacion
        ? 'CONTEXTO_INCONSISTENTE' : row.actuales !== 1 ? 'VERSION_AMBIGUA' : ocr.length > 1 ? 'OCR_MULTIPLE'
        : ocr.length === 1 && !['pendiente_validacion','editado'].includes(ocr[0].estado) ? 'OCR_NO_RECUPERABLE' : null;
      if (conflicto) { conflictos.push({ documentoId: row.documentoId, archivoId: row.archivoId, codigo: conflicto }); continue; }
      const fuente = ocr[0]?.metadata?.metadata ?? {};
      const tipoOcr = String(fuente.tipoDocumental ?? ocr[0]?.tipo_propuesto ?? row.tipoDocumental).toUpperCase();
      const compatible = (tipoOcr === 'GUIA' ? 'GUIA_REMISION' : tipoOcr) === row.tipoDocumental;
      const identidad = ocr.length === 1 && compatible ? (row.tipoDocumental === 'FACTURA'
        ? identidadFacturaPendiente(scope.empresa, ocr[0]) : identidadAlmacen(scope.empresa, row.tipoDocumental, fuente)) : null;
      const matches = identidad && ['GUIA_REMISION','FACTURA'].includes(row.tipoDocumental)
        ? rows[0].destinos.filter((d: any) => (row.versionAdjunta || Number(d.id) !== Number(row.documentoId))
          && d.tipo_documental === row.tipoDocumental && d.clave_documental === identidad) : [];
      const destino = matches.length === 1 && Number(matches[0].vinculos) === 1 ? Number(matches[0].id) : null;
      data.push({ documentoId: Number(row.documentoId), archivoId: Number(row.archivoId), tipoDocumental: row.tipoDocumental,
        filename: row.filename, fechaCarga: row.fechaCarga, estadoDocumento: row.estadoDocumento,
        ocrResultadoId: ocr[0]?.id == null ? null : Number(ocr[0].id), estadoOcr: ocr[0]?.estado ?? null,
        clasificacion: identidad ? 'IDENTIFICADO' : 'PENDIENTE_OCR', documentoIdDestino: destino,
        accionSugerida: destino ? 'AGREGAR_VERSION' : ocr.length ? 'VALIDAR_OCR' : 'VALIDAR_MANUAL',
        ...(interno ? { identidadDocumental: identidad } : {}) });
    }
    return { data, conflictos, contexto };
  }

  async bloquear(tx: SqlExecutor, contexto: AlmacenContexto, documentoId: number, archivoId: number, documentoDestinoId?: number) {
    // Same existing file mutex, ordered before document/OCR locks.
    await tx`SELECT id FROM documentos.documentos_archivos
      WHERE id = ${archivoId} OR documento_id = ${documentoDestinoId ?? documentoId} OR metadata->>'grupoFacturaId' = ${String(contexto.grupoFacturaId)}
      ORDER BY id FOR UPDATE`;
    const docs = await tx`SELECT * FROM documentos.documentos WHERE id IN (${documentoId}, ${documentoDestinoId ?? documentoId}) ORDER BY id FOR UPDATE`;
    const archivos = await tx`SELECT * FROM documentos.documentos_archivos WHERE id = ${archivoId}`;
    const documento = docs.find((d: any) => Number(d.id) === documentoId);
    if (!documento || Number(archivos[0]?.documento_id) !== documentoId) throw new ConflictException('El documento/archivo cambió');
    const ocr = await tx`SELECT * FROM documentos.ocr_resultados
      WHERE documento_id = ${documentoId} AND archivo_id = ${archivoId} ORDER BY id FOR UPDATE`;
    return { documento, archivo: archivos[0], ocr };
  }
}
