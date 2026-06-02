import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

export type GruposFilters = {
  cliente?: string;
  tipo?: string;
  anio?: number;
  mes?: number;
  oc?: string;
  os?: string;
  limit?: number;
  offset?: number;
};

@Injectable()
export class GruposRepository {
  async findAll(filters: GruposFilters) {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const data = await sql`
      SELECT
        g.id,
        g.tipo_grupo,
        g.clave_grupo,
        g.cliente_abreviatura,
        g.anio,
        g.mes,
        g.asiento_contable,
        g.orden_compra,
        g.orden_servicio,
        g.estado,
        g.origen_grupo,
        g.origen_migracion,
        g.creado_en
      FROM documentos.grupos_documentales g
      WHERE
        (${filters.cliente ?? null}::text IS NULL OR g.cliente_abreviatura = ${filters.cliente ?? null})
        AND (${filters.tipo ?? null}::text IS NULL OR g.tipo_grupo = ${filters.tipo ?? null})
        AND (${filters.anio ?? null}::int IS NULL OR g.anio = ${filters.anio ?? null})
        AND (${filters.mes ?? null}::int IS NULL OR g.mes = ${filters.mes ?? null})
        AND (${filters.oc ?? null}::text IS NULL OR g.orden_compra = ${filters.oc ?? null})
        AND (${filters.os ?? null}::text IS NULL OR g.orden_servicio = ${filters.os ?? null})
      ORDER BY g.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total
      FROM documentos.grupos_documentales g
      WHERE
        (${filters.cliente ?? null}::text IS NULL OR g.cliente_abreviatura = ${filters.cliente ?? null})
        AND (${filters.tipo ?? null}::text IS NULL OR g.tipo_grupo = ${filters.tipo ?? null})
        AND (${filters.anio ?? null}::int IS NULL OR g.anio = ${filters.anio ?? null})
        AND (${filters.mes ?? null}::int IS NULL OR g.mes = ${filters.mes ?? null})
        AND (${filters.oc ?? null}::text IS NULL OR g.orden_compra = ${filters.oc ?? null})
        AND (${filters.os ?? null}::text IS NULL OR g.orden_servicio = ${filters.os ?? null})
    `;

    return {
      total: countRow.total,
      limit,
      offset,
      data,
    };
  }

  async findById(id: number) {
    const rows = await sql`
      SELECT
        g.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', d.id,
              'tipo_documental', d.tipo_documental,
              'cliente_abreviatura', d.cliente_abreviatura,
              'anio', d.anio,
              'mes', d.mes,
              'ruc_emisor', d.ruc_emisor,
              'razon_social_emisor', d.razon_social_emisor,
              'serie', d.serie,
              'numero', d.numero,
              'clave_documental', d.clave_documental,
              'estado', d.estado
            )
            ORDER BY d.tipo_documental, d.id
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) AS documentos
      FROM documentos.grupos_documentales g
      LEFT JOIN documentos.grupo_documentos gd
        ON gd.grupo_id = g.id
      LEFT JOIN documentos.documentos d
        ON d.id = gd.documento_id
      WHERE g.id = ${id}
      GROUP BY g.id
      LIMIT 1
    `;

    return rows[0] ?? null;
  }
}
