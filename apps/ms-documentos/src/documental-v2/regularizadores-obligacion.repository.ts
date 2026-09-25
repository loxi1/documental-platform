import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

type Executor = Pick<typeof sql, 'unsafe'>;

@Injectable()
export class RegularizadoresObligacionRepository {
  async listarConfiguradosActivosPorConcepto(
    conceptoId: number,
    executor: Executor = sql,
  ): Promise<string[]> {
    const rows = await executor.unsafe(
      `
        SELECT tipo_documental
        FROM documentos.config_regularizadores_concepto_obligacion
        WHERE concepto_id = $1
          AND activo = true
        ORDER BY tipo_documental
      `,
      [conceptoId],
    );

    return rows.map((row: any) => String(row.tipo_documental));
  }

  async congelarParaObligacion(
    grupoFacturaId: number,
    tiposDocumentales: string[],
    executor: Executor = sql,
  ): Promise<void> {
    for (const tipoDocumental of tiposDocumentales) {
      await executor.unsafe(
        `
          INSERT INTO documentos.obligacion_regularizadores_snapshot
            (
              grupo_factura_id,
              tipo_documental
            )
          VALUES ($1, $2)
        `,
        [grupoFacturaId, tipoDocumental],
      );
    }
  }

  async listarCongeladosPorGrupoFacturaId(
    grupoFacturaId: number,
    executor: Executor = sql,
  ): Promise<string[]> {
    const rows = await executor.unsafe(
      `
        SELECT tipo_documental
        FROM documentos.obligacion_regularizadores_snapshot
        WHERE grupo_factura_id = $1
        ORDER BY tipo_documental
      `,
      [grupoFacturaId],
    );

    return rows.map((row: any) => String(row.tipo_documental));
  }

  async permiteTipoDocumental(
    grupoFacturaId: number,
    tipoDocumental: string,
    executor: Executor = sql,
  ): Promise<boolean> {
    const rows = await executor.unsafe(
      `
        SELECT 1
        FROM documentos.obligacion_regularizadores_snapshot
        WHERE grupo_factura_id = $1
          AND tipo_documental = $2
        LIMIT 1
      `,
      [grupoFacturaId, tipoDocumental],
    );

    return rows.length > 0;
  }
}
