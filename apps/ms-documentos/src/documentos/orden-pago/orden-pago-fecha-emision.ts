import { ConflictException } from '@nestjs/common';
import type { TmpConnection } from '../tmp/tmp.repository';

export async function obtenerFechaEmisionOpPersistida(
  tx: TmpConnection,
  ordenPagoId: number,
  actor: {
    empresaCodigo: string;
    clienteDestinoId: number;
  },
): Promise<Date> {
  if (!Number.isSafeInteger(ordenPagoId) || ordenPagoId <= 0) {
    throw new ConflictException('OP_PERIODO_ID_INVALIDO');
  }

  const [op] = await tx`
    SELECT d.fecha_emision::text AS "fechaEmision"
    FROM documentos.documentos_operativos_principales p
    JOIN documentos.documentos d
      ON d.id = p.documento_id
     AND d.tipo_documental = 'ORDEN_PAGO'
    JOIN documentos.contenedores_operativos c
      ON c.id = p.contenedor_operativo_id
    WHERE p.id = ${ordenPagoId}
      AND p.tipo_principal = 'ORDEN_PAGO'
      AND p.estado = 'activo'
      AND p.es_principal_activo = true
      AND d.estado = 'confirmado'
      AND c.estado = 'activo'
      AND c.empresa_codigo = ${actor.empresaCodigo}
      AND c.cliente_destino_id
          IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
  `;

  const fecha = op?.fechaEmision;

  if (
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    Number.isNaN(Date.parse(fecha)) ||
    new Date(fecha).toISOString().slice(0, 10) !== fecha
  ) {
    throw new ConflictException('OP_PERIODO_FECHA_INVALIDA_O_NO_DISPONIBLE');
  }

  return new Date(fecha);
}
