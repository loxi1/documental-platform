import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  ActualizarGrupoFacturaInput,
  CrearGrupoFacturaInput,
  GrupoFacturaRow,
  JsonObject,
} from './documental-v2.types';
import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';
import { GrupoFacturaRepository } from './grupo-factura.repository';

@Injectable()
export class GrupoFacturaService {
  constructor(
    private readonly repository: GrupoFacturaRepository,
    private readonly documentoOperativoPrincipalRepository: DocumentoOperativoPrincipalRepository,
  ) {}

  async crear(input: CrearGrupoFacturaInput): Promise<GrupoFacturaRow> {
    const data = this.normalizeCrearInput(input);
    const documentoOperativo = await this.documentoOperativoPrincipalRepository.buscarPorId(
      data.documentoOperativoPrincipalId,
    );

    if (!documentoOperativo || documentoOperativo.estado !== 'activo') {
      throw new NotFoundException(
        `Documento operativo principal ${data.documentoOperativoPrincipalId} no encontrado o no activo`,
      );
    }

    const existente = await this.repository.buscarPorFacturaDocumentoId(data.facturaDocumentoId);

    if (existente && existente.estado !== 'anulado') {
      throw new ConflictException({
        code: 'FACTURA_YA_TIENE_GRUPO_ACTIVO',
        message: 'La factura ya pertenece a un Grupo de Factura activo o vigente.',
        details: {
          grupoFacturaId: existente.id,
          facturaDocumentoId: data.facturaDocumentoId,
        },
      });
    }

    return this.repository.crear(data);
  }

  async buscarPorId(id: number): Promise<GrupoFacturaRow> {
    const normalizedId = this.normalizeId(id, 'grupoFacturaId');
    const row = await this.repository.buscarPorId(normalizedId);

    if (!row) {
      throw new NotFoundException(`Grupo de Factura ${normalizedId} no encontrado`);
    }

    return row;
  }

  async buscarPorFacturaDocumentoId(facturaDocumentoId: number): Promise<GrupoFacturaRow | null> {
    return this.repository.buscarPorFacturaDocumentoId(
      this.normalizeId(facturaDocumentoId, 'facturaDocumentoId'),
    );
  }

  async listarPorDocumentoOperativoPrincipal(
    documentoOperativoPrincipalId: number,
  ): Promise<GrupoFacturaRow[]> {
    const id = this.normalizeId(documentoOperativoPrincipalId, 'documentoOperativoPrincipalId');
    return this.repository.listarPorDocumentoOperativoPrincipal(id);
  }

  async actualizar(input: ActualizarGrupoFacturaInput): Promise<GrupoFacturaRow> {
    const id = this.normalizeId(input.id, 'grupoFacturaId');
    await this.buscarPorId(id);

    const row = await this.repository.actualizar({
      ...input,
      id,
      estado: input.estado?.trim().toLowerCase(),
      metadata: this.normalizeMetadata(input.metadata),
    });

    if (!row) {
      throw new NotFoundException(`Grupo de Factura ${id} no encontrado`);
    }

    return row;
  }

  async anular(params: {
    id: number;
    usuarioId?: number | null;
    motivo?: string | null;
  }): Promise<GrupoFacturaRow> {
    const id = this.normalizeId(params.id, 'grupoFacturaId');
    await this.buscarPorId(id);

    const row = await this.repository.anular({
      id,
      usuarioId: this.normalizeOptionalId(params.usuarioId),
      motivo: params.motivo?.trim() || null,
    });

    if (!row) {
      throw new NotFoundException(`Grupo de Factura ${id} no encontrado`);
    }

    return row;
  }

  private normalizeCrearInput(input: CrearGrupoFacturaInput): CrearGrupoFacturaInput {
    return {
      ...input,
      documentoOperativoPrincipalId: this.normalizeId(
        input.documentoOperativoPrincipalId,
        'documentoOperativoPrincipalId',
      ),
      facturaDocumentoId: this.normalizeId(input.facturaDocumentoId, 'facturaDocumentoId'),
      estado: input.estado?.trim().toLowerCase() || 'pendiente_revision',
      metadata: this.normalizeMetadata(input.metadata),
      creadoPor: this.normalizeOptionalId(input.creadoPor),
    };
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
