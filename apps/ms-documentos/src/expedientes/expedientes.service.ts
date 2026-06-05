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

    return expediente;
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
    },
  ) {
    await this.findById(expedienteId);

    return this.repo.addDocumento({
      expedienteId,
      documentoId: data.documentoId,
      tipoRelacion: data.tipoRelacion,
    });
  }
}
