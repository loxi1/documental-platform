import { Injectable } from '@nestjs/common';

import type { SqlExecutor } from './sql-executor';

export type CatalogoConceptoObligacionRow = {
  id: number;
  codigo: string;
  nombre: string;
  clasificacion: string;
  activo: boolean;
  requiereRegularizacion: boolean;
  requierePeriodo: boolean;
  usoCodigoPago: string;
  tipoBeneficiario: string;
  usoBeneficiario: string;
  modoSeleccionBeneficiario: string;
};

@Injectable()
export class CatalogoConceptosObligacionRepository {
  async buscarPorCodigo(
    codigo: string,
    tx: SqlExecutor,
  ): Promise<CatalogoConceptoObligacionRow | null> {
    const rows = await tx`
      SELECT
        id,
        codigo,
        nombre,
        clasificacion,
        activo,
        requiere_regularizacion AS "requiereRegularizacion",
        requiere_periodo AS "requierePeriodo",
        uso_codigo_pago AS "usoCodigoPago",
        tipo_beneficiario AS "tipoBeneficiario",
        uso_beneficiario AS "usoBeneficiario",
        modo_seleccion_beneficiario AS "modoSeleccionBeneficiario"
      FROM documentos.catalogo_conceptos_obligacion
      WHERE codigo = ${codigo}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: Number(row.id),
      codigo: String(row.codigo),
      nombre: String(row.nombre),
      clasificacion: String(row.clasificacion),
      activo: row.activo === true,
      requiereRegularizacion: row.requiereRegularizacion === true,
      requierePeriodo: row.requierePeriodo === true,
      usoCodigoPago: String(row.usoCodigoPago),
      tipoBeneficiario: String(row.tipoBeneficiario),
      usoBeneficiario: String(row.usoBeneficiario),
      modoSeleccionBeneficiario: String(row.modoSeleccionBeneficiario),
    };
  }

  async listarRepresentablesParaOrdenPago(
    tx: SqlExecutor,
  ): Promise<CatalogoConceptoObligacionRow[]> {
    const rows = await tx`
      SELECT
        id,
        codigo,
        nombre,
        clasificacion,
        activo,
        requiere_regularizacion AS "requiereRegularizacion",
        requiere_periodo AS "requierePeriodo",
        uso_codigo_pago AS "usoCodigoPago",
        tipo_beneficiario AS "tipoBeneficiario",
        uso_beneficiario AS "usoBeneficiario",
        modo_seleccion_beneficiario AS "modoSeleccionBeneficiario"
      FROM documentos.catalogo_conceptos_obligacion
      WHERE activo = true
      ORDER BY orden ASC, id ASC
    `;

    return rows.map(row => ({
      id: Number(row.id),
      codigo: String(row.codigo),
      nombre: String(row.nombre),
      clasificacion: String(row.clasificacion),
      activo: row.activo === true,
      requiereRegularizacion: row.requiereRegularizacion === true,
      requierePeriodo: row.requierePeriodo === true,
      usoCodigoPago: String(row.usoCodigoPago),
      tipoBeneficiario: String(row.tipoBeneficiario),
      usoBeneficiario: String(row.usoBeneficiario),
      modoSeleccionBeneficiario: String(row.modoSeleccionBeneficiario),
    }));
  }
}
