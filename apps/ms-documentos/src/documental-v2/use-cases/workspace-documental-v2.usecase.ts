import { BadRequestException, Injectable } from '@nestjs/common';

import { V1V2CompatibilityAdapter } from '../adapters/v1-v2-compatibility.adapter';
import type {
  AdjuntosNoClasificadosCompatibilidadView,
  DocumentoOperativoPrincipalCompatibilidadView,
  GrupoFacturaCompatibilidadView,
  GrupoFacturaDocumentoCompatibilidadView,
} from '../adapters/v1-v2-compatibility.types';
import { ContenedorOperativoService } from '../contenedor-operativo.service';
import type {
  DocumentoOperativoPrincipalRow,
  GrupoFacturaDocumentoRow,
  GrupoFacturaRow,
  JsonObject,
} from '../documental-v2.types';
import { DocumentoExistenteReadonlyRepository } from '../documento-existente-readonly.repository';
import type { DocumentoExistenteV2 } from '../documento-existente-readonly.repository';
import { DocumentoOperativoPrincipalService } from '../documento-operativo-principal.service';
import { GrupoFacturaDocumentoService } from '../grupo-factura-documento.service';
import { GrupoFacturaService } from '../grupo-factura.service';
import { WorkspaceDocumentalV2ViewMapper } from '../mappers/workspace-documental-v2-view.mapper';
import type {
  AdjuntosNoClasificadosWorkspaceV2,
  DocumentoOperativoPrincipalWorkspaceV2,
  EntidadWorkspaceV2,
  GrupoFacturaDocumentoWorkspaceV2,
  GrupoFacturaWorkspaceV2,
  WorkspaceDocumentalV2View,
} from './workspace-documental-v2.types';

@Injectable()
export class WorkspaceDocumentalV2UseCase {
  constructor(
    private readonly compatibilityAdapter: V1V2CompatibilityAdapter,
    private readonly contenedores: ContenedorOperativoService,
    private readonly documentosOperativos: DocumentoOperativoPrincipalService,
    private readonly documentosExistentes: DocumentoExistenteReadonlyRepository,
    private readonly gruposFactura: GrupoFacturaService,
    private readonly grupoFacturaDocumentos: GrupoFacturaDocumentoService,
    private readonly viewMapper: WorkspaceDocumentalV2ViewMapper,
  ) {}

  async construirDesdeExpedienteV1(expedienteId: number): Promise<WorkspaceDocumentalV2View> {
    const id = this.normalizeId(expedienteId, 'expedienteId');
    const compatibilidad = await this.compatibilityAdapter.construirVistaV2DesdeExpedienteV1(id);

    const contenedorPersistido = await this.contenedores.buscarPorClave({
      empresaCodigo: compatibilidad.contenedorOperativo.empresaCodigo,
      tipoContexto: compatibilidad.contenedorOperativo.tipoContexto,
      codigo: compatibilidad.contenedorOperativo.codigo,
    });

    const documentosOperativosPrincipalesCompatibilidad = await Promise.all(
      compatibilidad.documentosOperativosPrincipales.map((documento) =>
        this.mapDocumentoOperativoPrincipal(documento),
      ),
    );

    const documentosOperativosPrincipalesPersistidos =
      await this.mapDocumentosOperativosPrincipalesPersistidosPorContenedor(
        contenedorPersistido?.id ? Number(contenedorPersistido.id) : null,
        documentosOperativosPrincipalesCompatibilidad,
        id,
      );

    const documentosOperativosPrincipales = [
      ...documentosOperativosPrincipalesCompatibilidad,
      ...documentosOperativosPrincipalesPersistidos,
    ];

    const advertencias = this.filtrarAdvertenciasResueltasPorPersistencia(
      compatibilidad.advertencias,
      documentosOperativosPrincipales,
    );

    const gruposFacturaCompatibilidad = await Promise.all(
      compatibilidad.gruposFactura.map((grupo) => this.mapGrupoFactura(grupo)),
    );

    const gruposFacturaPersistidos = await this.mapGruposFacturaPersistidosPorPrincipales(
      documentosOperativosPrincipales,
      gruposFacturaCompatibilidad,
      id,
    );

    const gruposFactura = [
      ...gruposFacturaCompatibilidad,
      ...gruposFacturaPersistidos,
    ];

    const adjuntosNoClasificados = await Promise.all(
      compatibilidad.adjuntosNoClasificados.map((adjunto) => this.mapAdjuntoNoClasificado(adjunto)),
    );

    const documentosGrupoFactura = gruposFactura.flatMap((grupo) => grupo.documentos);

    const workspace: WorkspaceDocumentalV2View = {
      origen: {
        modeloEntrada: 'V1',
        expedienteId: id,
        modo: 'lectura',
        adaptador: 'V1V2CompatibilityAdapter',
        casoUso: 'WorkspaceDocumentalV2UseCase',
      },
      compatibilidad,
      contenedorOperativo: this.wrap(compatibilidad.contenedorOperativo, contenedorPersistido),
      documentosOperativosPrincipales,
      gruposFactura,
      adjuntosNoClasificados,
      advertencias,
      resumen: {
        documentosOperativosPrincipales: documentosOperativosPrincipales.length,
        documentosOperativosPrincipalesPersistidos: documentosOperativosPrincipales.filter(
          (documento) => documento.estadoPersistencia === 'persistido',
        ).length,
        gruposFactura: gruposFactura.length,
        gruposFacturaPersistidos: gruposFactura.filter(
          (grupo) => grupo.estadoPersistencia === 'persistido',
        ).length,
        documentosGrupoFactura: documentosGrupoFactura.length,
        documentosGrupoFacturaPersistidos: documentosGrupoFactura.filter(
          (documento) => documento.estadoPersistencia === 'persistido',
        ).length,
        adjuntosNoClasificados: adjuntosNoClasificados.length,
        advertencias: advertencias.length,
      },
    };

    return this.viewMapper.enriquecer(workspace);
  }

  private async mapDocumentoOperativoPrincipal(
    documento: DocumentoOperativoPrincipalCompatibilidadView,
  ): Promise<DocumentoOperativoPrincipalWorkspaceV2> {
    const persistido = await this.documentosOperativos.buscarPorDocumentoId(documento.documentoId);
    return this.wrap(documento, persistido);
  }

  private async mapDocumentosOperativosPrincipalesPersistidosPorContenedor(
    contenedorOperativoId: number | null,
    documentosYaMapeados: DocumentoOperativoPrincipalWorkspaceV2[],
    expedienteId: number,
  ): Promise<DocumentoOperativoPrincipalWorkspaceV2[]> {
    if (!contenedorOperativoId) return [];

    const persistidos =
      await this.documentosOperativos.listarActivosPorContenedorOperativoId(contenedorOperativoId);

    const documentosYaIncluidos = new Set(
      documentosYaMapeados
        .map((documento) => {
          const persistidoDocumentoId = documento.persistido?.documentoId;
          const vistaDocumentoId = documento.vista?.documentoId;

          return Number(persistidoDocumentoId ?? vistaDocumentoId);
        })
        .filter((documentoId) => Number.isInteger(documentoId) && documentoId > 0),
    );

    const soloV2 = persistidos.filter(
      (principal) => !documentosYaIncluidos.has(Number(principal.documentoId)),
    );

    return Promise.all(
      soloV2.map((principal) =>
        this.mapDocumentoOperativoPrincipalPersistido(principal, expedienteId),
      ),
    );
  }

  private async mapDocumentoOperativoPrincipalPersistido(
    principal: DocumentoOperativoPrincipalRow,
    expedienteId: number,
  ): Promise<DocumentoOperativoPrincipalWorkspaceV2> {
    const documento = await this.documentosExistentes.buscarPorId(Number(principal.documentoId));

    const vista: DocumentoOperativoPrincipalCompatibilidadView = {
      documentoId: Number(principal.documentoId),
      tipoPrincipal: String(principal.tipoPrincipal ?? '').trim().toUpperCase(),
      esPrincipalActivo: Boolean(principal.esPrincipalActivo),
      estado: documento?.estado ?? principal.estado,
      metadata: this.buildMetadataPrincipalPersistido(principal, documento),
      origen: {
        modelo: 'V1',
        expedienteId,
        modo: 'lectura',
        tipoRelacionV1: null,
        esPrincipalV1: false,
      },
    };

    return this.wrap(vista, principal);
  }

  private buildMetadataPrincipalPersistido(
    principal: DocumentoOperativoPrincipalRow,
    documento: DocumentoExistenteV2 | null,
  ): JsonObject {
    const metadataBase =
      principal.metadata && typeof principal.metadata === 'object'
        ? (principal.metadata as JsonObject)
        : {};

    const compatibilidadBase =
      metadataBase.compatibilidad &&
      typeof metadataBase.compatibilidad === 'object' &&
      !Array.isArray(metadataBase.compatibilidad)
        ? (metadataBase.compatibilidad as JsonObject)
        : {};

    return {
      ...metadataBase,
      compatibilidad: {
        ...compatibilidadBase,
        origen: 'V2',
        documentoOperativoPrincipalId: principal.id,
        documentoV1: documento ? this.buildDocumentoV1Metadata(documento) : null,
      },
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


  private async mapGruposFacturaPersistidosPorPrincipales(
    documentosOperativosPrincipales: DocumentoOperativoPrincipalWorkspaceV2[],
    gruposYaMapeados: GrupoFacturaWorkspaceV2[],
    expedienteId: number,
  ): Promise<GrupoFacturaWorkspaceV2[]> {
    const principalesPersistidos = documentosOperativosPrincipales
      .map((principal) => principal.persistido)
      .filter((principal): principal is DocumentoOperativoPrincipalRow => Boolean(principal));

    if (principalesPersistidos.length === 0) return [];

    const facturasYaIncluidas = new Set(
      gruposYaMapeados
        .map((grupo) => {
          const persistidoFacturaId = grupo.persistido?.facturaDocumentoId;
          const vistaFacturaId = grupo.vista?.facturaDocumentoId;

          return Number(persistidoFacturaId ?? vistaFacturaId);
        })
        .filter((facturaDocumentoId) => Number.isInteger(facturaDocumentoId) && facturaDocumentoId > 0),
    );

    const gruposPorPrincipal = await Promise.all(
      principalesPersistidos.map(async (principal) => {
        const grupos = await this.gruposFactura.listarPorDocumentoOperativoPrincipal(
          Number(principal.id),
        );

        return grupos.map((grupo) => ({ grupo, principal }));
      }),
    );

    const gruposPersistidos = gruposPorPrincipal
      .flat()
      .filter(({ grupo }) => !facturasYaIncluidas.has(Number(grupo.facturaDocumentoId)));

    return Promise.all(
      gruposPersistidos.map(({ grupo, principal }) =>
        this.mapGrupoFacturaPersistido(grupo, principal, expedienteId),
      ),
    );
  }

  private async mapGrupoFacturaPersistido(
    grupo: GrupoFacturaRow,
    principal: DocumentoOperativoPrincipalRow,
    expedienteId: number,
  ): Promise<GrupoFacturaWorkspaceV2> {
    const factura = await this.documentosExistentes.buscarPorId(Number(grupo.facturaDocumentoId));

    const vista: GrupoFacturaCompatibilidadView = {
      facturaDocumentoId: Number(grupo.facturaDocumentoId),
      documentoOperativoPrincipalDocumentoId: Number(principal.documentoId),
      estado: 'pendiente_revision',
      metadata: this.buildMetadataGrupoFacturaPersistido(grupo, factura),
      documentos: [],
      origen: {
        modelo: 'V1',
        expedienteId,
        modo: 'lectura',
        tipoDocumentalV1: 'FACTURA',
        tipoRelacionV1: null,
      },
    };

    return {
      ...this.wrap(vista, grupo),
      documentos: [],
    };
  }

  private buildMetadataGrupoFacturaPersistido(
    grupo: GrupoFacturaRow,
    factura: DocumentoExistenteV2 | null,
  ): JsonObject {
    const metadataBase =
      grupo.metadata && typeof grupo.metadata === 'object'
        ? (grupo.metadata as JsonObject)
        : {};

    const compatibilidadBase =
      metadataBase.compatibilidad &&
      typeof metadataBase.compatibilidad === 'object' &&
      !Array.isArray(metadataBase.compatibilidad)
        ? (metadataBase.compatibilidad as JsonObject)
        : {};

    return {
      ...metadataBase,
      compatibilidad: {
        ...compatibilidadBase,
        origen: 'V2',
        grupoFacturaId: grupo.id,
        documentoFundador: 'FACTURA',
        documentoV1: factura ? this.buildDocumentoV1Metadata(factura) : null,
      },
    };
  }

  private async mapGrupoFactura(
    grupo: GrupoFacturaCompatibilidadView,
  ): Promise<GrupoFacturaWorkspaceV2> {
    const persistido = await this.gruposFactura.buscarPorFacturaDocumentoId(grupo.facturaDocumentoId);
    const documentos = await Promise.all(
      grupo.documentos.map((documento) => this.mapGrupoFacturaDocumento(documento)),
    );

    return {
      ...this.wrap(grupo, persistido),
      documentos,
    };
  }

  private async mapGrupoFacturaDocumento(
    documento: GrupoFacturaDocumentoCompatibilidadView,
  ): Promise<GrupoFacturaDocumentoWorkspaceV2> {
    const persistido = await this.grupoFacturaDocumentos.buscarActivoPorDocumentoId(
      documento.documentoId,
    );
    return this.wrap(documento, persistido);
  }

  private async mapAdjuntoNoClasificado(
    adjunto: AdjuntosNoClasificadosCompatibilidadView,
  ): Promise<AdjuntosNoClasificadosWorkspaceV2> {
    const persistido = await this.grupoFacturaDocumentos.buscarActivoPorDocumentoId(
      adjunto.documentoId,
    );
    return this.wrap(adjunto, persistido);
  }

  private wrap<TVista, TPersistida>(
    vista: TVista,
    persistido: TPersistida | null,
  ): EntidadWorkspaceV2<TVista, TPersistida> {
    return {
      estadoPersistencia: persistido ? 'persistido' : 'no_persistido',
      vista,
      persistido,
    };
  }

  private filtrarAdvertenciasResueltasPorPersistencia(
    advertencias: string[],
    documentosOperativosPrincipales: DocumentoOperativoPrincipalWorkspaceV2[],
  ): string[] {
    const existePrincipal = documentosOperativosPrincipales.some(
      (documento) =>
        documento.estadoPersistencia === 'persistido' ||
        Boolean(documento.persistido) ||
        Boolean(documento.vista?.documentoId),
    );

    if (!existePrincipal) {
      return advertencias;
    }

    return advertencias.filter((advertencia) => {
      const texto = String(advertencia ?? '').toUpperCase();

      return !(
        texto.includes('SIN_DOCUMENTO_PRINCIPAL') ||
        texto.includes('FALTA_ASOCIAR_DOCUMENTO_OPERATIVO_PRINCIPAL') ||
        texto.includes('FALTA ASOCIAR UN DOCUMENTO OPERATIVO PRINCIPAL') ||
        texto.includes('EXPEDIENTE_V1_SIN_DOCUMENTO_PRINCIPAL')
      );
    });
  }

  private normalizeId(value: unknown, field: string): number {
    const normalized = Number(value);

    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new BadRequestException(`${field} debe ser un entero positivo`);
    }

    return normalized;
  }
}
