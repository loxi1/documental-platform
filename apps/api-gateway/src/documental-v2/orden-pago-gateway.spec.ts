jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate-token' }, REQUEST_ID_HEADER: 'x-request-id' }));
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));
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
