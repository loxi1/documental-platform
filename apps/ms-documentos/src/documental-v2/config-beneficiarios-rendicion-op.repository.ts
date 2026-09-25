import { Injectable } from '@nestjs/common';

import type { SqlExecutor } from './sql-executor';

export type BeneficiarioRendicionConfiguradoRow = {
  usuarioId: number;
};

@Injectable()
export class ConfigBeneficiariosRendicionOpRepository {
  async listarActivos(
    contenedorOperativoId: number,
    tx: SqlExecutor,
  ): Promise<BeneficiarioRendicionConfiguradoRow[]> {
    const rows = await tx`
      SELECT DISTINCT ON (cr.usuario_id)
        cr.usuario_id AS "usuarioId"
      FROM documentos.config_beneficiarios_rendicion_op cr
      JOIN auth.usuarios u
        ON u.id = cr.usuario_id
      WHERE cr.activo = true
        AND u.estado = 'activo'
        AND (
          cr.contenedor_operativo_id = ${contenedorOperativoId}
          OR cr.contenedor_operativo_id IS NULL
        )
      ORDER BY
        cr.usuario_id,
        (cr.contenedor_operativo_id = ${contenedorOperativoId}) DESC,
        cr.id DESC
    `;

    return rows.map(row => ({
      usuarioId: Number(row.usuarioId),
    }));
  }

  async estaHabilitado(
    contenedorOperativoId: number,
    usuarioId: number,
    tx: SqlExecutor,
  ): Promise<boolean> {
    const rows = await tx`
      SELECT 1
      FROM documentos.config_beneficiarios_rendicion_op cr
      JOIN auth.usuarios u
        ON u.id = cr.usuario_id
      WHERE cr.usuario_id = ${usuarioId}
        AND cr.activo = true
        AND u.estado = 'activo'
        AND (
          cr.contenedor_operativo_id = ${contenedorOperativoId}
          OR cr.contenedor_operativo_id IS NULL
        )
      LIMIT 1
    `;

    return rows.length > 0;
  }
}
