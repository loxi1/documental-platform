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


  async findArchivosByDocumentoId(documentoId: number) {
    return sql`
      SELECT
        da.id,
        da.documento_id,
        da.nombre_archivo,
        da.tipo_version,
        da.version,
        da.es_version_actual,
        da.estado,
        da.creado_en,
        da.area_origen,
        da.origen_archivo,
        da.observacion,
        da.storage_provider,
        da.storage_bucket,
        da.storage_key,
        da.hash_sha256,
        da.metadata->'versionado' AS versionado,
        ocr.id AS ocr_resultado_id,
        ocr.estado AS ocr_estado,
        ocr.validado_en AS ocr_validado_en,
        ocr.metadata->'versionado' AS ocr_versionado
      FROM documentos.documentos_archivos da
      LEFT JOIN LATERAL (
        SELECT
          o.id,
          o.estado,
          o.validado_en,
          o.metadata
        FROM documentos.ocr_resultados o
        WHERE o.archivo_id = da.id
        ORDER BY o.id DESC
        LIMIT 1
      ) ocr ON true
      WHERE da.documento_id = ${documentoId}::int
        AND da.estado <> 'duplicado_absorbido'
      ORDER BY COALESCE(da.version, 0) DESC, da.creado_en DESC, da.id DESC
    `;
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

    let vinculo: any = null;

    try {
      vinculo = await this.vincularOcrAExpedienteExistente({
        ocrResultadoId: rows[0].id,
        documentoId: params.documentoId,
        clienteAbreviatura: metadataSanitizada.clienteAbreviatura,
        codigoExpediente: metadataSanitizada.metadata?.codigoExpediente,
        tipoPropuesto: params.tipoPropuesto,
      });
    } catch (error) {
      console.error(
        '[OCR] Error posterior al guardado vinculando expediente existente',
        {
          ocrResultadoId: rows[0].id,
          documentoId: params.documentoId,
          clienteAbreviatura: metadataSanitizada.clienteAbreviatura,
          codigoExpediente: metadataSanitizada.metadata?.codigoExpediente,
          error,
        },
      );
    }

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
        NULLIF(o.metadata #>> '{vinculoExpediente,expedienteId}', '')::int AS expediente_id
      FROM documentos.ocr_resultados o
      LEFT JOIN documentos.documentos_archivos da
        ON da.id = o.archivo_id
      WHERE (${filters.estado ?? null}::text IS NULL OR o.estado = ${filters.estado ?? null})
        AND (
          ${filters.soloNoVinculados ?? false}::boolean = false
          OR o.metadata->'vinculoExpediente' IS NULL
        )
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


  async confirmarOcrResultadoConExpediente(
    id: number,
    input: {
      expedienteId: number;
      tipoRelacion?: string;
      esPrincipal?: boolean;
      orden?: number;
      metadata?: Record<string, any>;
      observacion?: string;
    },
    usuarioId?: number,
  ) {
    return sql.begin(async (tx) => {
      const ocrRows = await tx`
        SELECT *
        FROM documentos.ocr_resultados
        WHERE id = ${id}::int
        FOR UPDATE
        LIMIT 1
      `;

      const ocr = ocrRows[0];

      if (!ocr) return null;

      if (!ocr.documento_id) {
        this.throwDomainError(
          'OCR_VALIDACION_INVALIDA',
          'El resultado OCR no tiene documento asociado',
          { ocrResultadoId: id },
        );
      }

      const expedienteRows = await tx`
        SELECT
          e.id,
          e.empresa_codigo,
          e.codigo_expediente,
          e.descripcion,
          e.cliente_destino_id,
          cd.abreviatura AS cliente_abreviatura,
          cd.ruc AS ruc_comprador
        FROM documentos.expedientes e
        JOIN core.clientes_destino cd
          ON cd.id = e.cliente_destino_id
        WHERE e.id = ${input.expedienteId}::bigint
        LIMIT 1
      `;

      const expediente = expedienteRows[0];

      if (!expediente) {
        this.throwDomainError(
          'EXPEDIENTE_NO_ENCONTRADO',
          `Expediente ${input.expedienteId} no encontrado`,
          { expedienteId: input.expedienteId },
        );
      }

      const metadataActual = ocr.metadata?.metadata ?? {};
      const metadataEntrada = this.limpiarCamposLegacyOcr({
        ...metadataActual,
        ...(input.metadata ?? {}),
      });

      const tipoDocumental = this.normalizarTipoDocumentalConfirmacion(
        metadataEntrada.tipoDocumental ??
          input.metadata?.tipoDocumental ??
          ocr.tipo_propuesto ??
          '',
      );

      if (!tipoDocumental) {
        this.throwDomainError(
          'OCR_VALIDACION_INVALIDA',
          'El tipo documental es obligatorio',
          { campo: 'tipoDocumental' },
        );
      }

      const clienteAbreviatura = String(
        metadataEntrada.clienteAbreviatura ??
          expediente.cliente_abreviatura ??
          expediente.empresa_codigo ??
          '',
      )
        .trim()
        .toUpperCase();

      const metadataFinal = this.limpiarCamposLegacyOcr({
        ...metadataEntrada,
        tipoDocumental,
        clienteAbreviatura,
        rucComprador: String(expediente.ruc_comprador ?? '').trim(),
        codigoExpediente: String(expediente.codigo_expediente ?? '').trim(),
      });

      const metadataSourceOverrides: Record<string, string> = {};
      await this.completarProveedorDesdeCatalogoTx(
        tx,
        tipoDocumental,
        metadataFinal,
        metadataSourceOverrides,
      );

      this.validarMetadataConfirmacion(tipoDocumental, metadataFinal);

      const claveDocumental = this.buildClaveDocumental(
        clienteAbreviatura,
        tipoDocumental,
        metadataFinal,
      );

      if (!claveDocumental) {
        this.throwDomainError(
          'OCR_VALIDACION_INVALIDA',
          'No se pudo calcular la clave documental con los campos enviados',
          { tipoDocumental, metadata: metadataFinal },
        );
      }

      metadataFinal.claveDocumental = claveDocumental;

      const tipoRelacion = this.normalizarTipoRelacionConfirmacion(
        tipoDocumental,
        input.tipoRelacion,
      );
      const esPrincipal = tipoRelacion.startsWith('principal_');
      const orden = esPrincipal ? 1 : Number(input.orden ?? 0);

      const duplicadoRows = await tx`
        SELECT
          d.id AS documento_id,
          d.clave_documental,
          ed.expediente_id,
          ed.tipo_relacion,
          ed.es_principal
        FROM documentos.documentos d
        JOIN documentos.expediente_documentos ed
          ON ed.documento_id = d.id
        WHERE ed.expediente_id = ${Number(expediente.id)}::bigint
          AND d.clave_documental = ${claveDocumental}
          AND d.id <> ${Number(ocr.documento_id)}::bigint
        LIMIT 1
      `;

      if (duplicadoRows[0]) {
        this.throwDomainError(
          'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE',
          'Ya existe otro documento con la misma clave documental en el expediente',
          {
            expedienteId: Number(expediente.id),
            documentoIdExistente: Number(duplicadoRows[0].documento_id),
            documentoIdActual: Number(ocr.documento_id),
            archivoIdActual: Number(ocr.archivo_id),
            claveDocumental,
            suggestedAction: 'AGREGAR_VERSION',
          },
        );
      }

      const metadataSourceActual = ocr.metadata?.metadataSource ?? {};
      const metadataSourceFinal = {
        ...metadataSourceActual,
        ...Object.fromEntries(Object.keys(metadataFinal).map((key) => [key, 'MANUAL'])),
        ...metadataSourceOverrides,
      };

      const metadataOcrFinal = this.limpiarCamposLegacyOcr({
        ...(ocr.metadata ?? {}),
        estado: 'confirmado',
        tipoPropuesto: tipoDocumental,
        tipoDocumental,
        claveDocumental,
        metadata: metadataFinal,
        metadataSource: metadataSourceFinal,
        audit: [
          ...(ocr.metadata?.audit ?? []),
          {
            accion: 'CONFIRMADO_CON_EXPEDIENTE',
            fecha: new Date().toISOString(),
            usuarioId: usuarioId ?? null,
            observacion: input.observacion ?? null,
            cambios: {
              metadata: metadataFinal,
              tipoPropuesto: tipoDocumental,
              tipoRelacion,
              expedienteId: Number(expediente.id),
            },
          },
        ],
        contextoValidacion: {
          ...(metadataFinal.contextoValidacion ?? {}),
          origen: metadataFinal.contextoValidacion?.origen ?? 'COMPRAS_EDITAR_MODAL',
          confirmadoDesde: metadataFinal.contextoValidacion?.confirmadoDesde ?? 'compras_editar',
          expedienteId: Number(expediente.id),
          codigoExpediente: String(expediente.codigo_expediente ?? ''),
          tipoRelacionSugerida: tipoRelacion,
        },
      });

      if (esPrincipal) {
        await tx`
          UPDATE documentos.expediente_documentos
          SET es_principal = false
          WHERE expediente_id = ${Number(expediente.id)}::bigint
            AND tipo_relacion LIKE 'principal_%'
        `;
      }

      const documentoRows = await tx`
        UPDATE documentos.documentos d
        SET
          cliente_abreviatura = ${clienteAbreviatura}::text,
          tipo_documental = ${tipoDocumental}::text,
          estado = 'confirmado',
          ruc_emisor = COALESCE(
            ${metadataFinal.rucProveedor ?? metadataFinal.rucEmisor ?? metadataFinal.ruc ?? null}::text,
            d.ruc_emisor
          ),
          razon_social_emisor = COALESCE(
            ${metadataFinal.proveedor ?? metadataFinal.razonSocial ?? metadataFinal.razonSocialEmisor ?? null}::text,
            d.razon_social_emisor
          ),
          serie = COALESCE(${metadataFinal.serie ?? null}::text, d.serie),
          numero = COALESCE(${metadataFinal.numero ?? null}::text, d.numero),
          fecha_emision = COALESCE(NULLIF(${metadataFinal.fechaEmision ?? null}::text, '')::date, d.fecha_emision),
          moneda = COALESCE(${metadataFinal.moneda ?? null}::text, d.moneda),
          monto_total = COALESCE(NULLIF(${metadataFinal.montoTotal ?? null}::text, '')::numeric, d.monto_total),
          clave_documental = ${claveDocumental}::text,
          metadata = COALESCE(d.metadata, '{}'::jsonb)
            || jsonb_build_object(
              'ocr', ${JSON.stringify(metadataOcrFinal)}::jsonb,
              'rucComprador', ${metadataFinal.rucComprador ?? null}::text,
              'codigoExpediente', ${metadataFinal.codigoExpediente ?? null}::text,
              'tipoRelacion', ${tipoRelacion}::text
            ),
          actualizado_en = now()
        WHERE d.id = ${Number(ocr.documento_id)}::bigint
        RETURNING *
      `;

      const documento = documentoRows[0];

      if (!documento) {
        this.throwDomainError(
          'OCR_VALIDACION_INVALIDA',
          `Documento ${ocr.documento_id} no encontrado`,
          { documentoId: ocr.documento_id },
        );
      }

      if (tipoDocumental === 'FACTURA') {
        await tx`
          INSERT INTO documentos.documentos_factura (
            documento_id,
            ruc_emisor,
            serie,
            numero,
            fecha_emision,
            total
          )
          VALUES (
            ${Number(ocr.documento_id)}::bigint,
            ${metadataFinal.rucProveedor ?? metadataFinal.rucEmisor ?? metadataFinal.ruc ?? null}::text,
            ${metadataFinal.serie ?? null}::text,
            ${metadataFinal.numero ?? null}::text,
            NULLIF(${metadataFinal.fechaEmision ?? null}::text, '')::date,
            NULLIF(${metadataFinal.montoTotal ?? null}::text, '')::numeric
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

      const vinculoRows = await tx`
        UPDATE documentos.expediente_documentos
        SET
          tipo_relacion = ${tipoRelacion}::text,
          es_principal = ${esPrincipal}::boolean,
          orden = ${orden}::int
        WHERE expediente_id = ${Number(expediente.id)}::bigint
          AND documento_id = ${Number(ocr.documento_id)}::bigint
        RETURNING
          expediente_id,
          documento_id,
          tipo_relacion,
          es_principal,
          orden,
          creado_en
      `;

      let vinculo = vinculoRows[0] ?? null;

      if (!vinculo) {
        const insertedRows = await tx`
          INSERT INTO documentos.expediente_documentos (
            expediente_id,
            documento_id,
            tipo_relacion,
            es_principal,
            orden
          )
          VALUES (
            ${Number(expediente.id)}::bigint,
            ${Number(ocr.documento_id)}::bigint,
            ${tipoRelacion}::text,
            ${esPrincipal}::boolean,
            ${orden}::int
          )
          RETURNING
            expediente_id,
            documento_id,
            tipo_relacion,
            es_principal,
            orden,
            creado_en
        `;
        vinculo = insertedRows[0] ?? null;
      }

      const ocrUpdatedRows = await tx`
        UPDATE documentos.ocr_resultados
        SET
          estado = 'confirmado',
          tipo_propuesto = ${tipoDocumental}::text,
          clave_documental = ${claveDocumental}::text,
          validado_en = now(),
          validado_por = ${usuarioId ?? null}::int,
          expediente_id = ${Number(expediente.id)}::bigint,
          vinculado_en = now(),
          metadata = ${JSON.stringify({
            ...metadataOcrFinal,
            vinculoExpediente: {
              expedienteId: Number(expediente.id),
              documentoId: Number(ocr.documento_id),
              clienteDestinoId: Number(expediente.cliente_destino_id),
              empresaCodigo: String(expediente.empresa_codigo ?? ''),
              codigoExpediente: String(expediente.codigo_expediente ?? ''),
              tipoRelacion,
              esPrincipal,
              orden,
              vinculadoEn: new Date().toISOString(),
            },
          })}::jsonb
        WHERE id = ${id}::int
        RETURNING *
      `;

      return {
        ok: true,
        ocrResultado: ocrUpdatedRows[0],
        documento,
        expediente: {
          id: Number(expediente.id),
          empresaCodigo: expediente.empresa_codigo,
          codigoExpediente: expediente.codigo_expediente,
          descripcion: expediente.descripcion,
          clienteDestinoId: Number(expediente.cliente_destino_id),
          clienteAbreviatura,
          rucComprador: metadataFinal.rucComprador,
        },
        vinculo,
        tipoDocumental,
        tipoRelacion,
        claveDocumental,
        estado: 'confirmado',
      };
    });
  }


  async agregarArchivoComoVersion(params: {
    documentoId: number;
    archivoId: number;
    tipoVersion?: string | null;
    observacion?: string | null;
    marcarComoActual?: boolean;
    usuarioId?: number | null;
  }) {
    return sql.begin(async (tx) => {
      const documentoRows = await tx`
        SELECT *
        FROM documentos.documentos
        WHERE id = ${params.documentoId}::int
        LIMIT 1
      `;

      const documento = documentoRows[0];
      if (!documento) {
        this.throwDomainError(
          'DOCUMENTO_NO_ENCONTRADO',
          `Documento ${params.documentoId} no encontrado`,
          { documentoId: params.documentoId },
        );
      }

      const archivoRows = await tx`
        SELECT *
        FROM documentos.documentos_archivos
        WHERE id = ${params.archivoId}::int
        FOR UPDATE
        LIMIT 1
      `;

      const archivo = archivoRows[0];
      if (!archivo) {
        this.throwDomainError(
          'ARCHIVO_NO_ENCONTRADO',
          `Archivo ${params.archivoId} no encontrado`,
          { archivoId: params.archivoId },
        );
      }

      const documentoAnteriorId = archivo.documento_id
        ? Number(archivo.documento_id)
        : null;
      const marcarComoActual = params.marcarComoActual !== false;
      const tipoVersion = String(params.tipoVersion ?? archivo.tipo_version ?? 'evidencia')
        .trim()
        .toLowerCase();

      await tx`
        WITH stats AS (
          SELECT COALESCE(MAX(version), 0)::int AS max_version
          FROM documentos.documentos_archivos
          WHERE documento_id = ${params.documentoId}::int
            AND id <> ${params.archivoId}::int
            AND version IS NOT NULL
        ), null_versions AS (
          SELECT
            da.id,
            stats.max_version + ROW_NUMBER() OVER (ORDER BY da.creado_en ASC, da.id ASC) AS normalized_version
          FROM documentos.documentos_archivos da
          CROSS JOIN stats
          WHERE da.documento_id = ${params.documentoId}::int
            AND da.id <> ${params.archivoId}::int
            AND da.version IS NULL
        )
        UPDATE documentos.documentos_archivos da
        SET
          version = null_versions.normalized_version::int,
          tipo_version = COALESCE(NULLIF(da.tipo_version, ''), 'original')
        FROM null_versions
        WHERE da.id = null_versions.id
      `;

      const versionRows = await tx`
        SELECT COALESCE(MAX(version), 0)::int + 1 AS siguiente_version
        FROM documentos.documentos_archivos
        WHERE documento_id = ${params.documentoId}::int
          AND id <> ${params.archivoId}::int
      `;

      const siguienteVersion = Number(versionRows[0]?.siguiente_version ?? 1);

      if (marcarComoActual) {
        await tx`
          UPDATE documentos.documentos_archivos
          SET es_version_actual = false
          WHERE documento_id = ${params.documentoId}::int
            AND id <> ${params.archivoId}::int
        `;
      }

      const archivoActualizadoRows = await tx`
        UPDATE documentos.documentos_archivos
        SET
          documento_id = ${params.documentoId}::int,
          tipo_version = ${tipoVersion}::text,
          version = ${siguienteVersion}::int,
          es_version_actual = ${marcarComoActual}::boolean,
          estado = 'activo',
          observacion = COALESCE(${params.observacion ?? null}::text, observacion),
          metadata = COALESCE(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'versionado',
              jsonb_build_object(
                'accion', 'AGREGADO_COMO_VERSION'::text,
                'documentoIdDestino', ${params.documentoId}::int,
                'documentoIdAnterior', ${documentoAnteriorId ?? null}::int,
                'archivoId', ${params.archivoId}::int,
                'tipoVersion', ${tipoVersion}::text,
                'version', ${siguienteVersion}::int,
                'esVersionActual', ${marcarComoActual}::boolean,
                'observacion', ${params.observacion ?? null}::text,
                'usuarioId', ${params.usuarioId ?? null}::int,
                'fecha', now()
              )
            )
        WHERE id = ${params.archivoId}::int
        RETURNING *
      `;

      const archivoActualizado = archivoActualizadoRows[0];

      if (
        documentoAnteriorId &&
        documentoAnteriorId !== Number(params.documentoId)
      ) {
        await tx`
          UPDATE documentos.documentos
          SET
            estado = 'duplicado_versionado',
            metadata = COALESCE(metadata, '{}'::jsonb)
              || jsonb_build_object(
                'duplicadoVersionado',
                jsonb_build_object(
                  'documentoIdDestino', ${params.documentoId}::int,
                  'archivoIdMovido', ${params.archivoId}::int,
                  'fecha', now()
                )
              ),
            actualizado_en = now()
          WHERE id = ${documentoAnteriorId}::int
        `;
      }

      const ocrRows = await tx`
        UPDATE documentos.ocr_resultados
        SET
          documento_id = ${params.documentoId}::int,
          estado = 'confirmado_como_version',
          validado_en = COALESCE(validado_en, now()),
          vinculado_en = COALESCE(vinculado_en, now()),
          metadata = COALESCE(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'documentoId', ${params.documentoId}::int,
              'versionado',
              jsonb_build_object(
                'accion', 'ARCHIVO_AGREGADO_COMO_VERSION'::text,
                'documentoIdDestino', ${params.documentoId}::int,
                'documentoIdAnterior', ${documentoAnteriorId ?? null}::int,
                'archivoId', ${params.archivoId}::int,
                'fecha', now()
              )
            )
        WHERE archivo_id = ${params.archivoId}::int
        RETURNING *
      `;

      return {
        ok: true,
        documento,
        archivo: archivoActualizado,
        ocrResultado: ocrRows[0] ?? null,
        documentoId: Number(params.documentoId),
        archivoId: Number(params.archivoId),
        documentoAnteriorId,
        tipoVersion,
        version: archivoActualizado?.version ?? siguienteVersion,
        esVersionActual: archivoActualizado?.es_version_actual ?? marcarComoActual,
      };
    });
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
      WHERE UPPER(cd.abreviatura) = ${clienteAbreviatura}::text
        AND e.codigo_expediente = ${codigoExpediente}::text
      LIMIT 1
    `;

    const expediente = expedienteRows[0];

    if (!expediente) {
      return null;
    }

    const tipoRelacion = this.tipoRelacionParaExpediente(
      params.tipoPropuesto ?? null,
    );

    const esPrincipal = tipoRelacion.startsWith('principal_');
    const orden = esPrincipal ? 1 : 0;

    const vinculo = await this.upsertExpedienteDocumento({
      expedienteId: Number(expediente.id),
      documentoId: Number(params.documentoId),
      tipoRelacion,
      esPrincipal,
      orden,
    });

    const ocrRows = await sql`
      UPDATE documentos.ocr_resultados
      SET metadata = COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'vinculoExpediente',
          jsonb_build_object(
            'expedienteId', ${Number(expediente.id)}::bigint,
            'documentoId', ${Number(params.documentoId)}::int,
            'clienteDestinoId', ${Number(expediente.cliente_destino_id)}::int,
            'empresaCodigo', ${String(expediente.empresa_codigo ?? '')}::text,
            'codigoExpediente', ${String(expediente.codigo_expediente ?? '')}::text,
            'tipoRelacion', ${tipoRelacion}::text,
            'esPrincipal', ${esPrincipal}::boolean,
            'orden', ${orden}::int,
            'vinculadoEn', now()
          )
        )
      WHERE id = ${params.ocrResultadoId}::int
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


  private async completarProveedorDesdeCatalogoTx(
    tx: any,
    tipoDocumental: string,
    metadata: Record<string, any>,
    metadataSourceOverrides: Record<string, string>,
  ) {
    const tipoKey = String(tipoDocumental ?? '').trim().toUpperCase();

    if (!['FACTURA', 'OC', 'OS', 'GUIA_REMISION', 'RECIBO_HONORARIO'].includes(tipoKey)) {
      return;
    }

    const proveedorActual = this.cleanText(
      metadata.proveedor ?? metadata.razonSocial ?? metadata.razonSocialEmisor,
    );

    if (proveedorActual) {
      return;
    }

    const rucProveedor = this.cleanText(
      metadata.rucProveedor ?? metadata.rucEmisor ?? metadata.ruc,
    );

    if (!this.isValidRuc(rucProveedor)) {
      return;
    }

    const proveedor = await this.findProveedorCatalogoByRucTx(tx, rucProveedor);

    if (!proveedor?.razon_social) {
      return;
    }

    const razonSocial = String(proveedor.razon_social).trim();

    metadata.proveedor = razonSocial;
    metadata.razonSocial = razonSocial;
    metadata.razonSocialEmisor = razonSocial;

    if (proveedor.direccion) {
      metadata.direccionProveedor = proveedor.direccion;
    }

    if (proveedor.tipo_persona) {
      metadata.tipoPersonaProveedor = proveedor.tipo_persona;
    }

    metadata.proveedorOrigen = 'CATALOGO_PROVEEDORES';

    metadataSourceOverrides.proveedor = 'CATALOGO_PROVEEDORES';
    metadataSourceOverrides.razonSocial = 'CATALOGO_PROVEEDORES';
    metadataSourceOverrides.razonSocialEmisor = 'CATALOGO_PROVEEDORES';
    metadataSourceOverrides.direccionProveedor = 'CATALOGO_PROVEEDORES';
    metadataSourceOverrides.tipoPersonaProveedor = 'CATALOGO_PROVEEDORES';
    metadataSourceOverrides.proveedorOrigen = 'SISTEMA';
  }

  private async findProveedorCatalogoByRucTx(tx: any, ruc: string) {
    const rows = await tx`
      SELECT
        ruc,
        razon_social,
        direccion,
        tipo_persona
      FROM core.proveedores
      WHERE ruc = ${ruc}::text
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  private cleanText(value: any): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text.length ? text : null;
  }

  private isValidRuc(value: any): value is string {
    const text = this.cleanText(value);
    return !!text && /^\d{11}$/.test(text);
  }


  private normalizarTipoDocumentalConfirmacion(tipo: string | null | undefined): string {
    const tipoKey = String(tipo ?? '').trim().toUpperCase();

    if (tipoKey === 'GUIA' || tipoKey === 'GUÍA') return 'GUIA_REMISION';

    return tipoKey;
  }

  private normalizarTipoRelacionConfirmacion(
    tipo: string,
    tipoRelacion?: string | null,
  ): string {
    const tipoFinal = this.normalizarTipoDocumentalConfirmacion(tipo);
    const tipoRelacionInput = String(tipoRelacion ?? '').trim();
    const tipoRelacionPorTipo = this.tipoRelacionParaExpediente(tipoFinal);

    if (tipoRelacionInput.startsWith('principal_') && tipoRelacionPorTipo.startsWith('principal_')) {
      return tipoRelacionPorTipo;
    }

    if (tipoRelacionInput) {
      return tipoRelacionInput;
    }

    return tipoRelacionPorTipo;
  }

  private validarMetadataConfirmacion(
    tipo: string,
    metadata: Record<string, any>,
  ) {
    const tipoKey = this.normalizarTipoDocumentalConfirmacion(tipo);
    const faltantes: string[] = [];
    const has = (key: string) => {
      const value = metadata[key];
      return value !== null && value !== undefined && String(value).trim() !== '';
    };
    const hasAny = (...keys: string[]) => keys.some((key) => has(key));

    if (!has('codigoExpediente')) faltantes.push('codigoExpediente');
    if (!has('fechaEmision')) faltantes.push('fechaEmision');

    if (tipoKey === 'OC' || tipoKey === 'OS') {
      if (!has('numero')) faltantes.push('numero');
      if (!hasAny('proveedor', 'razonSocial', 'razonSocialEmisor')) faltantes.push('proveedor');
      if (!hasAny('rucProveedor', 'rucEmisor', 'ruc')) faltantes.push('rucProveedor');
      if (!has('montoTotal')) faltantes.push('montoTotal');
    }

    if (tipoKey === 'FACTURA') {
      if (!has('serie')) faltantes.push('serie');
      if (!has('numero')) faltantes.push('numero');
      if (!hasAny('rucProveedor', 'rucEmisor', 'ruc')) faltantes.push('rucProveedor');
      if (!hasAny('proveedor', 'razonSocial', 'razonSocialEmisor')) faltantes.push('proveedor');
      if (!has('montoTotal')) faltantes.push('montoTotal');
    }

    if (tipoKey === 'GUIA_REMISION') {
      if (!has('serie')) faltantes.push('serie');
      if (!has('numero')) faltantes.push('numero');
      if (!hasAny('rucProveedor', 'rucEmisor', 'ruc')) faltantes.push('rucProveedor');
      if (!hasAny('proveedor', 'razonSocial', 'razonSocialEmisor')) faltantes.push('proveedor');
    }

    if (faltantes.length) {
      this.throwDomainError(
        'OCR_VALIDACION_INVALIDA',
        `Faltan campos obligatorios para confirmar ${tipoKey}: ${faltantes.join(', ')}`,
        { tipoDocumental: tipoKey, faltantes },
      );
    }
  }

  private throwDomainError(code: string, message: string, details?: any): never {
    const error = new Error(message) as Error & { code?: string; details?: any };
    error.code = code;
    error.details = details ?? null;
    throw error;
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

    const ruc = clean(metadata.ruc ?? metadata.rucProveedor ?? metadata.rucEmisor);
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
