jest.mock(
  '@documental/shared',
  () => ({
    NatsSubjects: { AuthValidateToken: 'auth.validate-token' },
    REQUEST_ID_HEADER: 'x-request-id',
  }),
  { virtual: true },
);

import { HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

import { SECURE_UPLOAD } from './carga-segura.contract';
import { DocumentosGatewayController } from './documentos.controller';
import type { SecureUploadFile } from './carga-segura.validation';

interface ResponseStub {
  status: jest.Mock;
}

interface InternalController {
  validateAuthorization: jest.Mock;
  assertSecureUploadExpedienteScope: jest.Mock;
}

interface MockWithCalls {
  mock: {
    calls: unknown;
  };
}

function getFirstAxiosRequest(spy: MockWithCalls): Record<string, unknown> {
  const calls = spy.mock.calls;

  if (
    !Array.isArray(calls) ||
    !Array.isArray(calls[0]) ||
    calls[0][0] === null ||
    typeof calls[0][0] !== 'object'
  ) {
    throw new Error('No se capturó configuración Axios');
  }

  return calls[0][0] as Record<string, unknown>;
}

function createController(): {
  controller: DocumentosGatewayController;
  internal: InternalController;
} {
  const config = {
    get: jest.fn().mockReturnValue('http://ms-documentos:3002/api/v1'),
  };

  const nats = { send: jest.fn() };

  const controller = new DocumentosGatewayController(
    config as never,
    nats as never,
  );

  return {
    controller,
    internal: controller as unknown as InternalController,
  };
}

function createResponse(): ResponseStub {
  const response: ResponseStub = { status: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function createFile(
  overrides: Partial<SecureUploadFile> = {},
): SecureUploadFile {
  return {
    fieldname: 'archivo',
    originalname: 'factura.pdf',
    mimetype: 'application/pdf',
    size: 7,
    buffer: Buffer.from('archivo'),
    ...overrides,
  };
}

function validBody(): Record<string, unknown> {
  return {
    expedienteId: '41',
    tipoDocumental: 'FACTURA',
    tipoRelacion: 'adjunto_factura',
    esPrincipal: 'false',
    canalIngreso: 'WEB_ADMIN_CARGA_SEGURA',
    metadata: JSON.stringify({ origen: 'workspace' }),
  };
}

function prepareAuthorizedController(): {
  controller: DocumentosGatewayController;
  internal: InternalController;
} {
  const result = createController();

  result.internal.validateAuthorization = jest.fn().mockResolvedValue({
    sub: 77,
    workspaceId: 9,
    empresa: 'BBTI',
    clienteDestinoId: 2,
    sistema: 'DOCUMENTAL',
    permisos: { actions: ['documentos.subir'] },
  });

  result.internal.assertSecureUploadExpedienteScope = jest
    .fn()
    .mockResolvedValue({
      workspaceId: 9,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      actorId: '77',
    });

  return result;
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
      config: { headers: {} },
      data,
    },
  );
}

describe('DocumentosGatewayController - carga segura', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [
      {
        data: {
          kind: 'CREATED',
          documentoId: 101,
          archivoId: 900,
          storageKey: 'privado',
        },
      },
      HttpStatus.CREATED,
      { kind: 'CREATED', documentoId: 101 },
    ],
    [
      {
        data: {
          kind: 'REPLAYED',
          documentoId: 101,
          archivoId: 900,
        },
      },
      HttpStatus.OK,
      { kind: 'REPLAYED', documentoId: 101 },
    ],
    [
      {
        data: {
          kind: 'RECONCILIATION_REQUIRED',
          operacionId: 55,
          errorCode: 'PERSISTENCIA_PENDIENTE',
          documentoId: 101,
        },
      },
      HttpStatus.ACCEPTED,
      {
        kind: 'RECONCILIATION_REQUIRED',
        operacionId: 55,
        errorCode: 'PERSISTENCIA_PENDIENTE',
      },
    ],
  ])(
    'mapea éxito minimizado a HTTP %i',
    async (upstreamPayload, expectedStatus, expectedBody) => {
      const { controller } = prepareAuthorizedController();
      const response = createResponse();
      const axiosRequest = jest
        .spyOn(axios, 'request')
        .mockResolvedValue({ data: upstreamPayload });

      const result = await controller.cargaSegura(
        'Bearer token-valido',
        'request-123',
        'idem-123',
        [createFile()],
        validBody(),
        response as never,
      );

      expect(result).toEqual(expectedBody);
      expect(response.status).toHaveBeenCalledWith(expectedStatus);
      expect(axiosRequest).toHaveBeenCalledTimes(1);
    },
  );

  it('realiza una sola llamada interna con headers y límites derivados', async () => {
    const { controller, internal } = prepareAuthorizedController();
    const response = createResponse();
    const axiosRequest = jest.spyOn(axios, 'request').mockResolvedValue({
      data: { kind: 'CREATED', documentoId: 101 },
    });

    await controller.cargaSegura(
      'Bearer token-valido',
      'request-123',
      'idem-123',
      [createFile()],
      validBody(),
      response as never,
    );

    expect(internal.validateAuthorization).toHaveBeenCalledTimes(1);
    expect(internal.assertSecureUploadExpedienteScope).toHaveBeenCalledWith(
      41,
      expect.objectContaining({ sistema: 'DOCUMENTAL' }),
      'request-123',
    );
    expect(axiosRequest).toHaveBeenCalledTimes(1);

    const call = getFirstAxiosRequest(axiosRequest);

    expect(call).toMatchObject({
      method: 'POST',
      url: 'http://ms-documentos:3002/api/v1/documentos/carga-segura',
      timeout: SECURE_UPLOAD.timeoutMs,
      maxBodyLength: SECURE_UPLOAD.multipartTotalBytes,
      maxContentLength: SECURE_UPLOAD.multipartTotalBytes,
    });

    const headers = call.headers;

    if (
      headers === null ||
      typeof headers !== 'object' ||
      Array.isArray(headers)
    ) {
      throw new Error('No se capturaron headers Axios válidos');
    }

    expect(headers as Record<string, unknown>).toMatchObject({
      authorization: 'Bearer token-valido',
      'idempotency-key': 'idem-123',
      'x-request-id': 'request-123',
      'x-correlation-id': 'request-123',
      'x-workspace-id': '9',
      'x-empresa-codigo': 'BBTI',
      'x-cliente-destino-id': '2',
      'x-actor-id': '77',
    });
  });

  it('construye multipart interno con archivo y sin alias file', async () => {
    const { controller } = prepareAuthorizedController();
    const response = createResponse();
    const axiosRequest = jest.spyOn(axios, 'request').mockResolvedValue({
      data: { kind: 'CREATED', documentoId: 101 },
    });

    await controller.cargaSegura(
      'Bearer token-valido',
      'request-123',
      'idem-123',
      [createFile()],
      validBody(),
      response as never,
    );

    const call = getFirstAxiosRequest(axiosRequest);
    const form = call.data as {
      getBuffer?: () => Buffer;
    };
    const multipart = form.getBuffer?.().toString('utf8') ?? '';

    expect(multipart).toContain('name="archivo"');
    expect(multipart).not.toContain('name="file"');
    expect(multipart).toContain('name="expedienteId"');
    expect(multipart).toContain('name="tipoDocumental"');
    expect(multipart).toContain('name="tipoRelacion"');
    expect(multipart).toContain('name="esPrincipal"');
    expect(multipart).toContain('name="canalIngreso"');
    expect(multipart).toContain('name="metadata"');
  });

  it.each([
    ['CARGA_SEGURA_OPERACION_EN_PROGRESO', HttpStatus.CONFLICT],
    ['CARGA_SEGURA_IDEMPOTENCY_CONFLICT', HttpStatus.CONFLICT],
    ['CARGA_SEGURA_DESHABILITADA', HttpStatus.SERVICE_UNAVAILABLE],
  ])('propaga %s sin reintento', async (code, status) => {
    const { controller } = prepareAuthorizedController();
    const response = createResponse();
    const axiosRequest = jest.spyOn(axios, 'request').mockRejectedValue(
      axiosError(status, {
        error: {
          code,
          message: 'Mensaje público',
          details: { stack: 'no exponer' },
        },
      }),
    );

    await expect(
      controller.cargaSegura(
        'Bearer token-valido',
        'request-123',
        'idem-123',
        [createFile()],
        validBody(),
        response as never,
      ),
    ).rejects.toMatchObject({ status });

    expect(axiosRequest).toHaveBeenCalledTimes(1);
  });

  it('normaliza timeout ambiguo y no reintenta', async () => {
    const { controller } = prepareAuthorizedController();
    const response = createResponse();
    const axiosRequest = jest
      .spyOn(axios, 'request')
      .mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'));

    let captured: unknown;

    try {
      await controller.cargaSegura(
        'Bearer token-valido',
        'request-123',
        'idem-123',
        [createFile()],
        validBody(),
        response as never,
      );
    } catch (error: unknown) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(HttpException);
    const httpError = captured as HttpException;
    expect(httpError.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(httpError.getResponse()).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'No se pudo confirmar el resultado de la carga documental segura',
      details: null,
    });
    expect(axiosRequest).toHaveBeenCalledTimes(1);
  });

  it('rechaza archivo múltiple antes del upstream', async () => {
    const { controller } = prepareAuthorizedController();
    const response = createResponse();
    const axiosRequest = jest.spyOn(axios, 'request');

    await expect(
      controller.cargaSegura(
        'Bearer token-valido',
        'request-123',
        'idem-123',
        [createFile(), createFile()],
        validBody(),
        response as never,
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });

    expect(axiosRequest).not.toHaveBeenCalled();
  });
});
