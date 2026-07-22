import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

interface CapturedResponse {
  status: jest.Mock;
  json: jest.Mock;
}

function createHost(requestId = 'request-123'): {
  host: ArgumentsHost;
  response: CapturedResponse;
} {
  const response: CapturedResponse = {
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockReturnValue(response);

  const request = {
    headers: {
      'x-request-id': requestId,
    },
    url: '/api/v1/documentos/carga-segura',
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

function getPayload(response: CapturedResponse): Record<string, unknown> {
  const call = response.json.mock.calls[0] as
    | [Record<string, unknown>]
    | undefined;

  if (!call) {
    throw new Error('No se capturó respuesta JSON');
  }

  return call[0];
}

describe('HttpExceptionFilter - carga segura', () => {
  it.each([
    ['CARGA_SEGURA_DUPLICATE', HttpStatus.CONFLICT],
    ['CARGA_SEGURA_IDEMPOTENCY_CONFLICT', HttpStatus.CONFLICT],
    ['CARGA_SEGURA_OPERACION_EN_PROGRESO', HttpStatus.CONFLICT],
    ['CARGA_SEGURA_SOLICITUD_INVALIDA', HttpStatus.UNPROCESSABLE_ENTITY],
    ['CARGA_SEGURA_DESHABILITADA', HttpStatus.SERVICE_UNAVAILABLE],
    ['CARGA_SEGURA_STORAGE_FAILED', HttpStatus.SERVICE_UNAVAILABLE],
  ])('preserva código público %s', (code, status) => {
    const { host, response } = createHost();
    const filter = new HttpExceptionFilter();

    filter.catch(
      new HttpException(
        {
          code,
          message: 'Mensaje público',
          details: null,
          storageKey: 'no exponer',
          stack: 'no exponer',
        },
        status,
      ),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(status);

    const payload = getPayload(response);
    expect(payload).toMatchObject({
      success: false,
      requestId: 'request-123',
      path: '/api/v1/documentos/carga-segura',
      error: {
        code,
        message: 'Mensaje público',
        details: null,
      },
    });

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('storageKey');
    expect(serialized).not.toContain('stack');
  });

  it('mapea PayloadTooLargeException a PAYLOAD_TOO_LARGE', () => {
    const { host, response } = createHost();
    const filter = new HttpExceptionFilter();

    filter.catch(new PayloadTooLargeException(), host);

    expect(getPayload(response)).toMatchObject({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
      },
    });
  });

  it('mapea UnsupportedMediaTypeException al código público', () => {
    const { host, response } = createHost();
    const filter = new HttpExceptionFilter();

    filter.catch(new UnsupportedMediaTypeException(), host);

    expect(getPayload(response)).toMatchObject({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
      },
    });
  });

  it('mantiene Validation failed', () => {
    const { host, response } = createHost();
    const filter = new HttpExceptionFilter();

    filter.catch(
      new HttpException(
        {
          message: 'Validation failed',
          errors: ['expedienteId es obligatorio'],
        },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(getPayload(response)).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Error de validación',
        details: ['expedienteId es obligatorio'],
      },
    });
  });

  it('mantiene envelope legacy sin code explícito', () => {
    const { host, response } = createHost();
    const filter = new HttpExceptionFilter();

    filter.catch(
      new HttpException(
        {
          message: 'Conflicto legacy',
          campo: 'valor',
        },
        HttpStatus.CONFLICT,
      ),
      host,
    );

    expect(getPayload(response)).toMatchObject({
      error: {
        code: 'CONFLICT',
        message: 'Conflicto legacy',
        details: {
          message: 'Conflicto legacy',
          campo: 'valor',
        },
      },
    });
  });
});
