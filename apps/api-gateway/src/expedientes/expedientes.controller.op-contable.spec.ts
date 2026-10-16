jest.mock('@documental/shared', () => ({
  NatsSubjects: { AuthValidateToken: 'auth.validate-token' },
  REQUEST_ID_HEADER: 'x-request-id',
}));
jest.mock('axios', () => ({ __esModule: true, default: {
  request: jest.fn(), isAxiosError: jest.fn(),
} }));
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import axios from 'axios';
import request from 'supertest';
import { of, throwError } from 'rxjs';
import { NATS_CLIENT } from '../nats/nats-client.provider';
import { ExpedientesGatewayController } from './expedientes.controller';

const endpoint = '/api/v1/expedientes/revision-contable/orden-pago/151';
const scope = { sub: 6, workspaceId: 13, empresa: 'BBTI', clienteDestinoId: 2 };
const detail = { ordenPagoId: 151, documentosRelacionados: [], estadoRegularizacion: 'REGULARIZADO' };
const nats = { send: jest.fn() };
async function application(controller: any) {
  const module = await Test.createTestingModule({
    controllers: [controller], providers: [
      { provide: ConfigService, useValue: { get: () => 'http://downstream.invalid/api/v1' } },
      { provide: NATS_CLIENT, useValue: nats },
    ],
  }).compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  return app;
}
describe('Revisión contable OP: contrato HTTP gateway aislado', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await application(ExpedientesGatewayController); });
  afterAll(async () => { await app.close(); });
  beforeEach(() => {
    jest.resetAllMocks();
    nats.send.mockReturnValue(of({ valid: true, payload: scope }));
    (axios.request as jest.Mock).mockResolvedValue({ data: detail });
    (axios.isAxiosError as unknown as jest.Mock).mockImplementation(e => e?.isAxiosError === true);
  });
  it('token válido devuelve detalle y deriva identidad exclusivamente del token validado', async () => {
    const res = await request(app.getHttpServer()).get(endpoint)
      .query({ empresa: 'INTRUSO', clienteDestinoId: 999, usuarioId: 999 })
      .set('Authorization', 'Bearer valid').set('x-request-id', 'req-op')
      .set('x-user-id', '999').set('x-workspace-id', '999')
      .set('x-empresa-codigo', 'INTRUSO').set('x-cliente-destino-id', '999').expect(200);
    expect(res.body).toEqual(detail);
    expect(nats.send).toHaveBeenCalledWith('auth.validate-token', { token: 'valid' });
    expect(axios.request).toHaveBeenCalledTimes(1);
    expect(axios.request).toHaveBeenCalledWith({
      method: 'GET', url: 'http://downstream.invalid/api/v1/expedientes/revision-contable/orden-pago/151',
      headers: { authorization: 'Bearer valid', 'x-request-id': 'req-op',
        'x-user-id': '6', 'x-workspace-id': '13', 'x-empresa-codigo': 'BBTI', 'x-cliente-destino-id': '2' },
      params: undefined, data: undefined,
    });
  });
  it.each([undefined, 'Basic invalid'])('rechaza autorización ausente/no Bearer: %s', async auth => {
    const req = request(app.getHttpServer()).get(endpoint);
    if (auth) req.set('Authorization', auth);
    await req.expect(401);
    expect(nats.send).not.toHaveBeenCalled(); expect(axios.request).not.toHaveBeenCalled();
  });
  it('token inválido no alcanza downstream', async () => {
    nats.send.mockReturnValue(of({ valid: false }));
    await request(app.getHttpServer()).get(endpoint).set('Authorization', 'Bearer invalid').expect(401);
    expect(axios.request).not.toHaveBeenCalled();
  });
  it('error de validación no alcanza downstream', async () => {
    nats.send.mockReturnValue(throwError(() => new Error('auth unavailable')));
    await request(app.getHttpServer()).get(endpoint).set('Authorization', 'Bearer valid').expect(401);
    expect(axios.request).not.toHaveBeenCalled();
  });
  it.each([
    ['sin payload', undefined], ['sin usuario', { ...scope, sub: undefined }],
    ['usuario fraccionario', { ...scope, sub: 1.5 }],
    ['sin empresa', { ...scope, empresa: undefined }], ['empresa vacía', { ...scope, empresa: ' ' }],
    ['cliente cero', { ...scope, clienteDestinoId: 0 }], ['cliente inválido', { ...scope, clienteDestinoId: 'invalid' }],
    ['cliente fraccionario', { ...scope, clienteDestinoId: 1.5 }],
  ])('identidad incompleta/inválida (%s) se rechaza antes del proxy', async (_, payload) => {
    nats.send.mockReturnValue(of({ valid: true, payload }));
    await request(app.getHttpServer()).get(endpoint).set('Authorization', 'Bearer valid').expect(403);
    expect(axios.request).not.toHaveBeenCalled();
  });
  it.each([
    [{ ...scope, empresa: 'OTRA' }, 'OTRA', '2'],
    [{ ...scope, clienteDestinoId: 3 }, 'BBTI', '3'],
    [{ usuarioId: 6, workspaceId: 13, empresaCodigo: ' bbti ', clienteDestinoId: 2 }, 'BBTI', '2'],
  ])('preserva empresa/cliente y aliases del token: %j', async (payload, empresa, cliente) => {
    nats.send.mockReturnValue(of({ valid: true, payload }));
    await request(app.getHttpServer()).get(endpoint).set('Authorization', 'Bearer valid').expect(200);
    expect((axios.request as jest.Mock).mock.calls[0][0].headers).toMatchObject({
      'x-user-id': '6', 'x-empresa-codigo': empresa, 'x-cliente-destino-id': cliente,
    });
  });
  it.each([undefined, null])('lectura contable acepta workspace %s sin inventar header', async workspaceId => {
    nats.send.mockReturnValue(of({ valid: true, payload: { ...scope, workspaceId } }));
    await request(app.getHttpServer()).get(endpoint).set('Authorization', 'Bearer valid')
      .set('x-workspace-id', '999').expect(200);
    const headers = (axios.request as jest.Mock).mock.calls[0][0].headers;
    expect(headers).not.toHaveProperty('x-workspace-id');
    expect(headers).toMatchObject({ 'x-user-id': '6', 'x-empresa-codigo': 'BBTI', 'x-cliente-destino-id': '2' });
  });
  it.each([null, undefined])('cliente %s permanece nulo sin sustitución por headers externos', async cliente => {
    nats.send.mockReturnValue(of({ valid: true, payload: { ...scope, clienteDestinoId: cliente } }));
    await request(app.getHttpServer()).get(endpoint).set('Authorization', 'Bearer valid')
      .set('x-cliente-destino-id', '999').expect(200);
    expect((axios.request as jest.Mock).mock.calls[0][0].headers).not.toHaveProperty('x-cliente-destino-id');
  });
  it.each([403, 404])('conserva rechazo downstream %s sin sustituir scope', async status => {
    const data = { message: status === 404 ? 'Orden de Pago no disponible' : 'Contexto autenticado requerido' };
    (axios.request as jest.Mock).mockRejectedValue({ isAxiosError: true, response: { status, data } });
    const res = await request(app.getHttpServer()).get(endpoint).set('Authorization', 'Bearer valid').expect(status);
    expect(res.body).toEqual(data); expect(axios.request).toHaveBeenCalledTimes(1);
  });
});
