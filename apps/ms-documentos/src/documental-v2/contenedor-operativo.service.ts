import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { ContenedorOperativoRepository } from './contenedor-operativo.repository';
import type {
  ActualizarContenedorOperativoInput,
  BuscarContenedoresOperativosFiltro,
  ContenedorOperativoRow,
  CrearContenedorOperativoInput,
  JsonObject,
} from './documental-v2.types';

@Injectable()
export class ContenedorOperativoService {
  constructor(private readonly repository: ContenedorOperativoRepository) {}

  async crear(input: CrearContenedorOperativoInput): Promise<ContenedorOperativoRow> {
    const data = this.normalizeCrearInput(input);
    const existente = await this.repository.buscarPorClave({
      empresaCodigo: data.empresaCodigo,
      tipoContexto: data.tipoContexto,
      codigo: data.codigo,
    });

    if (existente && existente.estado === 'activo') {
      throw new ConflictException({
        code: 'CONTENEDOR_OPERATIVO_YA_EXISTE',
        message: 'Ya existe un contenedor operativo activo con la misma empresa, tipo y código.',
        details: {
          contenedorOperativoId: existente.id,
          empresaCodigo: data.empresaCodigo,
          tipoContexto: data.tipoContexto,
          codigo: data.codigo,
        },
      });
    }

    return this.repository.crear(data);
  }

  async buscarPorId(id: number): Promise<ContenedorOperativoRow> {
    const normalizedId = this.normalizeId(id, 'contenedorOperativoId');
    const row = await this.repository.buscarPorId(normalizedId);

    if (!row) {
      throw new NotFoundException(`Contenedor operativo ${normalizedId} no encontrado`);
    }

    return row;
  }

  async buscarPorClave(params: {
    empresaCodigo: string;
    tipoContexto: string;
    codigo: string;
  }): Promise<ContenedorOperativoRow | null> {
    return this.repository.buscarPorClave({
      empresaCodigo: this.normalizeText(params.empresaCodigo, 'empresaCodigo').toUpperCase(),
      tipoContexto: this.normalizeText(params.tipoContexto, 'tipoContexto').toLowerCase(),
      codigo: this.normalizeText(params.codigo, 'codigo'),
    });
  }

  listar(filtro: BuscarContenedoresOperativosFiltro = {}) {
    return this.repository.listar({
      ...filtro,
      empresaCodigo: filtro.empresaCodigo?.trim().toUpperCase() || undefined,
      tipoContexto: filtro.tipoContexto?.trim().toLowerCase() || undefined,
      estado: filtro.estado?.trim().toLowerCase() || undefined,
      q: filtro.q?.trim() || undefined,
    });
  }

  async actualizar(input: ActualizarContenedorOperativoInput): Promise<ContenedorOperativoRow> {
    const id = this.normalizeId(input.id, 'contenedorOperativoId');
    await this.buscarPorId(id);

    const row = await this.repository.actualizar({
      ...input,
      id,
      estado: input.estado?.trim().toLowerCase(),
      metadata: this.normalizeMetadata(input.metadata),
    });

    if (!row) {
      throw new NotFoundException(`Contenedor operativo ${id} no encontrado`);
    }

    return row;
  }

  async anular(params: {
    id: number;
    usuarioId?: number | null;
    motivo?: string | null;
  }): Promise<ContenedorOperativoRow> {
    const id = this.normalizeId(params.id, 'contenedorOperativoId');
    await this.buscarPorId(id);

    const row = await this.repository.anular({
      id,
      usuarioId: this.normalizeOptionalId(params.usuarioId),
      motivo: params.motivo?.trim() || null,
    });

    if (!row) {
      throw new NotFoundException(`Contenedor operativo ${id} no encontrado`);
    }

    return row;
  }

  private normalizeCrearInput(input: CrearContenedorOperativoInput): CrearContenedorOperativoInput {
    return {
      ...input,
      empresaCodigo: this.normalizeText(input.empresaCodigo, 'empresaCodigo').toUpperCase(),
      tipoContexto: this.normalizeText(input.tipoContexto, 'tipoContexto').toLowerCase(),
      codigo: this.normalizeText(input.codigo, 'codigo'),
      nombre: input.nombre?.trim() || null,
      descripcion: input.descripcion?.trim() || null,
      centroCostoCodigo: input.centroCostoCodigo?.trim() || null,
      ordenProduccionCodigo: input.ordenProduccionCodigo?.trim() || null,
      proyectoCodigo: input.proyectoCodigo?.trim() || null,
      estado: input.estado?.trim().toLowerCase() || 'activo',
      metadata: this.normalizeMetadata(input.metadata),
      creadoPor: this.normalizeOptionalId(input.creadoPor),
    };
  }

  private normalizeText(value: unknown, field: string): string {
    const normalized = String(value ?? '').trim();

    if (!normalized) {
      throw new BadRequestException(`${field} es obligatorio`);
    }

    return normalized;
  }

  private normalizeId(value: unknown, field: string): number {
    const normalized = Number(value);

    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new BadRequestException(`${field} debe ser un entero positivo`);
    }

    return normalized;
  }

  private normalizeOptionalId(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    const normalized = Number(value);
    return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
  }

  private normalizeMetadata(metadata?: JsonObject | null): JsonObject {
    return metadata && typeof metadata === 'object' ? metadata : {};
  }
}
