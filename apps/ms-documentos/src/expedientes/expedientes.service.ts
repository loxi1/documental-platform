import { Injectable, NotFoundException } from '@nestjs/common';
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

      documentoPrincipal:
        documentos.find((d: any) => d.esPrincipal) ?? null,

      documentosAdjuntos:
        documentos.filter((d: any) => !d.esPrincipal),
    };
  }

  create(data: {
    correlativo: string;
    empresaCodigo: string;
    tipoExpediente: string;
    codigoCentroCosto?: string | null;
    codigoOp?: string | null;
    descripcion?: string | null;
  }) {
    return this.repo.create(data);
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

    return this.repo.addDocumento({
      expedienteId,
      documentoId: data.documentoId,
      tipoRelacion: data.tipoRelacion,
      esPrincipal: data.esPrincipal ?? false,
      orden: data.orden ?? 0,
    });
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
        codigoCentroCosto: resumen.codigo_centro_costo,
        codigoOp: resumen.codigo_op,
        estado: resumen.estado,
      },
      documentoPrincipal:
        documentos.find((d: any) => d.esPrincipal) ?? null,
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
      throw new NotFoundException(
        `Expediente ${id} no encontrado`,
      );
    }

    const timeline =
      await this.repo.getTimeline(id);

    return {
      expediente: {
        id: expediente.id,
        correlativo: expediente.correlativo,
        empresaCodigo:
          expediente.empresa_codigo,
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
}
