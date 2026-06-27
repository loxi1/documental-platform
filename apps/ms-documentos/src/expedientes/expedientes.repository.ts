import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

@Injectable()
export class ExpedientesRepository {
  async findAll(filters: {
    empresa?: string;
    estado?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const data = await sql`
      SELECT
        e.id,
        e.cliente_destino_id,
        cd.nombre_oficial AS cliente_nombre,
        cd.abreviatura AS cliente_abreviatura,
        cd.ruc AS cliente_ruc,
        e.empresa_codigo,
        e.codigo_expediente,
        e.descripcion,
        e.estado,
        e.metadata,
        e.creado_en,
        e.actualizado_en
      FROM documentos.expedientes e
      LEFT JOIN core.clientes_destino cd
        ON cd.id = e.cliente_destino_id
      WHERE (${filters.empresa ?? null}::text IS NULL OR e.empresa_codigo = ${filters.empresa ?? null})
        AND (${filters.estado ?? null}::text IS NULL OR e.estado = ${filters.estado ?? null})
      ORDER BY e.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM documentos.expedientes e
      WHERE (${filters.empresa ?? null}::text IS NULL OR e.empresa_codigo = ${filters.empresa ?? null})
        AND (${filters.estado ?? null}::text IS NULL OR e.estado = ${filters.estado ?? null})
    `;

    return {
      total: countRows[0]?.total ?? 0,
      limit,
      offset,
      data,
    };
  }

  async findById(id: number) {
    const rows = await sql`
      SELECT
        e.id,
        e.cliente_destino_id,
        cd.nombre_oficial AS cliente_nombre,
        cd.abreviatura AS cliente_abreviatura,
        cd.ruc AS cliente_ruc,
        e.empresa_codigo,
        e.codigo_expediente,
        e.descripcion,
        e.estado,
        e.metadata,
        e.creado_en,
        e.actualizado_en,
        COALESCE(
          json_agg(
            json_build_object(
              'documentoId', d.id,
              'tipoDocumental', d.tipo_documental,
              'rucEmisor', d.ruc_emisor,
              'razonSocialEmisor', d.razon_social_emisor,
              'serie', d.serie,
              'numero', d.numero,
              'fechaEmision', d.fecha_emision,
              'moneda', d.moneda,
              'montoTotal', d.monto_total,
              'claveDocumental', d.clave_documental,
              'estado', d.estado,
              'tipoRelacion', ed.tipo_relacion,
              'esPrincipal', ed.es_principal,
              'orden', ed.orden,
              'archivoId', da.id,
              'nombreArchivo', da.nombre_archivo,
              'archivoEstado', da.estado,
              'storageProvider', da.storage_provider
            )
            ORDER BY ed.es_principal DESC, ed.orden ASC, d.id ASC
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS documentos
      FROM documentos.expedientes e
      LEFT JOIN core.clientes_destino cd
        ON cd.id = e.cliente_destino_id
      LEFT JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      LEFT JOIN documentos.documentos d
        ON d.id = ed.documento_id
      LEFT JOIN LATERAL (
        SELECT da.*
        FROM documentos.documentos_archivos da
        WHERE da.documento_id = d.id
        ORDER BY da.es_version_actual DESC NULLS LAST, da.version DESC NULLS LAST, da.id DESC
        LIMIT 1
      ) da ON true
      WHERE e.id = ${id}
      GROUP BY e.id, cd.id
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async create(data: {
    clienteDestinoId: number;
    empresaCodigo: string;
    codigoExpediente: string;
    descripcion?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    const existingRows = await sql`
      SELECT *
      FROM documentos.expedientes
      WHERE empresa_codigo = ${data.empresaCodigo}
        AND codigo_expediente = ${data.codigoExpediente}
      LIMIT 1
    `;

    if (existingRows[0]) {
      return {
        ...existingRows[0],
        yaExistia: true,
        motivo: 'MISMO_CODIGO_EXPEDIENTE',
      };
    }

    const rows = await sql`
      INSERT INTO documentos.expedientes (
        cliente_destino_id,
        empresa_codigo,
        codigo_expediente,
        descripcion,
        metadata
      )
      VALUES (
        ${data.clienteDestinoId},
        ${data.empresaCodigo},
        ${data.codigoExpediente},
        ${data.descripcion ?? null},
        ${JSON.stringify(data.metadata ?? {})}::jsonb
      )
      RETURNING *
    `;

    return {
      ...rows[0],
      yaExistia: false,
    };
  }

  async addDocumento(data: {
    expedienteId: number;
    documentoId: number;
    tipoRelacion?: string | null;
    esPrincipal?: boolean;
    orden?: number;
  }) {
    const vinculoExistente = await sql`
      SELECT expediente_id
      FROM documentos.expediente_documentos
      WHERE documento_id = ${data.documentoId}
        AND expediente_id <> ${data.expedienteId}
      LIMIT 1
    `;

    if (vinculoExistente[0]) {
      return {
        yaVinculado: true,
        expedienteId: vinculoExistente[0].expediente_id,
      };
    }

    const rows = await sql`
      INSERT INTO documentos.expediente_documentos (
        expediente_id,
        documento_id,
        tipo_relacion,
        es_principal,
        orden
      )
      VALUES (
        ${data.expedienteId},
        ${data.documentoId},
        ${data.tipoRelacion ?? null},
        ${data.esPrincipal ?? false},
        ${data.orden ?? 0}
      )
      ON CONFLICT (expediente_id, documento_id)
      DO UPDATE SET
        tipo_relacion = EXCLUDED.tipo_relacion,
        es_principal = EXCLUDED.es_principal,
        orden = EXCLUDED.orden
      RETURNING *
    `;

    return rows[0];
  }

  async getResumen(id: number) {
    const rows = await sql`
      SELECT
        e.id,
        e.cliente_destino_id,
        cd.nombre_oficial AS cliente_nombre,
        cd.abreviatura AS cliente_abreviatura,
        cd.ruc AS cliente_ruc,
        e.empresa_codigo,
        e.codigo_expediente,
        e.descripcion,
        e.estado,
        e.metadata,
        COUNT(ed.documento_id)::int AS total_documentos,
        COUNT(*) FILTER (WHERE d.tipo_documental = 'FACTURA')::int AS total_facturas,
        COUNT(*) FILTER (WHERE d.tipo_documental = 'GUIA_REMISION')::int AS total_guias,
        COUNT(*) FILTER (WHERE d.tipo_documental = 'NOTA_INGRESO')::int AS total_notas_ingreso,
        COUNT(*) FILTER (WHERE d.tipo_documental IN ('PAGO_TRANSFERENCIA', 'PAGO_DETRACCION'))::int AS total_pagos,
        COALESCE(
          json_agg(
            json_build_object(
              'documentoId', d.id,
              'tipoDocumental', d.tipo_documental,
              'serie', d.serie,
              'numero', d.numero,
              'fechaEmision', d.fecha_emision,
              'moneda', d.moneda,
              'montoTotal', d.monto_total,
              'claveDocumental', d.clave_documental,
              'estado', d.estado,
              'tipoRelacion', ed.tipo_relacion,
              'esPrincipal', ed.es_principal,
              'archivoId', da.id,
              'nombreArchivo', da.nombre_archivo,
              'archivoEstado', da.estado,
              'storageProvider', da.storage_provider
            )
            ORDER BY ed.es_principal DESC, ed.orden ASC, d.id ASC
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS documentos
      FROM documentos.expedientes e
      LEFT JOIN core.clientes_destino cd
        ON cd.id = e.cliente_destino_id
      LEFT JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      LEFT JOIN documentos.documentos d
        ON d.id = ed.documento_id
      LEFT JOIN LATERAL (
        SELECT da.*
        FROM documentos.documentos_archivos da
        WHERE da.documento_id = d.id
        ORDER BY da.es_version_actual DESC NULLS LAST, da.version DESC NULLS LAST, da.id DESC
        LIMIT 1
      ) da ON true
      WHERE e.id = ${id}
      GROUP BY e.id, cd.id
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async getTimeline(expedienteId: number) {
    return sql`
      SELECT
        d.id,
        d.tipo_documental,
        d.serie,
        d.numero,
        d.fecha_emision,
        d.estado,
        ed.tipo_relacion,
        ed.es_principal,
        ed.orden
      FROM documentos.expediente_documentos ed
      JOIN documentos.documentos d
        ON d.id = ed.documento_id
      WHERE ed.expediente_id = ${expedienteId}
      ORDER BY d.fecha_emision NULLS LAST, ed.orden ASC, d.id ASC
    `;
  }


  async buscarExpedientes(filters: { q: string; limit?: number }) {
    const q = filters.q.trim();
    const like = `%${q}%`;
    const normalizedDoc = q.replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
    const likeNormalizedDoc = `%${normalizedDoc}%`;
    const limit = filters.limit ?? 10;

    const rows = await sql`
      SELECT
        e.id,
        e.codigo_expediente AS "codigoExpediente",
        e.descripcion,
        e.empresa_codigo AS "empresaCodigo",
        e.cliente_destino_id AS "clienteDestinoId",
        cd.nombre_oficial AS "clienteNombre",
        cd.abreviatura AS "clienteAbreviatura",
        cd.ruc AS "clienteRuc",
        e.estado,
        COUNT(DISTINCT ed.documento_id)::int AS documentos,
        COUNT(DISTINCT a.id)::int AS alertas,
        principal.documento_principal AS "documentoPrincipal",
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'documentoId', d.id,
              'tipoDocumental', d.tipo_documental,
              'rucEmisor', d.ruc_emisor,
              'razonSocialEmisor', d.razon_social_emisor,
              'serie', d.serie,
              'numero', d.numero,
              'fechaEmision', d.fecha_emision,
              'moneda', d.moneda,
              'montoTotal', d.monto_total,
              'claveDocumental', d.clave_documental,
              'estado', d.estado,
              'tipoRelacion', ed.tipo_relacion,
              'esPrincipal', ed.es_principal,
              'orden', ed.orden,
              'archivoId', da.id,
              'nombreArchivo', da.nombre_archivo,
              'archivoEstado', da.estado,
              'storageProvider', da.storage_provider
            )
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'::jsonb
        ) AS "documentosLista"
      FROM documentos.expedientes e
      LEFT JOIN core.clientes_destino cd
        ON cd.id = e.cliente_destino_id
      LEFT JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      LEFT JOIN documentos.documentos d
        ON d.id = ed.documento_id
      LEFT JOIN LATERAL (
        SELECT da.*
        FROM documentos.documentos_archivos da
        WHERE da.documento_id = d.id
        ORDER BY da.es_version_actual DESC NULLS LAST, da.version DESC NULLS LAST, da.id DESC
        LIMIT 1
      ) da ON true
      LEFT JOIN documentos.documento_alertas a
        ON a.documento_id = ed.documento_id
       AND a.estado = 'activa'
      LEFT JOIN LATERAL (
        SELECT jsonb_build_object(
          'documentoId', dp.id,
          'tipoDocumental', dp.tipo_documental,
          'rucEmisor', dp.ruc_emisor,
          'razonSocialEmisor', dp.razon_social_emisor,
          'serie', dp.serie,
          'numero', dp.numero,
          'estado', dp.estado,
          'tipoRelacion', edp.tipo_relacion,
          'esPrincipal', edp.es_principal,
          'orden', edp.orden
        ) AS documento_principal
        FROM documentos.expediente_documentos edp
        JOIN documentos.documentos dp
          ON dp.id = edp.documento_id
        WHERE edp.expediente_id = e.id
          AND edp.es_principal = true
          AND edp.tipo_relacion LIKE 'principal_%'
        ORDER BY edp.orden ASC, dp.id DESC
        LIMIT 1
      ) principal ON true
      WHERE e.estado <> 'eliminado'
        AND (
          e.codigo_expediente ILIKE ${like}
          OR e.descripcion ILIKE ${like}
          OR e.empresa_codigo ILIKE ${like}
          OR cd.nombre_oficial ILIKE ${like}
          OR cd.abreviatura ILIKE ${like}
          OR cd.ruc ILIKE ${like}
          OR EXISTS (
            SELECT 1
            FROM documentos.expediente_documentos eds
            JOIN documentos.documentos ds
              ON ds.id = eds.documento_id
            WHERE eds.expediente_id = e.id
              AND (
                ds.clave_documental ILIKE ${like}
                OR ds.tipo_documental ILIKE ${like}
                OR ds.serie ILIKE ${like}
                OR ds.numero ILIKE ${like}
                OR ds.ruc_emisor ILIKE ${like}
                OR ds.razon_social_emisor ILIKE ${like}
                OR CONCAT(COALESCE(ds.serie, ''), COALESCE(ds.numero, '')) ILIKE ${likeNormalizedDoc}
                OR CONCAT(COALESCE(ds.serie, ''), '-', COALESCE(ds.numero, '')) ILIKE ${like}
              )
          )
        )
      GROUP BY e.id, cd.id, principal.documento_principal
      ORDER BY
        CASE WHEN e.codigo_expediente = ${q} THEN 0 ELSE 1 END,
        e.actualizado_en DESC NULLS LAST,
        e.id DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      ...row,
      documentos: Number(row.documentos ?? 0),
      documentosLista: row.documentosLista ?? [],
      documentosAdjuntos: row.documentosLista ?? [],
    }));
  }

  async findByCodigoExpediente(codigo: string) {
    const rows = await sql`
      SELECT *
      FROM documentos.expedientes
      WHERE codigo_expediente = ${codigo}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async getRevisionContable(filters: {
    empresa: string;
    anio: number;
    mes: number;
  }) {
    return sql`
      SELECT
        e.id AS expediente_id,
        e.codigo_expediente,
        e.estado AS expediente_estado,
        d.id AS documento_id,
        d.tipo_documental,
        d.fecha_emision,
        d.periodo_anio,
        d.periodo_mes,
        d.serie,
        d.numero,
        d.ruc_emisor,
        d.razon_social_emisor,
        d.monto_total,
        d.estado AS documento_estado,
        d.alerta_contable,
        d.observacion_contable,
        COUNT(a.id)::int AS alertas_activas
      FROM documentos.expedientes e
      JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      JOIN documentos.documentos d
        ON d.id = ed.documento_id
      LEFT JOIN documentos.documento_alertas a
        ON a.documento_id = d.id
       AND a.estado = 'activa'
      WHERE e.empresa_codigo = ${filters.empresa}
        AND d.tipo_documental = 'FACTURA'
        AND d.periodo_anio = ${filters.anio}
        AND d.periodo_mes = ${filters.mes}
      GROUP BY e.id, d.id
      ORDER BY d.fecha_emision ASC, e.id ASC
    `;
  }

  async getEstadoDocumental(expedienteId: number) {
    const expedienteRows = await sql`
      SELECT
        e.id,
        e.codigo_expediente,
        e.empresa_codigo,
        e.estado
      FROM documentos.expedientes e
      WHERE e.id = ${expedienteId}
      LIMIT 1
    `;

    const expediente = expedienteRows[0];

    if (!expediente) {
      return null;
    }

    const rows = await sql`
      SELECT
        COALESCE(ed.tipo_relacion, d.tipo_documental) AS tipo,
        COUNT(*)::int AS cantidad
      FROM documentos.expediente_documentos ed
      JOIN documentos.documentos d
        ON d.id = ed.documento_id
      WHERE ed.expediente_id = ${expedienteId}
      GROUP BY COALESCE(ed.tipo_relacion, d.tipo_documental)
    `;

    const alertaRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM documentos.documento_alertas a
      JOIN documentos.expediente_documentos ed
        ON ed.documento_id = a.documento_id
      WHERE ed.expediente_id = ${expedienteId}
        AND a.estado = 'activa'
    `;

    const alertasActivas = Number(alertaRows[0]?.total ?? 0);

    const base: Record<string, number> = {
      principal_oc: 0,
      principal_os: 0,
      principal_factura: 0,
      adjunto_guia: 0,
      adjunto_nota_ingreso: 0,
      adjunto_transferencia: 0,
      adjunto_detraccion: 0,
      adjunto_recibo_honorario: 0,
      adjunto_otro: 0,
    };

    for (const row of rows) {
      base[row.tipo] = Number(row.cantidad);
    }

    return {
      expediente,
      documentos: base,
      alertasActivas,
    };
  }

  async getDashboardContable(filters: {
    empresa: string;
    anio: number;
    mes: number;
  }) {
    const rows = await sql`
      SELECT
        COUNT(DISTINCT e.id)::int AS expedientes,
        COUNT(d.id)::int AS facturas,
        COALESCE(SUM(d.monto_total), 0)::numeric(14,2) AS monto_facturado,
        COUNT(a.id)::int AS alertas_activas
      FROM documentos.expedientes e
      JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      JOIN documentos.documentos d
        ON d.id = ed.documento_id
      LEFT JOIN documentos.documento_alertas a
        ON a.documento_id = d.id
       AND a.estado = 'activa'
      WHERE e.empresa_codigo = ${filters.empresa}
        AND d.tipo_documental = 'FACTURA'
        AND d.periodo_anio = ${filters.anio}
        AND d.periodo_mes = ${filters.mes}
    `;

    return rows[0];
  }

  async findDocumentosByExpedienteId(id: number) {
    const rows = await sql`
      SELECT
        ed.expediente_id,
        ed.documento_id,
        ed.tipo_relacion,
        ed.es_principal,
        ed.orden,
        ed.creado_en,
        d.cliente_abreviatura,
        d.tipo_documental,
        d.ruc_emisor,
        d.razon_social_emisor,
        d.serie,
        d.numero,
        d.clave_documental,
        d.estado,
        d.fecha_emision,
        d.moneda,
        d.monto_total,
        d.metadata,
        da.id AS archivo_id,
        da.nombre_archivo,
        da.storage_provider,
        da.storage_bucket,
        da.storage_key,
        da.estado AS archivo_estado,
        da.area_origen
      FROM documentos.expediente_documentos ed
      JOIN documentos.documentos d
        ON d.id = ed.documento_id
      LEFT JOIN LATERAL (
        SELECT da.*
        FROM documentos.documentos_archivos da
        WHERE da.documento_id = d.id
        ORDER BY da.id DESC
        LIMIT 1
      ) da ON true
      WHERE ed.expediente_id = ${id}
      ORDER BY ed.es_principal DESC, ed.orden ASC, ed.creado_en ASC
    `;

    return rows;
  }
}
