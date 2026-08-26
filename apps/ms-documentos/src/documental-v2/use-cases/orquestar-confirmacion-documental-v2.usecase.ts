import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from '@documental/database';

import { DocumentosRepository } from '../../documentos/documentos.repository';
import { DocumentoExistenteReadonlyRepository } from '../documento-existente-readonly.repository';
import { GrupoFacturaRepository } from '../grupo-factura.repository';
import type { SqlExecutor } from '../sql-executor';
import type { AccionDecisionCorrespondencia } from '../finanzas/correspondencia-pago-factura.types';
import { MaterializarContextoOperativoV2UseCase } from './materializar-contexto-operativo-v2.usecase';
import { AsociarDocumentoPrincipalV2UseCase } from './asociar-documento-principal-v2.usecase';
import { AsociarGrupoFacturaV2UseCase } from './asociar-grupo-factura-v2.usecase';
import { AsociarDocumentoGrupoFacturaV2UseCase } from './asociar-documento-grupo-factura-v2.usecase';

export type ConfirmacionDocumentalIntegradaInput = {
  expedienteId: number;
  documentoBaseId?: number;
  grupoFacturaId?: number | null;
  tipoRelacion?: string;
  esPrincipal?: boolean;
  orden?: number;
  metadata?: Record<string, any>;
  observacion?: string;
  decisionCorrespondencia?: {
    accion: AccionDecisionCorrespondencia;
    motivo?: string | null;
  };
};

export type ConfirmacionDocumentalAudit = {
  usuarioId?: number | null;
  requestId?: string | null;
  correlationId?: string | null;
  tienePermisoAutorizarExcepcion?: boolean;
};

const RELACIONES_ADJUNTO_V2 = new Set([
  'adjunto_guia',
  'adjunto_nota_ingreso',
  'adjunto_transferencia',
  'adjunto_detraccion',
]);

@Injectable()
export class OrquestarConfirmacionDocumentalV2UseCase {
  constructor(
    private readonly documentosLegacy: DocumentosRepository,
    private readonly documentosV2: DocumentoExistenteReadonlyRepository,
    private readonly gruposFactura: GrupoFacturaRepository,
    private readonly materializarContexto: MaterializarContextoOperativoV2UseCase,
    private readonly asociarPrincipal: AsociarDocumentoPrincipalV2UseCase,
    private readonly asociarGrupoFactura: AsociarGrupoFacturaV2UseCase,
    private readonly asociarDocumentoGrupo: AsociarDocumentoGrupoFacturaV2UseCase,
  ) {}

  execute(
    ocrResultadoId: number,
    input: ConfirmacionDocumentalIntegradaInput,
    audit: ConfirmacionDocumentalAudit = {},
  ) {
    return sql.begin(async (tx) => {
      const confirmado = await this.documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor(
        tx,
        ocrResultadoId,
        input,
        audit.usuarioId ?? undefined,
      );

      if (!confirmado) return null;

      const expediente = confirmado.expediente;
      const documentoId = Number(confirmado.documento?.id ?? NaN);
      const tipoDocumental = String(confirmado.tipoDocumental ?? '').trim().toUpperCase();
      const tipoRelacion = String(confirmado.tipoRelacion ?? '').trim().toLowerCase();

      if (!Number.isInteger(documentoId) || documentoId <= 0) {
        throw new ConflictException({
          code: 'DOCUMENTO_CONFIRMADO_INVALIDO',
          message: 'La confirmación V1 no devolvió un documento válido',
        });
      }

      const esPrincipalOperativoV2 =
        confirmado.vinculo?.es_principal === true &&
        ['OC', 'OS'].includes(tipoDocumental);
      const esFacturaGrupoV2 =
        tipoDocumental === 'FACTURA' &&
        confirmado.vinculo?.es_principal !== true;
      const esAdjuntoGrupoV2 = RELACIONES_ADJUNTO_V2.has(tipoRelacion);

      if (!esPrincipalOperativoV2 && !esFacturaGrupoV2 && !esAdjuntoGrupoV2) {
        return {
          ...confirmado,
          documentalV2: null,
        };
      }

      const usuario = {
        id: audit.usuarioId ?? null,
        empresaCodigo: String(expediente?.empresaCodigo ?? '').trim().toUpperCase(),
        clienteDestinoId: Number(expediente?.clienteDestinoId ?? NaN),
        requestId: audit.requestId ?? null,
        correlationId: audit.correlationId ?? audit.requestId ?? null,
        origen: 'confirmacion-ocr-integrada',
        tienePermisoAutorizarExcepcion:
          audit.tienePermisoAutorizarExcepcion === true,
      };

      const contexto = await this.materializarContexto.execute(
        {
          expedienteId: Number(expediente.id),
          usuario,
        },
        tx,
      );

      const documentoBaseId = esPrincipalOperativoV2
        ? documentoId
        : Number(confirmado.documentoBaseId ?? input.documentoBaseId ?? NaN);

      if (!Number.isInteger(documentoBaseId) || documentoBaseId <= 0) {
        throw new BadRequestException({
          code: 'DOCUMENTO_BASE_REQUERIDO',
          message: 'Debe resolverse un documento principal OC/OS para materializar V2',
        });
      }

      const documentoBase = await this.documentosV2.buscarPorId(documentoBaseId, tx);
      if (!documentoBase) {
        throw new NotFoundException({
          code: 'DOCUMENTO_BASE_NO_ENCONTRADO',
          message: `Documento base ${documentoBaseId} no encontrado`,
        });
      }

      const tipoPrincipal = String(documentoBase.tipoDocumental ?? '').trim().toUpperCase();
      const principal = await this.asociarPrincipal.execute(
        {
          contenedorOperativoId: contexto.contenedorOperativo.id,
          documentoId: documentoBaseId,
          tipoPrincipal,
          usuario,
        },
        tx,
      );

      let grupoFactura: any = null;
      let documentoGrupoFactura: any = null;

      if (esFacturaGrupoV2) {
        grupoFactura = await this.asociarGrupoFactura.execute(
          {
            documentoOperativoPrincipalId: principal.documentoOperativoPrincipal.id,
            facturaDocumentoId: documentoId,
            usuario,
          },
          tx,
        );
      } else if (esAdjuntoGrupoV2) {
        const grupoFacturaId = await this.resolverGrupoFacturaId(
          principal.documentoOperativoPrincipal.id,
          input.grupoFacturaId,
          tx,
        );

        documentoGrupoFactura = await this.asociarDocumentoGrupo.execute(
          {
            grupoFacturaId,
            documentoId,
            tipoRelacion,
            usuario,
            ...(input.decisionCorrespondencia
              ? { decisionCorrespondencia: input.decisionCorrespondencia }
              : {}),
          },
          tx,
        );

        const accionDecision = input.decisionCorrespondencia?.accion;
        if (
          accionDecision === 'ACEPTAR' ||
          accionDecision === 'OBSERVAR' ||
          accionDecision === 'AUTORIZAR_EXCEPCION'
        ) {
          await this.documentosLegacy.consumirValidacionPendientePagoConExecutor(
            tx,
            ocrResultadoId,
            accionDecision,
            input.decisionCorrespondencia?.motivo ?? null,
          );
        }
      }

      return {
        ...confirmado,
        documentalV2: {
          contenedorOperativo: contexto.contenedorOperativo,
          documentoOperativoPrincipal: principal.documentoOperativoPrincipal,
          grupoFactura: grupoFactura?.grupoFactura ?? null,
          documentoGrupoFactura: documentoGrupoFactura?.documentoGrupoFactura ?? null,
          correspondencia: documentoGrupoFactura?.correspondencia ?? null,
        },
      };
    });
  }

  private async resolverGrupoFacturaId(
    documentoOperativoPrincipalId: number,
    grupoFacturaIdSolicitado: number | null | undefined,
    tx: SqlExecutor,
  ): Promise<number> {
    const grupos = (await this.gruposFactura.listarPorDocumentoOperativoPrincipal(
      documentoOperativoPrincipalId,
      tx,
    )).filter((grupo) => grupo.estado !== 'anulado');

    if (grupoFacturaIdSolicitado != null) {
      const grupoFacturaId = Number(grupoFacturaIdSolicitado);
      const grupo = grupos.find((item) => Number(item.id) === grupoFacturaId);

      if (!grupo) {
        throw new ConflictException({
          code: 'GRUPO_FACTURA_NO_PERTENECE_AL_PRINCIPAL',
          message: 'El Grupo Factura indicado no pertenece al principal operativo seleccionado',
          details: { documentoOperativoPrincipalId, grupoFacturaId },
        });
      }

      return grupoFacturaId;
    }

    if (grupos.length === 0) {
      throw new ConflictException({
        code: 'GRUPO_FACTURA_REQUERIDO',
        message: 'El principal seleccionado todavía no tiene un Grupo Factura activo',
        details: { documentoOperativoPrincipalId },
      });
    }

    if (grupos.length > 1) {
      throw new ConflictException({
        code: 'GRUPO_FACTURA_AMBIGUO',
        message: 'Existen varios Grupos Factura activos; debe indicar grupoFacturaId',
        details: {
          documentoOperativoPrincipalId,
          gruposFacturaIds: grupos.map((grupo) => Number(grupo.id)),
        },
      });
    }

    return Number(grupos[0].id);
  }
}
