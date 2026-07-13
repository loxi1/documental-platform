import { Injectable } from '@nestjs/common';
import { sql } from '@documental/database';

export type DocumentoExistenteV2 = {
  id: number;
  clienteAbreviatura: string;
  tipoDocumental: string;
  rucEmisor: string | null;
  razonSocialEmisor: string | null;
  serie: string | null;
  numero: string | null;
  claveDocumental: string | null;
  estado: string | null;
  fechaEmision: string | null;
  moneda: string | null;
  montoTotal: number | null;
  nombreArchivo: string | null;
};

function mapDocumento(row: any): DocumentoExistenteV2 {
  return {
    id: Number(row.id),
    clienteAbreviatura: row.cliente_abreviatura,
    tipoDocumental: row.tipo_documental,
    rucEmisor: row.ruc_emisor ?? null,
    razonSocialEmisor: row.razon_social_emisor ?? null,
    serie: row.serie ?? null,
    numero: row.numero ?? null,
    claveDocumental: row.clave_documental ?? null,
    estado: row.estado ?? null,
    fechaEmision: row.fecha_emision ? String(row.fecha_emision).slice(0, 10) : null,
    moneda: row.moneda ?? null,
    montoTotal: row.monto_total === null || row.monto_total === undefined ? null : Number(row.monto_total),
    nombreArchivo: row.nombre_archivo ?? null,
  };
}

@Injectable()
export class DocumentoExistenteReadonlyRepository {
  async buscarPorId(documentoId: number): Promise<DocumentoExistenteV2 | null> {
    const rows = await sql<any[]>`
      SELECT
        d.id,
        d.cliente_abreviatura,
        d.tipo_documental,
        d.ruc_emisor,
        d.razon_social_emisor,
        d.serie,
        d.numero,
        d.clave_documental,
        d.estado,
        d.fecha_emision,
        d.moneda,
        d.monto_total,
        da.nombre_archivo
      FROM documentos.documentos d
      LEFT JOIN documentos.documentos_archivos da
        ON da.documento_id = d.id
       AND da.es_version_actual = true
      WHERE d.id = ${documentoId}
      LIMIT 1
    `;

    return rows[0] ? mapDocumento(rows[0]) : null;
  }

  async listarCandidatosPrincipal(input: {
    empresaCodigo: string;
    tipoPrincipal: string;
    q?: string;
    estado?: string;
    limit?: number;
  }): Promise<Array<DocumentoExistenteV2 & { yaEsPrincipalV2: boolean }>> {
    const q = input.q?.trim();
    const estado = input.estado?.trim() || 'confirmado';
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);

    const rows = await sql<any[]>`
      SELECT
        d.id,
        d.cliente_abreviatura,
        d.tipo_documental,
        d.ruc_emisor,
        d.razon_social_emisor,
        d.serie,
        d.numero,
        d.clave_documental,
        d.estado,
        d.fecha_emision,
        d.moneda,
        d.monto_total,
        da.nombre_archivo,
        CASE WHEN dop.id IS NULL THEN false ELSE true END AS ya_es_principal_v2
      FROM documentos.documentos d
      LEFT JOIN documentos.documentos_archivos da
        ON da.documento_id = d.id
       AND da.es_version_actual = true
      LEFT JOIN documentos.documentos_operativos_principales dop
        ON dop.documento_id = d.id
       AND dop.estado = 'activo'
      WHERE d.cliente_abreviatura = ${input.empresaCodigo}
        AND d.tipo_documental = ${input.tipoPrincipal}
        AND d.estado = ${estado}
        AND (
          ${q ?? null}::text IS NULL
          OR d.numero ILIKE '%' || ${q ?? ''} || '%'
          OR d.serie ILIKE '%' || ${q ?? ''} || '%'
          OR d.razon_social_emisor ILIKE '%' || ${q ?? ''} || '%'
          OR d.ruc_emisor ILIKE '%' || ${q ?? ''} || '%'
        )
      ORDER BY d.fecha_emision DESC NULLS LAST, d.id DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      ...mapDocumento(row),
      yaEsPrincipalV2: row.ya_es_principal_v2 === true,
    }));
  }

  async listarFacturasCandidatas(input: {
    empresaCodigo: string;
    texto?: string;
    pagina?: number;
    limite?: number;
  }): Promise<Array<DocumentoExistenteV2 & { yaTieneGrupoFacturaV2: boolean }>> {
    const texto = input.texto?.trim();
    const pagina = Math.max(input.pagina ?? 1, 1);
    const limite = Math.min(Math.max(input.limite ?? 20, 1), 50);
    const offset = (pagina - 1) * limite;

    const rows = await sql<any[]>`
      SELECT
        d.id,
        d.cliente_abreviatura,
        d.tipo_documental,
        d.ruc_emisor,
        d.razon_social_emisor,
        d.serie,
        d.numero,
        d.clave_documental,
        d.estado,
        d.fecha_emision,
        d.moneda,
        d.monto_total,
        da.nombre_archivo,
        CASE WHEN gf.id IS NULL THEN false ELSE true END AS ya_tiene_grupo_factura_v2
      FROM documentos.documentos d
      LEFT JOIN documentos.documentos_archivos da
        ON da.documento_id = d.id
       AND da.es_version_actual = true
      LEFT JOIN documentos.grupos_factura gf
        ON gf.factura_documento_id = d.id
      WHERE d.cliente_abreviatura = ${input.empresaCodigo}
        AND d.tipo_documental = 'FACTURA'
        AND d.estado = 'confirmado'
        AND (
          ${texto ?? null}::text IS NULL
          OR d.numero ILIKE '%' || ${texto ?? ''} || '%'
          OR d.serie ILIKE '%' || ${texto ?? ''} || '%'
          OR d.razon_social_emisor ILIKE '%' || ${texto ?? ''} || '%'
          OR d.ruc_emisor ILIKE '%' || ${texto ?? ''} || '%'
        )
      ORDER BY d.fecha_emision DESC NULLS LAST, d.id DESC
      LIMIT ${limite}
      OFFSET ${offset}
    `;

    return rows.map((row) => ({
      ...mapDocumento(row),
      yaTieneGrupoFacturaV2: row.ya_tiene_grupo_factura_v2 === true,
    }));
  }

}