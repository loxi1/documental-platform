import { BadRequestException, Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

import {
  resolverPeriodoDesdeRelacionesR2,
  resolverPeriodoSustentoDesdeRelacionesR2,
  type PeriodoR2SustentoSolicitud,
  type PeriodoR2SustentoRelacion,
  type PeriodoR2SustentoResultado,
  type PeriodoR2Contexto,
  type PeriodoR2Relacion,
  type PeriodoR2Resultado,
  type PeriodoR2Solicitud,
} from './periodo-documental-r2.resolver';

type SqlRow = {
  facturaDocumentoId: string | number | null;
  fechaEmision: string | null;
  empresaCodigo: string | null;
  clienteDestinoId: string | number | null;
  expedienteId: string | number | null;
};

function normalizarId(valor: string | number | null): number | null {
  if (valor === null) return null;

  if (
    typeof valor === 'string' &&
    !/^[0-9]+$/.test(valor)
  ) {
    throw new BadRequestException('PERIODO_R2_ID_INVALIDO');
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new BadRequestException('PERIODO_R2_ID_INVALIDO');
  }

  return numero;
}

function normalizarRelacion(row: SqlRow): PeriodoR2Relacion {
  const facturaDocumentoId = normalizarId(row.facturaDocumentoId);

  if (facturaDocumentoId === null) {
    throw new BadRequestException('PERIODO_R2_FACTURA_NO_ENCONTRADA');
  }

  return {
    facturaDocumentoId,
    fechaEmision: row.fechaEmision,
    empresaCodigo: row.empresaCodigo ?? '',
    clienteDestinoId: normalizarId(row.clienteDestinoId),
    expedienteId: normalizarId(row.expedienteId),
  };
}

@Injectable()
export class PeriodoDocumentalR2Repository {
  /** Identity proof only: never recomputes a historical period during replay. */
  async verificarIdentidadGrupo(
    contexto: PeriodoR2Contexto,
    solicitud: { grupoFacturaId: number; documentoBaseId: number; documentoId?: number },
  ): Promise<boolean> {
    if (![contexto.workspaceId, contexto.clienteDestinoId, contexto.expedienteId,
      solicitud.grupoFacturaId, solicitud.documentoBaseId].every(id => Number.isSafeInteger(id) && Number(id) > 0)) return false;
    const rows = await sql<Array<{ grupoId: string | number; baseId: string | number }>>`
      SELECT g.id AS "grupoId", p.documento_id AS "baseId"
      FROM documentos.grupos_factura g
      JOIN documentos.documentos_operativos_principales p ON p.id = g.documento_operativo_principal_id
      JOIN documentos.contenedores_operativos c ON c.id = p.contenedor_operativo_id
      JOIN documentos.documentos pd ON pd.id = p.documento_id
      JOIN documentos.documentos f ON f.id = g.factura_documento_id
      WHERE g.id = ${solicitud.grupoFacturaId}::bigint AND g.estado <> 'anulado'
        AND g.origen_obligacion = 'FACTURA' AND p.tipo_principal IN ('OC','OS')
        AND pd.tipo_documental = p.tipo_principal AND pd.cliente_abreviatura = c.empresa_codigo
        AND pd.estado NOT IN ('anulado','duplicado_versionado')
        AND f.tipo_documental = 'FACTURA' AND f.cliente_abreviatura = c.empresa_codigo
        AND f.estado NOT IN ('anulado','duplicado_versionado')
        AND p.estado = 'activo' AND p.es_principal_activo = true AND c.estado = 'activo'
        AND p.documento_id = ${solicitud.documentoBaseId}::bigint
        AND c.empresa_codigo = ${contexto.empresaCodigo}::text
        AND c.cliente_destino_id = ${contexto.clienteDestinoId}::integer
        AND c.expediente_v1_id = ${contexto.expedienteId}::bigint
        AND (${solicitud.documentoId ?? null}::bigint IS NULL OR EXISTS (
          SELECT 1 FROM documentos.grupo_factura_documentos v
          JOIN documentos.documentos d ON d.id = v.documento_id
          WHERE d.cliente_abreviatura = c.empresa_codigo AND d.estado NOT IN ('anulado','duplicado_versionado')
            AND v.grupo_factura_id = g.id AND v.documento_id = ${solicitud.documentoId ?? null}::bigint
            AND v.estado = 'activo'))
    `;
    return rows.length === 1 && Number(rows[0].grupoId) === solicitud.grupoFacturaId &&
      Number(rows[0].baseId) === solicitud.documentoBaseId;
  }

  async resolverParaVersion(
    actor: { workspaceId: number; empresaCodigo: string; clienteDestinoId: number; actorId: number },
    documentoId: number,
    tipoPersistido: string,
  ): Promise<PeriodoR2Resultado> {
    if (![actor.workspaceId, actor.clienteDestinoId, actor.actorId, documentoId]
      .every(id => Number.isSafeInteger(id) && id > 0) || !actor.empresaCodigo?.trim()) {
      throw new BadRequestException('PERIODO_R2_CONTEXTO_INVALIDO');
    }
    if (tipoPersistido !== 'FACTURA' && tipoPersistido !== 'GUIA_REMISION') {
      throw new BadRequestException('PERIODO_R2_SOLICITUD_INVALIDA');
    }
    const relaciones = tipoPersistido === 'FACTURA'
      ? await this.obtenerVersionFactura(documentoId) : await this.obtenerVersionGuia(documentoId);
    const expedientes = new Set(relaciones.map(r => r.expedienteId));
    if (expedientes.size !== 1 || !Number.isSafeInteger([...expedientes][0]) || Number([...expedientes][0]) <= 0) {
      throw new BadRequestException('PERIODO_R2_EXPEDIENTE_AMBIGUO');
    }
    return resolverPeriodoDesdeRelacionesR2({ ...actor, expedienteId: [...expedientes][0] as number },
      { operacion: tipoPersistido === 'FACTURA' ? 'VERSION_FACTURA' : 'VERSION_GUIA', documentoId }, relaciones);
  }

  async resolverSustento(
    contexto: PeriodoR2Contexto,
    solicitud: PeriodoR2SustentoSolicitud,
  ): Promise<PeriodoR2SustentoResultado> {
    // Validate authenticated context and requested identity before querying.
    if (![contexto.workspaceId, contexto.clienteDestinoId, contexto.expedienteId,
      solicitud.grupoFacturaId, solicitud.documentoBaseId]
      .every(id => typeof id === 'number' && Number.isSafeInteger(id) && id > 0) ||
      typeof contexto.empresaCodigo !== 'string' || !contexto.empresaCodigo.trim()) {
      throw new BadRequestException('PERIODO_R2_CONTEXTO_INVALIDO');
    }
    const rows = await sql<Array<{
      grupoFacturaId: string | number; documentoBaseId: string | number | null;
      organizadorDocumentoId: string | number | null; tipoOrganizador: string | null;
      fechaEmision: string | null; empresaCodigo: string | null;
      clienteDestinoId: string | number | null; expedienteId: string | number | null;
      integridadValida: boolean;
    }>>`
      SELECT g.id AS "grupoFacturaId", pd.id AS "documentoBaseId",
        CASE WHEN g.origen_obligacion = 'FACTURA' THEN f.id
             WHEN g.origen_obligacion = 'ORDEN_PAGO' THEN pd.id END AS "organizadorDocumentoId",
        CASE WHEN g.origen_obligacion = 'FACTURA' THEN 'FACTURA'
             WHEN g.origen_obligacion = 'ORDEN_PAGO' THEN 'ORDEN_PAGO' END AS "tipoOrganizador",
        CASE WHEN g.origen_obligacion = 'FACTURA' THEN f.fecha_emision::text
             WHEN g.origen_obligacion = 'ORDEN_PAGO' THEN pd.fecha_emision::text END AS "fechaEmision",
        c.empresa_codigo AS "empresaCodigo", c.cliente_destino_id AS "clienteDestinoId",
        c.expediente_v1_id AS "expedienteId",
        (g.estado <> 'anulado' AND p.estado = 'activo' AND p.es_principal_activo = true
          AND c.estado = 'activo' AND pd.estado NOT IN ('anulado', 'duplicado_versionado')
          AND pd.tipo_documental = p.tipo_principal AND pd.cliente_abreviatura = c.empresa_codigo
          AND ((g.origen_obligacion = 'FACTURA' AND p.tipo_principal IN ('OC','OS')
                AND f.tipo_documental = 'FACTURA' AND f.estado NOT IN ('anulado','duplicado_versionado')
                AND f.cliente_abreviatura = c.empresa_codigo)
            OR (g.origen_obligacion = 'ORDEN_PAGO' AND p.tipo_principal = 'ORDEN_PAGO'
                AND pd.tipo_documental = 'ORDEN_PAGO'))) IS TRUE AS "integridadValida"
      FROM documentos.grupos_factura g
      LEFT JOIN documentos.documentos_operativos_principales p ON p.id = g.documento_operativo_principal_id
      LEFT JOIN documentos.contenedores_operativos c ON c.id = p.contenedor_operativo_id
      LEFT JOIN documentos.documentos pd ON pd.id = p.documento_id
      LEFT JOIN documentos.documentos f ON f.id = g.factura_documento_id
      WHERE g.id = ${solicitud.grupoFacturaId}::bigint
    `;
    const relaciones: PeriodoR2SustentoRelacion[] = rows.map(row => {
      if (row.integridadValida !== true) {
        throw new BadRequestException('PERIODO_R2_RELACION_INCOMPLETA');
      }
      return {
        grupoFacturaId: normalizarId(row.grupoFacturaId)!,
        documentoBaseId: normalizarId(row.documentoBaseId)!,
        organizadorDocumentoId: normalizarId(row.organizadorDocumentoId)!,
        tipoOrganizador: row.tipoOrganizador as 'FACTURA' | 'ORDEN_PAGO',
        fechaEmision: row.fechaEmision, empresaCodigo: row.empresaCodigo ?? '',
        clienteDestinoId: normalizarId(row.clienteDestinoId),
        expedienteId: normalizarId(row.expedienteId), relacionActiva: true,
      };
    });
    return resolverPeriodoSustentoDesdeRelacionesR2(contexto, solicitud, relaciones);
  }

  async resolver(
    contexto: PeriodoR2Contexto,
    solicitud: PeriodoR2Solicitud,
  ): Promise<PeriodoR2Resultado> {
    const relaciones = await this.obtenerRelaciones(contexto, solicitud);

    return resolverPeriodoDesdeRelacionesR2(
      contexto,
      solicitud,
      relaciones,
    );
  }

  async obtenerRelaciones(
    contexto: PeriodoR2Contexto,
    solicitud: PeriodoR2Solicitud,
  ): Promise<PeriodoR2Relacion[]> {
    if (
      !Number.isSafeInteger(contexto.workspaceId) ||
      contexto.workspaceId <= 0 ||
      !Number.isSafeInteger(contexto.expedienteId) ||
      contexto.expedienteId <= 0 ||
      typeof contexto.empresaCodigo !== 'string' ||
      !contexto.empresaCodigo.trim()
    ) {
      throw new BadRequestException('PERIODO_R2_CONTEXTO_INVALIDO');
    }

    if (
      solicitud.operacion === 'NUEVA_GUIA' ||
      solicitud.operacion === 'NUEVA_NI'
    ) {
      if (
        !Number.isSafeInteger(solicitud.grupoFacturaId) ||
        solicitud.grupoFacturaId <= 0
      ) {
        throw new BadRequestException('PERIODO_R2_SOLICITUD_INVALIDA');
      }

      return this.obtenerPorGrupoFactura(solicitud.grupoFacturaId);
    }

    if (solicitud.operacion === 'VERSION_FACTURA') {
      if (
        !Number.isSafeInteger(solicitud.documentoId) ||
        solicitud.documentoId <= 0
      ) {
        throw new BadRequestException('PERIODO_R2_SOLICITUD_INVALIDA');
      }

      return this.obtenerVersionFactura(solicitud.documentoId);
    }

    if (solicitud.operacion === 'VERSION_GUIA') {
      if (
        !Number.isSafeInteger(solicitud.documentoId) ||
        solicitud.documentoId <= 0
      ) {
        throw new BadRequestException('PERIODO_R2_SOLICITUD_INVALIDA');
      }

      return this.obtenerVersionGuia(solicitud.documentoId);
    }

    throw new BadRequestException('PERIODO_R2_SOLICITUD_INVALIDA');
  }

  private async obtenerPorGrupoFactura(
    grupoFacturaId: number,
  ): Promise<PeriodoR2Relacion[]> {
    const rows = await sql<(SqlRow & { integridadValida: boolean })[]>`
      SELECT
        g.factura_documento_id AS "facturaDocumentoId",
        f.fecha_emision::text AS "fechaEmision",
        c.empresa_codigo AS "empresaCodigo",
        c.cliente_destino_id AS "clienteDestinoId",
        c.expediente_v1_id AS "expedienteId",
        (
          g.estado <> 'anulado'
          AND g.origen_obligacion = 'FACTURA'
          AND p.id IS NOT NULL
          AND p.estado = 'activo'
          AND p.es_principal_activo = true
          AND c.id IS NOT NULL
          AND c.estado = 'activo'
          AND pd.id IS NOT NULL
          AND pd.estado <> 'anulado'
          AND pd.tipo_documental = p.tipo_principal
          AND pd.cliente_abreviatura = c.empresa_codigo
          AND f.id IS NOT NULL
          AND f.estado <> 'anulado'
          AND f.tipo_documental = 'FACTURA'
          AND f.cliente_abreviatura = c.empresa_codigo
        ) IS TRUE AS "integridadValida"
      FROM documentos.grupos_factura g
      LEFT JOIN documentos.documentos_operativos_principales p
        ON p.id = g.documento_operativo_principal_id
      LEFT JOIN documentos.contenedores_operativos c
        ON c.id = p.contenedor_operativo_id
      LEFT JOIN documentos.documentos pd
        ON pd.id = p.documento_id
      LEFT JOIN documentos.documentos f
        ON f.id = g.factura_documento_id
      WHERE g.id = ${grupoFacturaId}::bigint
    `;

    for (const row of rows) {
      if (row.integridadValida !== true) {
        throw new BadRequestException('PERIODO_R2_RELACION_INCOMPLETA');
      }
    }

    return rows.map(normalizarRelacion);
  }

  private async obtenerVersionFactura(
    documentoId: number,
  ): Promise<PeriodoR2Relacion[]> {
    const rows = await sql<(SqlRow & { integridadValida: boolean })[]>`
      SELECT
        f.id AS "facturaDocumentoId",
        f.fecha_emision::text AS "fechaEmision",
        c.empresa_codigo AS "empresaCodigo",
        c.cliente_destino_id AS "clienteDestinoId",
        c.expediente_v1_id AS "expedienteId",
        (
          f.tipo_documental = 'FACTURA'
          AND f.estado <> 'anulado'
          AND g.id IS NOT NULL
          AND g.estado <> 'anulado'
          AND g.origen_obligacion = 'FACTURA'
          AND p.id IS NOT NULL
          AND p.estado = 'activo'
          AND p.es_principal_activo = true
          AND c.id IS NOT NULL
          AND c.estado = 'activo'
          AND pd.id IS NOT NULL
          AND pd.estado <> 'anulado'
          AND pd.tipo_documental = p.tipo_principal
          AND pd.cliente_abreviatura = c.empresa_codigo
          AND f.cliente_abreviatura = c.empresa_codigo
        ) IS TRUE AS "integridadValida"
      FROM documentos.documentos f
      LEFT JOIN documentos.grupos_factura g
        ON g.factura_documento_id = f.id
      LEFT JOIN documentos.documentos_operativos_principales p
        ON p.id = g.documento_operativo_principal_id
      LEFT JOIN documentos.contenedores_operativos c
        ON c.id = p.contenedor_operativo_id
      LEFT JOIN documentos.documentos pd
        ON pd.id = p.documento_id
      WHERE f.id = ${documentoId}::bigint
    `;

    for (const row of rows) {
      if (row.integridadValida !== true) {
        throw new BadRequestException('PERIODO_R2_RELACION_INCOMPLETA');
      }
    }

    return rows.map(normalizarRelacion);
  }

  private async obtenerVersionGuia(
    documentoId: number,
  ): Promise<PeriodoR2Relacion[]> {
    const rows = await sql<(SqlRow & { integridadValida: boolean })[]>`
      SELECT
        g.factura_documento_id AS "facturaDocumentoId",
        f.fecha_emision::text AS "fechaEmision",
        c.empresa_codigo AS "empresaCodigo",
        c.cliente_destino_id AS "clienteDestinoId",
        c.expediente_v1_id AS "expedienteId",
        (
          guia.id IS NOT NULL
          AND guia.tipo_documental = 'GUIA_REMISION'
          AND guia.estado <> 'anulado'
          AND g.id IS NOT NULL
          AND g.estado <> 'anulado'
          AND g.origen_obligacion = 'FACTURA'
          AND p.id IS NOT NULL
          AND p.estado = 'activo'
          AND p.es_principal_activo = true
          AND c.id IS NOT NULL
          AND c.estado = 'activo'
          AND pd.id IS NOT NULL
          AND pd.estado <> 'anulado'
          AND pd.tipo_documental = p.tipo_principal
          AND pd.cliente_abreviatura = c.empresa_codigo
          AND guia.cliente_abreviatura = c.empresa_codigo
          AND f.id IS NOT NULL
          AND f.estado <> 'anulado'
          AND f.tipo_documental = 'FACTURA'
          AND f.cliente_abreviatura = c.empresa_codigo
        ) IS TRUE AS "integridadValida"
      FROM documentos.grupo_factura_documentos v
      LEFT JOIN documentos.documentos guia
        ON guia.id = v.documento_id
      LEFT JOIN documentos.grupos_factura g
        ON g.id = v.grupo_factura_id
      LEFT JOIN documentos.documentos_operativos_principales p
        ON p.id = g.documento_operativo_principal_id
      LEFT JOIN documentos.contenedores_operativos c
        ON c.id = p.contenedor_operativo_id
      LEFT JOIN documentos.documentos pd
        ON pd.id = p.documento_id
      LEFT JOIN documentos.documentos f
        ON f.id = g.factura_documento_id
      WHERE v.documento_id = ${documentoId}::bigint
        AND v.estado = 'activo'
    `;

    for (const row of rows) {
      if (row.integridadValida !== true) {
        throw new BadRequestException('PERIODO_R2_RELACION_INCOMPLETA');
      }
    }

    return rows.map(normalizarRelacion);
  }
}
