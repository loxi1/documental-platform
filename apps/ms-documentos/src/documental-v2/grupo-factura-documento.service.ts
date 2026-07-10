import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  ActualizarGrupoFacturaDocumentoInput,
  CrearGrupoFacturaDocumentoInput,
  GrupoFacturaDocumentoRow,
  JsonObject,
} from './documental-v2.types';
import { GrupoFacturaDocumentoRepository } from './grupo-factura-documento.repository';
import { GrupoFacturaRepository } from './grupo-factura.repository';

@Injectable()
export class GrupoFacturaDocumentoService {
  constructor(
    private readonly repository: GrupoFacturaDocumentoRepository,
    private readonly grupoFacturaRepository: GrupoFacturaRepository,
  ) {}

  async crear(input: CrearGrupoFacturaDocumentoInput): Promise<GrupoFacturaDocumentoRow> {
    const data = this.normalizeCrearInput(input);
    const grupo = await this.grupoFacturaRepository.buscarPorId(data.grupoFacturaId);

    if (!grupo || grupo.estado === 'anulado') {
      throw new NotFoundException(`Grupo de Factura ${data.grupoFacturaId} no encontrado o anulado`);
    }

    const grupoActivoDelDocumento = await this.repository.buscarActivoPorDocumentoId(data.documentoId);

    if (grupoActivoDelDocumento) {
      throw new ConflictException({
        code: 'DOCUMENTO_YA_PERTENECE_A_GRUPO_FACTURA_ACTIVO',
        message: 'El documento ya pertenece a un Grupo de Factura activo.',
        details: {
          grupoFacturaDocumentoId: grupoActivoDelDocumento.id,
          grupoFacturaId: grupoActivoDelDocumento.grupoFacturaId,
          documentoId: data.documentoId,
        },
      });
    }

    return this.repository.crear(data);
  }

  async buscarPorId(id: number): Promise<GrupoFacturaDocumentoRow> {
    const normalizedId = this.normalizeId(id, 'grupoFacturaDocumentoId');
    const row = await this.repository.buscarPorId(normalizedId);

    if (!row) {
      throw new NotFoundException(`Documento de Grupo de Factura ${normalizedId} no encontrado`);
    }

    return row;
  }

  async buscarActivoPorDocumentoId(documentoId: number): Promise<GrupoFacturaDocumentoRow | null> {
    return this.repository.buscarActivoPorDocumentoId(this.normalizeId(documentoId, 'documentoId'));
  }

  async listarPorGrupoFactura(grupoFacturaId: number): Promise<GrupoFacturaDocumentoRow[]> {
    const id = this.normalizeId(grupoFacturaId, 'grupoFacturaId');
    return this.repository.listarPorGrupoFactura(id);
  }

  async actualizar(input: ActualizarGrupoFacturaDocumentoInput): Promise<GrupoFacturaDocumentoRow> {
    const id = this.normalizeId(input.id, 'grupoFacturaDocumentoId');
    await this.buscarPorId(id);

    const row = await this.repository.actualizar({
      ...input,
      id,
      tipoRelacion: input.tipoRelacion?.trim().toLowerCase(),
      estado: input.estado?.trim().toLowerCase(),
      metadata: this.normalizeMetadata(input.metadata),
    });

    if (!row) {
      throw new NotFoundException(`Documento de Grupo de Factura ${id} no encontrado`);
    }

    return row;
  }

  async anular(params: {
    id: number;
    usuarioId?: number | null;
    motivo?: string | null;
  }): Promise<GrupoFacturaDocumentoRow> {
    const id = this.normalizeId(params.id, 'grupoFacturaDocumentoId');
    await this.buscarPorId(id);

    const row = await this.repository.anular({
      id,
      usuarioId: this.normalizeOptionalId(params.usuarioId),
      motivo: params.motivo?.trim() || null,
    });

    if (!row) {
      throw new NotFoundException(`Documento de Grupo de Factura ${id} no encontrado`);
    }

    return row;
  }

  private normalizeCrearInput(input: CrearGrupoFacturaDocumentoInput): CrearGrupoFacturaDocumentoInput {
    return {
      ...input,
      grupoFacturaId: this.normalizeId(input.grupoFacturaId, 'grupoFacturaId'),
      documentoId: this.normalizeId(input.documentoId, 'documentoId'),
      tipoRelacion: this.normalizeText(input.tipoRelacion, 'tipoRelacion').toLowerCase(),
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
