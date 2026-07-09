import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  AdjuntosNoClasificadosCompatibilidadView,
  CompatibilidadV2Origen,
  DocumentoOperativoPrincipalCompatibilidadView,
  ExpedienteV1ComoV2CompatibilidadView,
  GrupoFacturaCompatibilidadView,
  GrupoFacturaDocumentoCompatibilidadView,
  V1DocumentoExpedienteRow,
  V1ExpedienteBaseRow,
} from './v1-v2-compatibility.types';
import { V1DocumentalReadOnlyRepository } from './v1-documental-readonly.repository';
import type { JsonObject } from '../documental-v2.types';

@Injectable()
export class V1V2CompatibilityAdapter {
  constructor(private readonly v1Repository: V1DocumentalReadOnlyRepository) {}

  async construirVistaV2DesdeExpedienteV1(
    expedienteId: number,
  ): Promise<ExpedienteV1ComoV2CompatibilidadView> {
    const id = this.normalizeId(expedienteId, 'expedienteId');
    const data = await this.v1Repository.obtenerExpedienteConDocumentos(id);

    if (!data) {
      throw new NotFoundException(`Expediente V1 ${id} no encontrado`);
    }

    return this.construirDesdeDatos(data.expediente, data.documentos);
  }

  construirDesdeDatos(
    expediente: V1ExpedienteBaseRow,
    documentos: V1DocumentoExpedienteRow[],
  ): ExpedienteV1ComoV2CompatibilidadView {
    const origen = this.buildOrigen(expediente.id);
    const documentosOrdenados = [...documentos].sort(this.compararDocumentosV1);
    const principales = documentosOrdenados.filter((documento) => documento.esPrincipal === true);
    const facturas = documentosOrdenados.filter((documento) => this.esFactura(documento));
    const adjuntosCandidatos = documentosOrdenados.filter(
      (documento) => !documento.esPrincipal && !this.esFactura(documento),
    );
    const advertencias: string[] = [];

    if (principales.length === 0) {
      advertencias.push('EXPEDIENTE_V1_SIN_DOCUMENTO_PRINCIPAL');
    }

    if (principales.length > 1) {
      advertencias.push('EXPEDIENTE_V1_CON_MULTIPLES_DOCUMENTOS_PRINCIPALES');
    }

    if (facturas.length === 0) {
      advertencias.push('EXPEDIENTE_V1_SIN_FACTURA');
    }

    if (facturas.length > 1) {
      advertencias.push('EXPEDIENTE_V1_CON_MULTIPLES_FACTURAS_REQUIERE_ASIGNACION_EXPLICITA');
    }

    const documentosOperativosPrincipales = principales.map((documento) =>
      this.mapDocumentoOperativoPrincipal(documento, origen),
    );
    const principalActivo = principales[0] ?? null;
    const adjuntosNoClasificados: AdjuntosNoClasificadosCompatibilidadView[] = [];
    const gruposFactura = facturas.map((factura) => {
      const documentosGrupo = this.resolverAdjuntosParaFactura(
        factura,
        facturas,
        adjuntosCandidatos,
        origen,
        adjuntosNoClasificados,
      );

      return this.mapGrupoFactura(factura, principalActivo, documentosGrupo, origen);
    });

    if (facturas.length === 0) {
      for (const adjunto of adjuntosCandidatos) {
        adjuntosNoClasificados.push(
          this.mapAdjuntoNoClasificado(adjunto, 'SIN_FACTURA', origen),
        );
      }
    }

    for (const principal of principales) {
      if (this.esFactura(principal)) continue;

      const existeComoDop = documentosOperativosPrincipales.some(
        (documento) => documento.documentoId === principal.documentoId,
      );

      if (!existeComoDop) {
        adjuntosNoClasificados.push(
          this.mapAdjuntoNoClasificado(principal, 'DOCUMENTO_PRINCIPAL', origen),
        );
      }
    }

    return {
      origen,
      contenedorOperativo: {
        empresaCodigo: expediente.empresaCodigo,
        clienteDestinoId: expediente.clienteDestinoId,
        tipoContexto: 'expediente_v1',
        codigo: expediente.codigoExpediente,
        nombre: expediente.descripcion,
        descripcion: expediente.descripcion,
        centroCostoCodigo: this.pickString(expediente.metadata, 'centroCostoCodigo'),
        ordenProduccionCodigo: this.pickString(expediente.metadata, 'ordenProduccionCodigo'),
        proyectoCodigo: this.pickString(expediente.metadata, 'proyectoCodigo'),
        estado: expediente.estado,
        metadata: {
          ...(expediente.metadata ?? {}),
          compatibilidad: {
            origen: 'V1',
            expedienteId: expediente.id,
            modo: 'lectura',
          },
        },
        origen,
      },
      documentosOperativosPrincipales,
      gruposFactura,
      adjuntosNoClasificados,
      advertencias,
    };
  }

  private resolverAdjuntosParaFactura(
    factura: V1DocumentoExpedienteRow,
    facturas: V1DocumentoExpedienteRow[],
    adjuntosCandidatos: V1DocumentoExpedienteRow[],
    origen: CompatibilidadV2Origen,
    adjuntosNoClasificados: AdjuntosNoClasificadosCompatibilidadView[],
  ): GrupoFacturaDocumentoCompatibilidadView[] {
    if (facturas.length !== 1) {
      for (const adjunto of adjuntosCandidatos) {
        const alreadyAdded = adjuntosNoClasificados.some(
          (item) => item.documentoId === adjunto.documentoId,
        );

        if (!alreadyAdded) {
          adjuntosNoClasificados.push(
            this.mapAdjuntoNoClasificado(adjunto, 'MULTIPLES_FACTURAS', origen),
          );
        }
      }

      return [];
    }

    return adjuntosCandidatos
      .filter((adjunto) => adjunto.documentoId !== factura.documentoId)
      .map((adjunto) => this.mapGrupoFacturaDocumento(adjunto, origen));
  }

  private mapDocumentoOperativoPrincipal(
    documento: V1DocumentoExpedienteRow,
    origen: CompatibilidadV2Origen,
  ): DocumentoOperativoPrincipalCompatibilidadView {
    return {
      documentoId: documento.documentoId,
      tipoPrincipal: this.resolveTipoPrincipal(documento),
      esPrincipalActivo: documento.esPrincipal === true,
      estado: this.resolveEstadoDocumento(documento),
      metadata: this.buildDocumentoMetadata(documento),
      origen: {
        ...origen,
        tipoRelacionV1: documento.tipoRelacion,
        esPrincipalV1: documento.esPrincipal,
      },
    };
  }

  private mapGrupoFactura(
    factura: V1DocumentoExpedienteRow,
    principal: V1DocumentoExpedienteRow | null,
    documentos: GrupoFacturaDocumentoCompatibilidadView[],
    origen: CompatibilidadV2Origen,
  ): GrupoFacturaCompatibilidadView {
    return {
      facturaDocumentoId: factura.documentoId,
      documentoOperativoPrincipalDocumentoId: principal?.documentoId ?? null,
      estado: 'pendiente_revision',
      metadata: {
        compatibilidad: {
          origen: 'V1',
          expedienteId: origen.expedienteId,
          facturaDocumentoId: factura.documentoId,
          modo: 'lectura',
        },
      },
      documentos,
      origen: {
        ...origen,
        tipoDocumentalV1: factura.tipoDocumental,
        tipoRelacionV1: factura.tipoRelacion,
      },
    };
  }

  private mapGrupoFacturaDocumento(
    documento: V1DocumentoExpedienteRow,
    origen: CompatibilidadV2Origen,
  ): GrupoFacturaDocumentoCompatibilidadView {
    return {
      documentoId: documento.documentoId,
      tipoRelacion: this.resolveTipoRelacionAdjunto(documento),
      estado: this.resolveEstadoDocumento(documento),
      metadata: this.buildDocumentoMetadata(documento),
      origen: {
        ...origen,
        tipoDocumentalV1: documento.tipoDocumental,
        tipoRelacionV1: documento.tipoRelacion,
      },
    };
  }

  private mapAdjuntoNoClasificado(
    documento: V1DocumentoExpedienteRow,
    motivo: AdjuntosNoClasificadosCompatibilidadView['motivo'],
    origen: CompatibilidadV2Origen,
  ): AdjuntosNoClasificadosCompatibilidadView {
    return {
      documentoId: documento.documentoId,
      tipoRelacionSugerida: this.resolveTipoRelacionAdjunto(documento),
      motivo,
      metadata: this.buildDocumentoMetadata(documento),
      origen: {
        ...origen,
        tipoDocumentalV1: documento.tipoDocumental,
        tipoRelacionV1: documento.tipoRelacion,
      },
    };
  }

  private buildDocumentoMetadata(documento: V1DocumentoExpedienteRow): JsonObject {
    return {
      ...(documento.metadata ?? {}),
      compatibilidad: {
        origen: 'V1',
        expedienteId: documento.expedienteId,
        documentoId: documento.documentoId,
        tipoDocumental: documento.tipoDocumental,
        tipoRelacion: documento.tipoRelacion,
        esPrincipal: documento.esPrincipal,
        orden: documento.orden,
        archivoId: documento.archivoId,
        nombreArchivo: documento.nombreArchivo,
        storageProvider: documento.storageProvider,
        storageBucket: documento.storageBucket,
        storageKey: documento.storageKey,
      },
    };
  }

  private buildOrigen(expedienteId: number): CompatibilidadV2Origen {
    return {
      modelo: 'V1',
      expedienteId,
      modo: 'lectura',
    };
  }

  private resolveTipoPrincipal(documento: V1DocumentoExpedienteRow): string {
    const tipoRelacion = documento.tipoRelacion?.trim().toUpperCase() || '';

    if (tipoRelacion.startsWith('PRINCIPAL_')) {
      return tipoRelacion.replace('PRINCIPAL_', '') || 'DOCUMENTO';
    }

    return documento.tipoDocumental?.trim().toUpperCase() || 'DOCUMENTO';
  }

  private resolveTipoRelacionAdjunto(documento: V1DocumentoExpedienteRow): string {
    const tipoRelacion = documento.tipoRelacion?.trim().toLowerCase();

    if (tipoRelacion && !tipoRelacion.startsWith('principal_')) {
      return tipoRelacion;
    }

    const tipoDocumental = documento.tipoDocumental?.trim().toUpperCase() || 'OTRO';

    const mapping: Record<string, string> = {
      GUIA_REMISION: 'guia',
      GUIA: 'guia',
      NOTA_INGRESO: 'nota_ingreso',
      PAGO_TRANSFERENCIA: 'transferencia',
      TRANSFERENCIA: 'transferencia',
      PAGO_DETRACCION: 'detraccion',
      DETRACCION: 'detraccion',
      RECIBO_HONORARIO: 'recibo_honorario',
      RECIBO_POR_HONORARIOS: 'recibo_honorario',
    };

    return mapping[tipoDocumental] ?? tipoDocumental.toLowerCase();
  }

  private resolveEstadoDocumento(documento: V1DocumentoExpedienteRow): string {
    return documento.estado?.trim().toLowerCase() || 'activo';
  }

  private esFactura(documento: V1DocumentoExpedienteRow): boolean {
    return documento.tipoDocumental?.trim().toUpperCase() === 'FACTURA';
  }

  private pickString(metadata: JsonObject | null | undefined, key: string): string | null {
    const value = metadata?.[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private compararDocumentosV1(
    a: V1DocumentoExpedienteRow,
    b: V1DocumentoExpedienteRow,
  ): number {
    if (a.esPrincipal !== b.esPrincipal) return a.esPrincipal ? -1 : 1;
    return Number(a.orden ?? 999999) - Number(b.orden ?? 999999) || a.documentoId - b.documentoId;
  }

  private normalizeId(value: unknown, field: string): number {
    const normalized = Number(value);

    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new BadRequestException(`${field} debe ser un entero positivo`);
    }

    return normalized;
  }
}
