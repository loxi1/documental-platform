import { Injectable } from '@nestjs/common';

import type { SqlExecutor } from './sql-executor';

export type CrearObligacionSnapshotInput = {
  grupoFacturaId: number;
  conceptoId: number | null;
  requiereRegularizacionAplicada: boolean;
  estadoRegularizacion: 'NO_REQUIERE' | 'PENDIENTE' | 'REGULARIZADO';
  periodoAnio: number | null;
  periodoMes: number | null;
  codigoPago: string | null;
  tipoBeneficiarioAplicado?: string | null;
  usoBeneficiarioAplicado?: string | null;
};

export type ObligacionSnapshotRegularizacion = {
  grupoFacturaId: number;
  requiereRegularizacionAplicada: boolean;
  estadoRegularizacion: 'NO_REQUIERE' | 'PENDIENTE' | 'REGULARIZADO';
};


@Injectable()
export class ObligacionesSnapshotRepository {
  async crear(
    input: CrearObligacionSnapshotInput,
    tx: SqlExecutor,
  ): Promise<void> {
    await tx`
      INSERT INTO documentos.obligaciones_snapshot (
        grupo_factura_id,
        concepto_id,
        requiere_regularizacion_aplicada,
        estado_regularizacion,
        periodo_anio,
        periodo_mes,
        codigo_pago,
        tipo_beneficiario_aplicado,
        uso_beneficiario_aplicado
      )
      VALUES (
        ${input.grupoFacturaId},
        ${input.conceptoId},
        ${input.requiereRegularizacionAplicada},
        ${input.estadoRegularizacion},
        ${input.periodoAnio},
        ${input.periodoMes},
        ${input.codigoPago},
        ${input.tipoBeneficiarioAplicado ?? null},
        ${input.usoBeneficiarioAplicado ?? null}
      )
    `;
  }

  async obtenerRegularizacionPorGrupoFacturaId(
    grupoFacturaId: number,
    tx: SqlExecutor,
  ): Promise<ObligacionSnapshotRegularizacion | null> {
    const rows = await tx`
      SELECT
        grupo_factura_id,
        requiere_regularizacion_aplicada,
        estado_regularizacion
      FROM documentos.obligaciones_snapshot
      WHERE grupo_factura_id = ${grupoFacturaId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      grupoFacturaId: Number(row.grupo_factura_id),
      requiereRegularizacionAplicada: Boolean(
        row.requiere_regularizacion_aplicada,
      ),
      estadoRegularizacion: String(
        row.estado_regularizacion,
      ) as ObligacionSnapshotRegularizacion['estadoRegularizacion'],
    };
  }

  async marcarRegularizadoDesdePendiente(
    grupoFacturaId: number,
    tx: SqlExecutor,
  ): Promise<boolean> {
    const rows = await tx`
      UPDATE documentos.obligaciones_snapshot
      SET
        estado_regularizacion = 'REGULARIZADO',
        updated_at = now()
      WHERE grupo_factura_id = ${grupoFacturaId}
        AND requiere_regularizacion_aplicada = true
        AND estado_regularizacion = 'PENDIENTE'
      RETURNING grupo_factura_id
    `;

    return rows.length === 1;
  }

  async existePorGrupoFacturaId(
    grupoFacturaId: number,
    tx: SqlExecutor,
  ): Promise<boolean> {
    const rows = await tx`
      SELECT 1
      FROM documentos.obligaciones_snapshot
      WHERE grupo_factura_id = ${grupoFacturaId}
      LIMIT 1
    `;

    return rows.length > 0;
  }
}
