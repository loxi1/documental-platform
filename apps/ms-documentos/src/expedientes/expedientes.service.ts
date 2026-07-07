import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpedientesRepository } from './expedientes.repository';
import { DocumentoEventosService } from '../documento-eventos/documento-eventos.service';

@Injectable()
export class ExpedientesService {
  constructor(
    private readonly repo: ExpedientesRepository,
    private readonly documentoEventos: DocumentoEventosService,
  ) {}


  private readonly estadosMantenimiento = new Set([
    'abierto',
    'cerrado',
    'observado',
    'anulado',
  ]);

  private normalizeEstadoMantenimiento(estado?: string | null) {
    const normalized = String(estado ?? 'abierto').trim().toLowerCase();

    if (!this.estadosMantenimiento.has(normalized)) {
      throw new BadRequestException(
        'estado inválido. Valores permitidos: abierto, cerrado, observado, anulado',
      );
    }

    return normalized;
  }

  private normalizeCodigoExpediente(codigo?: string | null) {
    const normalized = String(codigo ?? '').trim();

    if (!normalized) {
      throw new BadRequestException('codigoExpediente es obligatorio');
    }

    return normalized;
  }

  private normalizeEmpresaCodigo(empresa?: string | null) {
    const normalized = String(empresa ?? '').trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('empresaCodigo es obligatorio');
    }

    return normalized;
  }

  private normalizeClienteDestinoId(clienteDestinoId: unknown) {
    const normalized = Number(clienteDestinoId);

    if (!Number.isFinite(normalized) || normalized <= 0) {
      throw new BadRequestException('clienteDestinoId es obligatorio');
    }

    return normalized;
  }

  findMantenimiento(filters: {
    empresa?: string;
    clienteDestinoId?: number;
    estado?: string;
    q?: string;
    limit?: number;
    offset?: number;
    page?: number;
    pageSize?: number;
  }) {
    return this.repo.findMantenimiento({
      empresa: filters.empresa?.trim().toUpperCase() || undefined,
      clienteDestinoId: filters.clienteDestinoId,
      estado: filters.estado?.trim() || undefined,
      q: filters.q?.trim() || undefined,
      limit: filters.limit,
      offset: filters.offset,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  }

  async findMantenimientoById(id: number) {
    const expediente = await this.repo.findMantenimientoById(id);

    if (!expediente) {
      throw new NotFoundException(`Expediente ${id} no encontrado`);
    }

    return expediente;
  }

  async createMantenimiento(data: {
    clienteDestinoId: number;
    empresaCodigo: string;
    codigoExpediente: string;
    descripcion?: string | null;
    estado?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    const empresaCodigo = this.normalizeEmpresaCodigo(data.empresaCodigo);
    const clienteDestinoId = this.normalizeClienteDestinoId(data.clienteDestinoId);
    const codigoExpediente = this.normalizeCodigoExpediente(data.codigoExpediente);
    const estado = this.normalizeEstadoMantenimiento(data.estado);

    const duplicate = await this.repo.existsMantenimientoDuplicate({
      empresaCodigo,
      clienteDestinoId,
      codigoExpediente,
    });

    if (duplicate) {
      throw new ConflictException(
        `Ya existe un expediente ${codigoExpediente} para la empresa ${empresaCodigo}`,
      );
    }

    return this.repo.createMantenimiento({
      clienteDestinoId,
      empresaCodigo,
      codigoExpediente,
      descripcion: data.descripcion?.trim() || null,
      estado,
      metadata: {
        ...(data.metadata ?? {}),
        origen: data.metadata?.origen ?? 'mantenimiento_contable',
      },
    });
  }

  async updateMantenimiento(
    id: number,
    data: {
      codigoExpediente?: string;
      descripcion?: string | null;
      estado?: string;
      metadata?: Record<string, any> | null;
    },
  ) {
    const current = await this.findMantenimientoById(id);
    const codigoExpediente =
      data.codigoExpediente !== undefined
        ? this.normalizeCodigoExpediente(data.codigoExpediente)
        : current.codigoExpediente;
    const estado =
      data.estado !== undefined
        ? this.normalizeEstadoMantenimiento(data.estado)
        : current.estado;

    const duplicate = await this.repo.existsMantenimientoDuplicate({
      empresaCodigo: current.empresaCodigo,
      clienteDestinoId: current.clienteDestinoId,
      codigoExpediente,
      excludeId: id,
    });

    if (duplicate) {
      throw new ConflictException(
        `Ya existe un expediente ${codigoExpediente} para la empresa ${current.empresaCodigo}`,
      );
    }

    return this.repo.updateMantenimiento(id, {
      codigoExpediente,
      descripcion:
        data.descripcion !== undefined ? data.descripcion?.trim() || null : undefined,
      estado,
      metadata: data.metadata !== undefined ? data.metadata ?? {} : undefined,
    });
  }

  async updateMantenimientoEstado(id: number, estado: string) {
    await this.findMantenimientoById(id);
    const normalizedEstado = this.normalizeEstadoMantenimiento(estado);

    return this.repo.updateMantenimientoEstado(id, normalizedEstado);
  }

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

    await this.documentoEventos.registrarEvento({
      documentoId: Number(data.documentoId),
      expedienteId: Number(expedienteId),
      tipoEvento: 'expediente.vinculado',
      entidadTipo: 'expediente',
      entidadId: Number(expedienteId),
      descripcion: 'Documento vinculado manualmente a expediente.',
      metadata: {
        tipoRelacion: data.tipoRelacion ?? null,
        esPrincipal: data.esPrincipal ?? false,
        orden: data.orden ?? 0,
        vinculo: result ?? null,
      },
      origen: 'api',
    });

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

  async buscarExpedientes(params: { q?: string; empresa?: string; limit?: number }) {
    const q = String(params.q ?? '').trim();
    const empresa = String(params.empresa ?? '').trim().toUpperCase() || undefined;
    const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 20);

    if (q.length < 2) {
      return {
        total: 0,
        data: [],
      };
    }

    const data = await this.repo.buscarExpedientes({ q, empresa, limit });

    return {
      total: data.length,
      data,
    };
  }

  async findByCodigoExpediente(codigo: string, empresa?: string) {
    const expediente = await this.repo.findByCodigoExpediente(
      codigo,
      empresa ? empresa.trim().toUpperCase() : undefined,
    );

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
