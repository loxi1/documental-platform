import type { TmpConnection } from './tmp.repository';

export async function findDuplicateDocumentOrigin(tx: TmpConnection, documentoId: number, actor: { empresaCodigo: string; clienteDestinoId: number }, tipo: 'FACTURA' | 'RECIBO_HONORARIO' = 'FACTURA') {
  const relation = tipo === 'FACTURA' ? 'regularizador_factura' : 'regularizador_recibo_honorario';
    const rows = await tx`
      SELECT p.id AS "principalId", p.tipo_principal AS "principalType",
        p.documento_id AS "obligationDocumentId", d.numero, a.id AS "associationId",
        g.id AS "groupId", c.expediente_v1_id AS "expedienteId"
      FROM documentos.grupos_factura g
      JOIN documentos.documentos_operativos_principales p ON p.id=g.documento_operativo_principal_id
      JOIN documentos.documentos d ON d.id=p.documento_id
      JOIN documentos.contenedores_operativos c ON c.id=p.contenedor_operativo_id
      LEFT JOIN documentos.grupo_factura_documentos a ON a.grupo_factura_id=g.id
        AND a.documento_id=${documentoId} AND a.estado='activo' AND a.tipo_relacion=${relation}
      WHERE g.estado <> 'anulado' AND p.estado='activo' AND p.es_principal_activo=true AND c.estado='activo'
        AND c.empresa_codigo=${actor.empresaCodigo}
        AND c.cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
        AND ((g.origen_obligacion='ORDEN_PAGO' AND p.tipo_principal='ORDEN_PAGO'
              AND d.tipo_documental='ORDEN_PAGO' AND a.id IS NOT NULL)
          OR (${tipo}='FACTURA' AND g.origen_obligacion='FACTURA' AND p.tipo_principal IN ('OC','OS')
              AND g.factura_documento_id=${documentoId}))
      ORDER BY g.id LIMIT 2
    `;
    if (rows.length !== 1) return null;
    const row = rows[0];
    if (typeof row.numero !== 'string' || !row.numero.trim()) return null;
    const validId = (value: unknown) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
    if (![row.principalId, row.obligationDocumentId, row.groupId].every(validId)) return null;
    const common = { number: row.numero.trim(), obligationDocumentId: Number(row.obligationDocumentId), groupId: Number(row.groupId) };
    if (row.principalType === 'ORDEN_PAGO' && validId(row.associationId)) {
      return { ...common, type: 'OP', ordenPagoId: Number(row.principalId), associationId: Number(row.associationId) };
    }
    if (tipo === 'FACTURA' && ['OC', 'OS'].includes(String(row.principalType)) && validId(row.expedienteId)) {
      return { ...common, type: String(row.principalType), expedienteId: Number(row.expedienteId), linkKind: 'FACTURA_FUNDADORA' };
    }
    return null;
}
