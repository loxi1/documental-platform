import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

export type DocumentosFilters = {
  cliente?: string;
  tipo?: string;
  anio?: number;
  mes?: number;
  limit?: number;
  offset?: number;
};

@Injectable()
export class DocumentosRepository {
  async findAll(filters: DocumentosFilters) {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const data = await sql`
      SELECT
        d.id,
        d.tipo_documental,
        d.cliente_abreviatura,
        d.anio,
        d.mes,
        d.ruc_emisor,
        d.razon_social_emisor,
        d.serie,
        d.numero,
        d.clave_documental,
        d.estado,
        d.creado_en
      FROM documentos.documentos d
      WHERE
        (${filters.cliente ?? null}::text IS NULL OR d.cliente_abreviatura = ${filters.cliente ?? null})
        AND (${filters.tipo ?? null}::text IS NULL OR d.tipo_documental = ${filters.tipo ?? null})
        AND (${filters.anio ?? null}::int IS NULL OR d.anio = ${filters.anio ?? null})
        AND (${filters.mes ?? null}::int IS NULL OR d.mes = ${filters.mes ?? null})
      ORDER BY d.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total
      FROM documentos.documentos d
      WHERE
        (${filters.cliente ?? null}::text IS NULL OR d.cliente_abreviatura = ${filters.cliente ?? null})
        AND (${filters.tipo ?? null}::text IS NULL OR d.tipo_documental = ${filters.tipo ?? null})
        AND (${filters.anio ?? null}::int IS NULL OR d.anio = ${filters.anio ?? null})
        AND (${filters.mes ?? null}::int IS NULL OR d.mes = ${filters.mes ?? null})
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
        d.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', da.id,
              'nombre_archivo', da.nombre_archivo,
              'ruta_archivo', da.ruta_archivo,
              'storage_provider', da.storage_provider,
              'storage_key', da.storage_key,
              'area_origen', da.area_origen,
              'origen_archivo', da.origen_archivo
            )
          ) FILTER (WHERE da.id IS NOT NULL),
          '[]'
        ) AS archivos
      FROM documentos.documentos d
      LEFT JOIN documentos.documentos_archivos da
        ON da.documento_id = d.id
      WHERE d.id = ${id}
      GROUP BY d.id
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async getTipos() {
    return sql`
      SELECT tipo_documental, COUNT(*)::int AS total
      FROM documentos.documentos
      GROUP BY tipo_documental
      ORDER BY tipo_documental
    `;
  }

    async getClientesDestino() {
    return sql`
      SELECT
        id,
        nombre_oficial,
        abreviatura,
        ruc,
        estado
      FROM core.clientes_destino
      ORDER BY abreviatura
    `;
  }

  async getProveedores(search?: string, limit = 20, offset = 0) {
    const term = search ? `%${search}%` : null;

    const data = await sql`
      SELECT
        id,
        ruc,
        razon_social,
        direccion,
        tipo_persona
      FROM core.proveedores
      WHERE
        (${term}::text IS NULL
          OR razon_social ILIKE ${term}
          OR ruc ILIKE ${term})
      ORDER BY razon_social
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total
      FROM core.proveedores
      WHERE
        (${term}::text IS NULL
          OR razon_social ILIKE ${term}
          OR ruc ILIKE ${term})
    `;

    return {
      total: countRow.total,
      limit,
      offset,
      data,
    };
  }

  async findArchivoById(archivoId: number) {
    const rows = await sql`
      SELECT
        da.id,
        da.documento_id,
        da.storage_provider,
        da.storage_key,
        da.ruta_archivo,
        da.nombre_archivo,
        d.cliente_abreviatura
      FROM documentos.documentos_archivos da
      LEFT JOIN documentos.documentos d
        ON d.id = da.documento_id
      WHERE da.id = ${archivoId}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async updateDocumentoOcrResult(params: {
    documentoId: number;
    tipoDocumental: string;
    estado: string;
    metadata: any;
  }) {
    const ocrMetadata = params.metadata;
    const extracted = ocrMetadata?.metadata ?? {};

    const rows = await sql`
      UPDATE documentos.documentos
      SET
        tipo_documental = ${params.tipoDocumental},
        estado = ${params.estado},
        ruc_emisor = COALESCE(${extracted.ruc ?? null}, ruc_emisor),
        serie = COALESCE(${extracted.serie ?? null}, serie),
        numero = COALESCE(${extracted.numero ?? null}, numero),
        fecha_emision = COALESCE(${extracted.fechaEmision ?? null}::date, fecha_emision),
        monto_total = COALESCE(${extracted.montoTotal ?? null}::numeric, monto_total),
        metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
          ocr: ocrMetadata,
        })}::jsonb
      WHERE id = ${params.documentoId}
      RETURNING *
    `;

    if (params.tipoDocumental === 'FACTURA') {
      await sql`
        INSERT INTO documentos.documentos_factura (
          documento_id,
          ruc_emisor,
          serie,
          numero,
          fecha_emision,
          total
        )
        VALUES (
          ${params.documentoId},
          ${extracted.ruc ?? null},
          ${extracted.serie ?? null},
          ${extracted.numero ?? null},
          ${extracted.fechaEmision ?? null}::date,
          ${extracted.montoTotal ?? null}::numeric
        )
        ON CONFLICT (documento_id)
        DO UPDATE SET
          ruc_emisor = COALESCE(EXCLUDED.ruc_emisor, documentos.documentos_factura.ruc_emisor),
          serie = COALESCE(EXCLUDED.serie, documentos.documentos_factura.serie),
          numero = COALESCE(EXCLUDED.numero, documentos.documentos_factura.numero),
          fecha_emision = COALESCE(EXCLUDED.fecha_emision, documentos.documentos_factura.fecha_emision),
          total = COALESCE(EXCLUDED.total, documentos.documentos_factura.total)
      `;
    }

    return rows[0] ?? null;
  }

  async saveOcrResultado(params: {
    archivoId: number;
    documentoId: number | null;
    tipoPropuesto: string | null;
    estado: string;
    confidence: number | null;
    claveDocumental: string | null;
    metadata: unknown;
  }) {
    if (params.claveDocumental) {
      const existing = await sql`
        SELECT *
        FROM documentos.ocr_resultados
        WHERE clave_documental = ${params.claveDocumental}
          AND estado IN ('pendiente_validacion', 'confirmado')
        ORDER BY id DESC
        LIMIT 1
      `;

      if (existing[0]) {
        return {
          ...existing[0],
          ya_existia: true,
        };
      }
    }

    const rows = await sql`
      INSERT INTO documentos.ocr_resultados (
        archivo_id,
        documento_id,
        tipo_propuesto,
        estado,
        confidence,
        clave_documental,
        metadata
      )
      VALUES (
        ${params.archivoId},
        ${params.documentoId},
        ${params.tipoPropuesto},
        ${params.estado},
        ${params.confidence},
        ${params.claveDocumental},
        ${JSON.stringify(params.metadata)}::jsonb
      )
      RETURNING *
    `;

    return {
      ...rows[0],
      ya_existia: false,
    };
  }
}
