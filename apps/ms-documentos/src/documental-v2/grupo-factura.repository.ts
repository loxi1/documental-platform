import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';
import type { SqlExecutor } from './sql-executor';

import type {
  ActualizarGrupoFacturaInput,
  CrearGrupoFacturaInput,
  GrupoFacturaRow,
} from './documental-v2.types';

@Injectable()
export class GrupoFacturaRepository {
  async crear(input: CrearGrupoFacturaInput, executor: SqlExecutor = sql): Promise<GrupoFacturaRow> {
    const rows = await executor`
      INSERT INTO documentos.grupos_factura (
        documento_operativo_principal_id,
        factura_documento_id,
        estado,
        metadata,
        creado_por
      )
      VALUES (
        ${input.documentoOperativoPrincipalId}::bigint,
        ${input.facturaDocumentoId}::bigint,
        ${input.estado ?? 'pendiente_revision'}::text,
        ${JSON.stringify(input.metadata ?? {})}::jsonb,
        ${input.creadoPor ?? null}::bigint
      )
      RETURNING
        id,
        documento_operativo_principal_id AS "documentoOperativoPrincipalId",
        factura_documento_id AS "facturaDocumentoId",
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

    return rows[0] as unknown as GrupoFacturaRow;
  }

  async buscarPorId(id: number, executor: SqlExecutor = sql): Promise<GrupoFacturaRow | null> {
    const rows = await executor`
      SELECT
        id,
        documento_operativo_principal_id AS "documentoOperativoPrincipalId",
        factura_documento_id AS "facturaDocumentoId",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.grupos_factura
      WHERE id = ${id}::bigint
      LIMIT 1
    `;

    return (rows[0] as unknown as GrupoFacturaRow | undefined) ?? null;
  }

  async buscarPorFacturaDocumentoId(facturaDocumentoId: number, executor: SqlExecutor = sql): Promise<GrupoFacturaRow | null> {
    const rows = await executor`
      SELECT
        id,
        documento_operativo_principal_id AS "documentoOperativoPrincipalId",
        factura_documento_id AS "facturaDocumentoId",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.grupos_factura
      WHERE factura_documento_id = ${facturaDocumentoId}::bigint
      LIMIT 1
    `;

    return (rows[0] as unknown as GrupoFacturaRow | undefined) ?? null;
  }

  async buscarVigentePorFacturaDocumentoId(
    facturaDocumentoId: number,
    executor: SqlExecutor = sql,
  ): Promise<GrupoFacturaRow | null> {
    const rows = await executor`
      SELECT
        id,
        documento_operativo_principal_id AS "documentoOperativoPrincipalId",
        factura_documento_id AS "facturaDocumentoId",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.grupos_factura
      WHERE factura_documento_id = ${facturaDocumentoId}::bigint
        AND estado <> 'anulado'
      ORDER BY creado_en DESC, id DESC
      LIMIT 1
    `;

    return (rows[0] as unknown as GrupoFacturaRow | undefined) ?? null;
  }

  async listarHistoricosPorFacturaDocumentoId(
    facturaDocumentoId: number,
    executor: SqlExecutor = sql,
  ): Promise<number[]> {
    const rows = await executor`
      SELECT id
      FROM documentos.grupos_factura
      WHERE factura_documento_id = ${facturaDocumentoId}::bigint
        AND estado = 'anulado'
      ORDER BY creado_en ASC, id ASC
    `;

    return rows.map((row: any) => Number(row.id));
  }

  async listarPorDocumentoOperativoPrincipal(documentoOperativoPrincipalId: number, executor: SqlExecutor = sql): Promise<GrupoFacturaRow[]> {
    const rows = await executor`
      SELECT
        id,
        documento_operativo_principal_id AS "documentoOperativoPrincipalId",
        factura_documento_id AS "facturaDocumentoId",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.grupos_factura
      WHERE documento_operativo_principal_id = ${documentoOperativoPrincipalId}::bigint
      ORDER BY creado_en DESC, id DESC
    `;

    return rows as unknown as GrupoFacturaRow[];
  }

  async actualizar(input: ActualizarGrupoFacturaInput, executor: SqlExecutor = sql): Promise<GrupoFacturaRow | null> {
    const rows = await executor`
      UPDATE documentos.grupos_factura
      SET
        estado = COALESCE(${input.estado ?? null}::text, estado),
        metadata = COALESCE(${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb, metadata),
        actualizado_por = ${input.actualizadoPor ?? null}::bigint,
        actualizado_en = now()
      WHERE id = ${input.id}::bigint
      RETURNING
        id,
        documento_operativo_principal_id AS "documentoOperativoPrincipalId",
        factura_documento_id AS "facturaDocumentoId",
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

    return (rows[0] as unknown as GrupoFacturaRow | undefined) ?? null;
  }

  async anular(params: { id: number; usuarioId?: number | null; motivo?: string | null }, executor: SqlExecutor = sql): Promise<GrupoFacturaRow | null> {
    const rows = await executor`
      UPDATE documentos.grupos_factura
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
        documento_operativo_principal_id AS "documentoOperativoPrincipalId",
        factura_documento_id AS "facturaDocumentoId",
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

    return (rows[0] as unknown as GrupoFacturaRow | undefined) ?? null;
  }
}
