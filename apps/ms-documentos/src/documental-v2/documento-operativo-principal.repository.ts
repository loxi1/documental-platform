import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';
import type { SqlExecutor } from './sql-executor';

import type {
  ActualizarDocumentoOperativoPrincipalInput,
  CrearDocumentoOperativoPrincipalInput,
  DocumentoOperativoPrincipalRow,
} from './documental-v2.types';

@Injectable()
export class DocumentoOperativoPrincipalRepository {
  async crear(input: CrearDocumentoOperativoPrincipalInput, executor: SqlExecutor = sql): Promise<DocumentoOperativoPrincipalRow> {
    const rows = await executor`
      INSERT INTO documentos.documentos_operativos_principales (
        contenedor_operativo_id,
        documento_id,
        tipo_principal,
        es_principal_activo,
        proveedor_id,
        ruc_proveedor,
        razon_social_proveedor,
        estado,
        metadata,
        creado_por
      )
      VALUES (
        ${input.contenedorOperativoId}::bigint,
        ${input.documentoId}::bigint,
        ${input.tipoPrincipal}::text,
        ${input.esPrincipalActivo ?? false}::boolean,
        ${input.proveedorId ?? null}::bigint,
        ${input.rucProveedor ?? null}::text,
        ${input.razonSocialProveedor ?? null}::text,
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
        proveedor_id AS "proveedorId",
        ruc_proveedor AS "rucProveedor",
        razon_social_proveedor AS "razonSocialProveedor",
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

  async buscarPorId(id: number, executor: SqlExecutor = sql): Promise<DocumentoOperativoPrincipalRow | null> {
    const rows = await executor`
      SELECT
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
        proveedor_id AS "proveedorId",
        ruc_proveedor AS "rucProveedor",
        razon_social_proveedor AS "razonSocialProveedor",
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

  async buscarPorDocumentoId(documentoId: number, executor: SqlExecutor = sql): Promise<DocumentoOperativoPrincipalRow | null> {
    const rows = await executor`
      SELECT
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
        proveedor_id AS "proveedorId",
        ruc_proveedor AS "rucProveedor",
        razon_social_proveedor AS "razonSocialProveedor",
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

  async buscarActivoPorDocumentoId(
    documentoId: number,
    executor: SqlExecutor = sql,
  ): Promise<DocumentoOperativoPrincipalRow | null> {
    const rows = await executor`
      SELECT
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
        proveedor_id AS "proveedorId",
        ruc_proveedor AS "rucProveedor",
        razon_social_proveedor AS "razonSocialProveedor",
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
        AND estado = 'activo'
      ORDER BY creado_en DESC, id DESC
      LIMIT 1
    `;

    return (rows[0] as unknown as DocumentoOperativoPrincipalRow | undefined) ?? null;
  }

  async listarHistoricosPorDocumentoId(documentoId: number, executor: SqlExecutor = sql): Promise<number[]> {
    const rows = await executor`
      SELECT id
      FROM documentos.documentos_operativos_principales
      WHERE documento_id = ${documentoId}::bigint
        AND estado = 'anulado'
      ORDER BY creado_en ASC, id ASC
    `;

    return rows.map((row: any) => Number(row.id));
  }

  async listarPorContenedor(contenedorOperativoId: number, executor: SqlExecutor = sql): Promise<DocumentoOperativoPrincipalRow[]> {
    const rows = await executor`
      SELECT
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
        proveedor_id AS "proveedorId",
        ruc_proveedor AS "rucProveedor",
        razon_social_proveedor AS "razonSocialProveedor",
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

  async actualizar(input: ActualizarDocumentoOperativoPrincipalInput, executor: SqlExecutor = sql): Promise<DocumentoOperativoPrincipalRow | null> {
    const rows = await executor`
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
        proveedor_id AS "proveedorId",
        ruc_proveedor AS "rucProveedor",
        razon_social_proveedor AS "razonSocialProveedor",
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

  async listarActivosPorContenedorOperativoId(
    contenedorOperativoId: number,
    executor: SqlExecutor = sql,
  ): Promise<DocumentoOperativoPrincipalRow[]> {
    const rows = await executor`
      SELECT
        id,
        contenedor_operativo_id AS "contenedorOperativoId",
        documento_id AS "documentoId",
        tipo_principal AS "tipoPrincipal",
        es_principal_activo AS "esPrincipalActivo",
        proveedor_id AS "proveedorId",
        ruc_proveedor AS "rucProveedor",
        razon_social_proveedor AS "razonSocialProveedor",
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
        AND estado = 'activo'
      ORDER BY es_principal_activo DESC, creado_en DESC, id DESC
    `;

    return rows as unknown as DocumentoOperativoPrincipalRow[];
  }

  async anular(params: { id: number; usuarioId?: number | null; motivo?: string | null }, executor: SqlExecutor = sql): Promise<DocumentoOperativoPrincipalRow | null> {
    const rows = await executor`
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
        proveedor_id AS "proveedorId",
        ruc_proveedor AS "rucProveedor",
        razon_social_proveedor AS "razonSocialProveedor",
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

  async buscarProveedorIdPorRuc(
    ruc: string,
    executor: SqlExecutor = sql,
  ): Promise<number | null> {
    const rows = await executor`
      SELECT id
      FROM core.proveedores
      WHERE ruc = ${ruc}::text
      LIMIT 1
    `;

    return rows[0]?.id === undefined || rows[0]?.id === null
      ? null
      : Number(rows[0].id);
  }

  async asegurarProveedorPorRuc(
    input: { ruc: string; razonSocial?: string | null },
    executor: SqlExecutor = sql,
  ): Promise<number | null> {
    const rows = await executor`
      INSERT INTO core.proveedores (
        ruc,
        razon_social,
        tipo_persona,
        creado_en,
        actualizado_en
      )
      VALUES (
        ${input.ruc}::text,
        ${input.razonSocial ?? null}::text,
        ${input.ruc.startsWith('10') ? 'NATURAL' : 'JURIDICA'}::text,
        now(),
        now()
      )
      ON CONFLICT (ruc) DO UPDATE
      SET
        razon_social = COALESCE(
          NULLIF(EXCLUDED.razon_social, ''),
          core.proveedores.razon_social
        ),
        actualizado_en = now()
      RETURNING id
    `;

    return rows[0]?.id === undefined || rows[0]?.id === null
      ? null
      : Number(rows[0].id);
  }
}
