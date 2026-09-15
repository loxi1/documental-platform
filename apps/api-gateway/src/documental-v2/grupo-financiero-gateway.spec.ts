jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate-token' }, REQUEST_ID_HEADER: 'x-request-id' }));
jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
import axios from 'axios';
import { of } from 'rxjs';
import { DocumentalV2GatewayController } from './documental-v2-gateway.controller';

describe('Gateway resumen financiero READ', () => {
  function controller(menus = ['finanzas']) {
    return new DocumentalV2GatewayController({ get: () => 'http://ms-documentos:3002/api/v1' } as any,
      { send: jest.fn(() => of({ valid: true, payload: { sub: 5, workspaceId: 7, empresa: 'LAB', clienteDestinoId: 2,
        permisos: { menus, actions: [] } } })) } as any);
  }
  beforeEach(() => jest.clearAllMocks());
  it('ruta GET y permiso lectura; identidad solo token sin query/body', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: { data: { grupoFacturaId: 116 } } });
    const read = controller();
    expect(Reflect.getMetadata('path', read.obtenerResumenFinancieroGrupo)).toBe('finanzas/grupos-factura/:grupoFacturaId/resumen');
    const result = await (read.obtenerResumenFinancieroGrupo as any)('Bearer token', 'req', '116', { actor: 999, empresa: 'OTRA' });
    expect(result).toEqual({ grupoFacturaId: 116 });
    expect(axios.get).toHaveBeenCalledWith('http://ms-documentos:3002/api/v1/documental-v2/finanzas/grupos-factura/116/resumen', {
      headers: expect.objectContaining({ 'x-user-id': '5', 'x-workspace-id': '7', 'x-empresa-codigo': 'LAB', 'x-cliente-destino-id': '2' }),
    });
  });
  it('sin Finanzas no reenvía', async () => {
    await expect(controller(['compras']).obtenerResumenFinancieroGrupo('Bearer token', 'req', '116')).rejects.toThrow('Sin permiso');
    expect(axios.get).not.toHaveBeenCalled();
  });
  it('sin token no reenvía', async () => {
    await expect(controller().obtenerResumenFinancieroGrupo(undefined, 'req', '116')).rejects.toThrow('Token requerido');
    expect(axios.get).not.toHaveBeenCalled();
  });
});
