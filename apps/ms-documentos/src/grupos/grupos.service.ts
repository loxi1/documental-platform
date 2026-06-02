import { Injectable, NotFoundException } from '@nestjs/common';
import { GruposFilters, GruposRepository } from './grupos.repository';

@Injectable()
export class GruposService {
  constructor(private readonly repo: GruposRepository) {}

  findAll(filters: GruposFilters) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const grupo = await this.repo.findById(id);

    if (!grupo) {
      throw new NotFoundException(`Grupo ${id} no encontrado`);
    }

    return grupo;
  }
}
