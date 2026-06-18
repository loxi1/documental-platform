import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

type ExpedienteWriteInput = {
  correlativo?: string;
  empresaCodigo?: string;
  tipoExpediente?: string;
  codigoExpediente?: string | null;
  clavePrincipal?: string | null;
  descripcion?: string | null;
  estado?: string | null;
  metadata?: Record<string, any> | null;
};

@Injectable()
export class ExpedientesRepository {
  async findAll(filters: {
    empresa?: string;
    estado?: string;
    limit?: number;
    offset?: number;
  }) {
    const empresa = filters.empresa?.trim().toUpperCase() || null;
    const estado = filters.estado?.trim().toLowerCase() || null;
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    return sql`
      SELECT
        id,
        correlativo,
        empresa_codigo,
        tipo_expediente,
        codigo_expediente,
        descripcion,
        estado,
        metadata,
        creado_en,
        actualizado_en,
        clave_principal
      FROM documentos.expedientes
      WHERE (${empresa}::text IS NULL OR empresa_codigo = ${empresa})
        AND (${estado}::text IS NULL OR estado = ${estado})
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
              'orden', ed.orden,
              'claveDocumental', d.clave_documental
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

  async create(data: ExpedienteWriteInput) {
    const correlativo = String(data.correlativo ?? '').trim();
    const empresaCodigo = String(data.empresaCodigo ?? '').trim().toUpperCase();
    const tipoExpediente = String(data.tipoExpediente ?? '').trim().toUpperCase();
    const codigoExpediente = data.codigoExpediente?.trim() || null;
    const clavePrincipal = data.clavePrincipal?.trim() || null;
    const descripcion = data.descripcion ?? null;
    const estado = data.estado?.trim().toLowerCase() || 'abierto';
    const metadata = JSON.stringify(data.metadata ?? {});

    const rows = await sql`
      INSERT INTO documentos.expedientes (
        correlativo,
        empresa_codigo,
        tipo_expediente,
        codigo_expediente,
        clave_principal,
        descripcion,
        estado,
        metadata
      )
      VALUES (
        ${correlativo},
        ${empresaCodigo},
        ${tipoExpediente},
        ${codigoExpediente},
        ${clavePrincipal},
        ${descripcion},
        ${estado},
        ${metadata}::jsonb
      )
      RETURNING *
    `;

    return rows[0] ?? null;
  }

  async patch(id: number, data: ExpedienteWriteInput) {
    const correlativo = data.correlativo?.trim() || null;
    const empresaCodigo = data.empresaCodigo?.trim().toUpperCase() || null;
    const tipoExpediente = data.tipoExpediente?.trim().toUpperCase() || null;
    const codigoExpediente = data.codigoExpediente === undefined
      ? null
      : data.codigoExpediente?.trim() || null;
    const clavePrincipal = data.clavePrincipal === undefined
      ? null
      : data.clavePrincipal?.trim() || null;
    const descripcion = data.descripcion === undefined ? null : data.descripcion;
    const estado = data.estado?.trim().toLowerCase() || null;
    const metadata = data.metadata === undefined ? null : JSON.stringify(data.metadata ?? {});

    const rows = await sql`
      UPDATE documentos.expedientes
      SET
        correlativo = COALESCE(${correlativo}, correlativo),
        empresa_codigo = COALESCE(${empresaCodigo}, empresa_codigo),
        tipo_expediente = COALESCE(${tipoExpediente}, tipo_expediente),
        codigo_expediente = CASE
          WHEN ${data.codigoExpediente === undefined}::boolean THEN codigo_expediente
          ELSE ${codigoExpediente}
        END,
        clave_principal = CASE
          WHEN ${data.clavePrincipal === undefined}::boolean THEN clave_principal
          ELSE ${clavePrincipal}
        END,
        descripcion = CASE
          WHEN ${data.descripcion === undefined}::boolean THEN descripcion
          ELSE ${descripcion}
        END,
        estado = COALESCE(${estado}, estado),
        metadata = CASE
          WHEN ${metadata}::text IS NULL THEN metadata
          ELSE ${metadata}::jsonb
        END,
        actualizado_en = now()
      WHERE id = ${id}
      RETURNING *
    `;

    return rows[0] ?? null;
  }

  async replace(id: number, data: ExpedienteWriteInput) {
    const correlativo = String(data.correlativo ?? '').trim();
    const empresaCodigo = String(data.empresaCodigo ?? '').trim().toUpperCase();
    const tipoExpediente = String(data.tipoExpediente ?? '').trim().toUpperCase();
    const codigoExpediente = data.codigoExpediente?.trim() || null;
    const clavePrincipal = data.clavePrincipal?.trim() || null;
    const descripcion = data.descripcion ?? null;
    const estado = data.estado?.trim().toLowerCase() || 'abierto';
    const metadata = JSON.stringify(data.metadata ?? {});

    const rows = await sql`
      UPDATE documentos.expedientes
      SET
        correlativo = ${correlativo},
        empresa_codigo = ${empresaCodigo},
        tipo_expediente = ${tipoExpediente},
        codigo_expediente = ${codigoExpediente},
        clave_principal = ${clavePrincipal},
        descripcion = ${descripcion},
        estado = ${estado},
        metadata = ${metadata}::jsonb,
        actualizado_en = now()
      WHERE id = ${id}
      RETURNING *
    `;

    return rows[0] ?? null;
  }

  async remove(id: number) {
    const rows = await sql`
      DELETE FROM documentos.expedientes
      WHERE id = ${id}
      RETURNING *
    `;

    return rows[0] ?? null;
  }

  async addDocumento(data: {
    expedienteId: number;
    documentoId: number;
    tipoRelacion?: string | null;
    esPrincipal?: boolean;
    orden?: number;
  }) {
    const tipoRelacion = data.tipoRelacion ?? null;
    const esPrincipal = data.esPrincipal ?? false;
    const orden = data.orden ?? 0;

    if (esPrincipal) {
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
        ${tipoRelacion},
        ${esPrincipal},
        ${orden}
      )
      ON CONFLICT (expediente_id, documento_id)
      DO UPDATE SET
        tipo_relacion = EXCLUDED.tipo_relacion,
        es_principal = EXCLUDED.es_principal,
        orden = EXCLUDED.orden
      RETURNING *
    `;

    return rows[0] ?? null;
  }

  async getResumen(id: number) {
    const rows = await sql`
      SELECT
        e.id,
        e.correlativo,
        e.empresa_codigo,
        e.tipo_expediente,
        e.codigo_expediente,
        e.clave_principal,
        e.descripcion,
        e.metadata,
        e.estado,
        COUNT(ed.documento_id)::int AS total_documentos,
        COUNT(*) FILTER (WHERE d.tipo_documental = 'FACTURA')::int AS total_facturas,
        COUNT(*) FILTER (WHERE d.tipo_documental = 'GUIA_REMISION')::int AS total_guias,
        COUNT(*) FILTER (WHERE d.tipo_documental = 'NOTA_INGRESO')::int AS total_notas_ingreso,
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
      SELECT
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
      GROUP BY
        e.id,
        e.correlativo,
        e.estado,
        d.id,
        d.tipo_documental,
        d.fecha_emision,
        d.periodo_anio,
        d.periodo_mes,
        d.serie,
        d.numero,
        d.ruc_emisor,
        d.razon_social_emisor,
        d.monto_total,
        d.estado,
        d.alerta_contable,
        d.observacion_contable
      ORDER BY d.fecha_emision ASC, e.id ASC
    `;

    return rows;
  }

  async getEstadoDocumental(expedienteId: number) {
    const expedienteRows = await sql`
      SELECT id, correlativo, empresa_codigo, estado
      FROM documentos.expedientes
      WHERE id = ${expedienteId}
      LIMIT 1
    `;

    const expediente = expedienteRows[0];

    if (!expediente) {
      return null;
    }

    const rows = await sql`
      SELECT
        d.tipo_documental,
        COUNT(*)::int AS cantidad
      FROM documentos.expediente_documentos ed
      JOIN documentos.documentos d
        ON d.id = ed.documento_id
      WHERE ed.expediente_id = ${expedienteId}
      GROUP BY d.tipo_documental
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
      FACTURA: 0,
      GUIA_REMISION: 0,
      NOTA_INGRESO: 0,
      PAGO_TRANSFERENCIA: 0,
      PAGO_DETRACCION: 0,
      RECIBO_HONORARIO: 0,
      OC: 0,
      OS: 0,
    };

    for (const row of rows) {
      base[String(row.tipo_documental)] = Number(row.cantidad);
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

    return rows[0] ?? null;
  }
}
