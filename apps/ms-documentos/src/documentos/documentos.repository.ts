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
    const sameArchivo = await sql`
      SELECT *
      FROM documentos.ocr_resultados
      WHERE archivo_id = ${params.archivoId}
        AND estado IN ('pendiente_validacion', 'confirmado')
      ORDER BY id DESC
      LIMIT 1
    `;

    if (sameArchivo[0]) {
      return {
        row: sameArchivo[0],
        yaExistia: true,
        motivo: 'MISMO_ARCHIVO',
      };
    }

    const documentoExistente = params.claveDocumental
      ? await sql`
          SELECT id
          FROM documentos.documentos
          WHERE clave_documental = ${params.claveDocumental}
          LIMIT 1
        `
      : [];

    const metadataFinal = {
      ...(params.metadata as object),
      duplicado: documentoExistente[0]
        ? {
            existeDocumento: true,
            documentoId: documentoExistente[0].id,
            claveDocumental: params.claveDocumental,
          }
        : null,
    };

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
        ${JSON.stringify(metadataFinal)}::jsonb
      )
      RETURNING *
    `;

    return {
      row: rows[0],
      yaExistia: false,
      motivo: documentoExistente[0] ? 'MISMA_CLAVE_DOCUMENTAL' : null,
    };
  }

  async findOcrResultados(filters: {
    estado?: string;
    limit?: number;
    offset?: number;
    soloNoVinculados?: boolean;
  }) {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    return sql`
      SELECT
        o.id,
        o.archivo_id,
        o.documento_id,
        o.tipo_propuesto,
        o.estado,
        o.confidence,
        o.clave_documental,
        o.creado_en,
        da.nombre_archivo,
        da.storage_provider,
        da.storage_key,
        o.expediente_id,
        o.vinculado_en
      FROM documentos.ocr_resultados o
      LEFT JOIN documentos.documentos_archivos da
        ON da.id = o.archivo_id
      WHERE (${filters.estado ?? null}::text IS NULL OR o.estado = ${filters.estado ?? null})
        AND (${filters.soloNoVinculados ?? false}::boolean = false OR o.expediente_id IS NULL)
      ORDER BY o.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  }

  async findOcrResultadoById(id: number) {
    const rows = await sql`
      SELECT
        o.*,
        da.nombre_archivo,
        da.storage_provider,
        da.storage_key,
        da.ruta_archivo
      FROM documentos.ocr_resultados o
      LEFT JOIN documentos.documentos_archivos da
        ON da.id = o.archivo_id
      WHERE o.id = ${id}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async confirmarOcrResultado(id: number, usuarioId?: number) {
    const rows = await sql`
      UPDATE documentos.ocr_resultados
      SET
        estado = 'confirmado',
        validado_en = now(),
        validado_por = ${usuarioId ?? null}
      WHERE id = ${id}
      RETURNING *
    `;

    return rows[0] ?? null;
  }

  async createDocumentoRelacion(params: {
    documentoOrigenId: number;
    documentoDestinoId: number;
    tipoRelacion: string;
    metadata?: unknown;
  }) {
    const rows = await sql`
      INSERT INTO documentos.documento_relaciones (
        documento_origen_id,
        documento_destino_id,
        tipo_relacion,
        metadata
      )
      VALUES (
        ${params.documentoOrigenId},
        ${params.documentoDestinoId},
        ${params.tipoRelacion},
        ${JSON.stringify(params.metadata ?? {})}::jsonb
      )
      ON CONFLICT (
        documento_origen_id,
        documento_destino_id,
        tipo_relacion
      )
      DO UPDATE SET
        metadata = EXCLUDED.metadata
      RETURNING *
    `;

    return rows[0];
  }

  async findDocumentoRelaciones(documentoId: number) {
    return sql`
      SELECT
        r.id,
        r.documento_origen_id,
        r.documento_destino_id,
        r.tipo_relacion,
        r.metadata,
        r.creado_en,

        origen.tipo_documental AS origen_tipo,
        origen.serie AS origen_serie,
        origen.numero AS origen_numero,

        destino.tipo_documental AS destino_tipo,
        destino.serie AS destino_serie,
        destino.numero AS destino_numero
      FROM documentos.documento_relaciones r
      JOIN documentos.documentos origen
        ON origen.id = r.documento_origen_id
      JOIN documentos.documentos destino
        ON destino.id = r.documento_destino_id
      WHERE r.documento_origen_id = ${documentoId}
         OR r.documento_destino_id = ${documentoId}
      ORDER BY r.id DESC
    `;
  }

  async createExpedienteDesdeOcr(params: {
    ocrResultadoId: number;
    correlativo: string;
    empresaCodigo: string;
    tipoExpediente: string;
    descripcion?: string | null;
    codigoCentroCosto?: string | null;
    codigoOp?: string | null;
    clavePrincipal?: string | null;
    tipoRelacionPrincipal: string;
  }) {
    const ocrRows = await sql`
      SELECT *
      FROM documentos.ocr_resultados
      WHERE id = ${params.ocrResultadoId}
      LIMIT 1
    `;

    const ocr = ocrRows[0];

    if (!ocr) {
      return null;
    }

    const clavePrincipal =
      params.clavePrincipal ?? ocr.clave_documental ?? null;

    if (clavePrincipal) {
      const existingExpediente = await sql`
        SELECT *
        FROM documentos.expedientes
        WHERE clave_principal = ${clavePrincipal}
          AND empresa_codigo = ${params.empresaCodigo}
        LIMIT 1
      `;

      if (existingExpediente[0]) {
        return {
          expediente: existingExpediente[0],
          yaExistia: true,
          motivo: 'MISMA_CLAVE_PRINCIPAL',
        };
      }
    }

    const expedienteRows = await sql`
      INSERT INTO documentos.expedientes (
        correlativo,
        empresa_codigo,
        tipo_expediente,
        descripcion,
        codigo_centro_costo,
        codigo_op,
        clave_principal
      )
      VALUES (
        ${params.correlativo},
        ${params.empresaCodigo},
        ${params.tipoExpediente},
        ${params.descripcion ?? null},
        ${params.codigoCentroCosto ?? null},
        ${params.codigoOp ?? null},
        ${params.clavePrincipal ?? ocr.clave_documental ?? null}
      )
      RETURNING *
    `;

    const expediente = expedienteRows[0];

    await sql`
      INSERT INTO documentos.expediente_documentos (
        expediente_id,
        documento_id,
        tipo_relacion,
        es_principal,
        orden
      )
      VALUES (
        ${expediente.id},
        ${ocr.documento_id},
        ${params.tipoRelacionPrincipal},
        true,
        1
      )
      ON CONFLICT (expediente_id, documento_id)
      DO UPDATE SET
        tipo_relacion = EXCLUDED.tipo_relacion,
        es_principal = true,
        orden = 1
    `;

    return expediente;
  }

  async sugerirExpedienteParaOcr(id: number) {
    const ocrRows = await sql`
      SELECT *
      FROM documentos.ocr_resultados
      WHERE id = ${id}
      LIMIT 1
    `;

    const ocr = ocrRows[0];

    if (!ocr) {
      return null;
    }

    if (!ocr.clave_documental) {
      return {
        ocr,
        sugerencia: {
          accion: 'SIN_SUGERENCIA',
          motivo: 'OCR_SIN_CLAVE_DOCUMENTAL',
          confidence: 0,
        },
      };
    }

    const expedienteRows = await sql`
      SELECT *
      FROM documentos.expedientes
      WHERE clave_principal = ${ocr.clave_documental}
      LIMIT 1
    `;

    if (expedienteRows[0]) {
      return {
        ocr,
        sugerencia: {
          accion: 'USAR_EXPEDIENTE_EXISTENTE',
          expediente: expedienteRows[0],
          motivo: 'MISMA_CLAVE_PRINCIPAL',
          confidence: 100,
        },
      };
    }

    return {
      ocr,
      sugerencia: {
        accion: 'CREAR_EXPEDIENTE',
        motivo: 'NO_EXISTE_EXPEDIENTE_PARA_CLAVE',
        confidence: 100,
      },
    };
  }

  async vincularOcrAExpediente(params: {
    ocrResultadoId: number;
    expedienteId: number;
    tipoRelacion: string;
    esPrincipal?: boolean;
    orden?: number;
  }) {
    const ocrRows = await sql`
      SELECT *
      FROM documentos.ocr_resultados
      WHERE id = ${params.ocrResultadoId}
      LIMIT 1
    `;

    const ocr = ocrRows[0];

    if (!ocr) {
      return null;
    }

    if (params.esPrincipal) {
      await sql`
        UPDATE documentos.expediente_documentos
        SET es_principal = false
        WHERE expediente_id = ${params.expedienteId}
      `;
    }

    const vinculoExistente = await sql`
      SELECT expediente_id
      FROM documentos.expediente_documentos
      WHERE documento_id = ${ocr.documento_id}
        AND expediente_id <> ${params.expedienteId}
      LIMIT 1
    `;

    if (vinculoExistente[0]) {
      return {
        ocr,
        vinculo: null,
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
        ${params.expedienteId},
        ${ocr.documento_id},
        ${params.tipoRelacion},
        ${params.esPrincipal ?? false},
        ${params.orden ?? 0}
      )
      ON CONFLICT (expediente_id, documento_id)
      DO UPDATE SET
        tipo_relacion = EXCLUDED.tipo_relacion,
        es_principal = EXCLUDED.es_principal,
        orden = EXCLUDED.orden
      RETURNING *
    `;
    
    await sql`
      UPDATE documentos.ocr_resultados
      SET
        expediente_id = ${params.expedienteId},
        vinculado_en = now()
      WHERE id = ${params.ocrResultadoId}
    `;

    return {
      ocr,
      vinculo: rows[0],
    };
  }

  async createDocumentoAlerta(params: {
    documentoId: number;
    tipoAlerta: string;
    mensaje?: string | null;
  }) {
    const rows = await sql`
      INSERT INTO documentos.documento_alertas (
        documento_id,
        tipo_alerta,
        mensaje
      )
      VALUES (
        ${params.documentoId},
        ${params.tipoAlerta},
        ${params.mensaje ?? null}
      )
      RETURNING *
    `;

    return rows[0];
  }

  async findDocumentoAlertas(documentoId: number) {
    return sql`
      SELECT *
      FROM documentos.documento_alertas
      WHERE documento_id = ${documentoId}
      ORDER BY creado_en DESC
    `;
  }

  async resolverDocumentoAlerta(params: {
    documentoId: number;
    alertaId: number;
  }) {
    const rows = await sql`
      UPDATE documentos.documento_alertas
      SET
        estado = 'resuelta',
        resuelto_en = now()
      WHERE id = ${params.alertaId}
        AND documento_id = ${params.documentoId}
      RETURNING *
    `;

    return rows[0] ?? null;
  }
}
