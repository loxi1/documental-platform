import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { ContenedorOperativoRepository } from '../contenedor-operativo.repository';
import { DocumentoExistenteReadonlyRepository, DocumentoExistenteV2 } from '../documento-existente-readonly.repository';
import { DocumentoOperativoPrincipalRepository } from '../documento-operativo-principal.repository';
import { GrupoFacturaRepository } from '../grupo-factura.repository';
import type {
  ContenedorOperativoRow,
  DocumentoOperativoPrincipalRow,
  GrupoFacturaRow,
  JsonObject,
} from '../documental-v2.types';

const ESTADO_GRUPO_FACTURA_INICIAL = 'pendiente_revision';
const TIPO_DOCUMENTAL_FACTURA = 'FACTURA';

export type ContextoAutenticadoV2 = {
  id?: number | null;
  email?: string | null;
  workspaceId?: number | null;
  empresaCodigo?: string | null;
  clienteDestinoId?: number | null;
  requestId?: string | null;
  correlationId?: string | null;
  origen?: string | null;
};

export type AsociarGrupoFacturaV2Input = {
  documentoOperativoPrincipalId: number;
  facturaDocumentoId: number;
  usuario?: ContextoAutenticadoV2;
};

export type GrupoFacturaOperativoV2 = {
  id: number;
  contenedorOperativoId: number;
  documentoOperativoPrincipalId: number;
  facturaDocumentoId: number;
  estado: string;
  vista: {
    facturaLabel: string | null;
    facturaSerie: string | null;
    facturaNumero: string | null;
    proveedorNombre: string | null;
    proveedorRuc: string | null;
    fechaEmision: string | null;
    importeTotal: number | null;
    moneda: string | null;
    nombreArchivo: string | null;
    estadoRevisionLabel: string | null;
  };
};

export type AsociarGrupoFacturaV2Result = {
  grupoFactura: GrupoFacturaOperativoV2;
  idempotente: boolean;
  workspaceDebeRefrescar: boolean;
};

export type FacturaCandidataGrupoFacturaV2 = {
  documentoId: number;
  tipoDocumental: string;
  tipoDocumentalLabel: string;
  numeroDocumento: string | null;
  facturaLabel: string | null;
  proveedorNombre: string | null;
  proveedorRuc: string | null;
  fechaEmision: string | null;
  importeTotal: number | null;
  moneda: string | null;
  estado: string | null;
  nombreArchivo: string | null;
  yaTieneGrupoFacturaV2: boolean;
};

function crearError(message: string, code: string, details?: JsonObject) {
  return { message, code, ...(details ? { details } : {}) };
}

function normalizarEmpresa(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

function normalizarId(value: unknown, field: string): number {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new ConflictException(crearError(`${field} debe ser un entero positivo`, 'PARAMETRO_INVALIDO'));
  }
  return normalized;
}

function buildFacturaLabel(factura: DocumentoExistenteV2): string | null {
  const serie = factura.serie?.trim();
  const numero = factura.numero?.trim();
  if (serie && numero) return `Factura ${serie}-${numero}`;
  if (numero) return `Factura ${numero}`;
  return factura.id ? `Factura ${factura.id}` : null;
}

function estadoRevisionLabel(estado: string | null | undefined): string | null {
  if (!estado) return null;
  const labels: Record<string, string> = {
    pendiente_revision: 'Pendiente de revisión',
    confirmado: 'Confirmado',
    observado: 'Observado',
    anulado: 'Anulado',
  };
  return labels[estado] ?? estado;
}

@Injectable()
export class AsociarGrupoFacturaV2UseCase {
  constructor(
    private readonly contenedores: ContenedorOperativoRepository,
    private readonly principales: DocumentoOperativoPrincipalRepository,
    private readonly gruposFactura: GrupoFacturaRepository,
    private readonly documentos: DocumentoExistenteReadonlyRepository,
  ) {}


  async listarFacturasCandidatas(input: {
    documentoOperativoPrincipalId: number;
    texto?: string | null;
    pagina?: number | null;
    limite?: number | null;
    usuario?: ContextoAutenticadoV2;
  }): Promise<FacturaCandidataGrupoFacturaV2[]> {
    const documentoOperativoPrincipalId = normalizarId(
      input.documentoOperativoPrincipalId,
      'documentoOperativoPrincipalId',
    );

    const principal = await this.principales.buscarPorId(documentoOperativoPrincipalId);
    if (!principal) {
      throw new NotFoundException(
        crearError(
          'Documento Operativo Principal no encontrado',
          'DOCUMENTO_OPERATIVO_PRINCIPAL_NO_ENCONTRADO',
        ),
      );
    }

    this.validarPrincipalActivo(principal);

    const contenedor = await this.contenedores.buscarPorId(Number(principal.contenedorOperativoId));
    if (!contenedor) {
      throw new NotFoundException(
        crearError(
          'Contexto operativo no encontrado para el Documento Operativo Principal',
          'DOCUMENTO_OPERATIVO_PRINCIPAL_NO_ENCONTRADO',
        ),
      );
    }

    this.validarContenedorActivo(contenedor);
    this.validarAutorizacion(contenedor, input.usuario);

    const facturas = await this.documentos.listarFacturasCandidatas({
      empresaCodigo: contenedor.empresaCodigo,
      texto: input.texto ?? undefined,
      pagina: input.pagina ?? undefined,
      limite: input.limite ?? undefined,
    });

    return facturas.map((factura) => ({
      documentoId: factura.id,
      tipoDocumental: factura.tipoDocumental,
      tipoDocumentalLabel: 'Factura',
      numeroDocumento: factura.numero,
      facturaLabel: buildFacturaLabel(factura),
      proveedorNombre: factura.razonSocialEmisor,
      proveedorRuc: factura.rucEmisor,
      fechaEmision: factura.fechaEmision,
      importeTotal: factura.montoTotal,
      moneda: factura.moneda,
      estado: factura.estado,
      nombreArchivo: factura.nombreArchivo,
      yaTieneGrupoFacturaV2: factura.yaTieneGrupoFacturaV2,
    }));
  }

  async execute(input: AsociarGrupoFacturaV2Input): Promise<AsociarGrupoFacturaV2Result> {
    const documentoOperativoPrincipalId = normalizarId(
      input.documentoOperativoPrincipalId,
      'documentoOperativoPrincipalId',
    );
    const facturaDocumentoId = normalizarId(input.facturaDocumentoId, 'facturaDocumentoId');

    const principal = await this.principales.buscarPorId(documentoOperativoPrincipalId);
    if (!principal) {
      throw new NotFoundException(
        crearError(
          'Documento Operativo Principal no encontrado',
          'DOCUMENTO_OPERATIVO_PRINCIPAL_NO_ENCONTRADO',
        ),
      );
    }

    this.validarPrincipalActivo(principal);

    const contenedor = await this.contenedores.buscarPorId(Number(principal.contenedorOperativoId));
    if (!contenedor) {
      throw new NotFoundException(
        crearError(
          'Contexto operativo no encontrado para el Documento Operativo Principal',
          'DOCUMENTO_OPERATIVO_PRINCIPAL_NO_ENCONTRADO',
        ),
      );
    }

    this.validarContenedorActivo(contenedor);
    this.validarAutorizacion(contenedor, input.usuario);

    const factura = await this.documentos.buscarPorId(facturaDocumentoId);
    if (!factura) {
      throw new NotFoundException(crearError('Factura no encontrada', 'FACTURA_NO_ENCONTRADA'));
    }

    if (factura.tipoDocumental !== TIPO_DOCUMENTAL_FACTURA) {
      throw new ConflictException(
        crearError('El documento seleccionado no es una Factura', 'DOCUMENTO_NO_ES_FACTURA'),
      );
    }

    if (factura.clienteAbreviatura !== contenedor.empresaCodigo) {
      throw new ForbiddenException(
        crearError(
          'La factura no pertenece al contexto autorizado',
          'PRINCIPAL_NO_PERTENECE_AL_CONTEXTO_AUTORIZADO',
        ),
      );
    }

    const existente = await this.gruposFactura.buscarPorFacturaDocumentoId(facturaDocumentoId);
    if (existente) {
      if (
        existente.estado !== 'anulado' &&
        Number(existente.documentoOperativoPrincipalId) === documentoOperativoPrincipalId
      ) {
        return {
          grupoFactura: this.enriquecerVista(existente, principal, factura),
          idempotente: true,
          workspaceDebeRefrescar: false,
        };
      }

      throw new ConflictException(
        crearError('La factura ya pertenece a un Grupo de Factura persistido', 'FACTURA_YA_TIENE_GRUPO_ACTIVO', {
          grupoFacturaId: existente.id,
          facturaDocumentoId,
          estadoGrupoFactura: existente.estado,
        }),
      );
    }

    const metadataCreacion = this.buildMetadataCreacion({
      principal,
      contenedor,
      factura,
      usuario: input.usuario,
    });

    const creadoInicial = await this.gruposFactura.crear({
      documentoOperativoPrincipalId,
      facturaDocumentoId,
      estado: ESTADO_GRUPO_FACTURA_INICIAL,
      metadata: metadataCreacion,
      creadoPor: input.usuario?.id ?? null,
    });

    const metadataFinal = this.completarMetadataEntidad(metadataCreacion, Number(creadoInicial.id));
    const creado =
      (await this.gruposFactura.actualizar({
        id: Number(creadoInicial.id),
        metadata: metadataFinal,
        actualizadoPor: input.usuario?.id ?? null,
      })) ?? creadoInicial;

    return {
      grupoFactura: this.enriquecerVista(creado, principal, factura),
      idempotente: false,
      workspaceDebeRefrescar: true,
    };
  }

  private validarPrincipalActivo(principal: DocumentoOperativoPrincipalRow) {
    if (principal.estado !== 'activo' || principal.esPrincipalActivo !== true) {
      throw new ConflictException(
        crearError('Documento principal no activo', 'DOCUMENTO_PRINCIPAL_NO_ACTIVO'),
      );
    }
  }

  private validarContenedorActivo(contenedor: ContenedorOperativoRow) {
    if (contenedor.estado !== 'activo') {
      throw new ConflictException(
        crearError('Contexto operativo inactivo', 'CONTEXTO_OPERATIVO_INACTIVO'),
      );
    }
  }

  private validarAutorizacion(contenedor: ContenedorOperativoRow, usuario?: ContextoAutenticadoV2) {
    const empresaToken = normalizarEmpresa(usuario?.empresaCodigo);
    const empresaContenedor = normalizarEmpresa(contenedor.empresaCodigo);

    if (!empresaToken || empresaToken !== empresaContenedor) {
      throw new ForbiddenException(
        crearError(
          'Documento Operativo Principal no autorizado',
          'DOCUMENTO_OPERATIVO_PRINCIPAL_NO_AUTORIZADO',
        ),
      );
    }

    const clienteDestinoToken = usuario?.clienteDestinoId ? Number(usuario.clienteDestinoId) : null;
    const clienteDestinoContenedor = contenedor.clienteDestinoId
      ? Number(contenedor.clienteDestinoId)
      : null;

    if (
      clienteDestinoToken &&
      clienteDestinoContenedor &&
      clienteDestinoToken !== clienteDestinoContenedor
    ) {
      throw new ForbiddenException(
        crearError(
          'Principal no pertenece al contexto autorizado',
          'PRINCIPAL_NO_PERTENECE_AL_CONTEXTO_AUTORIZADO',
        ),
      );
    }
  }

  private buildMetadataCreacion(input: {
    principal: DocumentoOperativoPrincipalRow;
    contenedor: ContenedorOperativoRow;
    factura: DocumentoExistenteV2;
    usuario?: ContextoAutenticadoV2;
  }): JsonObject {
    return {
      tipoOperacion: 'GRUPO_FACTURA_CREADO',
      accion: 'GRUPO_FACTURA_CREADO',
      entidadTipo: 'grupo_factura',
      entidadId: null,
      entidad: 'grupo_factura',
      origen: 'OPERACION_DOCUMENTAL_V2',
      sprint: '2.0B',
      usuario: input.usuario ?? null,
      contexto: {
        contenedorOperativoId: input.contenedor.id,
        documentoOperativoPrincipalId: input.principal.id,
        documentoOperativoPrincipalDocumentoId: input.principal.documentoId,
        facturaDocumentoId: input.factura.id,
        empresaCodigo: input.contenedor.empresaCodigo,
        tipoContexto: input.contenedor.tipoContexto,
        codigo: input.contenedor.codigo,
      },
      request: {
        requestId: input.usuario?.requestId ?? null,
        correlationId: input.usuario?.correlationId ?? null,
        origen: input.usuario?.origen ?? 'api-gateway',
      },
      compatibilidad: {
        origen: 'V2',
        documentoFundador: 'FACTURA',
        documentoV1: this.buildDocumentoV1Metadata(input.factura),
      },
    };
  }


  private completarMetadataEntidad(metadata: JsonObject, grupoFacturaId: number): JsonObject {
    return {
      ...metadata,
      entidadId: grupoFacturaId,
    };
  }

  private buildDocumentoV1Metadata(documento: DocumentoExistenteV2): JsonObject {
    return {
      documentoId: documento.id,
      tipoDocumental: documento.tipoDocumental,
      rucEmisor: documento.rucEmisor,
      razonSocialEmisor: documento.razonSocialEmisor,
      serie: documento.serie,
      numero: documento.numero,
      claveDocumental: documento.claveDocumental,
      estado: documento.estado,
      fechaEmision: documento.fechaEmision,
      moneda: documento.moneda,
      montoTotal: documento.montoTotal,
      nombreArchivo: documento.nombreArchivo,
    };
  }

  private enriquecerVista(
    grupo: GrupoFacturaRow,
    principal: DocumentoOperativoPrincipalRow,
    factura: DocumentoExistenteV2,
  ): GrupoFacturaOperativoV2 {
    return {
      id: Number(grupo.id),
      contenedorOperativoId: Number(principal.contenedorOperativoId),
      documentoOperativoPrincipalId: Number(grupo.documentoOperativoPrincipalId),
      facturaDocumentoId: Number(grupo.facturaDocumentoId),
      estado: grupo.estado,
      vista: {
        facturaLabel: buildFacturaLabel(factura),
        facturaSerie: factura.serie,
        facturaNumero: factura.numero,
        proveedorNombre: factura.razonSocialEmisor,
        proveedorRuc: factura.rucEmisor,
        fechaEmision: factura.fechaEmision,
        importeTotal: factura.montoTotal,
        moneda: factura.moneda,
        nombreArchivo: factura.nombreArchivo,
        estadoRevisionLabel: estadoRevisionLabel(grupo.estado),
      },
    };
  }
}
