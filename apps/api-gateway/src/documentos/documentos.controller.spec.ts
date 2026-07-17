jest.mock('@documental/shared', () => ({
  NatsSubjects: { AuthValidateToken: 'auth.validate-token' },
  REQUEST_ID_HEADER: 'x-request-id',
}));

import { of } from 'rxjs';
import { DocumentosGatewayController } from './documentos.controller';

describe('DocumentosGatewayController - auditoría OCR', () => {
  it('propaga identidad y correlación al confirmar OCR con expediente', async () => {
    const contexto = {
      sub: 1,
      email: 'admin@documental.local',
      workspaceId: 1,
      empresa: 'BBTI',
      clienteDestinoId: 2,
      permisos: {
        actions: [
          'documentos.confirmar_ocr',
          'documentos.vincular_expediente',
        ],
      },
    };

    const config = {
      get: jest.fn().mockReturnValue('http://ms-documentos:3002/api/v1'),
    } as any;

    const nats = {
      send: jest.fn().mockReturnValue(of({ valid: true, payload: contexto })),
    } as any;

    const controller = new DocumentosGatewayController(config, nats);
    const internal = controller as any;

    jest.spyOn(internal, 'assertOcrPermitido').mockResolvedValue(undefined);
    jest.spyOn(internal, 'assertExpedientePermitido').mockResolvedValue(undefined);
    const proxy = jest.spyOn(internal, 'proxy').mockResolvedValue({ ok: true });

    const body = { expedienteId: 117 };
    const requestId = '98888888-8888-4888-8888-888888888881';

    await controller.confirmarOcrResultadoConExpediente(
      'Bearer token-valido',
      requestId,
      '2',
      body,
    );

    expect(proxy).toHaveBeenCalledWith({
      method: 'POST',
      path: '/documentos/ocr-resultados/2/confirmar-con-expediente',
      authorization: 'Bearer token-valido',
      requestId,
      body,
      headers: {
        authorization: 'Bearer token-valido',
        'x-request-id': requestId,
        'x-user-id': '1',
        'x-user-email': 'admin@documental.local',
        'x-workspace-id': '1',
        'x-empresa-codigo': 'BBTI',
        'x-cliente-destino-id': '2',
        'x-correlation-id': requestId,
      },
    });
  });
});
