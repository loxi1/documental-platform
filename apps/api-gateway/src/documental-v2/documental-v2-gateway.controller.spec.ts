jest.mock('@documental/shared', () => ({
  NatsSubjects: { AuthValidateToken: 'auth.validate-token' },
  REQUEST_ID_HEADER: 'x-request-id',
}));

jest.mock('axios', () => {
  const request = {
    get: jest.fn(),
    isAxiosError: jest.fn((error: any) => Boolean(error?.isAxiosError)),
  };
  return {
    __esModule: true,
    default: request,
    ...request,
  };
});

import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { of } from 'rxjs';

import { DocumentalV2GatewayController } from './documental-v2-gateway.controller';

describe('DocumentalV2GatewayController', () => {
  const workspace = {
    contenedorOperativo: {
      vista: {
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
      },
    },
    resumen: {
      documentosOperativosPrincipales: 1,
      gruposFactura: 1,
      adjuntosNoClasificados: 0,
      advertencias: 0,
    },
  };

  const buildController = (payload: Record<string, unknown> = {}) => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'MS_DOCUMENTOS_URL' ? 'http://ms-documentos:3002/api/v1' : undefined,
      ),
    } as unknown as ConfigService;

    const nats = {
      send: jest.fn(() =>
        of({
          valid: true,
          payload: {
            empresa: 'BBTI',
            clienteDestinoId: 2,
            ...payload,
          },
        }),
      ),
    };

    return {
      controller: new DocumentalV2GatewayController(config, nats as any),
      nats,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: workspace,
      },
    });
  });

  it('expone el workspace documental V2 desde expediente V1 por proxy controlado', async () => {
    const { controller, nats } = buildController();

    const result = await controller.construirWorkspaceDesdeExpedienteV1(
      'Bearer token-valido',
      'req-1',
      '41',
    );

    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', {
      token: 'token-valido',
    });
    expect(axios.get).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/workspace/expedientes-v1/41',
      {
        headers: {
          authorization: 'Bearer token-valido',
          'x-request-id': 'req-1',
        },
      },
    );
    expect(result).toEqual(workspace);
  });

  it('rechaza requests sin token bearer', async () => {
    const { controller } = buildController();

    await expect(
      controller.construirWorkspaceDesdeExpedienteV1(undefined, 'req-1', '41'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza workspace de otra empresa', async () => {
    const { controller } = buildController({ empresa: 'CIMA' });

    await expect(
      controller.construirWorkspaceDesdeExpedienteV1('Bearer token-valido', 'req-1', '41'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza workspace de otro cliente destino', async () => {
    const { controller } = buildController({ clienteDestinoId: 99 });

    await expect(
      controller.construirWorkspaceDesdeExpedienteV1('Bearer token-valido', 'req-1', '41'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
