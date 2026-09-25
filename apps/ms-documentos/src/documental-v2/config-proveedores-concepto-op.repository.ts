import { Injectable } from '@nestjs/common';

import type { SqlExecutor } from './sql-executor';

export type ProveedorConfiguradoOpRow = {
  proveedorId: number;
  ruc: string;
  razonSocial: string;
};

@Injectable()
export class ConfigProveedoresConceptoOpRepository {
  async listarActivos(
    conceptoId: number,
    contenedorOperativoId: number,
    tx: SqlExecutor,
  ): Promise<ProveedorConfiguradoOpRow[]> {
    const rows = await tx`
      SELECT DISTINCT ON (cp.proveedor_id)
        cp.proveedor_id AS "proveedorId",
        p.ruc,
        p.razon_social AS "razonSocial"
      FROM documentos.config_proveedores_concepto_op cp
      JOIN core.proveedores p
        ON p.id = cp.proveedor_id
      WHERE cp.concepto_id = ${conceptoId}
        AND cp.activo = true
        AND (
          cp.contenedor_operativo_id = ${contenedorOperativoId}
          OR cp.contenedor_operativo_id IS NULL
        )
      ORDER BY
        cp.proveedor_id,
        (cp.contenedor_operativo_id = ${contenedorOperativoId}) DESC,
        cp.id DESC
    `;

    return rows.map(row => ({
      proveedorId: Number(row.proveedorId),
      ruc: String(row.ruc),
      razonSocial: String(row.razonSocial),
    }));
  }

  async estaHabilitado(
    conceptoId: number,
    contenedorOperativoId: number,
    proveedorId: number,
    tx: SqlExecutor,
  ): Promise<boolean> {
    const rows = await tx`
      SELECT 1
      FROM documentos.config_proveedores_concepto_op cp
      WHERE cp.concepto_id = ${conceptoId}
        AND cp.proveedor_id = ${proveedorId}
        AND cp.activo = true
        AND (
          cp.contenedor_operativo_id = ${contenedorOperativoId}
          OR cp.contenedor_operativo_id IS NULL
        )
      LIMIT 1
    `;

    return rows.length > 0;
  }
}
