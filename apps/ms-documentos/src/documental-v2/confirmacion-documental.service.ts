import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DocumentoEventosService } from '../documento-eventos/documento-eventos.service';
import { DocumentosRepository } from '../documentos/documentos.repository';
import { OrquestarConfirmacionDocumentalV2UseCase } from './use-cases/orquestar-confirmacion-documental-v2.usecase';

export type ConfirmacionDocumentalInput = {
  expedienteId: number;
  documentoBaseId?: number;
  grupoFacturaId?: number | null;
  origenObligacion?: 'ORDEN_PAGO';
  tipoRelacion?: string;
  esPrincipal?: boolean;
  orden?: number;
  metadata?: Record<string, any>;
  observacion?: string;
  decisionCorrespondencia?: {
    accion: 'ACEPTAR' | 'OBSERVAR' | 'AUTORIZAR_EXCEPCION';
    motivo?: string | null;
  };
};

export type ConfirmacionDocumentalAudit = {
  usuarioId?: number | null;
  requestId?: string | null;
  correlationId?: string | null;
  tienePermisoAutorizarExcepcion?: boolean;
};

@Injectable()
export class ConfirmacionDocumentalService {
  constructor(
    private readonly repo: DocumentosRepository,
    private readonly orquestarConfirmacionV2: OrquestarConfirmacionDocumentalV2UseCase,
    private readonly documentoEventos: DocumentoEventosService,
  ) {}

  async confirmarOcrResultadoConExpediente(
    id: number,
    input: ConfirmacionDocumentalInput,
    audit?: ConfirmacionDocumentalAudit,
  ) {
    if (!input?.expedienteId) {
      throw new BadRequestException('El expediente es obligatorio para confirmar el OCR');
    }

    try {
      const confirmado = await this.orquestarConfirmacionV2.execute(
        id,
        input,
        audit,
      );

      if (!confirmado) {
        throw new NotFoundException(`Resultado OCR ${id} no encontrado`);
      }

      const documentoId = Number(confirmado.documento?.id ?? NaN);
      const archivoId = Number(confirmado.ocrResultado?.archivo_id ?? NaN);
      const expedienteId = Number(confirmado.expediente?.id ?? NaN);
      const ocrResultadoId = Number(confirmado.ocrResultado?.id ?? id);
      const usuarioId = audit?.usuarioId ?? null;
      const requestId = audit?.requestId ?? null;
      const correlationId = audit?.correlationId ?? requestId;

      await this.documentoEventos.registrarEvento({
        documentoId: Number.isFinite(documentoId) ? documentoId : null,
        archivoId: Number.isFinite(archivoId) ? archivoId : null,
        expedienteId: Number.isFinite(expedienteId) ? expedienteId : null,
        tipoEvento: 'ocr.confirmado',
        entidadTipo: 'ocr_resultado',
        entidadId: Number.isFinite(ocrResultadoId) ? ocrResultadoId : id,
        descripcion: 'Resultado OCR confirmado con expediente.',
        metadata: {
          tipoPropuesto: confirmado.tipoDocumental ?? null,
          claveDocumental: confirmado.claveDocumental ?? null,
          tipoRelacion: confirmado.tipoRelacion ?? null,
          esPrincipal: confirmado.vinculo?.es_principal ?? false,
        },
        usuarioId,
        origen: 'api',
        requestId,
        correlationId,
      });

      await this.documentoEventos.registrarEvento({
        documentoId: Number.isFinite(documentoId) ? documentoId : null,
        archivoId: Number.isFinite(archivoId) ? archivoId : null,
        expedienteId: Number.isFinite(expedienteId) ? expedienteId : null,
        tipoEvento: 'expediente.vinculado',
        entidadTipo: 'expediente',
        entidadId: Number.isFinite(expedienteId) ? expedienteId : null,
        descripcion: 'Documento OCR vinculado a expediente.',
        metadata: {
          ocrResultadoId: Number.isFinite(ocrResultadoId) ? ocrResultadoId : id,
          tipoRelacion: confirmado.tipoRelacion ?? null,
          esPrincipal: confirmado.vinculo?.es_principal ?? false,
          orden: confirmado.vinculo?.orden ?? null,
        },
        usuarioId,
        origen: 'api',
        requestId,
        correlationId,
      });

      return confirmado;
    } catch (error: any) {
      const draftErrorPayload =
        typeof error?.getResponse === 'function'
          ? error.getResponse()
          : error?.response ?? null;
      const draftErrorCode = String(
        draftErrorPayload?.code ?? error?.code ?? '',
      ).trim();
      const draftErrorDetails =
        draftErrorPayload?.details ?? error?.details ?? null;

      if (draftErrorCode === 'DECISION_CORRESPONDENCIA_REQUERIDA') {
        // El orquestador ya rechazó su sql.begin(); este write es independiente.
        const ocrActual = await this.repo.findOcrResultadoById(id);
        if (!ocrActual) throw error;

        const numeroPositivoONull = (value: unknown): number | null => {
          const n = Number(value);
          return Number.isInteger(n) && n > 0 ? n : null;
        };

        const draft = {
          version: 1,
          estado: 'PENDIENTE_DECISION',
          identidad: {
            ocrResultadoId: id,
            archivoId: numeroPositivoONull(ocrActual.archivo_id),
            documentoId: numeroPositivoONull(ocrActual.documento_id),
            expedienteId: numeroPositivoONull(input.expedienteId),
            documentoBaseId: numeroPositivoONull(input.documentoBaseId),
            grupoFacturaId: numeroPositivoONull(input.grupoFacturaId),
            facturaDocumentoId: numeroPositivoONull(
              draftErrorDetails?.facturaDocumentoId,
            ),
          },
          evaluacion:
            draftErrorDetails?.evaluacion &&
            typeof draftErrorDetails.evaluacion === 'object'
              ? draftErrorDetails.evaluacion
              : null,
          request: {
            metadata: input.metadata ?? {},
            tipoRelacion: input.tipoRelacion ?? null,
            esPrincipal: input.esPrincipal ?? false,
            orden: input.orden ?? null,
            observacion: input.observacion ?? null,
          },
          actualizadoEn: new Date().toISOString(),
        };

        await this.repo.guardarValidacionPendientePago(id, draft);
        // Relanzar EXACTAMENTE la misma instancia 409.
        throw error;
      }

      if (
        [
          'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE',
          'OCR_CONTEXTO_MODIFICADO',
          'DOCUMENTO_YA_VINCULADO_A_OTRO_EXPEDIENTE',
          'CODIGO_EXPEDIENTE_NO_COINCIDE',
          'EXPEDIENTE_YA_TIENE_DOCUMENTO_PRINCIPAL',
        ].includes(error?.code)
      ) {
        throw new ConflictException({
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        });
      }

      if (error?.code === 'OCR_VALIDACION_INVALIDA') {
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        });
      }

      if (error?.code === 'EXPEDIENTE_NO_ENCONTRADO') {
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        });
      }

      throw error;
    }
  }
}
