import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpedientesRepository } from './expedientes.repository';

export type ExpedienteInput = {
  correlativo?: string;
  empresaCodigo?: string;
  tipoExpediente?: string;
  codigoExpediente?: string | null;
  clavePrincipal?: string | null;
  descripcion?: string | null;
  estado?: string | null;
  metadata?: Record<string, any> | null;
  codigoCentroCosto?: string | null;
  codigoOp?: string | null;
};

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
      documentoPrincipal: documentos.find((d: any) => d.esPrincipal) ?? null,
      documentosPrincipales: documentos.filter((d: any) => d.esPrincipal),
      documentosAdjuntos: documentos.filter((d: any) => !d.esPrincipal),
    };
  }

  create(data: ExpedienteInput) {
    this.assertCreateInput(data);
    return this.repo.create(this.normalizeInput(data));
  }

  async patch(id: number, data: ExpedienteInput) {
    await this.findById(id);

    const updated = await this.repo.patch(id, this.normalizeInput(data));

    if (!updated) {
      throw new NotFoundException(`Expediente ${id} no encontrado`);
    }

    return updated;
  }

  async replace(id: number, data: ExpedienteInput) {
    await this.findById(id);
    this.assertReplaceInput(data);

    const updated = await this.repo.replace(id, this.normalizeInput(data));

    if (!updated) {
      throw new NotFoundException(`Expediente ${id} no encontrado`);
    }

    return updated;
  }

  async remove(id: number) {
    await this.findById(id);

    const removed = await this.repo.remove(id);

    if (!removed) {
      throw new NotFoundException(`Expediente ${id} no encontrado`);
    }

    return {
      eliminado: true,
      expediente: removed,
    };
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
        correlativo: resumen.correlativo,
        empresaCodigo: resumen.empresa_codigo,
        tipoExpediente: resumen.tipo_expediente,
        codigoExpediente: resumen.codigo_expediente,
        clavePrincipal: resumen.clave_principal,
        estado: resumen.estado,
        descripcion: resumen.descripcion,
        metadata: resumen.metadata ?? {},
      },
      documentoPrincipal: documentos.find((d: any) => d.esPrincipal) ?? null,
      documentosPrincipales: documentos.filter((d: any) => d.esPrincipal),
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
        correlativo: expediente.correlativo,
        empresaCodigo: expediente.empresa_codigo,
      },
      timeline,
    };
  }

  async findByClavePrincipal(clave: string) {
    const expediente = await this.repo.findByClavePrincipal(clave);

    return {
      existe: !!expediente,
      expediente,
    };
  }

  getRevisionContable(filters: { empresa: string; anio: number; mes: number }) {
    return this.repo.getRevisionContable(filters);
  }

  async getEstadoDocumental(id: number) {
    const result = await this.repo.getEstadoDocumental(id);

    if (!result) {
      throw new NotFoundException(`Expediente ${id} no encontrado`);
    }

    return result;
  }

  async getDashboardContable(filters: { empresa: string; anio: number; mes: number }) {
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

  private assertCreateInput(data: ExpedienteInput) {
    if (!data.correlativo?.trim()) {
      throw new BadRequestException('correlativo es obligatorio');
    }

    if (!data.empresaCodigo?.trim()) {
      throw new BadRequestException('empresaCodigo es obligatorio');
    }

    if (!data.tipoExpediente?.trim()) {
      throw new BadRequestException('tipoExpediente es obligatorio');
    }
  }

  private assertReplaceInput(data: ExpedienteInput) {
    this.assertCreateInput(data);
  }

  private normalizeInput(data: ExpedienteInput) {
    const metadata = {
      ...(data.metadata ?? {}),
    };

    if (data.codigoCentroCosto !== undefined) {
      metadata.codigoCentroCosto = data.codigoCentroCosto;
    }

    if (data.codigoOp !== undefined) {
      metadata.codigoOp = data.codigoOp;
    }

    return {
      correlativo: data.correlativo?.trim(),
      empresaCodigo: data.empresaCodigo?.trim().toUpperCase(),
      tipoExpediente: data.tipoExpediente?.trim().toUpperCase(),
      codigoExpediente:
        data.codigoExpediente?.trim() ||
        data.codigoOp?.trim() ||
        data.codigoCentroCosto?.trim() ||
        null,
      clavePrincipal: data.clavePrincipal?.trim() || null,
      descripcion: data.descripcion ?? null,
      estado: data.estado?.trim().toLowerCase() || null,
      metadata,
    };
  }
}
