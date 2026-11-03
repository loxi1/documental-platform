import {DocumentosGatewayController} from './documentos.controller';
describe('Gateway TEMP documental permisos y scope (sin red)',()=>{
 let c:any;
 beforeEach(()=>{c=Object.create(DocumentosGatewayController.prototype);c.tmpHeaders=jest.fn(async()=>({}));c.validateAuthorization=jest.fn(async()=>({}));c.assertAnyActionPermitida=jest.fn();c.assertExpedientePermitido=jest.fn(async()=>undefined);c.assertDocumentoPermitido=jest.fn(async()=>undefined);c.tmpRequest=jest.fn(async()=>({ok:true}));});
 it('exige confirmar y vincular, verifica expediente/principal antes del proxy',async()=>{
  await c.promoverTmp('Bearer fixture','r','fixture-key','50',{confirmacionDocumental:{expedienteId:118,documentoBaseId:10}});
  expect(c.assertAnyActionPermitida).toHaveBeenCalledTimes(2);expect(c.assertExpedientePermitido).toHaveBeenCalledWith(118,{},'r');expect(c.assertDocumentoPermitido).toHaveBeenCalledWith('10',{},'r');expect(c.tmpRequest).toHaveBeenCalledTimes(1);
 });
 it('permiso denegado impide proxy',async()=>{c.assertAnyActionPermitida.mockImplementation(()=>{throw Error('denied');});await expect(c.promoverTmp('x','r','k','50',{confirmacionDocumental:{expedienteId:118}})).rejects.toThrow('denied');expect(c.tmpRequest).not.toHaveBeenCalled();});
 it('borrador requiere mismo scope',async()=>{await c.promoverTmp('x','r','k','50',{borradorDocumental:{expedienteId:118}});expect(c.assertExpedientePermitido).toHaveBeenCalledTimes(1);});
 it('promoción genérica conserva contrato',async()=>{await c.promoverTmp('x','r','k','50',{destinoStorageKey:'documentos/2026/01/BBTI/50__a.pdf'});expect(c.assertExpedientePermitido).not.toHaveBeenCalled();expect(c.tmpRequest).toHaveBeenCalledTimes(1);});
});
