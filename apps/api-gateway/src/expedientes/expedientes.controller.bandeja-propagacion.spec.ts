jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate-token' }, REQUEST_ID_HEADER: 'x-request-id' }));
jest.mock('axios', () => ({ __esModule: true, default: { request: jest.fn(), isAxiosError: jest.fn() } }));
import axios from 'axios';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { of } from 'rxjs';
import request from 'supertest';
import { ExpedientesGatewayController } from './expedientes.controller';
import { NATS_CLIENT } from '../nats/nats-client.provider';
const endpoint='/api/v1/expedientes/bandeja-contable';
const scope={sub:4,workspaceId:8,empresa:'BBTI',clienteDestinoId:1,perfil:'contabilidad'};
const nats={send:jest.fn()};
describe('Bandeja contable: recuperación ancestral de contexto',()=>{
 let app:INestApplication;
 beforeAll(async()=>{const module=await Test.createTestingModule({controllers:[ExpedientesGatewayController],providers:[{provide:ConfigService,useValue:{get:()=> 'http://downstream.invalid/api/v1'}},{provide:NATS_CLIENT,useValue:nats}]}).compile();app=module.createNestApplication();app.setGlobalPrefix('api/v1');await app.init();});
 afterAll(async()=>{await app.close();});
 beforeEach(()=>{jest.resetAllMocks();nats.send.mockReturnValue(of({valid:true,payload:scope}));(axios.request as jest.Mock).mockResolvedValue({data:{success:true,data:[{origen:'ORDEN_PAGO',ordenPagoId:157}]}});});
 it('JWT validado gobierna headers aunque el navegador intente otro scope',async()=>{
  const res=await request(app.getHttpServer()).get(endpoint).query({empresa:'BBTI',anio:'2026',mes:'1',workspaceId:'999',clienteDestinoId:'999'})
   .set('Authorization','Bearer unit-token').set('x-request-id','req-context')
   .set('x-workspace-id','999').set('x-cliente-destino-id','999').set('x-empresa-codigo','OTRA').expect(200);
  expect(nats.send).toHaveBeenCalledWith('auth.validate-token',{token:'unit-token'});
  expect((axios.request as jest.Mock).mock.calls[0][0]).toMatchObject({method:'GET',url:'http://downstream.invalid/api/v1/expedientes/bandeja-contable',headers:{authorization:'Bearer unit-token','x-request-id':'req-context','x-workspace-id':'8','x-cliente-destino-id':'1','x-empresa-codigo':'BBTI'}});
  expect(res.body).toEqual({success:true,data:[{origen:'ORDEN_PAGO',ordenPagoId:157}]});
 });
 it('empresa arbitraria en query se rechaza antes del downstream',async()=>{
  await request(app.getHttpServer()).get(endpoint).query({empresa:'OTRA'}).set('Authorization','Bearer unit-token').expect(403);expect(axios.request).not.toHaveBeenCalled();
 });
 it.each([undefined,'Basic invalid'])('sin Bearer válido (%s) no propaga contexto',async auth=>{
  const req=request(app.getHttpServer()).get(endpoint);if(auth)req.set('Authorization',auth);await req.expect(401);expect(nats.send).not.toHaveBeenCalled();expect(axios.request).not.toHaveBeenCalled();
 });
 it('token rechazado no alcanza ms-documentos',async()=>{nats.send.mockReturnValue(of({valid:false}));await request(app.getHttpServer()).get(endpoint).set('Authorization','Bearer rejected-unit-token').expect(401);expect(axios.request).not.toHaveBeenCalled();});
 it('contexto sin empresa se rechaza',async()=>{nats.send.mockReturnValue(of({valid:true,payload:{...scope,empresa:undefined}}));await request(app.getHttpServer()).get(endpoint).set('Authorization','Bearer unit-token').expect(403);expect(axios.request).not.toHaveBeenCalled();});
 it.each([null,undefined])('cliente %s no se sustituye por cliente del navegador',async cliente=>{
  nats.send.mockReturnValue(of({valid:true,payload:{...scope,clienteDestinoId:cliente}}));await request(app.getHttpServer()).get(endpoint).query({clienteDestinoId:'999'}).set('Authorization','Bearer unit-token').set('x-cliente-destino-id','999').expect(200);
  const headers=(axios.request as jest.Mock).mock.calls[0][0].headers;expect(headers).not.toHaveProperty('x-cliente-destino-id');expect(headers['x-workspace-id']).toBe('8');
 });
 it.each([{...scope,clienteDestinoId:2},{...scope,empresa:'BBTEC'},{...scope,workspaceId:99}])('scope del token se conserva sin comparar workspace de origen: %j',async payload=>{
  nats.send.mockReturnValue(of({valid:true,payload}));await request(app.getHttpServer()).get(endpoint).set('Authorization','Bearer unit-token').expect(200);
  const call=(axios.request as jest.Mock).mock.calls[0][0];expect(call.headers['x-cliente-destino-id']).toBe(String(payload.clienteDestinoId));expect(call.headers['x-empresa-codigo']).toBe(payload.empresa);expect(call.headers['x-workspace-id']).toBe(String(payload.workspaceId));expect(call.params).toEqual({empresa:payload.empresa});
 });
 it('la ruta OP recuperada no se ejecuta al verificar bandeja',()=>{expect('getOrdenPagoRevisionContable' in app.get(ExpedientesGatewayController)).toBe(true);expect(axios.request).not.toHaveBeenCalled();});
});
