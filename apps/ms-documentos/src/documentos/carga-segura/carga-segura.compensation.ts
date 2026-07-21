import { Inject, Injectable } from '@nestjs/common';

import { CARGA_SEGURA_STORAGE } from './carga-segura.constants';
import { CargaSeguraError } from './carga-segura.errors';
import { CargaSeguraRepository } from './carga-segura.repository';
import type {
  CargaSeguraCompensationInput,
  CargaSeguraCompensationResult,
} from './carga-segura.types';
import type { CargaSeguraStorage } from './carga-segura.storage';

@Injectable()
export class CargaSeguraCompensation {
  constructor(
    private readonly repository: CargaSeguraRepository,
    @Inject(CARGA_SEGURA_STORAGE)
    private readonly storage: CargaSeguraStorage,
  ) {}

  async compensate(
    input: CargaSeguraCompensationInput,
  ): Promise<CargaSeguraCompensationResult> {
    const reason = await this.evaluateUnsafeReason(input);

    if (reason) {
      await this.markReconciliation(input, reason);

      return {
        kind: 'RECONCILIATION_REQUIRED',
        operacionId: input.operacion.id,
        reason,
      };
    }

    try {
      await this.storage.deleteObject({
        provider: 'r2',
        bucket: input.storageObject.bucket,
        key: input.storageObject.key,
      });

      const updated = await this.repository.marcarFallida({
        operacionId: input.operacion.id,
        errorCodigo: input.errorCodigo,
        errorDetalle: input.errorDetalle,
      });

      if (!updated) {
        return this.reconciliation(input, 'TRANSICION_FALLIDA_NO_APLICADA');
      }

      return {
        kind: 'COMPENSATED',
        operacionId: input.operacion.id,
      };
    } catch {
      return this.reconciliation(input, 'DELETE_OBJECT_FAILED');
    }
  }

  private async evaluateUnsafeReason(
    input: CargaSeguraCompensationInput,
  ): Promise<string | null> {
    if (!input.objetoCreadoPorOperacion) {
      return 'OBJECT_NOT_CREATED_BY_OPERATION';
    }

    if (input.objetoPreexistente) {
      return 'OBJECT_PREEXISTING';
    }

    if (input.esReplay) {
      return 'REPLAY_OPERATION';
    }

    if (input.operacion.estado === 'completada') {
      return 'OPERATION_COMPLETED';
    }

    const references = await this.repository.contarReferenciasVigentesStorage({
      provider: input.storageObject.provider,
      bucket: input.storageObject.bucket,
      key: input.storageObject.key,
    });

    if (references > 0) {
      return 'ACTIVE_STORAGE_REFERENCES';
    }

    return null;
  }

  private async reconciliation(
    input: CargaSeguraCompensationInput,
    reason: string,
  ): Promise<CargaSeguraCompensationResult> {
    await this.markReconciliation(input, reason);

    return {
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: input.operacion.id,
      reason,
    };
  }

  private async markReconciliation(
    input: CargaSeguraCompensationInput,
    reason: string,
  ): Promise<void> {
    const updated = await this.repository.marcarRequiereReconciliacion({
      operacionId: input.operacion.id,
      storageProvider: input.storageObject.provider,
      storageBucket: input.storageObject.bucket,
      storageKey: input.storageObject.key,
      errorCodigo: 'ARCHIVO_REQUIERE_RECONCILIACION',
      errorDetalle: [input.errorDetalle, `compensationReason=${reason}`].join(
        '; ',
      ),
    });

    if (!updated) {
      throw new CargaSeguraError(
        'CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED',
        'No se pudo registrar la reconciliación de la carga segura',
        { operacionId: input.operacion.id },
      );
    }
  }
}
