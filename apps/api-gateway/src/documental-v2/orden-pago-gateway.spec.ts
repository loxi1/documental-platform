jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate-token' }, REQUEST_ID_HEADER: 'x-request-id' }));
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn(), patch: jest.fn() } }));
import axios from 'axios';
import { of } from 'rxjs';
import { DocumentalV2GatewayController } from './documental-v2-gateway.controller';

describe('Gateway OP identidad autenticada', () => {
  const context = { sub: 5, workspaceId: 7, empresa: 'LAB', clienteDestinoId: 2,
    permisos: { menus: ['finanzas'], actions: ['documentos.subir'] } };
  function controller(payload = context) {
    return new DocumentalV2GatewayController({ get: () => 'http://ms-documentos:3002/api/v1' } as any,
      { send: jest.fn(() => of({ valid: true, payload })) } as any);
  }
  beforeEach(() => jest.clearAllMocks());
  it('detalle permite Finanzas lectura sin documentos.subir y reenvía scope del token', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: { data: { ordenPagoId: 151, archivoInicial: null } } });
    const read = controller({ ...context, permisos: { menus: ['finanzas'], actions: [] } });
    // Argumentos extra simulando body/query maliciosos no forman parte del handler.
    const result = await (read.obtenerOrdenPago as any)('Bearer token', 'req', '151', { actor: 999, empresa: 'OTRA', clienteDestinoId: 999 });
    expect(result).toEqual({ ordenPagoId: 151, archivoInicial: null });
    expect(axios.get).toHaveBeenCalledWith('http://ms-documentos:3002/api/v1/documental-v2/finanzas/ordenes-pago/151', {
      headers: expect.objectContaining({ 'x-user-id': '5', 'x-workspace-id': '7', 'x-empresa-codigo': 'LAB', 'x-cliente-destino-id': '2' }),
    });
    expect((axios.get as jest.Mock).mock.calls[0][1].params).toBeUndefined();
    expect((axios.get as jest.Mock).mock.calls[0][1].data).toBeUndefined();
  });
  it('detalle rechaza acceso sin Finanzas', async () => {
    await expect(controller({ ...context, permisos: { menus: ['compras'], actions: ['documentos.subir'] } })
      .obtenerOrdenPago('Bearer token', 'req', '151')).rejects.toThrow('Sin permiso');
    expect(axios.get).not.toHaveBeenCalled();
  });
  it('detalle exige autorización antes del passthrough', async () => {
    await expect(controller().obtenerOrdenPago(undefined, 'req', '151')).rejects.toThrow('Token requerido');
    expect(axios.get).not.toHaveBeenCalled();
  });
  it('R23 reemplazo OP reenvía tempId, clave idempotente y scope autenticado', async () => {
    const body = { tempId: 50 };
    const result = {
      ordenPagoId: 151,
      documentoId: 210,
      grupoFacturaId: 114,
      archivoInicial: {
        archivoId: 550,
        oldArchivoId: 441,
        version: 2,
        esVersionActual: true,
      },
    };

    (axios.post as jest.Mock).mockResolvedValue({
      data: { data: result },
    });

    await expect(
      controller().reemplazarArchivoInicialOrdenPago(
        'Bearer token',
        'req-r23',
        'key-r23',
        '151',
        body,
      ),
    ).resolves.toEqual(result);

    expect(axios.post).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/finanzas/ordenes-pago/151/reemplazar-archivo-inicial',
      body,
      {
        headers: expect.objectContaining({
          'x-user-id': '5',
          'x-workspace-id': '7',
          'x-empresa-codigo': 'LAB',
          'x-cliente-destino-id': '2',
          'idempotency-key': 'key-r23',
        }),
      },
    );
  });

  it('R23 reemplazo OP exige permiso documentos.subir', async () => {
    const c = controller({
      ...context,
      permisos: {
        menus: ['finanzas'],
        actions: [],
      },
    });

    await expect(
      c.reemplazarArchivoInicialOrdenPago(
        'Bearer token',
        'req-r23',
        'key-r23',
        '151',
        { tempId: 50 },
      ),
    ).rejects.toThrow('Sin permiso');

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('R23 PATCH editar OP permite Finanzas sin documentos.subir y reenvía body con scope autenticado', async () => {
    const body = {
      monto: '150.00',
      observacion: 'ajuste autorizado',
    };
    const result = {
      ordenPagoId: 151,
      documentoId: 210,
      grupoFacturaId: 114,
    };

    (axios.patch as jest.Mock).mockResolvedValue({
      data: { data: result },
    });

    const c = controller({
      ...context,
      permisos: {
        menus: ['finanzas'],
        actions: [],
      },
    });

    await expect(
      c.editarOrdenPago(
        'Bearer token',
        'req-edit-r23',
        '151',
        body,
      ),
    ).resolves.toEqual(result);

    expect(axios.patch).toHaveBeenCalledWith(
      'http://ms-documentos:3002/api/v1/documental-v2/finanzas/ordenes-pago/151',
      body,
      {
        headers: expect.objectContaining({
          'x-user-id': '5',
          'x-workspace-id': '7',
          'x-empresa-codigo': 'LAB',
          'x-cliente-destino-id': '2',
        }),
      },
    );
  });

  it('OP-01B reenvía tempId opcional y conserva el resultado de integración', async () => {
    const body = { contenedorOperativoId: 7, fechaEmision: '2026-09-15', monto: '10.00', moneda: 'PEN', tipo: 'SEGUROS', tempId: 50 };
    const result = { ordenPagoId: 10, documentoId: 11, grupoFacturaId: 12, archivoInicial: { tempId: 50, archivoId: 20, estado: 'PROMOTED' } };
    (axios.post as jest.Mock).mockResolvedValue({ data: { data: result } });
    await expect(controller().crearOrdenPago('Bearer token', 'req', 'key', body)).resolves.toEqual(result);
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/finanzas/ordenes-pago'), body, {
      headers: expect.objectContaining({ 'x-user-id': '5', 'x-workspace-id': '7', 'x-empresa-codigo': 'LAB',
        'x-cliente-destino-id': '2', 'idempotency-key': 'key' }),
    });
  });
  it('reenvía identidad del token y clave de reintento, no identidad del body', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { data: { ordenPagoId: 10 } } });
    await controller().crearOrdenPago('Bearer token', 'req', 'key', { actor: 999 });
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/finanzas/ordenes-pago'), { actor: 999 }, {
      headers: expect.objectContaining({ 'x-user-id': '5', 'x-workspace-id': '7', 'idempotency-key': 'key' }),
    });
    // El DTO en ms-documentos rechaza además campos de actor en body.
  });
  it('rechaza creación sin permiso de escritura', async () => {
    await expect(controller({ ...context, permisos: { menus: ['finanzas'], actions: [] } })
      .crearOrdenPago('Bearer token', 'req', 'key', {})).rejects.toThrow('Sin permiso');
    expect(axios.post).not.toHaveBeenCalled();
  });
  it('rechaza creación desde contexto sin Finanzas', async () => {
    await expect(controller({ ...context, permisos: { menus: ['compras'], actions: ['documentos.subir'] } })
      .crearOrdenPago('Bearer token', 'req', 'key', {})).rejects.toThrow('Sin permiso');
  });
  it('busca contextos con scope autenticado e ignora empresa libre', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: { data: { items: [] } } });
    await expect(controller().buscarContextosOrdenPago('Bearer token', 'req',
      { q: '050', limit: '10', empresa: 'OTRA', workspaceId: '999' })).resolves.toEqual({ items: [] });
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/ordenes-pago/contextos'), {
      params: { q: '050', limit: '10' }, headers: expect.objectContaining({ 'x-workspace-id': '7' }),
    });
  });
  it('rechaza búsqueda sin permiso para crear OP', async () => {
    await expect(controller({ ...context, permisos: { menus: ['finanzas'], actions: [] } })
      .buscarContextosOrdenPago('Bearer token', 'req', { q: '050' })).rejects.toThrow('Sin permiso');
    expect(axios.get).not.toHaveBeenCalled();
  });

});
