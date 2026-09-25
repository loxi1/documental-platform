jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

jest.mock('@documental/shared', () => ({
  NatsSubjects: {},
}));

import { OrdenPagoCreacionController } from './orden-pago-creacion.controller';

describe('R23 controller reemplazo archivo inicial OP', () => {
  it('delega ordenPagoId, body, idempotency-key y actor exclusivamente desde headers', async () => {
    const op: any = {
      reemplazarArchivoInicial: jest.fn(async () => ({
        ordenPagoId: 151,
        documentoId: 210,
        grupoFacturaId: 114,
        archivoInicial: { archivoId: 550 },
      })),
    };

    const controller = new OrdenPagoCreacionController(op);

    const body = { tempId: 50 };

    await expect(
      controller.reemplazarArchivoInicial(
        {
          'idempotency-key': 'KEY-R23',
          'x-user-id': '6',
          'x-workspace-id': '12',
          'x-empresa-codigo': 'bbti',
          'x-cliente-destino-id': '2',
          'x-user-email': 'usuario@bbti.test',
          'x-request-id': 'req-r23',
          'x-correlation-id': 'corr-r23',
          'x-session-context-id': 'session-r23',
          'x-sistema-codigo': 'DOCUMENTAL',
          'x-perfil-codigo': 'FINANZAS',
        },
        '151',
        body,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        ordenPagoId: 151,
        documentoId: 210,
        grupoFacturaId: 114,
      }),
    );

    expect(op.reemplazarArchivoInicial).toHaveBeenCalledWith(
      151,
      body,
      'KEY-R23',
      expect.objectContaining({
        id: 6,
        workspaceId: 12,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        email: 'usuario@bbti.test',
        requestId: 'req-r23',
        correlationId: 'corr-r23',
        sessionContextId: 'session-r23',
        sistemaCodigo: 'DOCUMENTAL',
        perfilCodigo: 'FINANZAS',
      }),
    );
  });
});
