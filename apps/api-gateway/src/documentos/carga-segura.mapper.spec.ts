import { HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';

import {
  mapSecureUploadSuccess,
  throwSecureUploadError,
} from './carga-segura.mapper';

function getHttpException(callback: () => unknown): HttpException {
  try {
    callback();
  } catch (error: unknown) {
    if (error instanceof HttpException) {
      return error;
    }

    throw error;
  }

  throw new Error('Se esperaba HttpException');
}

function axiosError(status: number, data: unknown): AxiosError<unknown> {
  return new AxiosError(
    'upstream error',
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      status,
      statusText: 'Error',
      headers: {},
      config: {
        headers: {},
      },
      data,
    },
  );
}

describe('carga-segura.mapper', () => {
  describe('mapSecureUploadSuccess', () => {
    it('mapea CREATED a 201 y minimiza', () => {
      expect(
        mapSecureUploadSuccess({
          success: true,
          requestId: 'req-1',
          data: {
            kind: 'CREATED',
            documentoId: 12,
            archivoId: 90,
            hashSha256: 'privado',
            storageKey: 'privado',
          },
        }),
      ).toEqual({
        status: HttpStatus.CREATED,
        data: {
          kind: 'CREATED',
          documentoId: 12,
        },
      });
    });

    it('mapea REPLAYED a 200 y minimiza', () => {
      expect(
        mapSecureUploadSuccess({
          data: {
            kind: 'REPLAYED',
            documentoId: 12,
            archivoId: 90,
          },
        }),
      ).toEqual({
        status: HttpStatus.OK,
        data: {
          kind: 'REPLAYED',
          documentoId: 12,
        },
      });
    });

    it('mapea RECONCILIATION_REQUIRED a 202', () => {
      expect(
        mapSecureUploadSuccess({
          kind: 'RECONCILIATION_REQUIRED',
          operacionId: 8,
          errorCode: 'PERSISTENCIA_PENDIENTE',
          documentoId: 12,
          archivoId: 90,
        }),
      ).toEqual({
        status: HttpStatus.ACCEPTED,
        data: {
          kind: 'RECONCILIATION_REQUIRED',
          operacionId: 8,
          errorCode: 'PERSISTENCIA_PENDIENTE',
        },
      });
    });

    it('permite reconciliación sin errorCode', () => {
      expect(
        mapSecureUploadSuccess({
          kind: 'RECONCILIATION_REQUIRED',
          operacionId: 8,
        }),
      ).toEqual({
        status: HttpStatus.ACCEPTED,
        data: {
          kind: 'RECONCILIATION_REQUIRED',
          operacionId: 8,
        },
      });
    });

    it.each([
      null,
      {},
      { kind: 'CREATED' },
      { kind: 'REPLAYED', documentoId: 0 },
      {
        kind: 'RECONCILIATION_REQUIRED',
        operacionId: -1,
      },
      { kind: 'UNKNOWN', documentoId: 1 },
    ])('rechaza éxito upstream inválido: %p', (payload) => {
      expect(() => mapSecureUploadSuccess(payload)).toThrow(Error);
    });
  });

  describe('throwSecureUploadError', () => {
    it.each([
      ['CARGA_SEGURA_DUPLICATE', 409],
      ['CARGA_SEGURA_IDEMPOTENCY_CONFLICT', 409],
      ['CARGA_SEGURA_OPERACION_EN_PROGRESO', 409],
      ['CARGA_SEGURA_SOLICITUD_INVALIDA', 422],
      ['PAYLOAD_TOO_LARGE', 413],
      ['UNSUPPORTED_MEDIA_TYPE', 415],
      ['CARGA_SEGURA_DESHABILITADA', 503],
      ['CARGA_SEGURA_STORAGE_FAILED', 503],
      ['CARGA_SEGURA_PERSISTENCE_FAILED', 503],
      ['CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED', 503],
      ['UNAUTHORIZED', 401],
      ['FORBIDDEN', 403],
      ['INTERNAL_SERVER_ERROR', 500],
    ])('preserva %s con HTTP %i', (code, expectedStatus) => {
      const error = getHttpException(() =>
        throwSecureUploadError(
          axiosError(500, {
            success: false,
            error: {
              code,
              message: 'Mensaje público',
              details: {
                stack: 'no exponer',
              },
            },
            stack: 'no exponer',
            storageKey: 'no exponer',
          }),
        ),
      );

      expect(error.getStatus()).toBe(expectedStatus);
      expect(error.getResponse()).toEqual({
        code,
        message: 'Mensaje público',
        details: null,
      });
    });

    it('normaliza código upstream desconocido', () => {
      const error = getHttpException(() =>
        throwSecureUploadError(
          axiosError(418, {
            error: {
              code: 'CODIGO_INTERNO',
              message: 'Detalle interno',
            },
            stack: 'secreto',
          }),
        ),
      );

      expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error.getResponse()).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'No se pudo confirmar el resultado de la carga documental segura',
        details: null,
      });
    });

    it('normaliza timeout o resultado ambiguo', () => {
      const error = getHttpException(() =>
        throwSecureUploadError(new AxiosError('timeout', 'ECONNABORTED')),
      );

      expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error.getResponse()).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'No se pudo confirmar el resultado de la carga documental segura',
        details: null,
      });
    });

    it('no expone respuesta Axios ni campos internos', () => {
      const error = getHttpException(() =>
        throwSecureUploadError(
          axiosError(503, {
            error: {
              code: 'CARGA_SEGURA_STORAGE_FAILED',
              message: 'Storage no disponible',
              details: {
                storageKey: 'privado',
                stack: 'privado',
              },
            },
            config: {
              url: 'http://ms-documentos',
            },
          }),
        ),
      );

      const serialized = JSON.stringify(error.getResponse());

      expect(serialized).not.toContain('storageKey');
      expect(serialized).not.toContain('stack');
      expect(serialized).not.toContain('ms-documentos');
    });
  });
});
