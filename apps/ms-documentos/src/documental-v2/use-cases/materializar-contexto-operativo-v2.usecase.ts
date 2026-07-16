import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { V1DocumentalReadOnlyRepository } from '../adapters/v1-documental-readonly.repository';
import { AuditoriaOperativaV2Repository } from '../auditoria-operativa-v2.repository';
import { ContenedorOperativoRepository } from '../contenedor-operativo.repository';
import type { ContenedorOperativoRow, JsonObject } from '../documental-v2.types';

const TIPO_CONTEXTO_EXPEDIENTE_V1 = 'expediente_v1';

export type MaterializarContextoOperativoV2Input = {
  expedienteId: number;
  usuario?: {
    id?: number | null;
    email?: string | null;
    workspaceId?: number | null;
    empresaCodigo?: string | null;
    clienteDestinoId?: number | null;
    requestId?: string | null;
    correlationId?: string | null;
    origen?: string | null;
    sistemaCodigo?: string | null;
    perfilCodigo?: string | null;
  };
};

export type MaterializarContextoOperativoV2Result = {
  expedienteId: number;
  contenedorOperativo: {
    id: number;
    empresaCodigo: string;
    clienteDestinoId: number | null;
    tipoContexto: string;
    codigo: string;
    estado: string;
  };
  idempotente: boolean;
  workspaceDebeRefrescar: true;
};

function crearError(message: string, code: string, details?: JsonObject) {
  return details ? { message, code, details } : { message, code };
}

function normalizarTexto(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
}

function normalizarEmpresa(value: unknown): string | null {
  const normalized = normalizarTexto(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizarCodigo(value: unknown): string | null {
  return normalizarTexto(value);
}

function normalizarId(value: unknown, field: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(crearError(`${field} debe ser un entero positivo`, 'PARAMETRO_INVALIDO'));
  }

  return parsed;
}

function normalizarClienteDestinoId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function esExpedienteNoActivo(estado: unknown): boolean {
  const normalized = String(estado ?? '').trim().toLowerCase();

  return ['anulado', 'inactivo', 'cerrado'].includes(normalized);
}

@Injectable()
export class MaterializarContextoOperativoV2UseCase {
  constructor(
    private readonly expedientesV1: V1DocumentalReadOnlyRepository,
    private readonly contenedores: ContenedorOperativoRepository,
    private readonly auditoria: AuditoriaOperativaV2Repository,
  ) {}

  async execute(
    input: MaterializarContextoOperativoV2Input,
  ): Promise<MaterializarContextoOperativoV2Result> {
    const expedienteId = normalizarId(input.expedienteId, 'expedienteId');
    const empresaContexto = normalizarEmpresa(input.usuario?.empresaCodigo);
    const clienteDestinoIdContexto = normalizarClienteDestinoId(input.usuario?.clienteDestinoId);

    if (!empresaContexto) {
      throw new ForbiddenException(crearError('Workspace sin empresa', 'WORKSPACE_SIN_EMPRESA'));
    }

    if (!clienteDestinoIdContexto) {
      throw new BadRequestException(
        crearError('Workspace sin cliente destino', 'WORKSPACE_SIN_CLIENTE_DESTINO'),
      );
    }

    const expedienteConDocumentos = await this.expedientesV1.obtenerExpedienteConDocumentos(expedienteId);
    const expediente = expedienteConDocumentos?.expediente ?? null;

    if (!expediente) {
      throw new NotFoundException(
        crearError('Expediente no encontrado', 'EXPEDIENTE_NO_ENCONTRADO', { expedienteId }),
      );
    }

    const empresaExpediente = normalizarEmpresa(expediente.empresaCodigo);
    const clienteDestinoIdExpediente = normalizarClienteDestinoId(expediente.clienteDestinoId);
    const codigoExpediente = normalizarCodigo(expediente.codigoExpediente);

    if (!empresaExpediente) {
      throw new BadRequestException(
        crearError('Expediente sin empresa', 'EXPEDIENTE_SIN_EMPRESA', { expedienteId }),
      );
    }

    if (!clienteDestinoIdExpediente) {
      throw new BadRequestException(
        crearError('Expediente sin cliente destino', 'EXPEDIENTE_SIN_CLIENTE_DESTINO', {
          expedienteId,
        }),
      );
    }

    if (!codigoExpediente) {
      throw new BadRequestException(
        crearError('Expediente sin código', 'EXPEDIENTE_SIN_CODIGO', { expedienteId }),
      );
    }

    if (esExpedienteNoActivo(expediente.estado)) {
      throw new ConflictException(
        crearError('Expediente no activo', 'EXPEDIENTE_NO_ACTIVO', {
          expedienteId,
          estado: expediente.estado,
        }),
      );
    }

    if (empresaExpediente !== empresaContexto) {
      throw new ForbiddenException(
        crearError('Expediente no autorizado para la empresa del workspace', 'EXPEDIENTE_NO_AUTORIZADO', {
          expedienteId,
          empresaExpediente,
          empresaContexto,
        }),
      );
    }

    if (clienteDestinoIdExpediente !== clienteDestinoIdContexto) {
      throw new ForbiddenException(
        crearError(
          'Expediente no autorizado para el cliente destino del workspace',
          'EXPEDIENTE_NO_AUTORIZADO',
          {
            expedienteId,
            clienteDestinoIdExpediente,
            clienteDestinoIdContexto,
          },
        ),
      );
    }

    const clave = {
      empresaCodigo: empresaExpediente,
      tipoContexto: TIPO_CONTEXTO_EXPEDIENTE_V1,
      codigo: codigoExpediente,
    };

    const existente = await this.contenedores.buscarPorClave(clave);

    if (existente) {
      return this.responderExistente(expedienteId, existente, clienteDestinoIdExpediente);
    }

    const creado = await this.contenedores.crearSiNoExistePorClave({
      empresaCodigo: empresaExpediente,
      clienteDestinoId: clienteDestinoIdExpediente,
      tipoContexto: TIPO_CONTEXTO_EXPEDIENTE_V1,
      codigo: codigoExpediente,
      nombre: expediente.descripcion ?? null,
      descripcion: expediente.descripcion ?? null,
      estado: 'activo',
      metadata: {
        origen: 'EXPEDIENTE_V1',
        expedienteId,
        codigoExpediente,
        sprint: '2.1B',
        accion: 'MATERIALIZAR_CONTEXTO_OPERATIVO',
      },
      creadoPor: input.usuario?.id ?? null,
    });

    if (!creado) {
      const recuperado = await this.contenedores.buscarPorClave(clave);

      if (!recuperado) {
        throw new ConflictException(
          crearError(
            'No se pudo recuperar el contexto operativo después del conflicto concurrente',
            'CONTEXTO_OPERATIVO_CONFLICTO_NO_RECUPERADO',
            { expedienteId, clave },
          ),
        );
      }

      return this.responderExistente(expedienteId, recuperado, clienteDestinoIdExpediente);
    }

    await this.auditoria.registrarCreacion({
      accion: 'MATERIALIZAR_CONTEXTO_OPERATIVO',
      entidad: 'contenedor_operativo',
      entidadId: creado.id,
      descripcion: 'Contexto Operativo materializado desde Expediente V1.',
      empresaCodigo: creado.empresaCodigo,
      usuario: input.usuario,
      despues: {
        expedienteId,
        contenedorOperativoId: creado.id,
        empresaCodigo: creado.empresaCodigo,
        clienteDestinoId: creado.clienteDestinoId,
        tipoContexto: creado.tipoContexto,
        codigo: creado.codigo,
      },
    });

    return this.responderCreado(expedienteId, creado);
  }

  private responderCreado(
    expedienteId: number,
    contenedor: ContenedorOperativoRow,
  ): MaterializarContextoOperativoV2Result {
    this.assertContenedorActivoYCompatible(contenedor, contenedor.clienteDestinoId);

    return {
      expedienteId,
      contenedorOperativo: this.mapContenedor(contenedor),
      idempotente: false,
      workspaceDebeRefrescar: true,
    };
  }

  private responderExistente(
    expedienteId: number,
    contenedor: ContenedorOperativoRow,
    clienteDestinoIdExpediente: number,
  ): MaterializarContextoOperativoV2Result {
    this.assertContenedorActivoYCompatible(contenedor, clienteDestinoIdExpediente);

    return {
      expedienteId,
      contenedorOperativo: this.mapContenedor(contenedor),
      idempotente: true,
      workspaceDebeRefrescar: true,
    };
  }

  private assertContenedorActivoYCompatible(
    contenedor: ContenedorOperativoRow,
    clienteDestinoIdEsperado: number | null,
  ) {
    if (contenedor.estado !== 'activo') {
      throw new ConflictException(
        crearError('Contexto operativo no activo', 'CONTEXTO_OPERATIVO_NO_ACTIVO', {
          contenedorOperativoId: contenedor.id,
          estado: contenedor.estado,
        }),
      );
    }

    const clienteDestinoIdContenedor = normalizarClienteDestinoId(contenedor.clienteDestinoId);

    if (
      clienteDestinoIdEsperado &&
      clienteDestinoIdContenedor &&
      clienteDestinoIdContenedor !== clienteDestinoIdEsperado
    ) {
      throw new ForbiddenException(
        crearError(
          'Contexto operativo no autorizado para el cliente destino del workspace',
          'CONTEXTO_OPERATIVO_NO_AUTORIZADO',
          {
            contenedorOperativoId: contenedor.id,
            clienteDestinoIdContenedor,
            clienteDestinoIdEsperado,
          },
        ),
      );
    }
  }

  private mapContenedor(contenedor: ContenedorOperativoRow) {
    return {
      id: Number(contenedor.id),
      empresaCodigo: contenedor.empresaCodigo,
      clienteDestinoId: contenedor.clienteDestinoId,
      tipoContexto: contenedor.tipoContexto,
      codigo: contenedor.codigo,
      estado: contenedor.estado,
    };
  }
}
