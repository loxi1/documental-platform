jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate-token' } }));
jest.mock('@documental/database', () => ({ sql: jest.fn() }));
import { of } from 'rxjs';
import { ExpedientesController } from './expedientes.controller';

const service = { findFacturasPendientes: jest.fn() };
const nats = { send: jest.fn() };
const controller = new ExpedientesController(service as any, nats as any);

describe('Autorización de facturas pendientes', () => {
  beforeEach(() => jest.clearAllMocks());
  it('rechaza acceso sin token antes de consultar', async () => {
    await expect(controller.findFacturasPendientes(1, 2)).rejects.toThrow('Token requerido');
    expect(service.findFacturasPendientes).not.toHaveBeenCalled();
  });
  it('rechaza token inválido', async () => {
    nats.send.mockReturnValue(of({ valid: false }));
    await expect(controller.findFacturasPendientes(1, 2, 'Bearer test')).rejects.toThrow('Token inválido');
    expect(service.findFacturasPendientes).not.toHaveBeenCalled();
  });
  it('rechaza workspace ausente', async () => {
    nats.send.mockReturnValue(of({ valid: true, payload: { empresa: 'TEST', clienteDestinoId: 8 } }));
    await expect(controller.findFacturasPendientes(1, 2, 'Bearer test')).rejects.toThrow('Workspace autenticado incompleto');
    expect(service.findFacturasPendientes).not.toHaveBeenCalled();
  });
  it('consulta únicamente con scope derivado del token validado', async () => {
    nats.send.mockReturnValue(of({ valid: true, payload: { workspaceId: 7, empresa: 'test', clienteDestinoId: 8 } }));
    service.findFacturasPendientes.mockResolvedValue({ data: [] });
    await controller.findFacturasPendientes(1, 2, 'Bearer test');
    expect(service.findFacturasPendientes).toHaveBeenCalledWith(1, 2, {
      workspaceId: 7, empresa: 'TEST', clienteDestinoId: 8,
    });
  });
});
