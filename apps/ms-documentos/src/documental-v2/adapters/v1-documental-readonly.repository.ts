import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

import type {
  V1DocumentoExpedienteRow,
  V1ExpedienteBaseRow,
  V1ExpedienteConDocumentos,
} from './v1-v2-compatibility.types';

@Injectable()
export class V1DocumentalReadOnlyRepository {
  async obtenerExpedienteConDocumentos(
    expedienteId: number,
  ): Promise<V1ExpedienteConDocumentos | null> {
    const expedienteRows = await sql`
      SELECT
        e.id,
        e.empresa_codigo AS "empresaCodigo",
        e.codigo_expediente AS "codigoExpediente",
        e.descripcion,
        e.cliente_destino_id AS "clienteDestinoId",
        e.estado,
        e.metadata,
        e.creado_en AS "creadoEn",
        e.actualizado_en AS "actualizadoEn"
      FROM documentos.expedientes e
      WHERE e.id = ${expedienteId}::bigint
      LIMIT 1
    `;

    const expediente = expedienteRows[0] as unknown as V1ExpedienteBaseRow | undefined;

    if (!expediente) {
      return null;
    }

    const documentosRows = await sql`
      SELECT
        ed.expediente_id AS "expedienteId",
        ed.documento_id AS "documentoId",
        ed.tipo_relacion AS "tipoRelacion",
        COALESCE(ed.es_principal, false) AS "esPrincipal",
        ed.orden,
        d.cliente_abreviatura AS "clienteAbreviatura",
        d.tipo_documental AS "tipoDocumental",
        d.ruc_emisor AS "rucEmisor",
        d.razon_social_emisor AS "razonSocialEmisor",
        d.serie,
        d.numero,
        d.clave_documental AS "claveDocumental",
        d.estado,
        d.fecha_emision AS "fechaEmision",
        d.moneda,
        d.monto_total AS "montoTotal",
        d.metadata,
        da.id AS "archivoId",
        da.nombre_archivo AS "nombreArchivo",
        da.storage_provider AS "storageProvider",
        da.storage_bucket AS "storageBucket",
        da.storage_key AS "storageKey",
        da.estado AS "archivoEstado",
        da.area_origen AS "areaOrigen"
      FROM documentos.expediente_documentos ed
      JOIN documentos.documentos d
        ON d.id = ed.documento_id
      LEFT JOIN LATERAL (
        SELECT da.*
        FROM documentos.documentos_archivos da
        WHERE da.documento_id = d.id
        ORDER BY da.es_version_actual DESC NULLS LAST, da.version DESC NULLS LAST, da.id DESC
        LIMIT 1
      ) da ON true
      WHERE ed.expediente_id = ${expedienteId}::bigint
      ORDER BY ed.es_principal DESC, ed.orden ASC NULLS LAST, ed.creado_en ASC, ed.documento_id ASC
    `;

    return {
      expediente,
      documentos: documentosRows as unknown as V1DocumentoExpedienteRow[],
    };
  }
}
