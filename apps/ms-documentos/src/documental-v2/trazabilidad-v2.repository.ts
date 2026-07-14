import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

export type TrazabilidadAuditoriaAccionV2 =
  | 'ASOCIAR_DOCUMENTO_PRINCIPAL'
  | 'GRUPO_FACTURA_CREADO'
  | 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO';

export interface TrazabilidadAuditoriaRowV2 {
  id: number | string;
  workspaceId: number | null;
  requestId: string | null;
  usuarioId: number | null;
  empresaCodigo: string | null;
  modulo: string;
  entidad: string;
  entidadId: string;
  accion: TrazabilidadAuditoriaAccionV2;
  descripcion: string | null;
  despues: Record<string, unknown> | null;
  creadoEn: string | Date;
}

export interface BuscarAuditoriaPorContenedorInput {
  contenedorOperativoId: number;
  empresaCodigo?: string | null;
}

@Injectable()
export class TrazabilidadV2Repository {
  async listarAuditoriaOperativaPorContenedor(
    input: BuscarAuditoriaPorContenedorInput,
  ): Promise<TrazabilidadAuditoriaRowV2[]> {
    const contenedorOperativoId = String(input.contenedorOperativoId);

    const rows = input.empresaCodigo
      ? await sql`
          SELECT
            id,
            workspace_id AS "workspaceId",
            request_id AS "requestId",
            usuario_id AS "usuarioId",
            empresa_codigo AS "empresaCodigo",
            modulo,
            entidad,
            entidad_id AS "entidadId",
            accion,
            descripcion,
            despues,
            creado_en AS "creadoEn"
          FROM core.auditoria_eventos
          WHERE modulo = 'documental-v2'
            AND accion IN (
              'ASOCIAR_DOCUMENTO_PRINCIPAL',
              'GRUPO_FACTURA_CREADO',
              'DOCUMENTO_GRUPO_FACTURA_ASOCIADO'
            )
            AND despues ->> 'contenedorOperativoId' = ${contenedorOperativoId}
            AND empresa_codigo = ${input.empresaCodigo}
          ORDER BY creado_en DESC, id DESC
        `
      : await sql`
          SELECT
            id,
            workspace_id AS "workspaceId",
            request_id AS "requestId",
            usuario_id AS "usuarioId",
            empresa_codigo AS "empresaCodigo",
            modulo,
            entidad,
            entidad_id AS "entidadId",
            accion,
            descripcion,
            despues,
            creado_en AS "creadoEn"
          FROM core.auditoria_eventos
          WHERE modulo = 'documental-v2'
            AND accion IN (
              'ASOCIAR_DOCUMENTO_PRINCIPAL',
              'GRUPO_FACTURA_CREADO',
              'DOCUMENTO_GRUPO_FACTURA_ASOCIADO'
            )
            AND despues ->> 'contenedorOperativoId' = ${contenedorOperativoId}
          ORDER BY creado_en DESC, id DESC
        `;

    return rows as unknown as TrazabilidadAuditoriaRowV2[];
  }
}
