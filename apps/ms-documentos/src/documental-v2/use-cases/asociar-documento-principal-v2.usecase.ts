import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { ContenedorOperativoRepository } from '../contenedor-operativo.repository';
import { DocumentoExistenteReadonlyRepository, DocumentoExistenteV2 } from '../documento-existente-readonly.repository';
import { DocumentoOperativoPrincipalRepository } from '../documento-operativo-principal.repository';
import type { DocumentoOperativoPrincipalRow } from '../documental-v2.types';

const TIPOS_PRINCIPALES_PERMITIDOS = new Set(['OC']);

export type AsociarDocumentoPrincipalV2Input = {
  contenedorOperativoId: number;
  documentoId: number;
  tipoPrincipal: string;
  usuario?: {
    id?: number | null;
    email?: string | null;
    workspaceId?: number | null;
    empresaCodigo?: string | null;
    clienteDestinoId?: number | null;
  };
};

export type AsociarDocumentoPrincipalV2Result = {
  documentoOperativoPrincipal: {
    id: number;
    contenedorOperativoId: number;
    documentoId: number;
    tipoPrincipal: string;
    esPrincipalActivo: boolean;
    estado: string;
    vista: {
      titulo: string | null;
      tipoDocumentalLabel: string | null;
      numeroDocumento: string | null;
      proveedorNombre: string | null;
      proveedorRuc: string | null;
      fechaEmision: string | null;
      montoTotal: number | null;
      moneda: string | null;
      nombreArchivo: string | null;
    };
  };
  idempotente: boolean;
  workspaceDebeRefrescar: boolean;
};

function crearError(message: string, code: string) {
  return { message, code };
}

function normalizarTipoPrincipal(tipoPrincipal: string): string {
  return tipoPrincipal.trim().toUpperCase();
}

function tipoDocumentalLabel(tipoDocumental: string | null | undefined): string | null {
  if (!tipoDocumental) return null;

  const labels: Record<string, string> = {
    OC: 'Orden de compra',
  };

  return labels[tipoDocumental] ?? tipoDocumental;
}

function buildTitulo(tipoPrincipal: string, numeroDocumento: string | null): string {
  return numeroDocumento ? `${tipoPrincipal} ${numeroDocumento}` : tipoPrincipal;
}

@Injectable()
export class AsociarDocumentoPrincipalV2UseCase {
  constructor(
    private readonly contenedores: ContenedorOperativoRepository,
    private readonly principales: DocumentoOperativoPrincipalRepository,
    private readonly documentos: DocumentoExistenteReadonlyRepository,
  ) {}

  async execute(input: AsociarDocumentoPrincipalV2Input): Promise<AsociarDocumentoPrincipalV2Result> {
    const tipoPrincipal = normalizarTipoPrincipal(input.tipoPrincipal);

    const contenedor = await this.contenedores.buscarPorId(input.contenedorOperativoId);
    if (!contenedor) {
      throw new NotFoundException(
        crearError('Contexto operativo no encontrado', 'CONTEXTO_OPERATIVO_NO_ENCONTRADO'),
      );
    }

    if (contenedor.estado !== 'activo') {
      throw new ConflictException(
        crearError('Contexto operativo inactivo', 'CONTEXTO_OPERATIVO_INACTIVO'),
      );
    }

    const empresaToken = input.usuario?.empresaCodigo?.trim();
    if (empresaToken && contenedor.empresaCodigo !== empresaToken) {
      throw new ForbiddenException(
        crearError('Contexto operativo no autorizado', 'CONTEXTO_OPERATIVO_NO_AUTORIZADO'),
      );
    }

    if (!TIPOS_PRINCIPALES_PERMITIDOS.has(tipoPrincipal)) {
      throw new ConflictException(
        crearError('Tipo documental no permitido como principal', 'TIPO_DOCUMENTAL_NO_PERMITIDO'),
      );
    }

    const documento = await this.documentos.buscarPorId(input.documentoId);
    if (!documento) {
      throw new NotFoundException(crearError('Documento no encontrado', 'DOCUMENTO_NO_ENCONTRADO'));
    }

    if (documento.tipoDocumental !== tipoPrincipal) {
      throw new ConflictException(
        crearError('Tipo principal no coincide con documento', 'TIPO_PRINCIPAL_NO_COINCIDE_CON_DOCUMENTO'),
      );
    }

    const existente = await this.principales.buscarPorDocumentoId(input.documentoId);

    if (existente) {
      if (
        Number(existente.contenedorOperativoId) === Number(input.contenedorOperativoId) &&
        existente.tipoPrincipal === tipoPrincipal
      ) {
        return {
          documentoOperativoPrincipal: this.enriquecerVista(existente, documento),
          idempotente: true,
          workspaceDebeRefrescar: false,
        };
      }

      if (Number(existente.contenedorOperativoId) === Number(input.contenedorOperativoId)) {
        throw new ConflictException(
          crearError(
            'Documento principal ya asociado con otro tipo',
            'DOCUMENTO_PRINCIPAL_YA_ASOCIADO_CON_OTRO_TIPO',
          ),
        );
      }

      throw new ConflictException(
        crearError(
          'Documento ya es principal en otro contexto',
          'DOCUMENTO_YA_ES_PRINCIPAL_EN_OTRO_CONTEXTO',
        ),
      );
    }

    const creado = await this.principales.crear({
      contenedorOperativoId: input.contenedorOperativoId,
      documentoId: input.documentoId,
      tipoPrincipal,
      esPrincipalActivo: true,
      estado: 'activo',
      metadata: {
        origen: 'OPERACION_DOCUMENTAL_V2',
        sprint: '2.0A',
        accion: 'ASOCIAR_DOCUMENTO_PRINCIPAL',
        usuario: input.usuario ?? null,
        contexto: {
          contenedorOperativoId: input.contenedorOperativoId,
          empresaCodigo: contenedor.empresaCodigo,
          tipoContexto: contenedor.tipoContexto,
          codigo: contenedor.codigo,
        },
      },
      creadoPor: input.usuario?.id ?? null,
    });

    return {
      documentoOperativoPrincipal: this.enriquecerVista(creado, documento),
      idempotente: false,
      workspaceDebeRefrescar: true,
    };
  }

  private enriquecerVista(principal: DocumentoOperativoPrincipalRow, documento: DocumentoExistenteV2) {
    const numeroDocumento = documento.numero ?? null;

    return {
      id: principal.id,
      contenedorOperativoId: principal.contenedorOperativoId,
      documentoId: principal.documentoId,
      tipoPrincipal: principal.tipoPrincipal,
      esPrincipalActivo: principal.esPrincipalActivo,
      estado: principal.estado,
      vista: {
        titulo: buildTitulo(principal.tipoPrincipal, numeroDocumento),
        tipoDocumentalLabel: tipoDocumentalLabel(documento.tipoDocumental),
        numeroDocumento,
        proveedorNombre: documento.razonSocialEmisor,
        proveedorRuc: documento.rucEmisor,
        fechaEmision: documento.fechaEmision,
        montoTotal: documento.montoTotal,
        moneda: documento.moneda,
        nombreArchivo: documento.nombreArchivo,
      },
    };
  }
}
