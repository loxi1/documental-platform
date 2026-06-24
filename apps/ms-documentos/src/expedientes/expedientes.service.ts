import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpedientesRepository } from './expedientes.repository';

@Injectable()
export class ExpedientesService {
  constructor(private readonly repo: ExpedientesRepository) {}

  findAll(filters: {
    empresa?: string;
    estado?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const expediente = await this.repo.findById(id);

    if (!expediente) {
      throw new NotFoundException(`Expediente ${id} no encontrado`);
    }

    const documentos = expediente.documentos ?? [];

    return {
      ...expediente,
      documentosPrincipales: documentos.filter((d: any) => d.esPrincipal),
      documentosAdjuntos: documentos.filter((d: any) => !d.esPrincipal),
    };
  }

  create(data: {
    clienteDestinoId: number;
    empresaCodigo: string;
    codigoExpediente: string;
    descripcion?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    const empresaCodigo = String(data.empresaCodigo ?? '').trim().toUpperCase();
    const codigoExpediente = String(data.codigoExpediente ?? '').trim();
    const clienteDestinoId = Number(data.clienteDestinoId);

    if (!empresaCodigo) {
      throw new BadRequestException('empresaCodigo es obligatorio');
    }

    if (!codigoExpediente) {
      throw new BadRequestException('codigoExpediente es obligatorio');
    }

    if (!Number.isFinite(clienteDestinoId) || clienteDestinoId <= 0) {
      throw new BadRequestException('clienteDestinoId es obligatorio');
    }

    return this.repo.create({
      clienteDestinoId,
      empresaCodigo,
      codigoExpediente,
      descripcion: data.descripcion?.trim() || null,
      metadata: {
        ...(data.metadata ?? {}),
        origenCreacion: 'COMPRAS_NUEVO',
      },
    });
  }

  async addDocumento(
    expedienteId: number,
    data: {
      documentoId: number;
      tipoRelacion?: string | null;
      esPrincipal?: boolean;
      orden?: number;
    },
  ) {
    await this.findById(expedienteId);

    const result = await this.repo.addDocumento({
      expedienteId,
      documentoId: data.documentoId,
      tipoRelacion: data.tipoRelacion,
      esPrincipal: data.esPrincipal ?? false,
      orden: data.orden ?? 0,
    });

    if (result?.yaVinculado) {
      return {
        ok: false,
        mensaje: 'Documento ya vinculado a otro expediente',
        expedienteId: result.expedienteId,
      };
    }

    return result;
  }

  async getResumen(id: number) {
    const resumen = await this.repo.getResumen(id);

    if (!resumen) {
      throw new NotFoundException(`Expediente ${id} no encontrado`);
    }

    const documentos = resumen.documentos ?? [];

    return {
      expediente: {
        id: resumen.id,
        clienteDestinoId: resumen.cliente_destino_id,
        clienteNombre: resumen.cliente_nombre,
        clienteAbreviatura: resumen.cliente_abreviatura,
        clienteRuc: resumen.cliente_ruc,
        empresaCodigo: resumen.empresa_codigo,
        codigoExpediente: resumen.codigo_expediente,
        descripcion: resumen.descripcion,
        estado: resumen.estado,
        metadata: resumen.metadata,
      },
      documentosPrincipales: documentos.filter((d: any) => d.esPrincipal),
      documentosAdjuntos: documentos.filter((d: any) => !d.esPrincipal),
      totales: {
        documentos: resumen.total_documentos,
        facturas: resumen.total_facturas,
        guias: resumen.total_guias,
        notasIngreso: resumen.total_notas_ingreso,
        pagos: resumen.total_pagos,
      },
      documentos,
    };
  }

  async getTimeline(id: number) {
    const expediente = await this.repo.findById(id);

    if (!expediente) {
      throw new NotFoundException(`Expediente ${id} no encontrado`);
    }

    const timeline = await this.repo.getTimeline(id);

    return {
      expediente: {
        id: expediente.id,
        codigoExpediente: expediente.codigo_expediente,
        empresaCodigo: expediente.empresa_codigo,
      },
      timeline,
    };
  }

  async buscarExpedientes(params: { q?: string; limit?: number }) {
    const q = String(params.q ?? '').trim();
    const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 20);

    if (q.length < 2) {
      return {
        total: 0,
        data: [],
      };
    }

    const data = await this.repo.buscarExpedientes({ q, limit });

    return {
      total: data.length,
      data,
    };
  }

  async findByCodigoExpediente(codigo: string) {
    const expediente = await this.repo.findByCodigoExpediente(codigo);

    return {
      existe: !!expediente,
      expediente,
    };
  }

  getRevisionContable(filters: {
    empresa: string;
    anio: number;
    mes: number;
  }) {
    return this.repo.getRevisionContable(filters);
  }

  async getEstadoDocumental(id: number) {
    const result = await this.repo.getEstadoDocumental(id);

    if (!result) {
      throw new NotFoundException(`Expediente ${id} no encontrado`);
    }

    return result;
  }

  async getDashboardContable(filters: {
    empresa: string;
    anio: number;
    mes: number;
  }) {
    const dashboard = await this.repo.getDashboardContable(filters);

    return {
      empresa: filters.empresa,
      anio: filters.anio,
      mes: filters.mes,
      totales: {
        expedientes: dashboard?.expedientes ?? 0,
        facturas: dashboard?.facturas ?? 0,
        montoFacturado: dashboard?.monto_facturado ?? '0.00',
        alertasActivas: dashboard?.alertas_activas ?? 0,
      },
    };
  }

  async findDocumentos(id: number) {
    await this.findById(id);
    return this.repo.findDocumentosByExpedienteId(id);
  }
}
