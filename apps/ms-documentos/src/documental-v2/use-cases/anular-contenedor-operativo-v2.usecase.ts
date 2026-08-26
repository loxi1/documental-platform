import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from '@documental/database';

import { AuditoriaOperativaV2Repository } from '../auditoria-operativa-v2.repository';
import type { ContenedorOperativoRow } from '../documental-v2.types';

type UsuarioOperacionV2 = {
  id?: number | null;
  email?: string | null;
  workspaceId?: number | null;
  empresaCodigo?: string | null;
  clienteDestinoId?: number | null;
  sessionContextId?: string | null;
  sistemaCodigo?: string | null;
  perfilCodigo?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  origen?: string | null;
};

export type AnularContenedorOperativoV2Input = {
  contenedorOperativoId: number;
  motivo: string;
  usuario?: UsuarioOperacionV2 | null;
};

export type AnularContenedorOperativoV2Result = {
  contenedorOperativo: ContenedorOperativoRow;
  idempotente: boolean;
  workspaceDebeRefrescar: boolean;
};

type DependenciasActivasRow = {
  tienePrincipales: boolean;
  tieneGrupos: boolean;
  tieneDocumentosGrupo: boolean;
};

@Injectable()
export class AnularContenedorOperativoV2UseCase {
  constructor(
    private readonly auditoria: AuditoriaOperativaV2Repository,
  ) {}

  async execute(
    input: AnularContenedorOperativoV2Input,
  ): Promise<AnularContenedorOperativoV2Result> {
    const contenedorOperativoId = normalizarId(
      input.contenedorOperativoId,
      'contenedorOperativoId',
    );
    const motivo = normalizarMotivo(input.motivo);
    const usuario = normalizarContexto(input.usuario);

    return sql.begin(async (tx) => {
      const contenedorRows = await tx`
        SELECT
          id,
          empresa_codigo AS "empresaCodigo",
          cliente_destino_id AS "clienteDestinoId",
          tipo_contexto AS "tipoContexto",
          codigo,
          nombre,
          descripcion,
          centro_costo_codigo AS "centroCostoCodigo",
          orden_produccion_codigo AS "ordenProduccionCodigo",
          proyecto_codigo AS "proyectoCodigo",
          estado,
          metadata,
          creado_por AS "creadoPor",
          creado_en AS "creadoEn",
          actualizado_por AS "actualizadoPor",
          actualizado_en AS "actualizadoEn",
          anulado_por AS "anuladoPor",
          anulado_en AS "anuladoEn",
          motivo_anulacion AS "motivoAnulacion"
        FROM documentos.contenedores_operativos
        WHERE id = ${contenedorOperativoId}::bigint
        FOR UPDATE
      `;

      const contenedor = contenedorRows[0] as
        | ContenedorOperativoRow
        | undefined;

      if (!contenedor) {
        throw new NotFoundException({
          code: 'CONTENEDOR_OPERATIVO_NO_ENCONTRADO',
          message: 'Contenedor Operativo no encontrado',
          details: { contenedorOperativoId },
        });
      }

      validarAlcance(contenedor, usuario);

      if (contenedor.estado === 'anulado') {
        return {
          contenedorOperativo: contenedor,
          idempotente: true,
          workspaceDebeRefrescar: false,
        };
      }

      if (contenedor.estado !== 'activo') {
        throw new ConflictException({
          code: 'CONTENEDOR_OPERATIVO_ESTADO_NO_ANULABLE',
          message:
            'Solo se puede anular un Contenedor Operativo que se encuentre activo.',
          details: {
            contenedorOperativoId,
            estadoActual: contenedor.estado,
          },
        });
      }

      const dependenciasRows = await tx`
        SELECT
          EXISTS (
            SELECT 1
            FROM documentos.documentos_operativos_principales dop
            WHERE dop.contenedor_operativo_id = ${contenedorOperativoId}::bigint
              AND dop.estado <> 'anulado'
          ) AS "tienePrincipales",

          EXISTS (
            SELECT 1
            FROM documentos.grupos_factura gf
            JOIN documentos.documentos_operativos_principales dop
              ON dop.id = gf.documento_operativo_principal_id
            WHERE dop.contenedor_operativo_id = ${contenedorOperativoId}::bigint
              AND gf.estado <> 'anulado'
          ) AS "tieneGrupos",

          EXISTS (
            SELECT 1
            FROM documentos.grupo_factura_documentos gfd
            JOIN documentos.grupos_factura gf
              ON gf.id = gfd.grupo_factura_id
            JOIN documentos.documentos_operativos_principales dop
              ON dop.id = gf.documento_operativo_principal_id
            WHERE dop.contenedor_operativo_id = ${contenedorOperativoId}::bigint
              AND gfd.estado <> 'anulado'
          ) AS "tieneDocumentosGrupo"
      `;

      const dependencias = dependenciasRows[0] as
        | DependenciasActivasRow
        | undefined;

      if (
        dependencias?.tienePrincipales ||
        dependencias?.tieneGrupos ||
        dependencias?.tieneDocumentosGrupo
      ) {
        throw new ConflictException({
          code: 'CONTENEDOR_OPERATIVO_TIENE_DEPENDENCIAS_ACTIVAS',
          message:
            'No se puede anular el Contenedor Operativo porque mantiene dependencias V2 activas.',
          details: {
            contenedorOperativoId,
            documentosOperativosPrincipales:
              Boolean(dependencias?.tienePrincipales),
            gruposFactura: Boolean(dependencias?.tieneGrupos),
            documentosGrupoFactura:
              Boolean(dependencias?.tieneDocumentosGrupo),
          },
        });
      }

      const actualizadoRows = await tx`
        UPDATE documentos.contenedores_operativos
        SET
          estado = 'anulado',
          anulado_por = ${usuario.id}::bigint,
          anulado_en = now(),
          motivo_anulacion = ${motivo}::text,
          actualizado_por = ${usuario.id}::bigint,
          actualizado_en = now()
        WHERE id = ${contenedorOperativoId}::bigint
          AND estado = 'activo'
        RETURNING
          id,
          empresa_codigo AS "empresaCodigo",
          cliente_destino_id AS "clienteDestinoId",
          tipo_contexto AS "tipoContexto",
          codigo,
          nombre,
          descripcion,
          centro_costo_codigo AS "centroCostoCodigo",
          orden_produccion_codigo AS "ordenProduccionCodigo",
          proyecto_codigo AS "proyectoCodigo",
          estado,
          metadata,
          creado_por AS "creadoPor",
          creado_en AS "creadoEn",
          actualizado_por AS "actualizadoPor",
          actualizado_en AS "actualizadoEn",
          anulado_por AS "anuladoPor",
          anulado_en AS "anuladoEn",
          motivo_anulacion AS "motivoAnulacion"
      `;

      const actualizado = actualizadoRows[0] as
        | ContenedorOperativoRow
        | undefined;

      if (!actualizado) {
        throw new ConflictException({
          code: 'CONTENEDOR_OPERATIVO_CAMBIO_CONCURRENTE',
          message:
            'El Contenedor Operativo cambió de estado durante la operación.',
          details: { contenedorOperativoId },
        });
      }

      await this.auditoria.registrarAnulacionConEjecutor(tx, {
        accion: 'ANULAR_CONTENEDOR_OPERATIVO',
        entidad: 'contenedor_operativo',
        entidadId: contenedorOperativoId,
        descripcion: 'Contenedor Operativo anulado desde operación V2.',
        empresaCodigo: actualizado.empresaCodigo,
        usuario,
        antes: proyectarAuditoria(contenedor),
        despues: {
          ...proyectarAuditoria(actualizado),
          motivoAnulacion: actualizado.motivoAnulacion,
          contenedorOperativoId,
        },
      });

      return {
        contenedorOperativo: actualizado,
        idempotente: false,
        workspaceDebeRefrescar: true,
      };
    });
  }
}

function normalizarId(value: unknown, field: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException({
      code: 'IDENTIFICADOR_INVALIDO',
      message: `${field} debe ser un entero positivo`,
    });
  }

  return parsed;
}

function normalizarMotivo(value: unknown): string {
  const motivo = String(value ?? '').trim();

  if (!motivo) {
    throw new BadRequestException({
      code: 'MOTIVO_ANULACION_REQUERIDO',
      message: 'El motivo de anulación es obligatorio.',
    });
  }

  if (motivo.length > 1000) {
    throw new BadRequestException({
      code: 'MOTIVO_ANULACION_DEMASIADO_LARGO',
      message: 'El motivo de anulación no puede superar 1000 caracteres.',
    });
  }

  return motivo;
}

function normalizarContexto(
  input: UsuarioOperacionV2 | null | undefined,
): Required<UsuarioOperacionV2> {
  const usuario = input ?? {};

  const normalizado = {
    id: normalizarEntero(usuario.id),
    email: normalizarTexto(usuario.email),
    workspaceId: normalizarEntero(usuario.workspaceId),
    empresaCodigo: normalizarTexto(usuario.empresaCodigo)?.toUpperCase() ?? null,
    clienteDestinoId: normalizarEntero(usuario.clienteDestinoId),
    sessionContextId: normalizarTexto(usuario.sessionContextId),
    sistemaCodigo: normalizarTexto(usuario.sistemaCodigo),
    perfilCodigo: normalizarTexto(usuario.perfilCodigo),
    requestId: normalizarTexto(usuario.requestId),
    correlationId:
      normalizarTexto(usuario.correlationId) ??
      normalizarTexto(usuario.requestId),
    origen: normalizarTexto(usuario.origen) ?? 'api-gateway',
  };

  if (
    !normalizado.id ||
    !normalizado.workspaceId ||
    !normalizado.empresaCodigo ||
    !normalizado.clienteDestinoId ||
    !normalizado.sessionContextId ||
    !normalizado.sistemaCodigo ||
    !normalizado.perfilCodigo ||
    !normalizado.requestId
  ) {
    throw new ForbiddenException({
      code: 'CONTEXTO_AUTENTICADO_INCOMPLETO',
      message:
        'No se recibió el contexto autenticado completo para anular el Contenedor Operativo.',
    });
  }

  return normalizado as Required<UsuarioOperacionV2>;
}

function validarAlcance(
  contenedor: ContenedorOperativoRow,
  usuario: Required<UsuarioOperacionV2>,
) {
  if (
    String(contenedor.empresaCodigo).trim().toUpperCase() !==
    usuario.empresaCodigo
  ) {
    throw new ForbiddenException({
      code: 'CONTENEDOR_OPERATIVO_NO_AUTORIZADO',
      message:
        'No tienes permiso para anular un Contenedor Operativo de otra empresa.',
    });
  }

  if (
    contenedor.clienteDestinoId !== null &&
    Number(contenedor.clienteDestinoId) !== Number(usuario.clienteDestinoId)
  ) {
    throw new ForbiddenException({
      code: 'CONTENEDOR_OPERATIVO_NO_AUTORIZADO',
      message:
        'No tienes permiso para anular un Contenedor Operativo de otro cliente destino.',
    });
  }
}

function proyectarAuditoria(
  row: ContenedorOperativoRow,
): Record<string, unknown> {
  return {
    id: row.id,
    empresaCodigo: row.empresaCodigo,
    clienteDestinoId: row.clienteDestinoId,
    tipoContexto: row.tipoContexto,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    estado: row.estado,
  };
}

function normalizarTexto(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizarEntero(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
