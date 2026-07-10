import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

import type {
  ActualizarGrupoFacturaDocumentoInput,
  CrearGrupoFacturaDocumentoInput,
  GrupoFacturaDocumentoRow,
} from './documental-v2.types';

@Injectable()
export class GrupoFacturaDocumentoRepository {
  async crear(input: CrearGrupoFacturaDocumentoInput): Promise<GrupoFacturaDocumentoRow> {
    const rows = await sql`
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

  async buscarPorId(id: number): Promise<GrupoFacturaDocumentoRow | null> {
    const rows = await sql`
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

  async buscarActivoPorDocumentoId(documentoId: number): Promise<GrupoFacturaDocumentoRow | null> {
    const rows = await sql`
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

  async listarPorGrupoFactura(grupoFacturaId: number): Promise<GrupoFacturaDocumentoRow[]> {
    const rows = await sql`
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
      WHERE grupo_factura_id = ${grupoFacturaId}::bigint
      ORDER BY creado_en DESC, id DESC
    `;

    return rows as unknown as GrupoFacturaDocumentoRow[];
  }

  async actualizar(input: ActualizarGrupoFacturaDocumentoInput): Promise<GrupoFacturaDocumentoRow | null> {
    const rows = await sql`
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

  async anular(params: { id: number; usuarioId?: number | null; motivo?: string | null }): Promise<GrupoFacturaDocumentoRow | null> {
    const rows = await sql`
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
