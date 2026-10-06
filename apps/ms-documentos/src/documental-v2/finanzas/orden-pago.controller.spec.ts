jest.mock('@documental/database', () => ({ sql: jest.fn() }));
import { OrdenPagoController } from './orden-pago.controller';

describe('OrdenPagoController - confirmarPago contrato HTTP', () => {
  const confirmarPago = jest.fn();

  const crearController = () =>
    new OrdenPagoController(
      { confirmarPago } as any,
      {} as any,
      {} as any,
    );

  const headers = {
    'x-user-id': '7',
    'x-workspace-id': '3',
    'x-empresa-codigo': 'bbti',
    'x-cliente-destino-id': '2',
    'x-user-email': 'usuario@bbti.test',
    'x-request-id': 'req-r7-b3',
    'x-correlation-id': 'corr-r7-b3',
    'x-session-context-id': 'session-r7-b3',
    'x-sistema-codigo': 'DOCUMENTAL',
    'x-perfil-codigo': 'FINANZAS',
  };

  beforeEach(() => {
    confirmarPago.mockReset();
  });

  it('usa ordenPagoId del param y delega payload + actor autenticado al service', async () => {
    const controller = crearController();

    const body = {
      ocrResultadoId: 94,
      metadata: { banco: 'BCP' },
      observacion: 'Pago OP',
      decisionCorrespondencia: {
        accion: 'ACEPTAR',
        motivo: 'Validado',
      },
    };

    confirmarPago.mockResolvedValue({
      documentoId: 900,
      archivoId: 901,
    });

    const resultado = await controller.confirmarPago(
      headers,
      '153',
      body,
    );

    expect(confirmarPago).toHaveBeenCalledTimes(1);
    expect(confirmarPago).toHaveBeenCalledWith(
      153,
      body,
      {
        id: 7,
        workspaceId: 3,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        email: 'usuario@bbti.test',
        requestId: 'req-r7-b3',
        correlationId: 'corr-r7-b3',
        sessionContextId: 'session-r7-b3',
        sistemaCodigo: 'DOCUMENTAL',
        perfilCodigo: 'FINANZAS',
      },
    );

    expect(resultado).toEqual({
      documentoId: 900,
      archivoId: 901,
    });
  });

  it('no convierte IDs estructurales del body en argumentos de autoridad del controller', async () => {
    const controller = crearController();

    const body = {
      ocrResultadoId: 94,
      expedienteId: 999,
      documentoBaseId: 998,
      grupoFacturaId: 997,
      clienteAbreviatura: 'OTRA',
    };

    confirmarPago.mockResolvedValue({ ok: true });

    await controller.confirmarPago(
      headers,
      '153',
      body,
    );

    expect(confirmarPago).toHaveBeenCalledTimes(1);

    const [ordenPagoId, payload, actor] =
      confirmarPago.mock.calls[0];

    expect(ordenPagoId).toBe(153);
    expect(payload).toBe(body);

    expect(actor).toMatchObject({
      id: 7,
      workspaceId: 3,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
    });

    expect(confirmarPago.mock.calls[0]).toHaveLength(3);
  });
});
