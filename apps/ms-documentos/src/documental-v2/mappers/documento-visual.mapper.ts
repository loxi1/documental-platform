import { Injectable } from '@nestjs/common';

import type {
  AdjuntosNoClasificadosCompatibilidadView,
  DocumentoOperativoPrincipalCompatibilidadView,
  GrupoFacturaCompatibilidadView,
  GrupoFacturaDocumentoCompatibilidadView,
} from '../adapters/v1-v2-compatibility.types';
import type { JsonObject } from '../documental-v2.types';
import {
  buildDocumentoLabel,
  buildSerieNumero,
  estadoRevisionLabel,
  normalizarMoneda,
  tipoDocumentalLabel,
} from './documental-v2-labels';

export type DocumentoVisualNormalizado = {
  tipoDocumental: string | null;
  tipoDocumentalLabel: string | null;
  serie: string | null;
  numero: string | null;
  numeroDocumento: string | null;
  documentoLabel: string | null;
  titulo: string | null;
  proveedorNombre: string | null;
  proveedorRuc: string | null;
  fechaEmision: string | null;
  montoTotal: number | null;
  importeTotal: number | null;
  moneda: string | null;
  nombreArchivo: string | null;
};

@Injectable()
export class DocumentoVisualMapper {
  enriquecerDocumentoOperativoPrincipal(
    documento: DocumentoOperativoPrincipalCompatibilidadView,
  ): DocumentoOperativoPrincipalCompatibilidadView {
    const visual = this.extraerDocumentoVisual(documento.metadata, documento.tipoPrincipal);
    const numeroDocumento = visual.numeroDocumento ?? visual.numero;
    const titulo = this.buildTitulo(documento.tipoPrincipal, numeroDocumento, visual.titulo);

    return {
      ...documento,
      numeroDocumento,
      titulo,
      proveedorNombre: visual.proveedorNombre,
      proveedorRuc: visual.proveedorRuc,
      fechaEmision: visual.fechaEmision,
      montoTotal: visual.montoTotal,
      moneda: visual.moneda,
      nombreArchivo: visual.nombreArchivo,
      tipoDocumentalLabel:
        visual.tipoDocumentalLabel ?? tipoDocumentalLabel(documento.tipoPrincipal),
    };
  }

  enriquecerGrupoFactura(grupo: GrupoFacturaCompatibilidadView): GrupoFacturaCompatibilidadView {
    const visual = this.extraerDocumentoVisual(grupo.metadata, 'FACTURA');
    const facturaSerie = visual.serie;
    const facturaNumero = visual.numero;
    const serieNumero = buildSerieNumero(facturaSerie, facturaNumero);

    return {
      ...grupo,
      facturaSerie,
      facturaNumero,
      facturaLabel: serieNumero ? `Factura ${serieNumero}` : null,
      proveedorNombre: visual.proveedorNombre,
      proveedorRuc: visual.proveedorRuc,
      fechaEmision: visual.fechaEmision,
      importeTotal: visual.importeTotal ?? visual.montoTotal,
      moneda: visual.moneda,
      estadoRevisionLabel: estadoRevisionLabel(grupo.estado),
      documentos: grupo.documentos.map((documento) =>
        this.enriquecerGrupoFacturaDocumento(documento),
      ),
    };
  }

  enriquecerGrupoFacturaDocumento(
    documento: GrupoFacturaDocumentoCompatibilidadView,
  ): GrupoFacturaDocumentoCompatibilidadView {
    const visual = this.extraerDocumentoVisual(
      documento.metadata,
      documento.origen.tipoDocumentalV1 ?? documento.tipoRelacion,
    );

    return {
      ...documento,
      tipoDocumental: visual.tipoDocumental ?? documento.origen.tipoDocumentalV1,
      tipoDocumentalLabel: visual.tipoDocumentalLabel,
      serie: visual.serie,
      numero: visual.numero,
      documentoLabel: visual.documentoLabel,
      fechaEmision: visual.fechaEmision,
      nombreArchivo: visual.nombreArchivo,
    };
  }

  enriquecerAdjuntoNoClasificado(
    documento: AdjuntosNoClasificadosCompatibilidadView,
  ): AdjuntosNoClasificadosCompatibilidadView {
    const visual = this.extraerDocumentoVisual(
      documento.metadata,
      documento.origen.tipoDocumentalV1 ?? documento.tipoRelacionSugerida,
    );

    return {
      ...documento,
      tipoDocumental: visual.tipoDocumental ?? documento.origen.tipoDocumentalV1,
      tipoDocumentalLabel: visual.tipoDocumentalLabel,
      serie: visual.serie,
      numero: visual.numero,
      documentoLabel: visual.documentoLabel,
      fechaEmision: visual.fechaEmision,
      estado: this.pickString(documento.metadata, 'estado') ?? null,
      nombreArchivo: visual.nombreArchivo,
    };
  }

  private extraerDocumentoVisual(
    metadata: JsonObject | null | undefined,
    tipoFallback: string | null | undefined,
  ): DocumentoVisualNormalizado {
    const ocrMetadata = this.pickObject(this.pickObject(metadata, 'ocr'), 'metadata');
    const compatibilidad = this.pickObject(metadata, 'compatibilidad');
    const documentoV1 = this.pickObject(compatibilidad, 'documentoV1');

    const tipoDocumental =
      this.pickString(ocrMetadata, 'tipoDocumental') ??
      this.pickString(metadata, 'tipoDocumental') ??
      this.pickString(compatibilidad, 'tipoDocumental') ??
      this.pickString(documentoV1, 'tipoDocumental') ??
      tipoFallback?.trim() ??
      null;
    const serie =
      this.pickString(ocrMetadata, 'serie') ??
      this.pickString(metadata, 'serie') ??
      this.pickString(documentoV1, 'serie');
    const numero =
      this.pickString(ocrMetadata, 'numero') ??
      this.pickString(metadata, 'numero') ??
      this.pickString(documentoV1, 'numero');
    const proveedorNombre =
      this.pickString(ocrMetadata, 'proveedor') ??
      this.pickString(ocrMetadata, 'razonSocial') ??
      this.pickString(metadata, 'proveedor') ??
      this.pickString(metadata, 'razonSocial') ??
      this.pickString(documentoV1, 'razonSocialEmisor');
    const proveedorRuc =
      this.pickString(ocrMetadata, 'rucProveedor') ??
      this.pickString(ocrMetadata, 'rucEmisor') ??
      this.pickString(metadata, 'rucProveedor') ??
      this.pickString(metadata, 'rucEmisor') ??
      this.pickString(documentoV1, 'rucEmisor');
    const fechaEmision = this.normalizeDate(
      this.pickValue(ocrMetadata, 'fechaEmision') ??
        this.pickValue(metadata, 'fechaEmision') ??
        this.pickValue(documentoV1, 'fechaEmision'),
    );
    const monto = this.normalizeNumber(
      this.pickValue(ocrMetadata, 'montoTotal') ??
        this.pickValue(ocrMetadata, 'importeTotal') ??
        this.pickValue(metadata, 'montoTotal') ??
        this.pickValue(metadata, 'importeTotal') ??
        this.pickValue(documentoV1, 'montoTotal'),
    );
    const moneda = normalizarMoneda(
      this.pickString(ocrMetadata, 'moneda') ??
        this.pickString(metadata, 'moneda') ??
        this.pickString(documentoV1, 'moneda'),
    );
    const nombreArchivo =
      this.pickString(metadata, 'filename') ??
      this.pickString(compatibilidad, 'nombreArchivo') ??
      this.pickString(documentoV1, 'nombreArchivo');
    const tipoLabel = tipoDocumentalLabel(tipoDocumental);
    const numeroDocumento = buildSerieNumero(serie, numero) ?? numero;
    const documentoLabel = buildDocumentoLabel(tipoDocumental, serie, numero);

    return {
      tipoDocumental,
      tipoDocumentalLabel: tipoLabel,
      serie,
      numero,
      numeroDocumento,
      documentoLabel,
      titulo: documentoLabel,
      proveedorNombre,
      proveedorRuc,
      fechaEmision,
      montoTotal: monto,
      importeTotal: monto,
      moneda,
      nombreArchivo,
    };
  }

  private buildTitulo(
    tipoPrincipal: string | null | undefined,
    numeroDocumento: string | null,
    fallback: string | null,
  ): string | null {
    const tipo = tipoPrincipal?.trim().toUpperCase() || null;
    if (tipo && numeroDocumento) return `${tipo} ${numeroDocumento}`;
    if (tipo) return tipo;
    return fallback;
  }

  private pickObject(source: JsonObject | null | undefined, key: string): JsonObject | null {
    const value = source?.[key];
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;
  }

  private pickString(source: JsonObject | null | undefined, key: string): string | null {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return null;
  }

  private pickValue(source: JsonObject | null | undefined, key: string): unknown {
    return source?.[key];
  }

  private normalizeDate(value: unknown): string | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value !== 'string') return null;

    const clean = value.trim();
    if (!clean) return null;

    const parsed = new Date(clean);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

    return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null;
  }

  private normalizeNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    if (typeof value !== 'string') return null;

    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
