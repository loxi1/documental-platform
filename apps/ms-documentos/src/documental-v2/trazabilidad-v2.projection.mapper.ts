import { Injectable } from '@nestjs/common';

import type {
  ConsultarTrazabilidadV2ResponseDto,
  TrazabilidadAdvertenciaCodigoV2,
  TrazabilidadItemV2Dto,
  TrazabilidadResultadoV2,
  TrazabilidadTipoV2,
} from './trazabilidad-v2.dto';
import type { TrazabilidadAuditoriaRowV2 } from './trazabilidad-v2.repository';

@Injectable()
export class TrazabilidadV2ProjectionMapper {
  construirRespuesta(params: {
    contenedorOperativoId: number;
    auditoriaRows: TrazabilidadAuditoriaRowV2[];
    documentoEventosOperativoDisponible?: boolean;
  }): ConsultarTrazabilidadV2ResponseDto {
    const documentoEventos = params.documentoEventosOperativoDisponible === true;
    const items = params.auditoriaRows
      .map((row) => this.mapearAuditoria(row))
      .sort((a, b) => compararFechaDesc(a.fecha, b.fecha));

    return {
      version: 1,
      contenedorOperativoId: params.contenedorOperativoId,
      items,
      cobertura: {
        auditoria: items.length > 0,
        documentoEventos,
        parcial: !documentoEventos,
      },
      advertencias: construirAdvertencias({
        itemsTotal: items.length,
        documentoEventos,
      }),
    };
  }

  mapearAuditoria(row: TrazabilidadAuditoriaRowV2): TrazabilidadItemV2Dto {
    const despues = asRecord(row.despues);

    return {
      id: `auditoria:${String(row.id)}`,
      fecha: toIsoString(row.creadoEn),
      categoria: 'AUDITORIA',
      tipo: normalizarTipo(row.accion),
      descripcion: row.descripcion ?? null,
      actor: {
        usuarioId: toInteger(row.usuarioId),
        email: toText(despues.usuarioEmail),
      },
      entidad: {
        tipo: row.entidad,
        id: String(row.entidadId),
      },
      resultado: normalizarResultado(despues.resultadoOperacion),
      origen: toText(despues.origen),
      requestId: toText(row.requestId),
      correlationId: toText(despues.correlationId),
    };
  }
}

function construirAdvertencias(params: {
  itemsTotal: number;
  documentoEventos: boolean;
}): TrazabilidadAdvertenciaCodigoV2[] {
  const advertencias: TrazabilidadAdvertenciaCodigoV2[] = [];

  if (!params.documentoEventos) {
    advertencias.push('TRAZABILIDAD_PARCIAL');
    advertencias.push('SIN_EVENTOS_DOCUMENTALES');
  }

  if (params.itemsTotal === 0) {
    advertencias.push('SIN_TRAZABILIDAD_OPERATIVA');
  }

  return advertencias;
}

function normalizarTipo(value: string): TrazabilidadTipoV2 {
  if (
    value === 'ASOCIAR_DOCUMENTO_PRINCIPAL' ||
    value === 'GRUPO_FACTURA_CREADO' ||
    value === 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO'
  ) {
    return value;
  }

  return 'ASOCIAR_DOCUMENTO_PRINCIPAL';
}

function normalizarResultado(value: unknown): TrazabilidadResultadoV2 {
  const text = toText(value);

  if (
    text === 'CREADO' ||
    text === 'ACTUALIZADO' ||
    text === 'ANULADO' ||
    text === 'RECHAZADO'
  ) {
    return text;
  }

  return null;
}

function compararFechaDesc(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toIsoString(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function toInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}
