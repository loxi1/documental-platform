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
        ruc_emisor = COALESCE(${extracted.ruc ?? extracted.rucProveedor ?? null}, ruc_emisor),
        razon_social_emisor = COALESCE(${extracted.razonSocial ?? extracted.proveedor ?? null}, razon_social_emisor),
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
    forceReprocess?: boolean;
  }) {
    if (!params.forceReprocess) {
      const sameArchivo = await sql`
        SELECT *
        FROM documentos.ocr_resultados
        WHERE archivo_id = ${params.archivoId}
          AND estado IN ('pendiente_validacion', 'confirmado', 'editado')
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
    }

    const documentoExistente = params.claveDocumental
      ? await sql`
          SELECT id
          FROM documentos.documentos
          WHERE clave_documental = ${params.claveDocumental}
          LIMIT 1
        `
      : [];

    const metadataSanitizada = this.limpiarCamposLegacyOcr(
      (params.metadata ?? {}) as Record<string, any>,
    );

    const metadataFinal = {
      ...metadataSanitizada,
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

    const vinculo = await this.vincularOcrAExpedienteExistente({
      ocrResultadoId: rows[0].id,
      documentoId: params.documentoId,
      clienteAbreviatura: metadataSanitizada.clienteAbreviatura,
      codigoExpediente: metadataSanitizada.metadata?.codigoExpediente,
      tipoPropuesto: params.tipoPropuesto,
    });

    return {
      row: vinculo?.ocr ?? rows[0],
      expediente: vinculo?.expediente ?? null,
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
        o.expediente_id
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
    const usuarioIdFinal: number | null = usuarioId ?? null;

    const rows = await sql`
      WITH ocr AS (
        UPDATE documentos.ocr_resultados
        SET
          estado = 'confirmado',
          validado_en = now(),
          validado_por = ${usuarioIdFinal},
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{estado}',
            to_jsonb('confirmado'::text),
            true
          )
        WHERE id = ${id}
        RETURNING *
      ),
      datos AS (
        SELECT
          ocr.*,
          ocr.metadata->'metadata' AS meta,
          COALESCE(
            ocr.metadata->>'tipoDocumental',
            ocr.tipo_propuesto
          ) AS tipo_documental_final,
          COALESCE(
            ocr.metadata->>'claveDocumental',
            ocr.clave_documental
          ) AS clave_documental_final
        FROM ocr
      ),
      doc_update AS (
        UPDATE documentos.documentos d
        SET
          tipo_documental = datos.tipo_documental_final,
          estado = 'confirmado',
          ruc_emisor = COALESCE(datos.meta->>'ruc', datos.meta->>'rucProveedor', d.ruc_emisor),
          razon_social_emisor = COALESCE(datos.meta->>'razonSocial', datos.meta->>'proveedor', d.razon_social_emisor),
          serie = COALESCE(datos.meta->>'serie', d.serie),
          numero = COALESCE(datos.meta->>'numero', d.numero),
          fecha_emision = COALESCE(NULLIF(datos.meta->>'fechaEmision', '')::date, d.fecha_emision),
          monto_total = COALESCE(NULLIF(datos.meta->>'montoTotal', '')::numeric, d.monto_total),
          clave_documental = datos.clave_documental_final,
          metadata = COALESCE(d.metadata, '{}'::jsonb) || jsonb_build_object('ocr', datos.metadata)
        FROM datos
        WHERE d.id = datos.documento_id
        RETURNING d.*
      )
      SELECT
        datos.id,
        datos.estado,
        datos.documento_id,
        datos.tipo_documental_final AS tipo_documental,
        datos.clave_documental_final AS clave_documental,
        datos.meta AS metadata
      FROM datos
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
    clienteDestinoId: number;
    empresaCodigo: string;
    codigoExpediente: string;
    descripcion?: string | null;
    metadata?: Record<string, any> | null;
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

    const existingExpediente = await sql`
      SELECT *
      FROM documentos.expedientes
      WHERE codigo_expediente = ${params.codigoExpediente}
        AND empresa_codigo = ${params.empresaCodigo}
      LIMIT 1
    `;

    if (existingExpediente[0]) {
      return {
        expediente: existingExpediente[0],
        yaExistia: true,
        motivo: 'MISMO_CODIGO_EXPEDIENTE',
      };
    }

    const expedienteRows = await sql`
      INSERT INTO documentos.expedientes (
        cliente_destino_id,
        empresa_codigo,
        codigo_expediente,
        descripcion,
        metadata
      )
      VALUES (
        ${params.clienteDestinoId},
        ${params.empresaCodigo},
        ${params.codigoExpediente},
        ${params.descripcion ?? null},
        ${JSON.stringify(params.metadata ?? {})}::jsonb
      )
      RETURNING *
    `;

    const expediente = expedienteRows[0];

    if (ocr.documento_id) {
      await this.upsertExpedienteDocumento({
        expedienteId: expediente.id,
        documentoId: ocr.documento_id,
        tipoRelacion: params.tipoRelacionPrincipal,
        esPrincipal: true,
        orden: 1,
      });
    }

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

    return {
      ocr,
      sugerencia: {
        accion: 'SELECCIONAR_EXPEDIENTE',
        motivo: 'EXPEDIENTE_ES_ENTIDAD_PRINCIPAL_Y_DEBE_SER_SELECCIONADO_O_RESUELTO_POR_UI',
        confidence: 0,
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

    const vinculo = await this.upsertExpedienteDocumento({
      expedienteId: params.expedienteId,
      documentoId: ocr.documento_id,
      tipoRelacion: params.tipoRelacion,
      esPrincipal: params.esPrincipal ?? false,
      orden: params.orden ?? 0,
    });

    const ocrUpdatedRows = await sql`
      UPDATE documentos.ocr_resultados
      SET
        metadata = COALESCE(metadata, '{}'::jsonb)
          || jsonb_build_object(
            'vinculoExpediente',
            jsonb_build_object(
              'expedienteId', ${params.expedienteId},
              'documentoId', ${ocr.documento_id},
              'tipoRelacion', ${params.tipoRelacion},
              'esPrincipal', ${params.esPrincipal ?? false},
              'orden', ${params.orden ?? 0},
              'vinculadoEn', now()
            )
          )
      WHERE id = ${params.ocrResultadoId}
      RETURNING *
    `;

    return {
      ocr: ocrUpdatedRows[0] ?? ocr,
      vinculo,
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
  
  async rechazarOcrResultado(
    id: number,
    motivo: string,
    usuarioId?: number,
  ) {
    const motivoFinal: string = motivo?.trim() || 'Rechazado por usuario';
    const usuarioIdFinal: number | null = usuarioId ?? null;

    const rows = await sql`
      UPDATE documentos.ocr_resultados
      SET
        estado = 'rechazado',
        validado_en = now(),
        validado_por = ${usuarioIdFinal},
        metadata =
          jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{estado}',
            to_jsonb('rechazado'::text),
            true
          )
          || jsonb_build_object(
            'rechazo',
            jsonb_build_object(
              'fecha', now(),
              'motivo', ${motivoFinal}
            )
          )
      WHERE id = ${id}
      RETURNING *
    `;

    return rows[0] ?? null;
  }

  async editarOcrResultado(
    id: number,
    input: {
      tipoPropuesto?: string;
      metadata?: Record<string, any>;
      observacion?: string;
    },
    usuarioId?: number,
  ) {
    const currentRows = await sql`
      SELECT *
      FROM documentos.ocr_resultados
      WHERE id = ${id}::integer
      LIMIT 1
    `;

    const current = currentRows[0];

    if (!current) return null;

    const metadataActual = current.metadata?.metadata ?? {};

    const metadataNueva = this.limpiarCamposLegacyOcr({
      ...metadataActual,
      ...(input.metadata ?? {}),
    });

    const metadataSourceActual = current.metadata?.metadataSource ?? {};

    const metadataSourceNueva = {
      ...metadataSourceActual,
      ...Object.fromEntries(
        Object.keys(input.metadata ?? {}).map((key) => [key, 'MANUAL']),
      ),
    };

    const tipoPropuestoFinal =
      input.tipoPropuesto ??
      current.tipo_propuesto ??
      current.metadata?.tipoDocumental ??
      null;

    const clienteAbreviatura =
      current.metadata?.clienteAbreviatura ??
      current.metadata?.metadata?.clienteAbreviatura ??
      current.metadata?.cliente ??
      'BBTI';

    const claveDocumental =
      this.buildClaveDocumental(
        clienteAbreviatura,
        tipoPropuestoFinal,
        metadataNueva,
      ) ?? current.clave_documental;

    const metadataFinal = {
      ...current.metadata,
      estado: 'editado',
      tipoPropuesto: tipoPropuestoFinal,
      tipoDocumental: tipoPropuestoFinal,
      metadata: metadataNueva,
      metadataSource: metadataSourceNueva,
      claveDocumental,
      audit: [
        ...(current.metadata?.audit ?? []),
        {
          accion: 'EDITADO_MANUAL',
          fecha: new Date().toISOString(),
          usuarioId: usuarioId ?? null,
          observacion: input.observacion ?? null,
          cambios: input,
        },
      ],
    };

    const rows = await sql`
      UPDATE documentos.ocr_resultados
      SET
        estado = 'editado',
        tipo_propuesto = ${tipoPropuestoFinal},
        clave_documental = ${claveDocumental},
        metadata = ${JSON.stringify(metadataFinal)}::jsonb
      WHERE id = ${id}::integer
      RETURNING *
    `;

    return rows[0] ?? null;
  }

  private limpiarCamposLegacyOcr<T extends Record<string, any>>(metadata: T): T {
    const legacyKeys = new Set([
      'tipoCodigoExpediente',
      'codigoOp',
      'codigoCentroCosto',
    ]);

    const clean = (value: any): any => {
      if (Array.isArray(value)) {
        return value.map((item) => clean(item));
      }

      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => !legacyKeys.has(key))
            .map(([key, item]) => [key, clean(item)]),
        );
      }

      return value;
    };

    return clean(metadata) as T;
  }

  private tipoRelacionParaExpediente(tipo: string | null): string {
    const tipoKey = String(tipo ?? '').trim().toUpperCase();

    if (tipoKey === 'OC') return 'principal_oc';
    if (tipoKey === 'OS') return 'principal_os';
    if (tipoKey === 'FACTURA') return 'principal_factura';
    if (tipoKey === 'GUIA' || tipoKey === 'GUIA_REMISION') return 'adjunto_guia';
    if (tipoKey === 'NOTA_INGRESO') return 'adjunto_nota_ingreso';
    if (tipoKey === 'RECIBO_HONORARIO') return 'adjunto_recibo_honorario';

    return 'adjunto_documento';
  }

  private async vincularOcrAExpedienteExistente(params: {
    ocrResultadoId: number;
    documentoId: number | null;
    clienteAbreviatura?: string | null;
    codigoExpediente?: string | null;
    tipoPropuesto?: string | null;
  }) {
    const clienteAbreviatura = String(params.clienteAbreviatura ?? '')
      .trim()
      .toUpperCase();
    const codigoExpediente = String(params.codigoExpediente ?? '').trim();

    if (!params.documentoId || !clienteAbreviatura || !codigoExpediente) {
      return null;
    }

    const expedienteRows = await sql`
      SELECT
        e.id,
        e.cliente_destino_id,
        e.empresa_codigo,
        e.codigo_expediente,
        e.descripcion
      FROM core.clientes_destino cd
      JOIN documentos.expedientes e
        ON e.cliente_destino_id = cd.id
      WHERE UPPER(cd.abreviatura) = ${clienteAbreviatura}
        AND e.codigo_expediente = ${codigoExpediente}
      LIMIT 1
    `;

    const expediente = expedienteRows[0];

    if (!expediente) {
      return null;
    }

    const tipoRelacion = this.tipoRelacionParaExpediente(params.tipoPropuesto ?? null);
    const esPrincipal = tipoRelacion.startsWith('principal_');

    const vinculo = await this.upsertExpedienteDocumento({
      expedienteId: expediente.id,
      documentoId: params.documentoId,
      tipoRelacion,
      esPrincipal,
      orden: esPrincipal ? 1 : 0,
    });

    const ocrRows = await sql`
      UPDATE documentos.ocr_resultados
      SET
        metadata = COALESCE(metadata, '{}'::jsonb)
          || jsonb_build_object(
            'vinculoExpediente',
            jsonb_build_object(
              'expedienteId', ${expediente.id},
              'documentoId', ${params.documentoId},
              'clienteDestinoId', ${expediente.cliente_destino_id},
              'codigoExpediente', ${expediente.codigo_expediente},
              'tipoRelacion', ${tipoRelacion},
              'esPrincipal', ${esPrincipal},
              'orden', ${esPrincipal ? 1 : 0},
              'vinculadoEn', now()
            )
          )
      WHERE id = ${params.ocrResultadoId}
      RETURNING *
    `;

    return {
      expediente,
      ocr: ocrRows[0],
      vinculo,
    };
  }

  private async upsertExpedienteDocumento(params: {
    expedienteId: number;
    documentoId: number;
    tipoRelacion: string;
    esPrincipal: boolean;
    orden: number;
  }) {
    const updatedRows = await sql`
      UPDATE documentos.expediente_documentos
      SET
        tipo_relacion = ${params.tipoRelacion},
        es_principal = ${params.esPrincipal},
        orden = ${params.orden}
      WHERE expediente_id = ${params.expedienteId}
        AND documento_id = ${params.documentoId}
      RETURNING
        expediente_id,
        documento_id,
        tipo_relacion,
        es_principal,
        orden
    `;

    if (updatedRows[0]) {
      return updatedRows[0];
    }

    const insertedRows = await sql`
      INSERT INTO documentos.expediente_documentos (
        expediente_id,
        documento_id,
        tipo_relacion,
        es_principal,
        orden
      )
      SELECT
        ${params.expedienteId},
        ${params.documentoId},
        ${params.tipoRelacion},
        ${params.esPrincipal},
        ${params.orden}
      WHERE NOT EXISTS (
        SELECT 1
        FROM documentos.expediente_documentos
        WHERE expediente_id = ${params.expedienteId}
          AND documento_id = ${params.documentoId}
      )
      RETURNING
        expediente_id,
        documento_id,
        tipo_relacion,
        es_principal,
        orden
    `;

    return insertedRows[0] ?? null;
  }

  private buildClaveDocumental(
    cliente: string,
    tipo: string | null,
    metadata: Record<string, any>,
  ): string | null {
    const clienteKey = String(cliente || 'BBTI').trim().toUpperCase();
    const tipoKey = String(tipo || '').trim().toUpperCase();

    const clean = (v: any) => {
      if (v === null || v === undefined) return null;
      const text = String(v).trim();
      return text.length ? text : null;
    };

    const ruc = clean(metadata.ruc);
    const serie = clean(metadata.serie);
    const numero = clean(metadata.numero);
    const numeroOperacion = clean(metadata.numeroOperacion);

    if (['FACTURA', 'GUIA_REMISION', 'NOTA_CREDITO', 'RECIBO_HONORARIO'].includes(tipoKey)) {
      if (clienteKey && ruc && serie && numero) {
        return `${clienteKey}|${tipoKey}|${ruc}|${serie}|${numero}`;
      }
    }

    if (['OC', 'OS', 'NOTA_INGRESO'].includes(tipoKey)) {
      if (clienteKey && numero) {
        return `${clienteKey}|${tipoKey}|${numero}`;
      }
    }

    if (['PAGO_TRANSFERENCIA', 'PAGO_DETRACCION'].includes(tipoKey)) {
      if (clienteKey && numeroOperacion) {
        return `${clienteKey}|${tipoKey}|${numeroOperacion}`;
      }
    }

    return null;
  }

}
