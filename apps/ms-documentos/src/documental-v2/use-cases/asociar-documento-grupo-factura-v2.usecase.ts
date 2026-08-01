import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { ContenedorOperativoRepository } from '../contenedor-operativo.repository';
import {
  DocumentoExistenteReadonlyRepository,
  DocumentoExistenteV2,
} from '../documento-existente-readonly.repository';
import { DocumentoOperativoPrincipalRepository } from '../documento-operativo-principal.repository';
import { GrupoFacturaDocumentoRepository } from '../grupo-factura-documento.repository';
import { GrupoFacturaRepository } from '../grupo-factura.repository';
import { AuditoriaOperativaV2Repository } from '../auditoria-operativa-v2.repository';
import type {
  ContenedorOperativoRow,
  DocumentoOperativoPrincipalRow,
  GrupoFacturaDocumentoRow,
  GrupoFacturaRow,
  JsonObject,
} from '../documental-v2.types';
import { tipoDocumentalLabel } from '../mappers/documental-v2-labels';
import type { ContextoAutenticadoV2 } from './asociar-grupo-factura-v2.usecase';
import {
  aplicarDecisionCorrespondencia,
  construirAuditoriaDecision,
} from '../finanzas/correspondencia-pago-factura.evaluator';
import type {
  AccionDecisionCorrespondencia,
  DecisionCorrespondenciaResult,
  EvaluacionCorrespondenciaPagoFactura,
} from '../finanzas/correspondencia-pago-factura.types';
import { EvaluarCorrespondenciaPagoFacturaUseCase } from '../finanzas/evaluar-correspondencia-pago-factura.usecase';

const TIPOS_RELACION_POR_TIPO_DOCUMENTAL: Record<string, string> = {
  GUIA_REMISION: 'adjunto_guia',
  NOTA_INGRESO: 'adjunto_nota_ingreso',
  TRANSFERENCIA: 'adjunto_transferencia',
  DETRACCION: 'adjunto_detraccion',
};

const TIPOS_DOCUMENTALES_PERMITIDOS = Object.keys(TIPOS_RELACION_POR_TIPO_DOCUMENTAL);
const TIPOS_RELACION_PERMITIDOS = new Set(Object.values(TIPOS_RELACION_POR_TIPO_DOCUMENTAL));

export type DocumentoCandidatoGrupoFacturaV2 = {
  documentoId: number;
  tipoDocumental: string;
  tipoDocumentalLabel: string | null;
  tipoRelacion: string;
  numeroDocumento: string | null;
  proveedorNombre: string | null;
  proveedorRuc: string | null;
  fecha: string | null;
  estado: string | null;
  nombreArchivo: string | null;
  yaAsociadoGrupoV2: boolean;
};

export type AsociarDocumentoGrupoFacturaV2Input = {
  grupoFacturaId: number;
  documentoId: number;
  tipoRelacion: string;
  decisionCorrespondencia?: {
    accion: AccionDecisionCorrespondencia;
    motivo?: string | null;
  };
  usuario?: ContextoAutenticadoV2;
};

export type DocumentoGrupoFacturaOperativoV2 = {
  id: number;
  grupoFacturaId: number;
  documentoId: number;
  tipoRelacion: string;
  estado: string;
  vista: {
    tipoDocumental: string;
    tipoDocumentalLabel: string | null;
    documentoLabel: string | null;
    proveedorNombre: string | null;
    proveedorRuc: string | null;
    fecha: string | null;
    nombreArchivo: string | null;
  };
};

export type AsociarDocumentoGrupoFacturaV2Result = {
  documentoGrupoFactura: DocumentoGrupoFacturaOperativoV2 | null;
  idempotente: boolean;
  workspaceDebeRefrescar: boolean;
  correspondencia?: DecisionCorrespondenciaResult;
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

function normalizarTexto(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function buildSerieNumero(documento: DocumentoExistenteV2): string | null {
  const serie = documento.serie?.trim();
  const numero = documento.numero?.trim();
  if (serie && numero) return `${serie}-${numero}`;
  if (numero) return numero;
  if (serie) return serie;
  return null;
}

function buildDocumentoLabel(documento: DocumentoExistenteV2): string | null {
  const label = tipoDocumentalLabel(documento.tipoDocumental);
  const serieNumero = buildSerieNumero(documento);
  if (label && serieNumero) return `${label} ${serieNumero}`;
  return label ?? serieNumero ?? String(documento.id);
}

@Injectable()
export class AsociarDocumentoGrupoFacturaV2UseCase {
  constructor(
    private readonly contenedores: ContenedorOperativoRepository,
    private readonly principales: DocumentoOperativoPrincipalRepository,
    private readonly gruposFactura: GrupoFacturaRepository,
    private readonly grupoFacturaDocumentos: GrupoFacturaDocumentoRepository,
    private readonly documentos: DocumentoExistenteReadonlyRepository,
    private readonly auditoria: AuditoriaOperativaV2Repository,
    @Optional()
    private readonly evaluarCorrespondencia?: EvaluarCorrespondenciaPagoFacturaUseCase,
  ) {}

  async listarDocumentosCandidatos(input: {
    grupoFacturaId: number;
    tipoDocumental?: string | null;
    texto?: string | null;
    pagina?: number | null;
    limite?: number | null;
    usuario?: ContextoAutenticadoV2;
  }): Promise<DocumentoCandidatoGrupoFacturaV2[]> {
    const grupoFacturaId = normalizarId(input.grupoFacturaId, 'grupoFacturaId');
    const contexto = await this.obtenerContextoGrupo(grupoFacturaId, input.usuario);
    const tipoDocumental = input.tipoDocumental?.trim().toUpperCase() || null;

    if (tipoDocumental && !TIPOS_DOCUMENTALES_PERMITIDOS.includes(tipoDocumental)) {
      throw new ConflictException(
        crearError(
          'Tipo documental no permitido para Grupo de Factura',
          'TIPO_DOCUMENTAL_NO_PERMITIDO_EN_GRUPO',
          { tipoDocumental, tiposPermitidos: TIPOS_DOCUMENTALES_PERMITIDOS },
        ),
      );
    }

    const candidatos = await this.documentos.listarCandidatosGrupoFactura({
      empresaCodigo: contexto.contenedor.empresaCodigo,
      tiposDocumentales: TIPOS_DOCUMENTALES_PERMITIDOS,
      tipoDocumental,
      texto: input.texto ?? null,
      pagina: input.pagina ?? undefined,
      limite: input.limite ?? undefined,
    });

    return candidatos.map((documento) => ({
      documentoId: documento.id,
      tipoDocumental: documento.tipoDocumental,
      tipoDocumentalLabel: tipoDocumentalLabel(documento.tipoDocumental),
      tipoRelacion: TIPOS_RELACION_POR_TIPO_DOCUMENTAL[documento.tipoDocumental] ?? '',
      numeroDocumento: buildSerieNumero(documento),
      proveedorNombre: documento.razonSocialEmisor,
      proveedorRuc: documento.rucEmisor,
      fecha: documento.fechaEmision,
      estado: documento.estado,
      nombreArchivo: documento.nombreArchivo,
      yaAsociadoGrupoV2: documento.yaAsociadoGrupoV2,
    }));
  }

  async execute(input: AsociarDocumentoGrupoFacturaV2Input): Promise<AsociarDocumentoGrupoFacturaV2Result> {
    const grupoFacturaId = normalizarId(input.grupoFacturaId, 'grupoFacturaId');
    const documentoId = normalizarId(input.documentoId, 'documentoId');
    const tipoRelacion = normalizarTexto(input.tipoRelacion);

    const contexto = await this.obtenerContextoGrupo(grupoFacturaId, input.usuario);
    this.validarTipoRelacionPermitido(tipoRelacion);

    const documento = await this.documentos.buscarPorId(documentoId);
    if (!documento) {
      throw new NotFoundException(crearError('Documento no encontrado', 'DOCUMENTO_NO_ENCONTRADO'));
    }

    this.validarDocumentoAutorizado(documento, contexto.contenedor);
    this.validarDocumentoActivo(documento);

    const existenteActivoDocumento = await this.grupoFacturaDocumentos.buscarActivoPorDocumentoId(documentoId);
    if (existenteActivoDocumento) {
      const mismoGrupo = Number(existenteActivoDocumento.grupoFacturaId) === grupoFacturaId;
      const mismaRelacion = existenteActivoDocumento.tipoRelacion === tipoRelacion;

      if (mismoGrupo && mismaRelacion) {
        return {
          documentoGrupoFactura: this.enriquecerVista(existenteActivoDocumento, documento),
          idempotente: true,
          workspaceDebeRefrescar: false,
        };
      }

      if (mismoGrupo) {
        throw new ConflictException(
          crearError(
            'El documento ya está asociado al Grupo de Factura con otra relación',
            'DOCUMENTO_YA_ASOCIADO_AL_GRUPO_CON_OTRA_RELACION',
            {
              grupoFacturaDocumentoId: existenteActivoDocumento.id,
              grupoFacturaId,
              documentoId,
              tipoRelacionExistente: existenteActivoDocumento.tipoRelacion,
              tipoRelacionSolicitada: tipoRelacion,
            },
          ),
        );
      }

      throw new ConflictException(
        crearError('El documento ya está asociado a otro Grupo de Factura', 'DOCUMENTO_YA_ASOCIADO_A_OTRO_GRUPO', {
          grupoFacturaDocumentoId: existenteActivoDocumento.id,
          grupoFacturaIdExistente: existenteActivoDocumento.grupoFacturaId,
          grupoFacturaIdSolicitado: grupoFacturaId,
          documentoId,
        }),
      );
    }

    this.validarCompatibilidadDocumentoRelacion(documento, tipoRelacion);

    let evaluacionCorrespondencia:
      | EvaluacionCorrespondenciaPagoFactura
      | undefined;
    let decisionCorrespondencia: DecisionCorrespondenciaResult | undefined;

    if (tipoRelacion === 'adjunto_transferencia') {
      if (!this.evaluarCorrespondencia) {
        throw new ConflictException(
          crearError(
            'El evaluador de correspondencia financiera no está disponible',
            'EVALUADOR_CORRESPONDENCIA_NO_DISPONIBLE',
          ),
        );
      }

      evaluacionCorrespondencia = await this.evaluarCorrespondencia.execute({
        facturaDocumentoId: Number(contexto.grupo.facturaDocumentoId),
        pagoDocumentoId: documentoId,
      });

      const requiereDecision =
        evaluacionCorrespondencia.requiereDecisionHumana ||
        !evaluacionCorrespondencia.permiteAsociacionOrdinaria;

      if (requiereDecision) {
        if (!input.decisionCorrespondencia) {
          throw new ConflictException(
            crearError(
              'La transferencia requiere una decisión de correspondencia',
              'DECISION_CORRESPONDENCIA_REQUERIDA',
              {
                estadoEvaluado: evaluacionCorrespondencia.estado,
                facturaDocumentoId: evaluacionCorrespondencia.facturaDocumentoId,
                pagoDocumentoId: evaluacionCorrespondencia.pagoDocumentoId,
              },
            ),
          );
        }

        try {
          decisionCorrespondencia = aplicarDecisionCorrespondencia(
            evaluacionCorrespondencia,
            {
              accion: input.decisionCorrespondencia.accion,
              motivo: input.decisionCorrespondencia.motivo,
              usuarioId: Number(input.usuario?.id),
              usuarioAutorizadoExcepcion:
                input.usuario?.tienePermisoAutorizarExcepcion === true,
            },
          );
        } catch (error: any) {
          throw new ConflictException(
            crearError(
              error?.message ?? 'Decisión de correspondencia inválida',
              'DECISION_CORRESPONDENCIA_INVALIDA',
              {
                estadoEvaluado: evaluacionCorrespondencia.estado,
                accion: input.decisionCorrespondencia.accion,
              },
            ),
          );
        }

        if (input.decisionCorrespondencia.accion === 'OBSERVAR') {
          await this.registrarAuditoriaCorrespondencia({
            contexto,
            evaluacion: evaluacionCorrespondencia,
            decision: decisionCorrespondencia,
            documentoId,
            asociacionCreada: false,
            entidadId: `${grupoFacturaId}:${documentoId}`,
            usuario: input.usuario,
          });

          return {
            documentoGrupoFactura: null,
            idempotente: false,
            workspaceDebeRefrescar: false,
            correspondencia: decisionCorrespondencia,
          };
        }

        if (!decisionCorrespondencia.permiteAsociacionOrdinaria) {
          throw new ConflictException(
            crearError(
              'La decisión no permite asociar la transferencia',
              'CORRESPONDENCIA_NO_PERMITE_ASOCIACION',
              {
                estadoResultante: decisionCorrespondencia.estado,
              },
            ),
          );
        }
      }
    }

    const documentosHistoricosIds =
      await this.grupoFacturaDocumentos.listarHistoricosPorDocumentoId(
        documentoId,
      );

    const metadata = this.buildMetadataCreacion({
      contexto,
      documento,
      tipoRelacion,
      usuario: input.usuario,
      resultadoOperacion:
        documentosHistoricosIds.length > 0 ? 'RECREADO' : 'CREADO',
      documentosHistoricosIds,
    });

    let creadoInicial: GrupoFacturaDocumentoRow;
    try {
      creadoInicial = await this.grupoFacturaDocumentos.crear({
        grupoFacturaId,
        documentoId,
        tipoRelacion,
        estado: 'activo',
        metadata,
        creadoPor: input.usuario?.id ?? null,
      });
    } catch (error: any) {
      if (error?.code !== '23505') throw error;

      const recuperado =
        await this.grupoFacturaDocumentos.buscarActivoPorDocumentoId(
          documentoId,
        );

      if (
        recuperado &&
        Number(recuperado.grupoFacturaId) === grupoFacturaId &&
        recuperado.tipoRelacion === tipoRelacion
      ) {
        return {
          documentoGrupoFactura: this.enriquecerVista(recuperado, documento),
          idempotente: true,
          workspaceDebeRefrescar: false,
        };
      }

      throw new ConflictException(
        crearError(
          'El documento ya está asociado a otro Grupo de Factura',
          'DOCUMENTO_YA_ASOCIADO_A_OTRO_GRUPO',
          {
            documentoId,
            grupoFacturaIdSolicitado: grupoFacturaId,
            grupoFacturaIdExistente: recuperado?.grupoFacturaId ?? null,
          },
        ),
      );
    }

    const metadataFinal = {
      ...metadata,
      entidadId: Number(creadoInicial.id),
    };

    const creado =
      (await this.grupoFacturaDocumentos.actualizar({
        id: Number(creadoInicial.id),
        metadata: metadataFinal,
        actualizadoPor: input.usuario?.id ?? null,
      })) ?? creadoInicial;

    await this.auditoria.registrarCreacion({
      accion: 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO',
      entidad: 'grupo_factura_documento',
      entidadId: creado.id,
      descripcion: 'Documento asociado al Grupo de Factura desde operación V2.',
      empresaCodigo: contexto.contenedor.empresaCodigo,
      usuario: input.usuario,
      despues: {
        contenedorOperativoId: contexto.contenedor.id,
        documentoOperativoPrincipalId: contexto.principal.id,
        grupoFacturaId,
        grupoFacturaDocumentoId: creado.id,
        facturaDocumentoId: contexto.grupo.facturaDocumentoId,
        documentoId,
        documentosHistoricosIds,
        recreacion: documentosHistoricosIds.length > 0,
        tipoDocumental: documento.tipoDocumental,
        tipoRelacion,
        empresaCodigo: contexto.contenedor.empresaCodigo,
        estado: creado.estado,
      },
    });

    if (evaluacionCorrespondencia && decisionCorrespondencia) {
      await this.registrarAuditoriaCorrespondencia({
        contexto,
        evaluacion: evaluacionCorrespondencia,
        decision: decisionCorrespondencia,
        documentoId,
        asociacionCreada: true,
        entidadId: creado.id,
        usuario: input.usuario,
      });
    }

    return {
      documentoGrupoFactura: this.enriquecerVista(creado, documento),
      idempotente: false,
      workspaceDebeRefrescar: true,
      ...(decisionCorrespondencia
        ? { correspondencia: decisionCorrespondencia }
        : {}),
    };
  }

  private async registrarAuditoriaCorrespondencia(input: {
    contexto: {
      grupo: GrupoFacturaRow;
      principal: DocumentoOperativoPrincipalRow;
      contenedor: ContenedorOperativoRow;
    };
    evaluacion: EvaluacionCorrespondenciaPagoFactura;
    decision: DecisionCorrespondenciaResult;
    documentoId: number;
    asociacionCreada: boolean;
    entidadId: string | number;
    usuario?: ContextoAutenticadoV2;
  }): Promise<void> {
    const auditoriaDecision = construirAuditoriaDecision(
      input.evaluacion,
      input.decision,
    );

    await this.auditoria.registrarDecisionCorrespondencia({
      accion: 'CORRESPONDENCIA_PAGO_FACTURA_DECIDIDA',
      entidad: 'grupo_factura_documento',
      entidadId: input.entidadId,
      descripcion:
        'Decisión humana de correspondencia entre Factura y transferencia.',
      empresaCodigo: input.contexto.contenedor.empresaCodigo,
      usuario: input.usuario,
      antes: {
        estadoEvaluado: input.evaluacion.estado,
        comparaciones: input.evaluacion.comparaciones,
      },
      despues: {
        facturaDocumentoId: auditoriaDecision.facturaDocumentoId,
        pagoDocumentoId: auditoriaDecision.pagoDocumentoId,
        grupoFacturaId: input.contexto.grupo.id,
        estadoEvaluado: auditoriaDecision.estadoAnterior,
        comparaciones: auditoriaDecision.comparaciones,
        accion: auditoriaDecision.accion,
        estadoResultante: auditoriaDecision.estadoResultante,
        motivo: auditoriaDecision.motivo,
        usuario: input.usuario ?? null,
        workspace: input.usuario?.workspaceId ?? null,
        empresa: input.contexto.contenedor.empresaCodigo,
        requestId: input.usuario?.requestId ?? null,
        correlationId: input.usuario?.correlationId ?? null,
        fecha: auditoriaDecision.fecha,
        permisoExcepcionUtilizado:
          auditoriaDecision.accion === 'AUTORIZAR_EXCEPCION',
        asociacionCreada: input.asociacionCreada,
        documentoId: input.documentoId,
      },
    });
  }

  private async obtenerContextoGrupo(grupoFacturaId: number, usuario?: ContextoAutenticadoV2) {
    const grupo = await this.gruposFactura.buscarPorId(grupoFacturaId);
    if (!grupo) {
      throw new NotFoundException(crearError('Grupo de Factura no encontrado', 'GRUPO_FACTURA_NO_ENCONTRADO'));
    }

    this.validarGrupoActivo(grupo);

    const principal = await this.principales.buscarPorId(Number(grupo.documentoOperativoPrincipalId));
    if (!principal) {
      throw new NotFoundException(
        crearError('Documento Operativo Principal del Grupo no encontrado', 'GRUPO_FACTURA_NO_PERSISTIDO'),
      );
    }

    const contenedor = await this.contenedores.buscarPorId(Number(principal.contenedorOperativoId));
    if (!contenedor) {
      throw new NotFoundException(crearError('Contexto operativo del Grupo no encontrado', 'GRUPO_FACTURA_NO_PERSISTIDO'));
    }

    this.validarGrupoAutorizado(contenedor, usuario);

    return { grupo, principal, contenedor };
  }

  private validarGrupoActivo(grupo: GrupoFacturaRow) {
    if (grupo.estado === 'anulado' || grupo.anuladoEn) {
      throw new ConflictException(crearError('Grupo de Factura no activo', 'GRUPO_FACTURA_NO_ACTIVO'));
    }
  }

  private validarGrupoAutorizado(contenedor: ContenedorOperativoRow, usuario?: ContextoAutenticadoV2) {
    const empresaToken = normalizarEmpresa(usuario?.empresaCodigo);
    const empresaContenedor = normalizarEmpresa(contenedor.empresaCodigo);

    if (!empresaToken || empresaToken !== empresaContenedor) {
      throw new ForbiddenException(crearError('Grupo de Factura no autorizado', 'GRUPO_FACTURA_NO_AUTORIZADO'));
    }

    const clienteDestinoToken = usuario?.clienteDestinoId ? Number(usuario.clienteDestinoId) : null;
    const clienteDestinoContenedor = contenedor.clienteDestinoId ? Number(contenedor.clienteDestinoId) : null;

    if (clienteDestinoToken && clienteDestinoContenedor && clienteDestinoToken !== clienteDestinoContenedor) {
      throw new ForbiddenException(crearError('Grupo de Factura no autorizado', 'GRUPO_FACTURA_NO_AUTORIZADO'));
    }
  }

  private validarDocumentoAutorizado(documento: DocumentoExistenteV2, contenedor: ContenedorOperativoRow) {
    if (normalizarEmpresa(documento.clienteAbreviatura) !== normalizarEmpresa(contenedor.empresaCodigo)) {
      throw new ForbiddenException(crearError('Documento no autorizado para el Grupo de Factura', 'GRUPO_FACTURA_NO_AUTORIZADO'));
    }
  }

  private validarDocumentoActivo(documento: DocumentoExistenteV2) {
    if (documento.estado === 'anulado') {
      throw new ConflictException(crearError('Documento anulado no puede asociarse', 'DOCUMENTO_NO_ENCONTRADO'));
    }
  }

  private validarTipoRelacionPermitido(tipoRelacion: string) {
    if (!TIPOS_RELACION_PERMITIDOS.has(tipoRelacion)) {
      throw new ConflictException(
        crearError('Tipo de relación no permitido', 'TIPO_RELACION_NO_PERMITIDO', {
          tipoRelacion,
          tiposPermitidos: Array.from(TIPOS_RELACION_PERMITIDOS),
        }),
      );
    }
  }

  private validarCompatibilidadDocumentoRelacion(documento: DocumentoExistenteV2, tipoRelacion: string) {
    const tipoDocumental = documento.tipoDocumental?.trim().toUpperCase();
    const tipoRelacionEsperada = TIPOS_RELACION_POR_TIPO_DOCUMENTAL[tipoDocumental];

    if (!tipoRelacionEsperada) {
      throw new ConflictException(
        crearError('Tipo documental no permitido para Grupo de Factura', 'TIPO_DOCUMENTAL_NO_PERMITIDO_EN_GRUPO', {
          tipoDocumental,
          tiposPermitidos: TIPOS_DOCUMENTALES_PERMITIDOS,
        }),
      );
    }

    if (tipoRelacionEsperada !== tipoRelacion) {
      throw new ConflictException(
        crearError('Tipo de relación no coincide con el documento', 'TIPO_RELACION_NO_COINCIDE_CON_DOCUMENTO', {
          tipoDocumental,
          tipoRelacion,
          tipoRelacionEsperada,
        }),
      );
    }
  }

  private buildMetadataCreacion(input: {
    contexto: {
      grupo: GrupoFacturaRow;
      principal: DocumentoOperativoPrincipalRow;
      contenedor: ContenedorOperativoRow;
    };
    documento: DocumentoExistenteV2;
    tipoRelacion: string;
    usuario?: ContextoAutenticadoV2;
    resultadoOperacion:
      | 'CREADO'
      | 'RECREADO'
      | 'IDEMPOTENTE'
      | 'RECHAZADO';
    documentosHistoricosIds: number[];
  }): JsonObject {
    return {
      tipoOperacion: 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO',
      resultadoOperacion: input.resultadoOperacion,
      accion: 'DOCUMENTO_GRUPO_FACTURA_ASOCIADO',
      entidadTipo: 'grupo_factura_documento',
      entidadId: null,
      entidad: 'grupo_factura_documento',
      origen: 'OPERACION_DOCUMENTAL_V2',
      sprint: '2.0C',
      documentosHistoricosIds: input.documentosHistoricosIds,
      usuario: input.usuario ?? null,
      contexto: {
        grupoFacturaId: input.contexto.grupo.id,
        documentoOperativoPrincipalId: input.contexto.principal.id,
        contenedorOperativoId: input.contexto.contenedor.id,
        facturaDocumentoId: input.contexto.grupo.facturaDocumentoId,
        documentoId: input.documento.id,
        tipoDocumental: input.documento.tipoDocumental,
        tipoRelacion: input.tipoRelacion,
        empresaCodigo: input.contexto.contenedor.empresaCodigo,
        clienteDestinoId: input.contexto.contenedor.clienteDestinoId,
      },
      request: {
        requestId: input.usuario?.requestId ?? null,
        correlationId: input.usuario?.correlationId ?? null,
        origen: input.usuario?.origen ?? 'api-gateway',
      },
      compatibilidad: {
        origen: 'V2',
        documentoV1: this.buildDocumentoV1Metadata(input.documento),
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

  private enriquecerVista(
    row: GrupoFacturaDocumentoRow,
    documento: DocumentoExistenteV2,
  ): DocumentoGrupoFacturaOperativoV2 {
    return {
      id: Number(row.id),
      grupoFacturaId: Number(row.grupoFacturaId),
      documentoId: Number(row.documentoId),
      tipoRelacion: row.tipoRelacion,
      estado: row.estado,
      vista: {
        tipoDocumental: documento.tipoDocumental,
        tipoDocumentalLabel: tipoDocumentalLabel(documento.tipoDocumental),
        documentoLabel: buildDocumentoLabel(documento),
        proveedorNombre: documento.razonSocialEmisor,
        proveedorRuc: documento.rucEmisor,
        fecha: documento.fechaEmision,
        nombreArchivo: documento.nombreArchivo,
      },
    };
  }
}
