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

    return sql`
      SELECT
        id,
        correlativo,
        empresa_codigo,
        tipo_expediente,
        codigo_centro_costo,
        codigo_op,
        descripcion,
        estado,
        creado_en,
        actualizado_en
      FROM documentos.expedientes
      WHERE (${filters.empresa ?? null}::text IS NULL OR empresa_codigo = ${filters.empresa ?? null})
        AND (${filters.estado ?? null}::text IS NULL OR estado = ${filters.estado ?? null})
      ORDER BY id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  }

  async findById(id: number) {
    const rows = await sql`
      SELECT
        e.*,
        COALESCE(
          json_agg(
            json_build_object(
              'documentoId', d.id,
              'tipoDocumental', d.tipo_documental,
              'rucEmisor', d.ruc_emisor,
              'razonSocialEmisor', d.razon_social_emisor,
              'serie', d.serie,
              'numero', d.numero,
              'estado', d.estado,
              'tipoRelacion', ed.tipo_relacion,
              'esPrincipal', ed.es_principal,
              'orden', ed.orden
            )
              ORDER BY ed.es_principal DESC, ed.orden ASC, d.id ASC
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS documentos
      FROM documentos.expedientes e
      LEFT JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      LEFT JOIN documentos.documentos d
        ON d.id = ed.documento_id
      WHERE e.id = ${id}
      GROUP BY e.id
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async create(data: {
    correlativo: string;
    empresaCodigo: string;
    tipoExpediente: string;
    codigoCentroCosto?: string | null;
    codigoOp?: string | null;
    descripcion?: string | null;
  }) {
    const rows = await sql`
      INSERT INTO documentos.expedientes (
        correlativo,
        empresa_codigo,
        tipo_expediente,
        codigo_centro_costo,
        codigo_op,
        descripcion
      )
      VALUES (
        ${data.correlativo},
        ${data.empresaCodigo},
        ${data.tipoExpediente},
        ${data.codigoCentroCosto ?? null},
        ${data.codigoOp ?? null},
        ${data.descripcion ?? null}
      )
      RETURNING *
    `;

    return rows[0];
  }

  async addDocumento(data: {
    expedienteId: number;
    documentoId: number;
    tipoRelacion?: string | null;
    esPrincipal?: boolean;
    orden?: number;
  }) {
    if (data.esPrincipal) {
      await sql`
        UPDATE documentos.expediente_documentos
        SET es_principal = false
        WHERE expediente_id = ${data.expedienteId}
      `;
    }

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
        e.correlativo,
        e.empresa_codigo,
        e.tipo_expediente,
        e.codigo_centro_costo,
        e.codigo_op,
        e.estado,

        COUNT(ed.documento_id)::int AS total_documentos,

        COUNT(*) FILTER (
          WHERE d.tipo_documental = 'FACTURA'
        )::int AS total_facturas,

        COUNT(*) FILTER (
          WHERE d.tipo_documental = 'GUIA_REMISION'
        )::int AS total_guias,

        COUNT(*) FILTER (
          WHERE d.tipo_documental = 'NOTA_INGRESO'
        )::int AS total_notas_ingreso,

        COUNT(*) FILTER (
          WHERE d.tipo_documental IN ('PAGO_TRANSFERENCIA', 'PAGO_DETRACCION')
        )::int AS total_pagos,

        COALESCE(
          json_agg(
            json_build_object(
              'documentoId', d.id,
              'tipoDocumental', d.tipo_documental,
              'serie', d.serie,
              'numero', d.numero,
              'estado', d.estado,
              'tipoRelacion', ed.tipo_relacion,
              'esPrincipal', ed.es_principal
            )
            ORDER BY ed.es_principal DESC, ed.orden ASC, d.id ASC
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS documentos
      FROM documentos.expedientes e
      LEFT JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      LEFT JOIN documentos.documentos d
        ON d.id = ed.documento_id
      WHERE e.id = ${id}
      GROUP BY e.id
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
      ORDER BY
        d.fecha_emision NULLS LAST,
        ed.orden ASC,
        d.id ASC
    `;
  }

  async findByClavePrincipal(clave: string) {
    const rows = await sql`
      SELECT *
      FROM documentos.expedientes
      WHERE clave_principal = ${clave}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async getRevisionContable(filters: {
    empresa: string;
    anio: number;
    mes: number;
  }) {
    const rows = await sql`
      SELECT DISTINCT
        e.id AS expediente_id,
        e.correlativo,
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
        d.observacion_contable
      FROM documentos.expedientes e
      JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      JOIN documentos.documentos d
        ON d.id = ed.documento_id
      WHERE e.empresa_codigo = ${filters.empresa}
        AND d.tipo_documental = 'FACTURA'
        AND d.periodo_anio = ${filters.anio}
        AND d.periodo_mes = ${filters.mes}
      ORDER BY d.fecha_emision ASC, e.id ASC
    `;

    return rows;
  }
}
