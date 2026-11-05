import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import {
  resolverFechaDocumentalR2,
  type PeriodoDocumentalR2,
} from './periodo-documental-r2.fecha';

export type PeriodoR2Contexto = {
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  expedienteId: number;
};

export type PeriodoR2Solicitud =
  | {
      operacion: 'NUEVA_GUIA' | 'NUEVA_NI';
      grupoFacturaId: number;
    }
  | {
      operacion: 'VERSION_FACTURA' | 'VERSION_GUIA';
      documentoId: number;
    };

/**
 * Resultado de una consulta de relaciones documentales persistidas.
 *
 * Cada fila representa una posible Factura organizadora.
 * El adaptador SQL deberá devolver todas las relaciones activas,
 * sin seleccionar arbitrariamente una mediante LIMIT 1.
 */
export type PeriodoR2Relacion = {
  facturaDocumentoId: number;
  fechaEmision: string | null;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  expedienteId: number | null;
};

export type PeriodoR2Resultado = PeriodoDocumentalR2 & {
  facturaDocumentoId: number;
};

function enteroPositivo(valor: unknown): valor is number {
  return Number.isSafeInteger(valor) && Number(valor) > 0;
}

function validarContexto(contexto: PeriodoR2Contexto): void {
  if (
    !enteroPositivo(contexto.workspaceId) ||
    !enteroPositivo(contexto.expedienteId) ||
    typeof contexto.empresaCodigo !== 'string' ||
    !contexto.empresaCodigo.trim() ||
    (contexto.clienteDestinoId !== null &&
      !enteroPositivo(contexto.clienteDestinoId))
  ) {
    throw new BadRequestException('PERIODO_R2_CONTEXTO_INVALIDO');
  }
}

function validarSolicitud(solicitud: PeriodoR2Solicitud): void {
  let id: number;

  if (
    solicitud.operacion === 'VERSION_FACTURA' ||
    solicitud.operacion === 'VERSION_GUIA'
  ) {
    id = solicitud.documentoId;
  } else if (
    solicitud.operacion === 'NUEVA_GUIA' ||
    solicitud.operacion === 'NUEVA_NI'
  ) {
    id = solicitud.grupoFacturaId;
  } else {
    throw new BadRequestException('PERIODO_R2_SOLICITUD_INVALIDA');
  }

  if (!enteroPositivo(id)) {
    throw new BadRequestException('PERIODO_R2_SOLICITUD_INVALIDA');
  }
}

/**
 * Valida las relaciones obtenidas de PostgreSQL.
 *
 * No consulta la base de datos y no escribe archivos.
 * El adaptador SQL es responsable de devolver únicamente
 * relaciones activas y de comprobar el tipo documental.
 */
export function resolverPeriodoDesdeRelacionesR2(
  contexto: PeriodoR2Contexto,
  solicitud: PeriodoR2Solicitud,
  relaciones: readonly PeriodoR2Relacion[],
): PeriodoR2Resultado {
  validarContexto(contexto);
  validarSolicitud(solicitud);

  if (!Array.isArray(relaciones) || relaciones.length === 0) {
    throw new BadRequestException('PERIODO_R2_FACTURA_NO_ENCONTRADA');
  }

  const empresaEsperada = contexto.empresaCodigo.trim().toUpperCase();

  for (const relacion of relaciones) {
    if (
      !enteroPositivo(relacion.facturaDocumentoId) ||
      !enteroPositivo(relacion.expedienteId) ||
      relacion.empresaCodigo.trim().toUpperCase() !== empresaEsperada ||
      relacion.clienteDestinoId !== contexto.clienteDestinoId ||
      relacion.expedienteId !== contexto.expedienteId
    ) {
      throw new ForbiddenException('PERIODO_R2_RELACION_FUERA_DE_AMBITO');
    }
  }

  const facturas = new Set(
    relaciones.map((relacion) => relacion.facturaDocumentoId),
  );

  if (facturas.size !== 1) {
    throw new BadRequestException('PERIODO_R2_FACTURA_AMBIGUA');
  }

  const fechas = relaciones.map((relacion) =>
    resolverFechaDocumentalR2(relacion.fechaEmision),
  );

  const periodos = new Set(
    fechas.map((fecha) => fecha.fecha.toISOString()),
  );

  if (periodos.size !== 1) {
    throw new BadRequestException('PERIODO_R2_FECHAS_CONTRADICTORIAS');
  }

  return {
    ...fechas[0],
    facturaDocumentoId: relaciones[0].facturaDocumentoId,
  };
}

export type PeriodoR2SustentoSolicitud = {
  grupoFacturaId: number;
  documentoBaseId: number;
};

export type PeriodoR2SustentoRelacion = {
  grupoFacturaId: number;
  documentoBaseId: number;
  organizadorDocumentoId: number;
  tipoOrganizador: 'FACTURA' | 'ORDEN_PAGO';
  fechaEmision: string | null;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  expedienteId: number | null;
  relacionActiva: boolean;
};

export type PeriodoR2SustentoResultado = PeriodoDocumentalR2 & {
  organizadorDocumentoId: number;
  tipoOrganizador: 'FACTURA' | 'ORDEN_PAGO';
};

export function resolverPeriodoSustentoDesdeRelacionesR2(
  contexto: PeriodoR2Contexto,
  solicitud: PeriodoR2SustentoSolicitud,
  relaciones: readonly PeriodoR2SustentoRelacion[],
): PeriodoR2SustentoResultado {
  validarContexto(contexto);
  if (!enteroPositivo(contexto.clienteDestinoId)) {
    throw new BadRequestException('PERIODO_R2_CONTEXTO_INVALIDO');
  }
  if (!enteroPositivo(solicitud.grupoFacturaId) || !enteroPositivo(solicitud.documentoBaseId)) {
    throw new BadRequestException('PERIODO_R2_SOLICITUD_INVALIDA');
  }
  if (!Array.isArray(relaciones) || relaciones.length === 0) {
    throw new BadRequestException('PERIODO_R2_ORGANIZADOR_NO_ENCONTRADO');
  }
  for (const relacion of relaciones) {
    if (!relacion.relacionActiva || !enteroPositivo(relacion.organizadorDocumentoId) ||
        !['FACTURA', 'ORDEN_PAGO'].includes(relacion.tipoOrganizador) ||
        (relacion.tipoOrganizador === 'ORDEN_PAGO' &&
          relacion.organizadorDocumentoId !== relacion.documentoBaseId)) {
      throw new BadRequestException('PERIODO_R2_RELACION_INCOMPLETA');
    }
    if (relacion.grupoFacturaId !== solicitud.grupoFacturaId ||
        relacion.documentoBaseId !== solicitud.documentoBaseId ||
        relacion.empresaCodigo.trim().toUpperCase() !== contexto.empresaCodigo.trim().toUpperCase() ||
        relacion.clienteDestinoId !== contexto.clienteDestinoId ||
        relacion.expedienteId !== contexto.expedienteId) {
      throw new ForbiddenException('PERIODO_R2_RELACION_FUERA_DE_AMBITO');
    }
  }
  const organizadores = new Set(relaciones.map(r => `${r.tipoOrganizador}:${r.organizadorDocumentoId}`));
  if (organizadores.size !== 1) {
    throw new BadRequestException('PERIODO_R2_ORGANIZADOR_AMBIGUO');
  }
  const fechas = relaciones.map(r => resolverFechaDocumentalR2(r.fechaEmision));
  if (new Set(fechas.map(f => f.fecha.toISOString())).size !== 1) {
    throw new BadRequestException('PERIODO_R2_FECHAS_CONTRADICTORIAS');
  }
  return { ...fechas[0], organizadorDocumentoId: relaciones[0].organizadorDocumentoId,
    tipoOrganizador: relaciones[0].tipoOrganizador };
}
