
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { SELF_DECLARED_DEPS_METADATA } from '@nestjs/common/constants';
import httpRequest from 'supertest';

jest.mock('@documental/shared', () => ({
  NatsSubjects: {
    AuthValidateToken: 'auth.validate-token',
  },
  REQUEST_ID_HEADER: 'x-request-id',
}));

import axios from 'axios';
import { of } from 'rxjs';

import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  ExpedientesGatewayController,
} from './expedientes.controller';

jest.mock('axios');

describe('Endpoint importacion CSV - Gateway', () => {
  const request = axios.request as jest.Mock;

  const nats = {
    send: jest.fn(),
  };

  const config = {
    get: jest.fn(),
  };

  const controller = new ExpedientesGatewayController(
    config as any,
    nats as any,
  );

  const payload = {
    sub: 10,
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    perfil: 'compras',
  };

  const solicitudId =
    'a1000000-0000-4000-8000-000000000001';

  const buffer = Buffer.from(
    'codigo_expediente,descripcion\n000001,ADMINISTRACION\n',
  );

  const file = {
    buffer,
    originalname: 'centros-costo.csv',
    size: buffer.length,
  };

  const result = {
    estado: 'confirmada',
    registrosInsertados: 1,
  };

  beforeEach(() => {
    jest.resetAllMocks();

    config.get.mockReturnValue(
      'http://localhost:3002/api/v1',
    );

    nats.send.mockReturnValue(
      of({ valid: true, payload }),
    );

    request.mockResolvedValue({
      data: { data: result },
    });
  });

  it('reenvia archivo y contexto autenticado', async () => {
    await expect(controller.importarCsv(
      'Bearer test',
      undefined,
      file,
      { solicitudId },
    )).resolves.toEqual(result);

    expect(request).toHaveBeenCalledTimes(1);

    const sent = request.mock.calls[0][0];

    expect(sent.method).toBe('POST');

    expect(sent.url).toBe(
      'http://localhost:3002/api/v1' +
      '/expedientes/mantenimiento/importar-csv',
    );

    expect(sent.headers).toMatchObject({
      authorization: 'Bearer test',
      'x-workspace-id': '1',
      'x-empresa-codigo': 'BBTI',
      'x-cliente-destino-id': '2',
      'x-actor-id': '10',
    });

    expect(sent.headers['content-type'])
      .toContain('multipart/form-data');

    const multipart = sent.data.getBuffer();

    expect(multipart.includes(buffer)).toBe(true);

    expect(multipart.toString())
      .toContain(solicitudId);
  });

  it('rechaza solicitud sin token', async () => {
    await expect(controller.importarCsv(
      undefined,
      undefined,
      file,
      { solicitudId },
    )).rejects.toBeInstanceOf(UnauthorizedException);

    expect(request).not.toHaveBeenCalled();
  });

  it('rechaza perfil no autorizado', async () => {
    nats.send.mockReturnValue(
      of({
        valid: true,
        payload: { ...payload, perfil: 'almacen' },
      }),
    );

    await expect(controller.importarCsv(
      'Bearer test',
      undefined,
      file,
      { solicitudId },
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect(request).not.toHaveBeenCalled();
  });

  it('rechaza empresa enviada por frontend', async () => {
    await expect(controller.importarCsv(
      'Bearer test',
      undefined,
      file,
      {
        solicitudId,
        empresaCodigo: 'BBTEC',
      },
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(request).not.toHaveBeenCalled();
  });

  it('rechaza solicitudId invalido', async () => {
    await expect(controller.importarCsv(
      'Bearer test',
      undefined,
      file,
      { solicitudId: 'invalid' },
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(request).not.toHaveBeenCalled();
  });

  it('rechaza archivo no CSV', async () => {
    await expect(controller.importarCsv(
      'Bearer test',
      undefined,
      { ...file, originalname: 'archivo.pdf' },
      { solicitudId },
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(request).not.toHaveBeenCalled();
  });

  it('rechaza archivo superior al limite', async () => {
    await expect(controller.importarCsv(
      'Bearer test',
      undefined,
      {
        ...file,
        buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
      },
      { solicitudId },
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(request).not.toHaveBeenCalled();
  });

  it('rechaza contexto sin workspace', async () => {
    nats.send.mockReturnValue(
      of({
        valid: true,
        payload: { ...payload, workspaceId: undefined },
      }),
    );

    await expect(controller.importarCsv(
      'Bearer test',
      undefined,
      file,
      { solicitudId },
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect(request).not.toHaveBeenCalled();
  });

  describe('Regresion HTTP multipart CSV', () => {
    let app: INestApplication;

    const endpoint =
      '/api/v1/expedientes/mantenimiento/importar-csv';

    beforeAll(async () => {
      const controllerType = ExpedientesGatewayController;

      const dependencies = [
        config, nats
      ];

      const tokens: any[] = [
        ...(Reflect.getMetadata(
          'design:paramtypes',
          controllerType,
        ) ?? []),
      ];

      const explicitTokens: Array<{
        index: number;
        param: any;
      }> = Reflect.getMetadata(
        SELF_DECLARED_DEPS_METADATA,
        controllerType,
      ) ?? [];

      for (const dependency of explicitTokens) {
        tokens[dependency.index] = dependency.param;
      }

      if (
        tokens.length !== dependencies.length ||
        tokens.some(token => !token)
      ) {
        throw new Error(
          'UNEXPECTED_CONTROLLER_DEPENDENCIES',
        );
      }

      const module = await Test.createTestingModule({
        controllers: [controllerType],
        providers: tokens.map((token, index) => ({
          provide: token,
          useValue: dependencies[index],
        })),
      }).compile();

      app = module.createNestApplication();
      app.setGlobalPrefix('api/v1');
      await app.init();
    });

    afterAll(async () => {
      if (app) await app.close();
    });

    function postCsv() {
      return httpRequest(app.getHttpServer())
        .post(endpoint)
        .set('Authorization', 'Bearer test')
        ;
    }

    function attachCsv(req: ReturnType<typeof postCsv>) {
      return req.attach('archivo', buffer, {
        filename: file.originalname,
        contentType: 'text/csv',
      });
    }

    it('acepta exactamente un archivo y solicitudId', async () => {
      const response = await attachCsv(postCsv())
        .field('solicitudId', solicitudId)
        .expect(201);

      expect(response.body).toEqual(result);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('acepta solicitudId antes del archivo', async () => {
      const req = postCsv()
        .field('solicitudId', solicitudId);

      await attachCsv(req).expect(201);

      expect(request).toHaveBeenCalledTimes(1);
    });

    it('rechaza dos archivos', async () => {
      await attachCsv(
        attachCsv(postCsv()),
      )
        .field('solicitudId', solicitudId)
        .expect(400);

      expect(request).not.toHaveBeenCalled();
    });

    it('rechaza un campo adicional', async () => {
      await attachCsv(postCsv())
        .field('solicitudId', solicitudId)
        .field('empresaCodigo', 'BBTEC')
        .expect(400);

      expect(request).not.toHaveBeenCalled();
    });

    it('rechaza solicitud sin archivo', async () => {
      await postCsv()
        .field('solicitudId', solicitudId)
        .expect(400);

      expect(request).not.toHaveBeenCalled();
    });

    it('rechaza solicitud sin solicitudId', async () => {
      await attachCsv(postCsv())
        .expect(400);

      expect(request).not.toHaveBeenCalled();
    });
  });

});
