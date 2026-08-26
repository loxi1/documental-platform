import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { of } from 'rxjs';
import { NatsSubjects, REQUEST_ID_HEADER } from '@documental/shared';

import { DocumentosGatewayController } from './documentos.controller';

jest.mock('axios');

describe('DocumentosGatewayController subir-version 42-B-03B', () => {
  const axiosMock = axios as jest.Mocked<typeof axios>;

  const config = {
    get: jest.fn().mockReturnValue('http://ms-documentos:3002/api/v1'),
  } as unknown as ConfigService;

  const contexto = {
    sub: 'user-42b',
    email: '42b@example.test',
    empresa: 'BBTI',
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    workspaceId: 77,
    permisos: {
      actions: ['documentos.subir'],
    },
  };

  let nats: { send: jest.Mock };
  let controller: DocumentosGatewayController;

  const file = {
    buffer: Buffer.from('pdf-version-42b'),
    originalname: 'version.pdf',
    mimetype: 'application/pdf',
    size: 15,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    nats = {
      send: jest.fn().mockReturnValue(
        of({
          valid: true,
          payload: contexto,
        }),
      ),
    };

    controller = new DocumentosGatewayController(
      config,
      nats as never,
    );

    axiosMock.get.mockResolvedValue({
      data: {
        data: {
          id: 777,
          cliente_abreviatura: 'BBTI',
        },
      },
    } as never);

    axiosMock.request.mockResolvedValue({
      data: {
        data: {
          ok: true,
          archivoId: 9001,
        },
      },
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('valida token, documentos.subir y scope; deriva tenant del contexto y reenvía un solo archivo físico', async () => {
    const appendSpy = jest.spyOn(FormData.prototype, 'append');

    await controller.subirVersionArchivo(
      'Bearer token-finanzas',
      'req-42-b',
      '777',
      { archivo: [file] },
      {
        empresa: 'EVIL',
        empresaCodigo: 'EVIL',
        cliente: 'EVIL',
        clienteAbreviatura: 'EVIL',
        clienteDestinoId: '999',
        workspaceId: '999',
        observacion: 'nueva versión',
      },
    );

    expect(nats.send).toHaveBeenCalledWith(
      NatsSubjects.AuthValidateToken,
      { token: 'token-finanzas' },
    );

    expect(axiosMock.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documentos/777',
      expect.objectContaining({
        headers: expect.objectContaining({
          [REQUEST_ID_HEADER]: 'req-42-b',
        }),
      }),
    );

    const physicalAppends = appendSpy.mock.calls.filter(
      ([key]) => key === 'file' || key === 'archivo',
    );

    expect(physicalAppends).toHaveLength(1);
    expect(physicalAppends[0]?.[0]).toBe('file');

    expect(appendSpy).toHaveBeenCalledWith('empresaCodigo', 'BBTI');

    for (const forbiddenValue of ['EVIL', '999']) {
      expect(
        appendSpy.mock.calls.some((call) =>
          call.some((value) => value === forbiddenValue),
        ),
      ).toBe(false);
    }

    expect(appendSpy).toHaveBeenCalledWith(
      'observacion',
      'nueva versión',
    );

    expect(axiosMock.request).toHaveBeenCalledTimes(1);

    const request = axiosMock.request.mock.calls[0]?.[0];

    expect(request).toEqual(
      expect.objectContaining({
        method: 'POST',
        url: 'http://ms-documentos:3002/api/v1/documentos/777/archivos/subir-version',
        headers: expect.objectContaining({
          authorization: 'Bearer token-finanzas',
          [REQUEST_ID_HEADER]: 'req-42-b',
          'x-correlation-id': 'req-42-b',
          'x-user-id': 'user-42b',
          'x-user-email': '42b@example.test',
          'x-workspace-id': '77',
          'x-empresa-codigo': 'BBTI',
          'x-cliente-destino-id': '2',
          'content-type': expect.stringContaining('multipart/form-data'),
        }),
      }),
    );
  });

  it('requiere documentos.subir antes de consultar scope o reenviar multipart', async () => {
    nats.send.mockReturnValue(
      of({
        valid: true,
        payload: {
          ...contexto,
          permisos: { actions: [] },
        },
      }),
    );

    await expect(
      controller.subirVersionArchivo(
        'Bearer token-sin-permiso',
        'req-sin-permiso',
        '777',
        { file: [file] },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(axiosMock.get).not.toHaveBeenCalled();
    expect(axiosMock.request).not.toHaveBeenCalled();
  });

  it('rechaza documento fuera de scope antes de reenviar multipart', async () => {
    axiosMock.get.mockResolvedValue({
      data: {
        data: {
          id: 777,
          cliente_abreviatura: 'OTRA_EMPRESA',
        },
      },
    } as never);

    await expect(
      controller.subirVersionArchivo(
        'Bearer token-bbti',
        'req-scope',
        '777',
        { file: [file] },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(axiosMock.request).not.toHaveBeenCalled();
  });
});
