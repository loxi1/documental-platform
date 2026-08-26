import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';
import type { SqlExecutor } from './sql-executor';

import type {
  ActualizarGrupoFacturaDocumentoInput,
  CrearGrupoFacturaDocumentoInput,
  GrupoFacturaDocumentoRow,
} from './documental-v2.types';

@Injectable()
export class GrupoFacturaDocumentoRepository {
  async crear(input: CrearGrupoFacturaDocumentoInput, executor: SqlExecutor = sql): Promise<GrupoFacturaDocumentoRow> {
    const rows = await executor`
      INSERT INTO documentos.grupo_factura_documentos (
        grupo_factura_id,
        documento_id,
        tipo_relacion,
        estado,
        metadata,
        creado_por
      )
      VALUES (
        ${input.grupoFacturaId}::bigint,
        ${input.documentoId}::bigint,
        ${input.tipoRelacion}::text,
        ${input.estado ?? 'activo'}::text,
        ${JSON.stringify(input.metadata ?? {})}::jsonb,
        ${input.creadoPor ?? null}::bigint
      )
      RETURNING
        id,
        grupo_factura_id AS "grupoFacturaId",
        documento_id AS "documentoId",
        tipo_relacion AS "tipoRelacion",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
    `;

    return rows[0] as unknown as GrupoFacturaDocumentoRow;
  }

  async buscarPorId(id: number, executor: SqlExecutor = sql): Promise<GrupoFacturaDocumentoRow | null> {
    const rows = await executor`
      SELECT
        id,
        grupo_factura_id AS "grupoFacturaId",
        documento_id AS "documentoId",
        tipo_relacion AS "tipoRelacion",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.grupo_factura_documentos
      WHERE id = ${id}::bigint
      LIMIT 1
    `;

    return (rows[0] as unknown as GrupoFacturaDocumentoRow | undefined) ?? null;
  }

  async buscarActivoPorDocumentoId(documentoId: number, executor: SqlExecutor = sql): Promise<GrupoFacturaDocumentoRow | null> {
    const rows = await executor`
      SELECT
        id,
        grupo_factura_id AS "grupoFacturaId",
        documento_id AS "documentoId",
        tipo_relacion AS "tipoRelacion",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.grupo_factura_documentos
      WHERE documento_id = ${documentoId}::bigint
        AND estado = 'activo'
      LIMIT 1
    `;

    return (rows[0] as unknown as GrupoFacturaDocumentoRow | undefined) ?? null;
  }



  async listarHistoricosPorDocumentoId(documentoId: number, executor: SqlExecutor = sql): Promise<number[]> {
    const rows = await executor`
      SELECT id
      FROM documentos.grupo_factura_documentos
      WHERE documento_id = ${documentoId}::bigint
        AND estado = 'anulado'
      ORDER BY creado_en ASC, id ASC
    `;

    return rows.map((row: any) => Number(row.id));
  }

  async buscarActivoPorGrupoDocumentoRelacion(params: {
    grupoFacturaId: number;
    documentoId: number;
    tipoRelacion: string;
  },
    executor: SqlExecutor = sql,
  ): Promise<GrupoFacturaDocumentoRow | null> {
    const rows = await executor`
      SELECT
        id,
        grupo_factura_id AS "grupoFacturaId",
        documento_id AS "documentoId",
        tipo_relacion AS "tipoRelacion",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.grupo_factura_documentos
      WHERE grupo_factura_id = ${params.grupoFacturaId}::bigint
        AND documento_id = ${params.documentoId}::bigint
        AND tipo_relacion = ${params.tipoRelacion}::text
        AND estado = 'activo'
      LIMIT 1
    `;

    return (rows[0] as unknown as GrupoFacturaDocumentoRow | undefined) ?? null;
  }

  async sumarMontoTransferenciasActivas(
    grupoFacturaId: number,
    executor: SqlExecutor = sql,
  ): Promise<number> {
    const rows = await executor<Array<{ montoAcumulado: string | number | null }>>`
      SELECT
        COALESCE(
          SUM(
            COALESCE(
              d.monto_total,
              CASE
                WHEN NULLIF(TRIM(d.metadata ->> 'montoTotal'), '') ~ '^[0-9]+([.,][0-9]+)?$'
                  THEN REPLACE(TRIM(d.metadata ->> 'montoTotal'), ',', '.')::numeric
                WHEN NULLIF(TRIM(d.metadata #>> '{ocr,metadata,montoTotal}'), '') ~ '^[0-9]+([.,][0-9]+)?$'
                  THEN REPLACE(TRIM(d.metadata #>> '{ocr,metadata,montoTotal}'), ',', '.')::numeric
                ELSE NULL
              END,
              0
            )
          ),
          0
        )::numeric(14,2) AS "montoAcumulado"
      FROM documentos.grupo_factura_documentos gfd
      JOIN documentos.documentos d
        ON d.id = gfd.documento_id
      WHERE gfd.grupo_factura_id = ${grupoFacturaId}::bigint
        AND gfd.estado = 'activo'
        AND gfd.tipo_relacion = 'adjunto_transferencia'
        AND d.estado NOT IN ('observado', 'anulado')
    `;

    const value = Number(rows[0]?.montoAcumulado ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  async listarPorGrupoFactura(grupoFacturaId: number, executor: SqlExecutor = sql): Promise<GrupoFacturaDocumentoRow[]> {
    const rows = await executor`
      SELECT
        gfd.id,
        gfd.grupo_factura_id AS "grupoFacturaId",
        gfd.documento_id AS "documentoId",
        gfd.tipo_relacion AS "tipoRelacion",
        gfd.estado,
        CASE
          WHEN d.id IS NULL THEN gfd.metadata
          ELSE jsonb_set(
            jsonb_set(
              COALESCE(gfd.metadata, '{}'::jsonb),
              '{documentoV1}',
              COALESCE(gfd.metadata -> 'documentoV1', '{}'::jsonb) || jsonb_build_object(
                'banco',
                COALESCE(
                  NULLIF(TRIM(d.metadata ->> 'banco'), ''),
                  NULLIF(TRIM(d.metadata #>> '{ocr,metadata,banco}'), '')
                ),
                'metadata',
                d.metadata
              ),
              true
            ),
            '{compatibilidad,documentoV1}',
            COALESCE(gfd.metadata #> '{compatibilidad,documentoV1}', '{}'::jsonb) || jsonb_build_object(
              'banco',
              COALESCE(
                NULLIF(TRIM(d.metadata ->> 'banco'), ''),
                NULLIF(TRIM(d.metadata #>> '{ocr,metadata,banco}'), '')
              ),
              'metadata',
              d.metadata
            ),
            true
          )
        END AS metadata,
        gfd.creado_por AS "creadoPor",
        gfd.creado_en AS "creadoEn",
        gfd.actualizado_por AS "actualizadoPor",
        gfd.actualizado_en AS "actualizadoEn",
        gfd.anulado_por AS "anuladoPor",
        gfd.anulado_en AS "anuladoEn",
        gfd.motivo_anulacion AS "motivoAnulacion"
      FROM documentos.grupo_factura_documentos gfd
      LEFT JOIN documentos.documentos d
        ON d.id = gfd.documento_id
      WHERE gfd.grupo_factura_id = ${grupoFacturaId}::bigint
      ORDER BY gfd.creado_en DESC, gfd.id DESC
    `;

    return rows as unknown as GrupoFacturaDocumentoRow[];
  }

  async actualizar(input: ActualizarGrupoFacturaDocumentoInput, executor: SqlExecutor = sql): Promise<GrupoFacturaDocumentoRow | null> {
    const rows = await executor`
      UPDATE documentos.grupo_factura_documentos
      SET
        tipo_relacion = COALESCE(${input.tipoRelacion ?? null}::text, tipo_relacion),
        estado = COALESCE(${input.estado ?? null}::text, estado),
        metadata = COALESCE(${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb, metadata),
        actualizado_por = ${input.actualizadoPor ?? null}::bigint,
        actualizado_en = now()
      WHERE id = ${input.id}::bigint
      RETURNING
        id,
        grupo_factura_id AS "grupoFacturaId",
        documento_id AS "documentoId",
        tipo_relacion AS "tipoRelacion",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
    `;

    return (rows[0] as unknown as GrupoFacturaDocumentoRow | undefined) ?? null;
  }

  async anular(params: { id: number; usuarioId?: number | null; motivo?: string | null }, executor: SqlExecutor = sql): Promise<GrupoFacturaDocumentoRow | null> {
    const rows = await executor`
      UPDATE documentos.grupo_factura_documentos
      SET
        estado = 'anulado',
        anulado_por = ${params.usuarioId ?? null}::bigint,
        anulado_en = now(),
        motivo_anulacion = ${params.motivo ?? null}::text,
        actualizado_por = ${params.usuarioId ?? null}::bigint,
        actualizado_en = now()
      WHERE id = ${params.id}::bigint
      RETURNING
        id,
        grupo_factura_id AS "grupoFacturaId",
        documento_id AS "documentoId",
        tipo_relacion AS "tipoRelacion",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
    `;

    return (rows[0] as unknown as GrupoFacturaDocumentoRow | undefined) ?? null;
  }
}
