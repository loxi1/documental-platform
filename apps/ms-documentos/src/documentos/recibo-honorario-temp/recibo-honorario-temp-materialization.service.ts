import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { buildCargaSeguraStorageKey } from '../carga-segura/carga-segura.storage';
import type { CargaSeguraHttpResolvedIdentity } from '../carga-segura/http/carga-segura-http.validation';
import { TmpRepository } from '../tmp/tmp.repository';
import { TmpService } from '../tmp/tmp.service';
import {
  OP_RECIBO_HONORARIO_REGULARIZER_MATERIALIZATION,
  ReciboHonorarioTempMaterializationRepository,
} from './recibo-honorario-temp-materialization.repository';

export type ReciboHonorarioTempMaterializationActor = {
  id: number;
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  requestId?: string;
  correlationId?: string;
};

@Injectable()
export class ReciboHonorarioTempMaterializationService {
  constructor(
    private readonly repository: ReciboHonorarioTempMaterializationRepository,
    private readonly temps: TmpRepository,
    private readonly tmp: TmpService,
  ) {}

  async materializar(
    tempId: number,
    key: string,
    actor: ReciboHonorarioTempMaterializationActor,
    humanValidatedData: Record<string, any>,
  ) {
    if (!Number.isSafeInteger(tempId) || tempId <= 0) {
      throw new ConflictException('tempId inválido');
    }

    if (typeof key !== 'string' || !key.trim()) {
      throw new ConflictException('Idempotency-Key requerido');
    }

    if (actor.clienteDestinoId == null) {
      throw new ForbiddenException(
        'Cliente autenticado requerido para TEMP',
      );
    }

    if (
      !humanValidatedData ||
      typeof humanValidatedData !== 'object' ||
      Array.isArray(humanValidatedData)
    ) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_METADATA_REQUIRED',
      );
    }

    const identity = key.trim().toLowerCase();
    const requestId = actor.requestId || randomUUID();

    const tmpActor: CargaSeguraHttpResolvedIdentity = {
      actorId: actor.id,
      workspaceId: actor.workspaceId,
      empresaCodigo: actor.empresaCodigo,
      clienteDestinoId: actor.clienteDestinoId,
      idempotencyKey: identity,
      requestId,
      correlationId: actor.correlationId || requestId,
    };

    const repositoryActor = {
      actorId: actor.id,
      workspaceId: actor.workspaceId,
      empresaCodigo: actor.empresaCodigo,
      clienteDestinoId: actor.clienteDestinoId,
    };

    /*
     * La reserva ocurre bajo el mismo lock/transacción del TEMP.
     * El repository RH es la autoridad para:
     * - validar ownership/contexto;
     * - exigir tipo esperado RECIBO_HONORARIO;
     * - impedir materialización mientras OCR siga PROCESSING;
     * - reservar/reutilizar el documentoId canónico.
     */
    const reserved = await this.temps.locked(
      String(tempId),
      c =>
        this.temps.transaction(c, async tx => {
          const row = await this.temps.own(
            tx,
            tempId,
            tmpActor,
          );

          const destination =
            row.metadata?.destinoReservado ||
            buildCargaSeguraStorageKey({
              operacionId: tempId,
              empresaCodigo: row.empresa_codigo,
              nombreArchivo:
                row.nombre_archivo_original,
              fecha: new Date(row.iniciada_en),
            });

          const ids = await this.repository.reserve(
            tx,
            row,
            identity,
            destination,
            repositoryActor,
          );

          return {
            documentoId: ids.documentoId,
            destination,
          };
        }),
    );

    /*
     * Se promueve el MISMO TEMP.
     * No se solicita OCR aquí y no se crea un segundo pipeline RH.
     * Si existe OCR DONE, sólo se entrega como asistencia al repository;
     * humanValidatedData conserva la autoridad de validación humana.
     */
    const promoted = await this.tmp.promote(
      tempId,
      tmpActor,
      reserved.destination,
      {
        consumer:
          OP_RECIBO_HONORARIO_REGULARIZER_MATERIALIZATION,
        identity,
        persist: async (tx, row, destination) => {
          const ids =
            await this.repository.createOrReuseDocumentAndFileWithExecutor(
              tx,
              row,
              reserved.documentoId,
              identity,
              destination,
              repositoryActor,
            );

          if (!ids.archivoId) {
            throw new ConflictException(
              'RECIBO_HONORARIO_TEMP_FILE_ID_MISSING',
            );
          }

          await this.repository.confirmReciboHonorarioWithExecutor(
            tx,
            {
              documentoId: reserved.documentoId,
              archivoId: ids.archivoId,
              actor: repositoryActor,
              humanValidatedData,
              ocrCandidate:
                row.metadata?.ocrCandidate?.status === 'DONE' &&
                row.metadata?.ocrCandidate?.resultado?.ok === true
                  ? row.metadata.ocrCandidate.resultado
                  : undefined,
            },
          );
        },
      },
    );

    const finalRow = await this.temps.locked(
      String(tempId),
      c => this.temps.own(c, tempId, tmpActor),
    );

    if (
      !finalRow.documento_id ||
      !finalRow.archivo_id ||
      finalRow.metadata?.integration?.completed !== true
    ) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_MATERIALIZATION_INCOMPLETE',
      );
    }

    if (
      Number(finalRow.documento_id) !==
      reserved.documentoId
    ) {
      throw new ConflictException(
        'RECIBO_HONORARIO_TEMP_DOCUMENT_ID_CONFLICT',
      );
    }

    return {
      tempId,
      documentoId: Number(finalRow.documento_id),
      archivoId: Number(finalRow.archivo_id),
      tipoDocumental: 'RECIBO_HONORARIO' as const,
      estado: promoted.estado,
      destinoStorageKey:
        promoted.destinoStorageKey ?? reserved.destination,
    };
  }
}
