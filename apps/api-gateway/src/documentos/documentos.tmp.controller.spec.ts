jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate-token' }, REQUEST_ID_HEADER: 'x-request-id' }), { virtual: true });
import { of } from 'rxjs';
import axios from 'axios';
import { DocumentosGatewayController } from './documentos.controller';

describe('Gateway TEMP autenticado', () => {
  const context = { sub: 6, workspaceId: 12, empresa: 'BBTI', clienteDestinoId: 2, sistema: 'DOCUMENTAL', permisos: { actions: ['documentos.subir'] } };
  const controller = (payload: any = context) => new DocumentosGatewayController({ get: () => 'http://lab/api/v1' } as any, { send: () => of({ valid: true, payload }) } as any);
  afterEach(() => jest.restoreAllMocks());
  it('consulta usa actor/contexto del token', async () => {
    const spy = jest.spyOn(axios, 'request').mockResolvedValue({ data: { data: { tempId: 1 } } });
    expect(await controller().consultarTmp('Bearer token', 'req', '1')).toEqual({ tempId: 1 });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ headers: expect.objectContaining({ 'x-actor-id': '6', 'x-workspace-id': '12' }) }));
  });
  it('rechaza sin permiso de carga', async () => {
    const spy = jest.spyOn(axios, 'request');
    await expect(controller({ ...context, permisos: { actions: [] } }).consultarTmp('Bearer token','req','1')).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
  it('no interpola rutas arbitrarias', async () => {
    await expect(controller().consultarTmp('Bearer token','req','../1')).rejects.toThrow('tempId');
  });
  it('reserva rechaza actor del body', async () => {
    await expect(controller().reservarTmp('Bearer token','req','key', [], { actorId: 999 })).rejects.toThrow('únicamente');
  });
});
