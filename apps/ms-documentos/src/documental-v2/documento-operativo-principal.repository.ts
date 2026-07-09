import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

import type {
  ActualizarDocumentoOperativoPrincipalInput,
  CrearDocumentoOperativoPrincipalInput,
  DocumentoOperativoPrincipalRow,
} from './documental-v2.types';

@Injectable()
export class DocumentoOperativoPrincipalRepository {
  async crear(input: CrearDocumentoOperativoPrincipalInput): Promise<DocumentoOperativoPrincipalRow> {
    const rows = await sql`
      INSERT INTO documentos.documentos_operativos_principales (
        contenedor_operativo_id,
        documento_id,
        tipo_principal,
        es_principal_activo,
        estado,
        metadata,
        creado_por
      )
      VALUES (
        ${input.contenedorOperativoId}::bigint,
        ${input.documentoId}::bigint,
        ${input.tipoPrincipal}::text,
        ${input.esPrincipalActivo ?? false}::boolean,
        ${input.estado ?? 'activo'}::text,
        ${JSON.stringify(input.metadata ?? {})}::jsonb,
        ${input.creadoPor ?? null}::bigint
      )
      RETURNING
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
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

    return rows[0] as unknown as DocumentoOperativoPrincipalRow;
  }

  async buscarPorId(id: number): Promise<DocumentoOperativoPrincipalRow | null> {
    const rows = await sql`
      SELECT
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.documentos_operativos_principales
      WHERE id = ${id}::bigint
      LIMIT 1
    `;

    return (rows[0] as unknown as DocumentoOperativoPrincipalRow | undefined) ?? null;
  }

  async buscarPorDocumentoId(documentoId: number): Promise<DocumentoOperativoPrincipalRow | null> {
    const rows = await sql`
      SELECT
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.documentos_operativos_principales
      WHERE documento_id = ${documentoId}::bigint
      LIMIT 1
    `;

    return (rows[0] as unknown as DocumentoOperativoPrincipalRow | undefined) ?? null;
  }

  async listarPorContenedor(contenedorOperativoId: number): Promise<DocumentoOperativoPrincipalRow[]> {
    const rows = await sql`
      SELECT
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.documentos_operativos_principales
      WHERE contenedor_operativo_id = ${contenedorOperativoId}::bigint
      ORDER BY es_principal_activo DESC, creado_en DESC, id DESC
    `;

    return rows as unknown as DocumentoOperativoPrincipalRow[];
  }

  async actualizar(input: ActualizarDocumentoOperativoPrincipalInput): Promise<DocumentoOperativoPrincipalRow | null> {
    const rows = await sql`
      UPDATE documentos.documentos_operativos_principales
      SET
        tipo_principal = COALESCE(${input.tipoPrincipal ?? null}::text, tipo_principal),
        es_principal_activo = COALESCE(${input.esPrincipalActivo ?? null}::boolean, es_principal_activo),
        estado = COALESCE(${input.estado ?? null}::text, estado),
        metadata = COALESCE(${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb, metadata),
        actualizado_por = ${input.actualizadoPor ?? null}::bigint,
        actualizado_en = now()
      WHERE id = ${input.id}::bigint
      RETURNING
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
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

    return (rows[0] as unknown as DocumentoOperativoPrincipalRow | undefined) ?? null;
  }

  async anular(params: { id: number; usuarioId?: number | null; motivo?: string | null }): Promise<DocumentoOperativoPrincipalRow | null> {
    const rows = await sql`
      UPDATE documentos.documentos_operativos_principales
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
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
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

    return (rows[0] as unknown as DocumentoOperativoPrincipalRow | undefined) ?? null;
  }
}
