import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { ContenedorOperativoRepository } from '../contenedor-operativo.repository';
import { TrazabilidadV2ProjectionMapper } from '../trazabilidad-v2.projection.mapper';
import { TrazabilidadV2Repository } from '../trazabilidad-v2.repository';
import type { ConsultarTrazabilidadV2ResponseDto } from '../trazabilidad-v2.dto';

export interface ConsultarTrazabilidadV2Input {
  contenedorOperativoId: number;
  usuario?: {
    empresaCodigo?: string | null;
    clienteDestinoId?: number | null;
  } | null;
}

@Injectable()
export class ConsultarTrazabilidadV2UseCase {
  constructor(
    private readonly contenedores: ContenedorOperativoRepository,
    private readonly trazabilidadRepository: TrazabilidadV2Repository,
    private readonly projectionMapper: TrazabilidadV2ProjectionMapper,
  ) {}

  async execute(
    input: ConsultarTrazabilidadV2Input,
  ): Promise<ConsultarTrazabilidadV2ResponseDto> {
    const contenedor = await this.contenedores.buscarPorId(input.contenedorOperativoId);

    if (!contenedor) {
      throw new NotFoundException({
        code: 'CONTENEDOR_OPERATIVO_NO_ENCONTRADO',
        message: 'Contenedor Operativo no encontrado',
      });
    }

    const empresaContexto = normalizarTexto(input.usuario?.empresaCodigo);
    const empresaContenedor = normalizarTexto(contenedor.empresaCodigo);

    if (empresaContexto && empresaContenedor && empresaContexto !== empresaContenedor) {
      throw new ForbiddenException({
        code: 'CONTENEDOR_OPERATIVO_NO_AUTORIZADO',
        message: 'No tienes permiso para consultar la trazabilidad del contenedor operativo solicitado',
      });
    }

    const clienteDestinoContexto = input.usuario?.clienteDestinoId ?? null;
    const clienteDestinoContenedor = contenedor.clienteDestinoId ?? null;

    if (
      clienteDestinoContexto !== null &&
      clienteDestinoContenedor !== null &&
      Number(clienteDestinoContexto) !== Number(clienteDestinoContenedor)
    ) {
      throw new ForbiddenException({
        code: 'CONTENEDOR_OPERATIVO_NO_AUTORIZADO',
        message: 'No tienes permiso para consultar la trazabilidad de otro cliente destino',
      });
    }

    const auditoriaRows = await this.trazabilidadRepository.listarAuditoriaOperativaPorContenedor({
      contenedorOperativoId: input.contenedorOperativoId,
      empresaCodigo: empresaContenedor,
    });

    return this.projectionMapper.construirRespuesta({
      contenedorOperativoId: input.contenedorOperativoId,
      auditoriaRows,
      documentoEventosOperativoDisponible: false,
    });
  }
}

function normalizarTexto(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim().toUpperCase();
}
