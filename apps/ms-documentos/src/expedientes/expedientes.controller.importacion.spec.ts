
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

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import { of, throwError } from 'rxjs';

import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

import { ExpedientesController } from './expedientes.controller';

describe('Endpoint importacion CSV - MS Documentos', () => {
  const importacion = {
    importar: jest.fn(),
  };

  const nats = {
    send: jest.fn(),
  };

  const controller = new ExpedientesController(
    {} as any,
    importacion as any,
    {} as any,
    nats as any,
  );

  const payload = {
    sub: 10,
    workspaceId: 1,
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    perfil: 'compras',
    email: 'test@example.invalid',
    sessionContextId: null,
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

  const body = { solicitudId };

  const result = {
    estado: 'confirmada',
    registrosInsertados: 1,
  };

  function invoke(
    overrides: Record<string, any> = {},
  ) {
    const args = {
      authorization: 'Bearer test',
      requestId: undefined,
      workspace: '1',
      empresa: 'BBTI',
      cliente: '2',
      actor: '10',
      file,
      body,
      ...overrides,
    };

    return controller.importarCsv(
      args.authorization,
      args.requestId,
      args.workspace,
      args.empresa,
      args.cliente,
      args.actor,
      args.file,
      args.body,
    );
  }

  beforeEach(() => {
    jest.resetAllMocks();

    nats.send.mockReturnValue(
      of({ valid: true, payload }),
    );

    importacion.importar.mockResolvedValue(result);
  });

  it.each([
    'admin',
    'compras',
    'contabilidad',
  ])('autoriza perfil %s', async perfil => {
    nats.send.mockReturnValue(
      of({
        valid: true,
        payload: { ...payload, perfil },
      }),
    );

    await expect(invoke()).resolves.toEqual(result);

    expect(importacion.importar).toHaveBeenCalledWith({
      solicitudId,
      nombreOriginal: file.originalname,
      contenido: buffer,
      contexto: {
        workspaceId: 1,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        usuarioId: 10,
        usuarioEmail: payload.email,
        perfil,
        requestId: null,
        sessionContextId: null,
      },
    });
  });

  it('rechaza solicitud sin token', async () => {
    await expect(
      invoke({ authorization: undefined }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(nats.send).not.toHaveBeenCalled();
    expect(importacion.importar).not.toHaveBeenCalled();
  });

  it('rechaza token invalido', async () => {
    nats.send.mockReturnValue(of({ valid: false }));

    await expect(invoke())
      .rejects.toBeInstanceOf(UnauthorizedException);

    expect(importacion.importar).not.toHaveBeenCalled();
  });

  it('rechaza fallo de autenticacion NATS', async () => {
    nats.send.mockReturnValue(
      throwError(() => new Error('AUTH_UNAVAILABLE')),
    );

    await expect(invoke())
      .rejects.toBeInstanceOf(UnauthorizedException);

    expect(importacion.importar).not.toHaveBeenCalled();
  });

  it.each([
    'almacen',
    'finanzas',
    '',
  ])('rechaza perfil no autorizado: %s', async perfil => {
    nats.send.mockReturnValue(
      of({
        valid: true,
        payload: { ...payload, perfil },
      }),
    );

    await expect(invoke())
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(importacion.importar).not.toHaveBeenCalled();
  });

  it.each([
    ['workspace', '99'],
    ['empresa', 'BBTEC'],
    ['cliente', '1'],
    ['actor', '99'],
  ])('rechaza cabecera manipulada: %s', async (key, value) => {
    await expect(invoke({ [key]: value }))
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(importacion.importar).not.toHaveBeenCalled();
  });

  it('rechaza empresa enviada en el formulario', async () => {
    await expect(invoke({
      body: {
        solicitudId,
        empresaCodigo: 'BBTEC',
      },
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(importacion.importar).not.toHaveBeenCalled();
  });

  it('rechaza solicitud sin archivo', async () => {
    await expect(
      invoke({ file: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(importacion.importar).not.toHaveBeenCalled();
  });

  it('rechaza contexto incompleto del token', async () => {
    nats.send.mockReturnValue(
      of({
        valid: true,
        payload: { ...payload, workspaceId: undefined },
      }),
    );

    await expect(invoke())
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(importacion.importar).not.toHaveBeenCalled();
  });

  describe('Regresion HTTP multipart CSV', () => {
    let app: INestApplication;

    const endpoint =
      '/api/v1/expedientes/mantenimiento/importar-csv';

    beforeAll(async () => {
      const controllerType = ExpedientesController;

      const dependencies = [
        {}, importacion, {}, nats
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

        .set('x-workspace-id', '1')
        .set('x-empresa-codigo', 'BBTI')
        .set('x-cliente-destino-id', '2')
        .set('x-actor-id', '10');
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
      expect(importacion.importar).toHaveBeenCalledTimes(1);
    });

    it('acepta solicitudId antes del archivo', async () => {
      const req = postCsv()
        .field('solicitudId', solicitudId);

      await attachCsv(req).expect(201);

      expect(importacion.importar).toHaveBeenCalledTimes(1);
    });

    it('rechaza dos archivos', async () => {
      await attachCsv(
        attachCsv(postCsv()),
      )
        .field('solicitudId', solicitudId)
        .expect(400);

      expect(importacion.importar).not.toHaveBeenCalled();
    });

    it('rechaza un campo adicional', async () => {
      await attachCsv(postCsv())
        .field('solicitudId', solicitudId)
        .field('empresaCodigo', 'BBTEC')
        .expect(400);

      expect(importacion.importar).not.toHaveBeenCalled();
    });

    it('rechaza solicitud sin archivo', async () => {
      await postCsv()
        .field('solicitudId', solicitudId)
        .expect(400);

      expect(importacion.importar).not.toHaveBeenCalled();
    });

    it('rechaza solicitud sin solicitudId', async () => {
      await attachCsv(postCsv())
        .expect(400);

      expect(importacion.importar).not.toHaveBeenCalled();
    });
  });

});
