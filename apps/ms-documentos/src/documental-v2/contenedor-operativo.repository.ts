import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

import type {
  ActualizarContenedorOperativoInput,
  BuscarContenedoresOperativosFiltro,
  ContenedorOperativoRow,
  CrearContenedorOperativoInput,
} from './documental-v2.types';

@Injectable()
export class ContenedorOperativoRepository {
  async crear(input: CrearContenedorOperativoInput): Promise<ContenedorOperativoRow> {
    const rows = await sql`
      INSERT INTO documentos.contenedores_operativos (
        empresa_codigo,
        cliente_destino_id,
        tipo_contexto,
        codigo,
        nombre,
        descripcion,
        centro_costo_codigo,
        orden_produccion_codigo,
        proyecto_codigo,
        estado,
        metadata,
        creado_por
      )
      VALUES (
        ${input.empresaCodigo}::text,
        ${input.clienteDestinoId ?? null}::bigint,
        ${input.tipoContexto}::text,
        ${input.codigo}::text,
        ${input.nombre ?? null}::text,
        ${input.descripcion ?? null}::text,
        ${input.centroCostoCodigo ?? null}::text,
        ${input.ordenProduccionCodigo ?? null}::text,
        ${input.proyectoCodigo ?? null}::text,
        ${input.estado ?? 'activo'}::text,
        ${JSON.stringify(input.metadata ?? {})}::jsonb,
        ${input.creadoPor ?? null}::bigint
      )
      RETURNING
        id,
        empresa_codigo AS "empresaCodigo",
        cliente_destino_id AS "clienteDestinoId",
        tipo_contexto AS "tipoContexto",
        codigo,
        nombre,
        descripcion,
        centro_costo_codigo AS "centroCostoCodigo",
        orden_produccion_codigo AS "ordenProduccionCodigo",
        proyecto_codigo AS "proyectoCodigo",
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

    return rows[0] as unknown as ContenedorOperativoRow;
  }

  async buscarPorId(id: number): Promise<ContenedorOperativoRow | null> {
    const rows = await sql`
      SELECT
        id,
        empresa_codigo AS "empresaCodigo",
        cliente_destino_id AS "clienteDestinoId",
        tipo_contexto AS "tipoContexto",
        codigo,
        nombre,
        descripcion,
        centro_costo_codigo AS "centroCostoCodigo",
        orden_produccion_codigo AS "ordenProduccionCodigo",
        proyecto_codigo AS "proyectoCodigo",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.contenedores_operativos
      WHERE id = ${id}::bigint
      LIMIT 1
    `;

    return (rows[0] as unknown as ContenedorOperativoRow | undefined) ?? null;
  }

  async buscarPorClave(params: {
    empresaCodigo: string;
    tipoContexto: string;
    codigo: string;
  }): Promise<ContenedorOperativoRow | null> {
    const rows = await sql`
      SELECT
        id,
        empresa_codigo AS "empresaCodigo",
        cliente_destino_id AS "clienteDestinoId",
        tipo_contexto AS "tipoContexto",
        codigo,
        nombre,
        descripcion,
        centro_costo_codigo AS "centroCostoCodigo",
        orden_produccion_codigo AS "ordenProduccionCodigo",
        proyecto_codigo AS "proyectoCodigo",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.contenedores_operativos
      WHERE empresa_codigo = ${params.empresaCodigo}::text
        AND tipo_contexto = ${params.tipoContexto}::text
        AND codigo = ${params.codigo}::text
      LIMIT 1
    `;

    return (rows[0] as unknown as ContenedorOperativoRow | undefined) ?? null;
  }

  async listar(filtro: BuscarContenedoresOperativosFiltro = {}): Promise<{
    items: ContenedorOperativoRow[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(Math.max(Number(filtro.limit ?? 50), 1), 200);
    const offset = Math.max(Number(filtro.offset ?? 0), 0);
    const q = filtro.q?.trim() || null;
    const like = q ? `%${q}%` : null;

    const rows = await sql`
      SELECT
        id,
        empresa_codigo AS "empresaCodigo",
        cliente_destino_id AS "clienteDestinoId",
        tipo_contexto AS "tipoContexto",
        codigo,
        nombre,
        descripcion,
        centro_costo_codigo AS "centroCostoCodigo",
        orden_produccion_codigo AS "ordenProduccionCodigo",
        proyecto_codigo AS "proyectoCodigo",
        estado,
        metadata,
        creado_por AS "creadoPor",
        creado_en AS "creadoEn",
        actualizado_por AS "actualizadoPor",
        actualizado_en AS "actualizadoEn",
        anulado_por AS "anuladoPor",
        anulado_en AS "anuladoEn",
        motivo_anulacion AS "motivoAnulacion"
      FROM documentos.contenedores_operativos
      WHERE (${filtro.empresaCodigo ?? null}::text IS NULL OR empresa_codigo = ${filtro.empresaCodigo ?? null}::text)
        AND (${filtro.clienteDestinoId ?? null}::bigint IS NULL OR cliente_destino_id = ${filtro.clienteDestinoId ?? null}::bigint)
        AND (${filtro.tipoContexto ?? null}::text IS NULL OR tipo_contexto = ${filtro.tipoContexto ?? null}::text)
        AND (${filtro.estado ?? null}::text IS NULL OR estado = ${filtro.estado ?? null}::text)
        AND (
          ${like}::text IS NULL
          OR codigo ILIKE ${like}
          OR nombre ILIKE ${like}
          OR descripcion ILIKE ${like}
          OR centro_costo_codigo ILIKE ${like}
          OR orden_produccion_codigo ILIKE ${like}
          OR proyecto_codigo ILIKE ${like}
        )
      ORDER BY creado_en DESC, id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM documentos.contenedores_operativos
      WHERE (${filtro.empresaCodigo ?? null}::text IS NULL OR empresa_codigo = ${filtro.empresaCodigo ?? null}::text)
        AND (${filtro.clienteDestinoId ?? null}::bigint IS NULL OR cliente_destino_id = ${filtro.clienteDestinoId ?? null}::bigint)
        AND (${filtro.tipoContexto ?? null}::text IS NULL OR tipo_contexto = ${filtro.tipoContexto ?? null}::text)
        AND (${filtro.estado ?? null}::text IS NULL OR estado = ${filtro.estado ?? null}::text)
        AND (
          ${like}::text IS NULL
          OR codigo ILIKE ${like}
          OR nombre ILIKE ${like}
          OR descripcion ILIKE ${like}
          OR centro_costo_codigo ILIKE ${like}
          OR orden_produccion_codigo ILIKE ${like}
          OR proyecto_codigo ILIKE ${like}
        )
    `;

    return {
      items: rows as unknown as ContenedorOperativoRow[],
      total: Number(countRows[0]?.total ?? 0),
      limit,
      offset,
    };
  }

  async actualizar(input: ActualizarContenedorOperativoInput): Promise<ContenedorOperativoRow | null> {
    const rows = await sql`
      UPDATE documentos.contenedores_operativos
      SET
        nombre = COALESCE(${input.nombre ?? null}::text, nombre),
        descripcion = COALESCE(${input.descripcion ?? null}::text, descripcion),
        centro_costo_codigo = COALESCE(${input.centroCostoCodigo ?? null}::text, centro_costo_codigo),
        orden_produccion_codigo = COALESCE(${input.ordenProduccionCodigo ?? null}::text, orden_produccion_codigo),
        proyecto_codigo = COALESCE(${input.proyectoCodigo ?? null}::text, proyecto_codigo),
        estado = COALESCE(${input.estado ?? null}::text, estado),
        metadata = COALESCE(${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb, metadata),
        actualizado_por = ${input.actualizadoPor ?? null}::bigint,
        actualizado_en = now()
      WHERE id = ${input.id}::bigint
      RETURNING
        id,
        empresa_codigo AS "empresaCodigo",
        cliente_destino_id AS "clienteDestinoId",
        tipo_contexto AS "tipoContexto",
        codigo,
        nombre,
        descripcion,
        centro_costo_codigo AS "centroCostoCodigo",
        orden_produccion_codigo AS "ordenProduccionCodigo",
        proyecto_codigo AS "proyectoCodigo",
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

    return (rows[0] as unknown as ContenedorOperativoRow | undefined) ?? null;
  }

  async anular(params: { id: number; usuarioId?: number | null; motivo?: string | null }): Promise<ContenedorOperativoRow | null> {
    const rows = await sql`
      UPDATE documentos.contenedores_operativos
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
        empresa_codigo AS "empresaCodigo",
        cliente_destino_id AS "clienteDestinoId",
        tipo_contexto AS "tipoContexto",
        codigo,
        nombre,
        descripcion,
        centro_costo_codigo AS "centroCostoCodigo",
        orden_produccion_codigo AS "ordenProduccionCodigo",
        proyecto_codigo AS "proyectoCodigo",
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

    return (rows[0] as unknown as ContenedorOperativoRow | undefined) ?? null;
  }
}
