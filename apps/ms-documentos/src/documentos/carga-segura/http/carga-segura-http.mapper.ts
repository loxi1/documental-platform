import { HttpStatus } from '@nestjs/common';

import { CargaSeguraError } from '../carga-segura.errors';
import type { CargaSeguraResult } from '../carga-segura.types';

export interface CargaSeguraHttpMappedResult {
  status: number;
  data: CargaSeguraResult;
}

export function mapCargaSeguraResultToHttp(
  result: CargaSeguraResult,
): CargaSeguraHttpMappedResult {
  switch (result.kind) {
    case 'CREATED':
      return {
        status: HttpStatus.CREATED,
        data: result,
      };

    case 'REPLAYED':
      return {
        status: HttpStatus.OK,
        data: result,
      };

    case 'DUPLICATE':
      throw new CargaSeguraError(
        'CARGA_SEGURA_DUPLICATE',
        'El archivo ya se encuentra registrado',
        {
          operacionId: result.operacionId,
          documentoId: result.documentoId,
          archivoId: result.archivoId,
        },
      );

    case 'IDEMPOTENCY_CONFLICT':
      throw new CargaSeguraError(
        'CARGA_SEGURA_IDEMPOTENCY_CONFLICT',
        'La operación fue utilizada con información diferente',
        {
          operacionId: result.operacionId,
        },
      );

    case 'RECONCILIATION_REQUIRED':
      if (result.errorCode === 'CARGA_SEGURA_OPERACION_EN_PROGRESO') {
        throw new CargaSeguraError(
          'CARGA_SEGURA_OPERACION_EN_PROGRESO',
          'La operación todavía se encuentra en progreso',
          {
            operacionId: result.operacionId,
          },
        );
      }

      return {
        status: HttpStatus.ACCEPTED,
        data: result,
      };
  }
}
