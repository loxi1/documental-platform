import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentosFilters,
  DocumentosRepository,
} from './documentos.repository';

@Injectable()
export class DocumentosService {
  constructor(private readonly repo: DocumentosRepository) {}

  findAll(filters: DocumentosFilters) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const doc = await this.repo.findById(id);

    if (!doc) {
      throw new NotFoundException(`Documento ${id} no encontrado`);
    }

    return doc;
  }

  getTipos() {
    return this.repo.getTipos();
  }

    getClientesDestino() {
    return this.repo.getClientesDestino();
  }

  getProveedores(search?: string, limit?: number, offset?: number) {
    return this.repo.getProveedores(search, limit, offset);
  }
}
