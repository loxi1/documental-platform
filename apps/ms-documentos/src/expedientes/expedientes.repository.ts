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
              'tipoRelacion', ed.tipo_relacion
            )
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
  }) {
    const rows = await sql`
      INSERT INTO documentos.expediente_documentos (
        expediente_id,
        documento_id,
        tipo_relacion
      )
      VALUES (
        ${data.expedienteId},
        ${data.documentoId},
        ${data.tipoRelacion ?? null}
      )
      ON CONFLICT (expediente_id, documento_id)
      DO UPDATE SET
        tipo_relacion = EXCLUDED.tipo_relacion
      RETURNING *
    `;

    return rows[0];
  }
}
