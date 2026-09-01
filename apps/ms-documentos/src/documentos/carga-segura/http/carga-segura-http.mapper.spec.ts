import { HttpStatus } from '@nestjs/common';

import { CargaSeguraError } from '../carga-segura.errors';
import { mapCargaSeguraResultToHttp } from './carga-segura-http.mapper';

describe('mapCargaSeguraResultToHttp', () => {
  it('mapea CREATED a 201', () => {
    const result = {
      kind: 'CREATED' as const,
      operacionId: 10,
      documentoId: 20,
      archivoId: 30,
      hashSha256: 'hash-created',
    };

    expect(mapCargaSeguraResultToHttp(result)).toEqual({
      status: HttpStatus.CREATED,
      data: result,
    });
  });

  it('mapea REPLAYED a 200', () => {
    const result = {
      kind: 'REPLAYED' as const,
      operacionId: 11,
      documentoId: 21,
      archivoId: 31,
      hashSha256: 'hash-replayed',
    };

    expect(mapCargaSeguraResultToHttp(result)).toEqual({
      status: HttpStatus.OK,
      data: result,
    });
  });

  it('mapea DUPLICATE a error contractual', () => {
    expect(() =>
      mapCargaSeguraResultToHttp({
        kind: 'DUPLICATE',
        operacionId: 12,
        documentoId: 22,
        archivoId: 32,
        hashSha256: 'hash-duplicate',
      }),
    ).toThrow(CargaSeguraError);

    try {
      mapCargaSeguraResultToHttp({
        kind: 'DUPLICATE',
        operacionId: 12,
        documentoId: 22,
        archivoId: 32,
        hashSha256: 'hash-duplicate',
      });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CargaSeguraError);

      if (!(error instanceof CargaSeguraError)) {
        throw new Error('Se esperaba CargaSeguraError');
      }

      expect(error.code).toBe('CARGA_SEGURA_DUPLICATE');
      expect(error.details).toEqual({
        operacionId: 12,
        documentoId: 22,
        archivoId: 32,
      });
    }
  });

  it('mapea IDEMPOTENCY_CONFLICT a error contractual', () => {
    try {
      mapCargaSeguraResultToHttp({
        kind: 'IDEMPOTENCY_CONFLICT',
        operacionId: 13,
      });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CargaSeguraError);

      if (!(error instanceof CargaSeguraError)) {
        throw new Error('Se esperaba CargaSeguraError');
      }

      expect(error.code).toBe('CARGA_SEGURA_IDEMPOTENCY_CONFLICT');
      expect(error.details).toEqual({
        operacionId: 13,
      });

      return;
    }

    throw new Error('Se esperaba excepción');
  });

  it('mapea operación en progreso a error contractual', () => {
    try {
      mapCargaSeguraResultToHttp({
        kind: 'RECONCILIATION_REQUIRED',
        operacionId: 14,
        errorCode: 'CARGA_SEGURA_OPERACION_EN_PROGRESO',
      });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CargaSeguraError);

      if (!(error instanceof CargaSeguraError)) {
        throw new Error('Se esperaba CargaSeguraError');
      }

      expect(error.code).toBe('CARGA_SEGURA_OPERACION_EN_PROGRESO');
      expect(error.details).toEqual({
        operacionId: 14,
      });

      return;
    }

    throw new Error('Se esperaba excepción');
  });

  it('mapea reconciliación real a 202', () => {
    const result = {
      kind: 'RECONCILIATION_REQUIRED' as const,
      operacionId: 15,
      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
    };

    expect(mapCargaSeguraResultToHttp(result)).toEqual({
      status: HttpStatus.ACCEPTED,
      data: result,
    });
  });
});
