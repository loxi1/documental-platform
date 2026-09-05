import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

type ExpedienteAuditContext = {
  usuarioId?: number | null;
  usuarioEmail?: string | null;
  perfil?: string | null;
  requestId?: string | null;
  sessionContextId?: string | null;
};

@Injectable()
export class ExpedientesRepository {

  private toUuidOrNull(value?: string | null) {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : null;
  }

  async findMantenimiento(filters: {
    empresa?: string;
    clienteDestinoId?: number;
    estado?: string;
    q?: string;
    limit?: number;
    offset?: number;
    page?: number;
    pageSize?: number;
  }) {
    const requestedPage = Math.max(Number(filters.page ?? 1), 1);
    const requestedPageSize = Math.min(
      Math.max(Number(filters.pageSize ?? filters.limit ?? 50), 1),
      200,
    );
    const limit = requestedPageSize;
    const offset =
      filters.offset !== undefined
        ? Math.max(Number(filters.offset ?? 0), 0)
        : (requestedPage - 1) * requestedPageSize;
    const page = Math.floor(offset / limit) + 1;
    const empresa = filters.empresa?.trim().toUpperCase() || null;
    const estado = filters.estado?.trim() || null;
    const clienteDestinoId = Number(filters.clienteDestinoId ?? NaN);
    const clienteDestinoIdParam =
      Number.isFinite(clienteDestinoId) && clienteDestinoId > 0
        ? clienteDestinoId
        : null;
    const q = filters.q?.trim() || null;
    const like = q ? `%${q}%` : null;

    const rows = await sql`
      SELECT
        e.id,
        e.id AS "expedienteId",
        e.empresa_codigo AS "empresaCodigo",
        e.codigo_expediente AS "codigoExpediente",
        e.descripcion,
        e.cliente_destino_id AS "clienteDestinoId",
        cd.nombre_oficial AS "clienteNombre",
        cd.abreviatura AS "clienteAbreviatura",
        cd.ruc AS "clienteRuc",
        e.estado,
        e.metadata,
        COUNT(DISTINCT ed.documento_id)::int AS "totalDocumentos",
        COALESCE(BOOL_OR(ed.es_principal IS TRUE), false) AS "tieneDocumentoPrincipal",
        e.creado_por AS "creadoPor",
        e.actualizado_por AS "actualizadoPor",
        e.anulado_en AS "anuladoEn",
        e.anulado_por AS "anuladoPor",
        e.motivo_anulacion AS "motivoAnulacion",
        e.creado_en AS "creadoEn",
        e.actualizado_en AS "actualizadoEn"
      FROM documentos.expedientes e
      LEFT JOIN core.clientes_destino cd
        ON cd.id = e.cliente_destino_id
      LEFT JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      WHERE (${empresa}::text IS NULL OR e.empresa_codigo = ${empresa})
        AND (${estado}::text IS NULL OR e.estado = ${estado})
        AND (${clienteDestinoIdParam}::int IS NULL OR e.cliente_destino_id = ${clienteDestinoIdParam})
        AND (
          ${like}::text IS NULL
          OR e.codigo_expediente ILIKE ${like}
          OR e.descripcion ILIKE ${like}
          OR e.empresa_codigo ILIKE ${like}
          OR cd.nombre_oficial ILIKE ${like}
          OR cd.abreviatura ILIKE ${like}
          OR cd.ruc ILIKE ${like}
        )
      GROUP BY e.id, cd.id
      ORDER BY e.actualizado_en DESC NULLS LAST, e.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM documentos.expedientes e
      LEFT JOIN core.clientes_destino cd
        ON cd.id = e.cliente_destino_id
      WHERE (${empresa}::text IS NULL OR e.empresa_codigo = ${empresa})
        AND (${estado}::text IS NULL OR e.estado = ${estado})
        AND (${clienteDestinoIdParam}::int IS NULL OR e.cliente_destino_id = ${clienteDestinoIdParam})
        AND (
          ${like}::text IS NULL
          OR e.codigo_expediente ILIKE ${like}
          OR e.descripcion ILIKE ${like}
          OR e.empresa_codigo ILIKE ${like}
          OR cd.nombre_oficial ILIKE ${like}
          OR cd.abreviatura ILIKE ${like}
          OR cd.ruc ILIKE ${like}
        )
    `;

    const total = countRows[0]?.total ?? 0;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return {
      items: rows,
      total,
      limit,
      offset,
      page,
      pageSize: limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      filters: {
        empresa,
        clienteDestinoId: clienteDestinoIdParam,
        estado,
        q,
      },
    };
  }

  async findMantenimientoById(id: number) {
    const rows = await sql`
      SELECT
        e.id,
        e.id AS "expedienteId",
        e.empresa_codigo AS "empresaCodigo",
        e.codigo_expediente AS "codigoExpediente",
        e.descripcion,
        e.cliente_destino_id AS "clienteDestinoId",
        cd.nombre_oficial AS "clienteNombre",
        cd.abreviatura AS "clienteAbreviatura",
        cd.ruc AS "clienteRuc",
        e.estado,
        e.metadata,
        COUNT(DISTINCT ed.documento_id)::int AS "totalDocumentos",
        COALESCE(BOOL_OR(ed.es_principal IS TRUE), false) AS "tieneDocumentoPrincipal",
        e.creado_por AS "creadoPor",
        e.actualizado_por AS "actualizadoPor",
        e.anulado_en AS "anuladoEn",
        e.anulado_por AS "anuladoPor",
        e.motivo_anulacion AS "motivoAnulacion",
        e.creado_en AS "creadoEn",
        e.actualizado_en AS "actualizadoEn"
      FROM documentos.expedientes e
      LEFT JOIN core.clientes_destino cd
        ON cd.id = e.cliente_destino_id
      LEFT JOIN documentos.expediente_documentos ed
        ON ed.expediente_id = e.id
      WHERE e.id = ${id}
      GROUP BY e.id, cd.id
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async existsMantenimientoDuplicate(params: {
    empresaCodigo: string;
    clienteDestinoId: number;
    codigoExpediente: string;
    excludeId?: number;
  }) {
    const rows = await sql`
      SELECT id
      FROM documentos.expedientes
      WHERE empresa_codigo = ${params.empresaCodigo}
        AND cliente_destino_id = ${params.clienteDestinoId}
        AND codigo_expediente = ${params.codigoExpediente}
        AND (${params.excludeId ?? null}::bigint IS NULL OR id <> ${params.excludeId ?? null})
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async expedienteTieneDocumentoPrincipal(id: number) {
    const rows = await sql`
      SELECT 1
      FROM documentos.expediente_documentos
      WHERE expediente_id = ${id}::bigint
        AND es_principal IS TRUE
      LIMIT 1
    `;

    return Boolean(rows[0]);
  }

  async createMantenimiento(data: {
    clienteDestinoId: number;
    empresaCodigo: string;
    codigoExpediente: string;
    descripcion?: string | null;
    estado?: string | null;
    metadata?: Record<string, any> | null;
    audit?: ExpedienteAuditContext | null;
  }) {
    const rows = await sql`
      INSERT INTO documentos.expedientes (
        cliente_destino_id,
        empresa_codigo,
        codigo_expediente,
        descripcion,
        estado,
        metadata,
        creado_por,
        actualizado_por,
        creado_en,
        actualizado_en
      )
      VALUES (
        ${data.clienteDestinoId},
        ${data.empresaCodigo},
        ${data.codigoExpediente},
        ${data.descripcion ?? null},
        ${data.estado ?? 'abierto'},
        ${JSON.stringify(data.metadata ?? {})}::jsonb,
        ${data.audit?.usuarioId ?? null}::bigint,
        ${data.audit?.usuarioId ?? null}::bigint,
        now(),
        now()
      )
      RETURNING id
    `;

    const expediente = await this.findMantenimientoById(Number(rows[0]?.id));

    if (expediente) {
      await this.registrarAuditoriaMantenimiento({
        expedienteId: Number(expediente.id),
        accion: 'expediente.creado',
        estadoNuevo: expediente.estado,
        codigoNuevo: expediente.codigoExpediente,
        descripcionNueva: expediente.descripcion,
        metadataNueva: expediente.metadata ?? {},
        empresaCodigo: expediente.empresaCodigo,
        clienteDestinoId: Number(expediente.clienteDestinoId),
        audit: data.audit,
      });
    }

    return expediente;
  }

  async updateMantenimiento(
    id: number,
    data: {
      codigoExpediente?: string;
      descripcion?: string | null;
      estado?: string;
      metadata?: Record<string, any> | null;
      audit?: ExpedienteAuditContext | null;
    },
  ) {
    const current = await this.findMantenimientoById(id);

    if (!current) {
      return null;
    }

    const nuevoCodigo = data.codigoExpediente ?? current.codigoExpediente;
    const nuevaDescripcion =
      data.descripcion !== undefined ? data.descripcion : current.descripcion;
    const nuevoEstado = data.estado ?? current.estado;
    const nuevaMetadata =
      data.metadata !== undefined ? data.metadata : current.metadata ?? {};
    const motivoAnulacion =
      nuevoEstado === 'anulado'
        ? String((nuevaMetadata as any)?.motivoAnulacion ?? '').trim() || null
        : null;

    const rows = await sql`
      UPDATE documentos.expedientes
      SET
        codigo_expediente = ${nuevoCodigo},
        descripcion = ${nuevaDescripcion},
        estado = ${nuevoEstado},
        metadata = ${JSON.stringify(nuevaMetadata ?? {})}::jsonb,
        actualizado_por = ${data.audit?.usuarioId ?? null}::bigint,
        anulado_en = CASE
          WHEN ${nuevoEstado}::text = 'anulado' AND anulado_en IS NULL THEN now()
          WHEN ${nuevoEstado}::text <> 'anulado' THEN NULL
          ELSE anulado_en
        END,
        anulado_por = CASE
          WHEN ${nuevoEstado}::text = 'anulado' THEN ${data.audit?.usuarioId ?? null}::bigint
          WHEN ${nuevoEstado}::text <> 'anulado' THEN NULL
          ELSE anulado_por
        END,
        motivo_anulacion = CASE
          WHEN ${nuevoEstado}::text = 'anulado' THEN ${motivoAnulacion}::text
          WHEN ${nuevoEstado}::text <> 'anulado' THEN NULL
          ELSE motivo_anulacion
        END,
        actualizado_en = now()
      WHERE id = ${id}
      RETURNING id
    `;

    const expediente = await this.findMantenimientoById(Number(rows[0]?.id));

    if (expediente) {
      await this.registrarAuditoriaMantenimiento({
        expedienteId: id,
        accion: current.estado !== nuevoEstado ? 'expediente.estado_cambiado' : 'expediente.actualizado',
        estadoAnterior: current.estado,
        estadoNuevo: expediente.estado,
        codigoAnterior: current.codigoExpediente,
        codigoNuevo: expediente.codigoExpediente,
        descripcionAnterior: current.descripcion,
        descripcionNueva: expediente.descripcion,
        metadataAnterior: current.metadata ?? {},
        metadataNueva: expediente.metadata ?? {},
        empresaCodigo: expediente.empresaCodigo,
        clienteDestinoId: Number(expediente.clienteDestinoId),
        detalle: { motivoAnulacion },
        audit: data.audit,
      });
    }

    return expediente;
  }

  async updateMantenimientoEstado(
    id: number,
    estado: string,
    audit?: ExpedienteAuditContext | null,
    motivoAnulacion?: string | null,
  ) {
    const current = await this.findMantenimientoById(id);

    if (!current) {
      return null;
    }

    const rows = await sql`
      UPDATE documentos.expedientes
      SET
        estado = ${estado},
        actualizado_por = ${audit?.usuarioId ?? null}::bigint,
        anulado_en = CASE
          WHEN ${estado}::text = 'anulado' AND anulado_en IS NULL THEN now()
          WHEN ${estado}::text <> 'anulado' THEN NULL
          ELSE anulado_en
        END,
        anulado_por = CASE
          WHEN ${estado}::text = 'anulado' THEN ${audit?.usuarioId ?? null}::bigint
          WHEN ${estado}::text <> 'anulado' THEN NULL
          ELSE anulado_por
        END,
        motivo_anulacion = CASE
          WHEN ${estado}::text = 'anulado' THEN ${motivoAnulacion ?? null}::text
          WHEN ${estado}::text <> 'anulado' THEN NULL
          ELSE motivo_anulacion
        END,
        actualizado_en = now()
      WHERE id = ${id}
      RETURNING id
    `;

    if (!rows[0]) {
      return null;
    }

    const expediente = await this.findMantenimientoById(Number(rows[0].id));

    if (expediente) {
      await this.registrarAuditoriaMantenimiento({
        expedienteId: id,
        accion: estado === 'anulado' ? 'expediente.anulado' : 'expediente.estado_cambiado',
        estadoAnterior: current.estado,
        estadoNuevo: expediente.estado,
        codigoAnterior: current.codigoExpediente,
        codigoNuevo: expediente.codigoExpediente,
        descripcionAnterior: current.descripcion,
        descripcionNueva: expediente.descripcion,
        metadataAnterior: current.metadata ?? {},
        metadataNueva: expediente.metadata ?? {},
        empresaCodigo: expediente.empresaCodigo,
        clienteDestinoId: Number(expediente.clienteDestinoId),
        detalle: { motivoAnulacion: motivoAnulacion ?? null },
        audit,
      });
    }

    return expediente;
  }

  async registrarAuditoriaMantenimiento(input: {
    expedienteId: number;
    accion: string;
    estadoAnterior?: string | null;
    estadoNuevo?: string | null;
    codigoAnterior?: string | null;
    codigoNuevo?: string | null;
    descripcionAnterior?: string | null;
    descripcionNueva?: string | null;
    metadataAnterior?: Record<string, any> | null;
    metadataNueva?: Record<string, any> | null;
    empresaCodigo?: string | null;
    clienteDestinoId?: number | null;
    detalle?: Record<string, any> | null;
    audit?: ExpedienteAuditContext | null;
  }) {
    await sql`
      INSERT INTO documentos.expediente_auditoria (
        expediente_id,
        accion,
        estado_anterior,
        estado_nuevo,
        codigo_anterior,
        codigo_nuevo,
        descripcion_anterior,
        descripcion_nueva,
        metadata_anterior,
        metadata_nueva,
        usuario_id,
        usuario_email,
        perfil,
        empresa_codigo,
        cliente_destino_id,
        request_id,
        session_context_id,
        detalle
      )
      VALUES (
        ${input.expedienteId}::bigint,
        ${input.accion}::text,
        ${input.estadoAnterior ?? null}::text,
        ${input.estadoNuevo ?? null}::text,
        ${input.codigoAnterior ?? null}::text,
        ${input.codigoNuevo ?? null}::text,
        ${input.descripcionAnterior ?? null}::text,
        ${input.descripcionNueva ?? null}::text,
        ${JSON.stringify(input.metadataAnterior ?? null)}::jsonb,
        ${JSON.stringify(input.metadataNueva ?? null)}::jsonb,
        ${input.audit?.usuarioId ?? null}::bigint,
        ${input.audit?.usuarioEmail ?? null}::text,
        ${input.audit?.perfil ?? null}::text,
        ${input.empresaCodigo ?? null}::text,
        ${input.clienteDestinoId ?? null}::int,
        ${this.toUuidOrNull(input.audit?.requestId)}::uuid,
        ${this.toUuidOrNull(input.audit?.sessionContextId)}::uuid,
        ${JSON.stringify(input.detalle ?? {})}::jsonb
      )
    `;
  }

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
        COUNT(*) FILTER (WHERE d.tipo_documental IN ('TRANSFERENCIA', 'PAGO_TRANSFERENCIA', 'PAGO_DETRACCION'))::int AS total_pagos,
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

  async buscarExpedientes(filters: { q: string; empresa?: string; limit?: number }) {
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
              'proveedorId', dop.proveedor_id,
              'rucProveedor', dop.ruc_proveedor,
              'razonSocialProveedor', dop.razon_social_proveedor,
              'proveedor_id', dop.proveedor_id,
              'ruc_proveedor', dop.ruc_proveedor,
              'razon_social_proveedor', dop.razon_social_proveedor,
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
      LEFT JOIN documentos.documentos_operativos_principales dop
        ON dop.documento_id = d.id
      AND dop.estado = 'activo'
      AND dop.es_principal_activo = true
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
          'proveedorId', dopp.proveedor_id,
          'rucProveedor', dopp.ruc_proveedor,
          'razonSocialProveedor', dopp.razon_social_proveedor,
          'proveedor_id', dopp.proveedor_id,
          'ruc_proveedor', dopp.ruc_proveedor,
          'razon_social_proveedor', dopp.razon_social_proveedor,
          'orden', edp.orden
        ) AS documento_principal
        FROM documentos.expediente_documentos edp
        JOIN documentos.documentos dp
          ON dp.id = edp.documento_id
        LEFT JOIN documentos.documentos_operativos_principales dopp
          ON dopp.documento_id = dp.id
        AND dopp.estado = 'activo'
        AND dopp.es_principal_activo = true
        WHERE edp.expediente_id = e.id
          AND edp.es_principal = true
          AND edp.tipo_relacion LIKE 'principal_%'
        ORDER BY edp.orden ASC, dp.id DESC
        LIMIT 1
      ) principal ON true
      WHERE e.estado <> 'eliminado'
        AND (${filters.empresa ?? null}::text IS NULL OR e.empresa_codigo = ${filters.empresa ?? null})
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

    return rows.map((row) => {
      const documentosLista = Array.isArray(row.documentosLista)
        ? row.documentosLista
        : [];

      return {
        ...row,
        documentos: Number(row.documentos ?? 0),
        documentosLista,
        documentosPrincipales: documentosLista.filter(
          (documento: any) => documento?.esPrincipal === true,
        ),
        documentosAdjuntos: documentosLista.filter(
          (documento: any) => documento?.esPrincipal === false,
        ),
      };
    });
  }

  async findByCodigoExpediente(codigo: string, empresa?: string) {
    const rows = await sql`
      SELECT *
      FROM documentos.expedientes
      WHERE codigo_expediente = ${codigo}
        AND (${empresa ?? null}::text IS NULL OR empresa_codigo = ${empresa ?? null})
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  async getBandejaComprasOcos(filters: {
    empresa: string;
    estado?: string;
    q?: string;
    limit?: number;
    offset?: number;
    incluirPendientesValidacion?: boolean;
  }) {
    if (filters.incluirPendientesValidacion === true) {
      return this.getBandejaComprasPendientesValidacion(filters);
    }
    /**
     * Bandeja Compras OC/OS-céntrica:
     * - Una fila = un documento operativo principal V2 OC/OS.
     * - La paginación se aplica ANTES de enriquecer con Facturas.
     * - Factura -> Grupo Factura -> Principal V2 se resuelve por vínculos persistidos.
     * - Buscar por Factura devuelve la fila de su principal OC/OS.
     * - No hay inferencias por metadata, tipoRelacion ni posición en arrays.
     */
    const empresa = String(filters.empresa ?? '').trim();
    const estado = String(filters.estado ?? '').trim() || null;
    const q = String(filters.q ?? '').trim() || null;

    const rawLimit = Number(filters.limit ?? 50);
    const rawOffset = Number(filters.offset ?? 0);
    const limit = Number.isInteger(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 100)
      : 50;
    const offset =
      Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const like = q ? `%${q}%` : null;

    const facturaMatch = q?.match(/^([A-Za-z0-9]{1,8})[-\s]?([A-Za-z0-9]{1,20})$/);
    const qFacturaSerie = facturaMatch?.[1]?.toUpperCase() ?? null;
    const qFacturaNumero = facturaMatch?.[2] ?? null;
    const qRuc = q && /^\d{11}$/.test(q) ? q : null;

    const totalRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM documentos.documentos_operativos_principales dop
      JOIN documentos.contenedores_operativos co
        ON co.id = dop.contenedor_operativo_id
       AND co.estado = 'activo'
       AND co.tipo_contexto = 'expediente_v1'
      JOIN documentos.expedientes e
        ON e.id = co.expediente_v1_id
       AND e.empresa_codigo = ${empresa}
      JOIN documentos.documentos dp
        ON dp.id = dop.documento_id
       AND dp.tipo_documental IN ('OC', 'OS')
      WHERE dop.estado = 'activo'
        AND dop.es_principal_activo = true
        AND (${estado}::text IS NULL OR e.estado = ${estado})
        AND (
          ${q}::text IS NULL
          OR dp.numero ILIKE ${like}
          OR e.codigo_expediente ILIKE ${like}
          OR e.descripcion ILIKE ${like}
          OR dp.ruc_emisor ILIKE ${like}
          OR dp.razon_social_emisor ILIKE ${like}
          OR EXISTS (
            SELECT 1
            FROM documentos.grupos_factura gfq
            JOIN documentos.documentos fq
              ON fq.id = gfq.factura_documento_id
             AND fq.tipo_documental = 'FACTURA'
            WHERE gfq.documento_operativo_principal_id = dop.id
              AND gfq.estado <> 'anulado'
              AND (
                (
                  ${qFacturaSerie}::text IS NOT NULL
                  AND UPPER(fq.serie) = ${qFacturaSerie}
                  AND fq.numero = ${qFacturaNumero}
                )
                OR (
                  ${qRuc}::text IS NOT NULL
                  AND fq.ruc_emisor = ${qRuc}
                )
                OR (
                  ${qFacturaSerie}::text IS NULL
                  AND ${qRuc}::text IS NULL
                  AND (
                    concat_ws('-', fq.serie, fq.numero) ILIKE ${like}
                    OR fq.numero ILIKE ${like}
                    OR fq.ruc_emisor ILIKE ${like}
                    OR fq.razon_social_emisor ILIKE ${like}
                  )
                )
              )
          )
        )
    `;

    const rows = await sql`
      WITH principales_pagina AS MATERIALIZED (
        SELECT
          dop.id AS documento_operativo_principal_id,
          dop.documento_id AS principal_documento_id,
          co.expediente_v1_id AS expediente_id,
          e.codigo_expediente,
          e.descripcion,
          e.estado AS expediente_estado,
          dp.tipo_documental AS principal_tipo,
          dp.numero AS principal_numero,
          dp.razon_social_emisor AS proveedor_nombre,
          dp.ruc_emisor AS proveedor_ruc
        FROM documentos.documentos_operativos_principales dop
        JOIN documentos.contenedores_operativos co
          ON co.id = dop.contenedor_operativo_id
         AND co.estado = 'activo'
         AND co.tipo_contexto = 'expediente_v1'
        JOIN documentos.expedientes e
          ON e.id = co.expediente_v1_id
         AND e.empresa_codigo = ${empresa}
        JOIN documentos.documentos dp
          ON dp.id = dop.documento_id
         AND dp.tipo_documental IN ('OC', 'OS')
        WHERE dop.estado = 'activo'
          AND dop.es_principal_activo = true
          AND (${estado}::text IS NULL OR e.estado = ${estado})
          AND (
            ${q}::text IS NULL
            OR dp.numero ILIKE ${like}
            OR e.codigo_expediente ILIKE ${like}
            OR e.descripcion ILIKE ${like}
            OR dp.ruc_emisor ILIKE ${like}
            OR dp.razon_social_emisor ILIKE ${like}
            OR EXISTS (
              SELECT 1
              FROM documentos.grupos_factura gfq
              JOIN documentos.documentos fq
                ON fq.id = gfq.factura_documento_id
               AND fq.tipo_documental = 'FACTURA'
              WHERE gfq.documento_operativo_principal_id = dop.id
                AND gfq.estado <> 'anulado'
                AND (
                  (
                    ${qFacturaSerie}::text IS NOT NULL
                    AND UPPER(fq.serie) = ${qFacturaSerie}
                    AND fq.numero = ${qFacturaNumero}
                  )
                  OR (
                    ${qRuc}::text IS NOT NULL
                    AND fq.ruc_emisor = ${qRuc}
                  )
                  OR (
                    ${qFacturaSerie}::text IS NULL
                    AND ${qRuc}::text IS NULL
                    AND (
                      concat_ws('-', fq.serie, fq.numero) ILIKE ${like}
                      OR fq.numero ILIKE ${like}
                      OR fq.ruc_emisor ILIKE ${like}
                      OR fq.razon_social_emisor ILIKE ${like}
                    )
                  )
                )
            )
          )
        ORDER BY co.expediente_v1_id DESC, dop.documento_id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      ),
      facturas_agrupadas AS MATERIALIZED (
        SELECT
          gf.documento_operativo_principal_id,
          jsonb_agg(
            jsonb_build_object(
              'documentoId', f.id,
              'serie', f.serie,
              'numero', f.numero,
              'grupoFacturaId', gf.id
            )
            ORDER BY gf.id
          ) AS facturas
        FROM documentos.grupos_factura gf
        JOIN principales_pagina pp
          ON pp.documento_operativo_principal_id =
             gf.documento_operativo_principal_id
        JOIN documentos.documentos f
          ON f.id = gf.factura_documento_id
         AND f.tipo_documental = 'FACTURA'
        WHERE gf.estado <> 'anulado'
        GROUP BY gf.documento_operativo_principal_id
      )
      SELECT
        pp.expediente_id AS "expedienteId",
        pp.codigo_expediente AS "codigoExpediente",
        pp.descripcion,
        pp.expediente_estado AS estado,
        jsonb_build_object(
          'documentoId', pp.principal_documento_id,
          'tipo', pp.principal_tipo,
          'numero', pp.principal_numero
        ) AS principal,
        CASE
          WHEN pp.proveedor_nombre IS NULL AND pp.proveedor_ruc IS NULL
            THEN NULL
          ELSE jsonb_build_object(
            'nombre', pp.proveedor_nombre,
            'ruc', pp.proveedor_ruc
          )
        END AS proveedor,
        COALESCE(fa.facturas, '[]'::jsonb) AS facturas
      FROM principales_pagina pp
      LEFT JOIN facturas_agrupadas fa
        ON fa.documento_operativo_principal_id =
           pp.documento_operativo_principal_id
      ORDER BY pp.expediente_id DESC, pp.principal_documento_id DESC
    `;

    return {
      total: Number(totalRows[0]?.total ?? 0),
      limit,
      offset,
      data: rows,
    };
  }

  private async getBandejaComprasPendientesValidacion(filters: {
    empresa: string; q?: string; limit?: number; offset?: number;
  }) {
    const empresa = String(filters.empresa ?? '').trim();
    const q = String(filters.q ?? '').trim() || null;
    const like = q ? `%${q}%` : null;
    const rawLimit = Number(filters.limit ?? 50);
    const rawOffset = Number(filters.offset ?? 0);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
    const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const base = sql`
      FROM documentos.documentos_archivos da
      JOIN documentos.documentos d ON d.id = da.documento_id
      JOIN documentos.expedientes e ON e.id = da.expediente_id AND e.empresa_codigo = ${empresa}
      LEFT JOIN LATERAL (
        SELECT o.id, o.estado, o.metadata FROM documentos.ocr_resultados o
        WHERE o.documento_id = d.id ORDER BY o.id DESC LIMIT 1
      ) ocr ON true
      WHERE da.es_version_actual = true
        AND da.empresa_codigo = ${empresa}
        AND d.tipo_documental IN ('OC', 'OS')
        AND d.estado IN ('pendiente_ocr', 'pendiente_validacion')
        AND COALESCE(ocr.estado, 'pendiente_validacion') IN ('pendiente', 'pendiente_validacion')
        AND NOT EXISTS (
          SELECT 1 FROM documentos.documentos_operativos_principales dop
          WHERE dop.documento_id = d.id AND dop.estado = 'activo' AND dop.es_principal_activo = true
        )
        AND (${q}::text IS NULL OR d.numero ILIKE ${like} OR e.codigo_expediente ILIKE ${like}
          OR e.descripcion ILIKE ${like} OR d.ruc_emisor ILIKE ${like}
          OR d.razon_social_emisor ILIKE ${like} OR ocr.metadata->'metadata'->>'numero' ILIKE ${like})
    `;
    const totalRows = await sql`SELECT COUNT(DISTINCT d.id)::int AS total ${base}`;
    const rows = await sql`
      SELECT DISTINCT ON (d.id) e.id AS "expedienteId", e.codigo_expediente AS "codigoExpediente",
        e.descripcion, 'pendiente_validacion'::text AS estado,
        ocr.id AS "ocrResultadoId",
        jsonb_build_object('documentoId', d.id, 'tipo', d.tipo_documental,
          'numero', COALESCE(d.numero, ocr.metadata->'metadata'->>'numero')) AS principal,
        CASE WHEN COALESCE(d.razon_social_emisor, ocr.metadata->'metadata'->>'proveedor') IS NULL
          AND COALESCE(d.ruc_emisor, ocr.metadata->'metadata'->>'rucProveedor') IS NULL THEN NULL
          ELSE jsonb_build_object(
            'nombre', COALESCE(d.razon_social_emisor, ocr.metadata->'metadata'->>'proveedor'),
            'ruc', COALESCE(d.ruc_emisor, ocr.metadata->'metadata'->>'rucProveedor')
          ) END AS proveedor,
        '[]'::jsonb AS facturas
      ${base} ORDER BY d.id DESC, da.id DESC LIMIT ${limit} OFFSET ${offset}
    `;
    return { total: Number(totalRows[0]?.total ?? 0), limit, offset, data: rows };
  }

  async getRevisionContable(filters: {
    empresa: string;
    anio?: number;
    mes?: number;
    q?: string;
    limit?: number;
    offset?: number;
    soloPendientesFinanzas?: boolean;
  }) {
    /**
     * Regla contable oficial:
     * - La FACTURA confirmada es la unidad de salida.
     * - El periodo se determina exclusivamente por la fecha_emision de la FACTURA.
     * - La relación documental V2 se resuelve sin inferencias:
     *   FACTURA -> GRUPO FACTURA -> PRINCIPAL V2 -> DOCUMENTO PRINCIPAL.
     * - Los sustentos se obtienen únicamente desde grupo_factura_documentos
     *   del grupo persistido de esa factura.
     * - Una factura histórica sin Grupo V2 permanece visible y devuelve
     *   grupo/principal nulos y documentos relacionados vacíos.
     */
    const anio = Number(filters.anio);
    const mes = Number(filters.mes);
    const tienePeriodo =
      Number.isInteger(anio) &&
      Number.isInteger(mes) &&
      anio > 0 &&
      mes >= 1 &&
      mes <= 12;

    const inicioPeriodo = tienePeriodo
      ? `${anio}-${String(mes).padStart(2, '0')}-01`
      : null;

    const siguienteMes = tienePeriodo
      ? (mes === 12 ? 1 : mes + 1)
      : null;

    const siguienteAnio = tienePeriodo
      ? (mes === 12 ? anio + 1 : anio)
      : null;

    const finPeriodo =
      tienePeriodo && siguienteMes !== null && siguienteAnio !== null
        ? `${siguienteAnio}-${String(siguienteMes).padStart(2, '0')}-01`
        : null;

    const qRaw = filters.q?.trim() || null;
    const q = qRaw && qRaw.length >= 3 ? qRaw : null;
    const like = q ? `%${q}%` : null;
    const soloPendientesFinanzas = filters.soloPendientesFinanzas === true;

    // BUSQUEDA_OPERATIVA_MIN3:
    // Sin periodo contable se consulta con q>=3 o con pendientes financieros.
    // q de 1-2 caracteres no se aplica como filtro.
    // Con periodo valido, Contabilidad conserva la carga completa del mes.
    if (!tienePeriodo && !q && !soloPendientesFinanzas) {
      return [];
    }

    const requestedLimit = Number(filters.limit);
    const requestedOffset = Number(filters.offset);

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 201)
        : tienePeriodo
          ? null
          : 51;

    const offset =
      Number.isInteger(requestedOffset) && requestedOffset >= 0
        ? requestedOffset
        : 0;

    return sql`
      WITH facturas_periodo AS (
        SELECT
          ed.expediente_id,
          d.id AS factura_id,
          d.serie,
          d.numero,
          d.fecha_emision,
          d.moneda,
          d.monto_total,
          d.ruc_emisor,
          d.razon_social_emisor,
          d.clave_documental,
          d.estado AS documento_estado,
          d.alerta_contable,
          d.observacion_contable
        FROM documentos.expediente_documentos ed
        JOIN documentos.documentos d
          ON d.id = ed.documento_id
        WHERE d.tipo_documental = 'FACTURA'
          AND d.estado = 'confirmado'
          AND (
            ${inicioPeriodo}::date IS NULL
            OR d.fecha_emision >= ${inicioPeriodo}::date
          )
          AND (
            ${finPeriodo}::date IS NULL
            OR d.fecha_emision < ${finPeriodo}::date
          )
      )
      SELECT
        e.id AS expediente_id,
        e.id AS expedienteid,
        e.empresa_codigo,
        e.empresa_codigo AS empresacodigo,
        e.codigo_expediente,
        e.codigo_expediente AS codigoexpediente,
        e.descripcion,
        e.estado AS expediente_estado,
        e.estado AS expedienteestado,

        fp.factura_id AS documento_id,
        fp.factura_id AS documentoid,
        fp.factura_id,
        fp.factura_id AS facturaid,
        'FACTURA'::text AS tipo_documental,
        'FACTURA'::text AS tipodocumental,
        fp.fecha_emision,
        fp.fecha_emision AS fechaemision,
        EXTRACT(YEAR FROM fp.fecha_emision)::int AS periodo_anio,
        EXTRACT(YEAR FROM fp.fecha_emision)::int AS periodoanio,
        EXTRACT(MONTH FROM fp.fecha_emision)::int AS periodo_mes,
        EXTRACT(MONTH FROM fp.fecha_emision)::int AS periodomes,
        fp.serie,
        fp.numero,
        fp.ruc_emisor,
        fp.ruc_emisor AS rucemisor,
        fp.razon_social_emisor,
        fp.razon_social_emisor AS razonsocialemisor,
        fp.moneda,
        fp.monto_total,
        fp.monto_total AS montototal,
        fp.clave_documental,
        fp.clave_documental AS clavedocumental,
        fp.documento_estado,
        fp.documento_estado AS documentoestado,
        fp.alerta_contable,
        fp.alerta_contable AS alertacontable,
        fp.observacion_contable,
        fp.observacion_contable AS observacioncontable,

        factura_archivo.archivo_id AS factura_archivo_id,
        factura_archivo.archivo_id AS facturaarchivoid,
        factura_archivo.nombre_archivo AS factura_nombre_archivo,
        factura_archivo.nombre_archivo AS facturanombrearchivo,
        factura_archivo.archivo_estado AS factura_archivo_estado,
        factura_archivo.archivo_estado AS facturaarchivoestado,
        factura_archivo.storage_provider AS factura_storage_provider,
        factura_archivo.storage_provider AS facturastorageprovider,

        COUNT(a.id)::int AS alertas_activas,
        COUNT(a.id)::int AS alertasactivas,

        v2.grupo_factura_id,
        v2.grupo_factura_id AS grupofacturaid,
        v2.documento_operativo_principal_id,
        v2.documento_operativo_principal_id AS documentooperativoprincipalid,
        v2.documento_principal_id,
        v2.documento_principal_id AS documentoprincipalid,
        v2.documento_principal_tipo,
        v2.documento_principal_tipo AS documentoprincipaltipo,
        v2.documento_principal_numero,
        v2.documento_principal_numero AS documentoprincipalnumero,

        v2.codigo_centro_costo,
        v2.codigo_centro_costo AS codigocentrocosto,
        v2.grupo_factura_estado,
        v2.grupo_factura_estado AS grupofacturaestado,
        v2.grupo_factura_metadata -> 'revisionContable' AS revision_contable,
        v2.grupo_factura_metadata -> 'revisionContable' AS revisioncontable,

        principal.documento_principal,
        principal.documento_principal AS documentoprincipal,

        COALESCE(docs.documentos, '[]'::jsonb) AS documentos,
        COALESCE(docs.documentos, '[]'::jsonb) AS documentos_relacionados,
        COALESCE(docs.documentos, '[]'::jsonb) AS documentosrelacionados,
        COALESCE(docs.documentos, '[]'::jsonb) AS documentos_adjuntos,
        COALESCE(docs.documentos, '[]'::jsonb) AS documentosadjuntos,

        jsonb_build_object(
          'expedienteId', e.id,
          'grupoFacturaId', v2.grupo_factura_id,

          'factura', jsonb_build_object(
            'documentoId', fp.factura_id,
            'archivoId', (
              SELECT da_factura.id
              FROM documentos.documentos_archivos da_factura
              WHERE da_factura.documento_id = fp.factura_id
              ORDER BY
                da_factura.es_version_actual DESC NULLS LAST,
                da_factura.version DESC NULLS LAST,
                da_factura.id DESC
              LIMIT 1
            ),
            'serie', fp.serie,
            'numero', fp.numero,
            'fechaEmision', fp.fecha_emision,
            'moneda', fp.moneda,
            'montoTotal', fp.monto_total,
            'proveedorNombre', fp.razon_social_emisor,
            'proveedorRuc', fp.ruc_emisor
          ),

          'principal',
            CASE
              WHEN v2.documento_principal_id IS NULL THEN NULL
              ELSE jsonb_build_object(
                'documentoId', v2.documento_principal_id,
                'tipo', v2.documento_principal_tipo,
                'numero', v2.documento_principal_numero
              )
            END,

          'centroCosto', jsonb_build_object(
            'codigo', v2.codigo_centro_costo
          ),

          'guia', canon.guia,
          'notaIngreso', canon.nota_ingreso,
          'transferencia', canon.transferencia,
          'detraccion', canon.detraccion,
          'requiereRevisionFinanzas',
            COALESCE(finanzas_pendiente.requiere_revision_finanzas, false),

          'periodo', jsonb_build_object(
            'anio', EXTRACT(YEAR FROM fp.fecha_emision)::int,
            'mes', EXTRACT(MONTH FROM fp.fecha_emision)::int
          ),

          'revisionContable', v2.grupo_factura_metadata -> 'revisionContable'
        ) AS "filaFactura"

      FROM facturas_periodo fp
      JOIN documentos.expedientes e
        ON e.id = fp.expediente_id

      LEFT JOIN LATERAL (
        SELECT
          da.id AS archivo_id,
          da.nombre_archivo,
          da.estado AS archivo_estado,
          da.storage_provider
        FROM documentos.documentos_archivos da
        WHERE da.documento_id = fp.factura_id
        ORDER BY
          da.es_version_actual DESC NULLS LAST,
          da.version DESC NULLS LAST,
          da.id DESC
        LIMIT 1
      ) factura_archivo ON true

      LEFT JOIN documentos.documento_alertas a
        ON a.documento_id = fp.factura_id
       AND a.estado = 'activa'

      /*
       * Resuelve la cadena V2 real. El vínculo con el expediente se valida
       * mediante el contenedor operativo materializado por la migración 0014.
       * Si no existe una cadena V2 completa y activa, la factura no se oculta:
       * los campos de grupo/principal permanecen en null.
       */
      LEFT JOIN LATERAL (
        SELECT
          gf.id AS grupo_factura_id,
          gf.estado AS grupo_factura_estado,
          gf.metadata AS grupo_factura_metadata,
          dop.id AS documento_operativo_principal_id,
          dp.id AS documento_principal_id,
          dp.tipo_documental AS documento_principal_tipo,
          dp.numero AS documento_principal_numero,
          co.centro_costo_codigo AS codigo_centro_costo
        FROM documentos.grupos_factura gf
        JOIN documentos.documentos_operativos_principales dop
          ON dop.id = gf.documento_operativo_principal_id
         AND dop.estado = 'activo'
        JOIN documentos.contenedores_operativos co
          ON co.id = dop.contenedor_operativo_id
         AND co.estado = 'activo'
         AND co.tipo_contexto = 'expediente_v1'
         AND co.expediente_v1_id = e.id
        JOIN documentos.documentos dp
          ON dp.id = dop.documento_id
        WHERE gf.factura_documento_id = fp.factura_id
          AND gf.estado <> 'anulado'
        LIMIT 1
      ) v2 ON true

      /*
       * Fuente canónica: draft persistido al emitir
       * DECISION_CORRESPONDENCIA_REQUERIDA.
       * Al resolver la decisión el mismo draft pasa a CONSUMIDO.
       */
      LEFT JOIN LATERAL (
        SELECT EXISTS (
          SELECT 1
          FROM documentos.ocr_resultados o_fin
          JOIN documentos.documentos_archivos da_fin
            ON da_fin.id = o_fin.archivo_id
          WHERE o_fin.metadata->'validacionPendientePago'->>'estado' = 'PENDIENTE_DECISION'
            AND o_fin.metadata #>> '{validacionPendientePago,identidad,grupoFacturaId}'
                = v2.grupo_factura_id::text
            AND o_fin.metadata #>> '{validacionPendientePago,identidad,facturaDocumentoId}'
                = fp.factura_id::text
            AND da_fin.metadata->>'grupoFacturaId' = v2.grupo_factura_id::text
        ) AS requiere_revision_finanzas
      ) finanzas_pendiente ON true

      LEFT JOIN LATERAL (
        SELECT jsonb_build_object(
          'documentoOperativoPrincipalId', v2.documento_operativo_principal_id,
          'documentoId', d2.id,
          'tipoDocumental', d2.tipo_documental,
          'serie', d2.serie,
          'numero', d2.numero,
          'estado', d2.estado,
          'fechaEmision', d2.fecha_emision,
          'moneda', d2.moneda,
          'montoTotal', d2.monto_total,
          'claveDocumental', d2.clave_documental,
          'archivoId', da2.id,
          'nombreArchivo', da2.nombre_archivo,
          'archivoEstado', da2.estado,
          'storageProvider', da2.storage_provider
        ) AS documento_principal
        FROM documentos.documentos d2
        LEFT JOIN LATERAL (
          SELECT da.*
          FROM documentos.documentos_archivos da
          WHERE da.documento_id = d2.id
          ORDER BY da.es_version_actual DESC NULLS LAST, da.version DESC NULLS LAST, da.id DESC
          LIMIT 1
        ) da2 ON true
        WHERE d2.id = v2.documento_principal_id
      ) principal ON true

      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'grupoFacturaDocumentoId', gfd.id,
            'grupoFacturaId', gfd.grupo_factura_id,
            'documentoId', d2.id,
            'tipoRelacion', gfd.tipo_relacion,
            'tipoDocumental', d2.tipo_documental,
            'serie', d2.serie,
            'numero', d2.numero,
            'estado', d2.estado,
            'fechaEmision', d2.fecha_emision,
            'moneda', d2.moneda,
            'montoTotal', d2.monto_total,
            'claveDocumental', d2.clave_documental,
            'archivoId', da2.id,
            'nombreArchivo', da2.nombre_archivo,
            'archivoEstado', da2.estado,
            'storageProvider', da2.storage_provider
          )
          ORDER BY gfd.creado_en ASC, gfd.id ASC
        ) AS documentos
        FROM documentos.grupo_factura_documentos gfd
        JOIN documentos.documentos d2
          ON d2.id = gfd.documento_id
        LEFT JOIN LATERAL (
          SELECT da.*
          FROM documentos.documentos_archivos da
          WHERE da.documento_id = d2.id
          ORDER BY da.es_version_actual DESC NULLS LAST, da.version DESC NULLS LAST, da.id DESC
          LIMIT 1
        ) da2 ON true
        WHERE gfd.grupo_factura_id = v2.grupo_factura_id
          AND gfd.estado = 'activo'
      ) docs ON true

      /*
       * Resumen canónico para BANDEJA.
       *
       * No impone unicidad al dominio:
       * - 0 relaciones activas del tipo => null
       * - 1 relación activa             => identidad documental
       * - >1 relaciones activas         => null (fail-closed)
       *
       * documentos[] conserva el detalle completo.
       */
      LEFT JOIN LATERAL (
        SELECT
          CASE
            WHEN COUNT(*) FILTER (
              WHERE gfd.tipo_relacion = 'adjunto_guia'
            ) = 1
            THEN (
              jsonb_agg(
                jsonb_build_object(
                  'documentoId', d2.id,
                  'archivoId', da2.id,
                  'serie', d2.serie,
                  'numero', d2.numero
                )
                ORDER BY gfd.creado_en ASC, gfd.id ASC
              ) FILTER (
                WHERE gfd.tipo_relacion = 'adjunto_guia'
              )
            )->0
            ELSE NULL
          END AS guia,

          CASE
            WHEN COUNT(*) FILTER (
              WHERE gfd.tipo_relacion = 'adjunto_nota_ingreso'
            ) = 1
            THEN (
              jsonb_agg(
                jsonb_build_object(
                  'documentoId', d2.id,
                  'archivoId', da2.id,
                  'numero', d2.numero
                )
                ORDER BY gfd.creado_en ASC, gfd.id ASC
              ) FILTER (
                WHERE gfd.tipo_relacion = 'adjunto_nota_ingreso'
              )
            )->0
            ELSE NULL
          END AS nota_ingreso,

          CASE
            WHEN COUNT(*) FILTER (
              WHERE gfd.tipo_relacion = 'adjunto_transferencia'
            ) = 1
            THEN (
              jsonb_agg(
                jsonb_build_object(
                  'documentoId', d2.id,
                  'archivoId', da2.id,

                  'banco', COALESCE(
                    d2.metadata ->> 'banco',
                    d2.metadata #>> '{ocr,metadata,banco}'
                  ),

                  'numeroOperacion', COALESCE(
                    d2.metadata ->> 'numeroOperacion',
                    d2.metadata #>> '{ocr,metadata,numeroOperacion}'
                  ),

                  'fechaPago', COALESCE(
                    d2.metadata ->> 'fechaPago',
                    d2.metadata #>> '{ocr,metadata,fechaPago}'
                  ),

                  'moneda', COALESCE(
                    d2.metadata ->> 'moneda',
                    d2.metadata #>> '{ocr,metadata,moneda}',
                    d2.moneda
                  ),

                  'montoTotal', COALESCE(
                    d2.metadata ->> 'montoTotal',
                    d2.metadata #>> '{ocr,metadata,montoTotal}',
                    d2.monto_total::text
                  )
                )
                ORDER BY gfd.creado_en ASC, gfd.id ASC
              ) FILTER (
                WHERE gfd.tipo_relacion = 'adjunto_transferencia'
              )
            )->0
            ELSE NULL
          END AS transferencia,

          CASE
            WHEN COUNT(*) FILTER (
              WHERE gfd.tipo_relacion = 'adjunto_detraccion'
            ) = 1
            THEN (
              jsonb_agg(
                jsonb_build_object(
                  'documentoId', d2.id,
                  'archivoId', da2.id,

                  'banco', COALESCE(
                    d2.metadata ->> 'banco',
                    d2.metadata #>> '{ocr,metadata,banco}'
                  ),

                  'numeroOperacion', COALESCE(
                    d2.metadata ->> 'numeroOperacion',
                    d2.metadata #>> '{ocr,metadata,numeroOperacion}'
                  ),

                  'fechaPago', COALESCE(
                    d2.metadata ->> 'fechaPago',
                    d2.metadata #>> '{ocr,metadata,fechaPago}'
                  ),

                  'moneda', COALESCE(
                    d2.metadata ->> 'moneda',
                    d2.metadata #>> '{ocr,metadata,moneda}',
                    d2.moneda
                  ),

                  'montoTotal', COALESCE(
                    d2.metadata ->> 'montoTotal',
                    d2.metadata #>> '{ocr,metadata,montoTotal}',
                    d2.monto_total::text
                  )
                )
                ORDER BY gfd.creado_en ASC, gfd.id ASC
              ) FILTER (
                WHERE gfd.tipo_relacion = 'adjunto_detraccion'
              )
            )->0
            ELSE NULL
          END AS detraccion

        FROM documentos.grupo_factura_documentos gfd
        JOIN documentos.documentos d2
          ON d2.id = gfd.documento_id

        LEFT JOIN LATERAL (
          SELECT da.*
          FROM documentos.documentos_archivos da
          WHERE da.documento_id = d2.id
          ORDER BY
            da.es_version_actual DESC NULLS LAST,
            da.version DESC NULLS LAST,
            da.id DESC
          LIMIT 1
        ) da2 ON true

        WHERE gfd.grupo_factura_id = v2.grupo_factura_id
          AND gfd.estado = 'activo'
      ) canon ON true

      WHERE e.empresa_codigo = ${filters.empresa}
        AND (
          ${soloPendientesFinanzas}::boolean = false
          OR COALESCE(finanzas_pendiente.requiere_revision_finanzas, false)
        )
        AND (
          ${like}::text IS NULL
          OR fp.numero ILIKE ${like}
          OR fp.serie ILIKE ${like}
          OR CONCAT_WS('-', fp.serie, fp.numero) ILIKE ${like}
          OR fp.razon_social_emisor ILIKE ${like}
          OR fp.ruc_emisor ILIKE ${like}
          OR v2.documento_principal_numero ILIKE ${like}
          OR EXISTS (
            SELECT 1
            FROM documentos.grupo_factura_documentos gfd_busqueda
            JOIN documentos.documentos d_busqueda
              ON d_busqueda.id = gfd_busqueda.documento_id
            WHERE gfd_busqueda.grupo_factura_id = v2.grupo_factura_id
              AND gfd_busqueda.estado = 'activo'
              AND (
                d_busqueda.numero ILIKE ${like}
                OR d_busqueda.serie ILIKE ${like}
                OR CONCAT_WS('-', d_busqueda.serie, d_busqueda.numero) ILIKE ${like}
                OR d_busqueda.razon_social_emisor ILIKE ${like}
                OR d_busqueda.ruc_emisor ILIKE ${like}
              )
          )
        )

      GROUP BY
        e.id,
        fp.factura_id,
        fp.serie,
        fp.numero,
        fp.fecha_emision,
        fp.moneda,
        fp.monto_total,
        fp.ruc_emisor,
        fp.razon_social_emisor,
        fp.clave_documental,
        fp.documento_estado,
        fp.alerta_contable,
        fp.observacion_contable,
        v2.grupo_factura_id,
        v2.documento_operativo_principal_id,
        v2.documento_principal_id,
        v2.documento_principal_tipo,
        v2.documento_principal_numero,
        principal.documento_principal,
        docs.documentos,
        factura_archivo.archivo_id,
        factura_archivo.nombre_archivo,
        factura_archivo.archivo_estado,
        factura_archivo.storage_provider,
        v2.codigo_centro_costo,
        v2.grupo_factura_estado,
        v2.grupo_factura_metadata,
        canon.guia,
        canon.nota_ingreso,
        canon.transferencia,
        canon.detraccion,
        finanzas_pendiente.requiere_revision_finanzas

      ORDER BY fp.fecha_emision ASC, e.codigo_expediente ASC, e.id ASC
      LIMIT ${limit}
      OFFSET ${offset}
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
    const inicioPeriodo = `${filters.anio}-${String(filters.mes).padStart(2, '0')}-01`;
    const siguienteMes = filters.mes === 12 ? 1 : filters.mes + 1;
    const siguienteAnio = filters.mes === 12 ? filters.anio + 1 : filters.anio;
    const finPeriodo = `${siguienteAnio}-${String(siguienteMes).padStart(2, '0')}-01`;

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
        AND d.estado = 'confirmado'
        AND d.fecha_emision >= ${inicioPeriodo}::date
        AND d.fecha_emision < ${finPeriodo}::date
    `;

    return rows[0];
  }

  async findDocumentosByExpedienteId(id: number) {
    const rows = await sql`
      SELECT
        ed.documento_id AS "documentoId",
        ed.expediente_id AS "expedienteId",
        ed.tipo_relacion AS "tipoRelacion",
        ed.es_principal AS "esPrincipal",
        ed.orden,
        ed.creado_en,
        d.cliente_abreviatura,
        d.tipo_documental,
        d.ruc_emisor,
        d.razon_social_emisor,
        dop.proveedor_id,
        dop.ruc_proveedor,
        dop.razon_social_proveedor,
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
      LEFT JOIN documentos.documentos_operativos_principales dop
        ON dop.documento_id = d.id
      AND dop.estado = 'activo'
      AND dop.es_principal_activo = true
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
