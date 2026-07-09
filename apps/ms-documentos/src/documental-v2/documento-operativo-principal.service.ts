import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { ContenedorOperativoRepository } from './contenedor-operativo.repository';
import type {
  ActualizarDocumentoOperativoPrincipalInput,
  CrearDocumentoOperativoPrincipalInput,
  DocumentoOperativoPrincipalRow,
  JsonObject,
} from './documental-v2.types';
import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';

@Injectable()
export class DocumentoOperativoPrincipalService {
  constructor(
    private readonly repository: DocumentoOperativoPrincipalRepository,
    private readonly contenedorRepository: ContenedorOperativoRepository,
  ) {}

  async crear(input: CrearDocumentoOperativoPrincipalInput): Promise<DocumentoOperativoPrincipalRow> {
    const data = this.normalizeCrearInput(input);
    const contenedor = await this.contenedorRepository.buscarPorId(data.contenedorOperativoId);

    if (!contenedor || contenedor.estado !== 'activo') {
      throw new NotFoundException(
        `Contenedor operativo ${data.contenedorOperativoId} no encontrado o no activo`,
      );
    }

    const existente = await this.repository.buscarPorDocumentoId(data.documentoId);

    if (existente && existente.estado === 'activo') {
      throw new ConflictException({
        code: 'DOCUMENTO_OPERATIVO_PRINCIPAL_YA_EXISTE',
        message: 'El documento ya está registrado como Documento Operativo Principal activo.',
        details: {
          documentoOperativoPrincipalId: existente.id,
          contenedorOperativoId: existente.contenedorOperativoId,
          documentoId: data.documentoId,
        },
      });
    }

    return this.repository.crear(data);
  }

  async buscarPorId(id: number): Promise<DocumentoOperativoPrincipalRow> {
    const normalizedId = this.normalizeId(id, 'documentoOperativoPrincipalId');
    const row = await this.repository.buscarPorId(normalizedId);

    if (!row) {
      throw new NotFoundException(`Documento operativo principal ${normalizedId} no encontrado`);
    }

    return row;
  }

  async buscarPorDocumentoId(documentoId: number): Promise<DocumentoOperativoPrincipalRow | null> {
    return this.repository.buscarPorDocumentoId(this.normalizeId(documentoId, 'documentoId'));
  }

  async listarPorContenedor(contenedorOperativoId: number): Promise<DocumentoOperativoPrincipalRow[]> {
    const id = this.normalizeId(contenedorOperativoId, 'contenedorOperativoId');
    return this.repository.listarPorContenedor(id);
  }

  async actualizar(input: ActualizarDocumentoOperativoPrincipalInput): Promise<DocumentoOperativoPrincipalRow> {
    const id = this.normalizeId(input.id, 'documentoOperativoPrincipalId');
    await this.buscarPorId(id);

    const row = await this.repository.actualizar({
      ...input,
      id,
      tipoPrincipal: input.tipoPrincipal?.trim().toUpperCase(),
      estado: input.estado?.trim().toLowerCase(),
      metadata: this.normalizeMetadata(input.metadata),
    });

    if (!row) {
      throw new NotFoundException(`Documento operativo principal ${id} no encontrado`);
    }

    return row;
  }

  async anular(params: {
    id: number;
    usuarioId?: number | null;
    motivo?: string | null;
  }): Promise<DocumentoOperativoPrincipalRow> {
    const id = this.normalizeId(params.id, 'documentoOperativoPrincipalId');
    await this.buscarPorId(id);

    const row = await this.repository.anular({
      id,
      usuarioId: this.normalizeOptionalId(params.usuarioId),
      motivo: params.motivo?.trim() || null,
    });

    if (!row) {
      throw new NotFoundException(`Documento operativo principal ${id} no encontrado`);
    }

    return row;
  }

  private normalizeCrearInput(input: CrearDocumentoOperativoPrincipalInput): CrearDocumentoOperativoPrincipalInput {
    return {
      ...input,
      contenedorOperativoId: this.normalizeId(input.contenedorOperativoId, 'contenedorOperativoId'),
      documentoId: this.normalizeId(input.documentoId, 'documentoId'),
      tipoPrincipal: this.normalizeText(input.tipoPrincipal, 'tipoPrincipal').toUpperCase(),
      esPrincipalActivo: Boolean(input.esPrincipalActivo ?? false),
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
