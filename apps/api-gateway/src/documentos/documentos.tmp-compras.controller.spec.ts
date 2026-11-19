jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate-token' }, REQUEST_ID_HEADER: 'x-request-id' }), { virtual: true });
import { DocumentosGatewayController } from './documentos.controller';
describe('Gateway Factura TEMP contextual',()=>{
 let c:any;
 beforeEach(()=>{
  c=Object.create(DocumentosGatewayController.prototype);
  c.validateAuthorization=jest.fn(async()=>({permisos:{menus:['compras']}}));c.assertAnyActionPermitida=jest.fn();
  c.assertExpedientePermitido=jest.fn(async()=>undefined);c.assertDocumentoPermitido=jest.fn(async()=>undefined);
  c.tmpHeaders=jest.fn(async()=>({'x-actor-id':'7'}));c.tmpRequest=jest.fn(async()=>({}));
 });
 it('listado exige acceso al expediente y principal, sin enviar actor del cargador',async()=>{
  await c.listarFacturasTmp('Bearer fixture','req','118','10');
  expect(c.assertExpedientePermitido).toHaveBeenCalledWith(118,{permisos:{menus:['compras']}},'req');expect(c.assertDocumentoPermitido).toHaveBeenCalledWith('10',{permisos:{menus:['compras']}},'req');
  expect(c.tmpRequest).toHaveBeenCalledWith('GET','/documentos/tmp/compras-facturas/118/10',{'x-actor-id':'7'});
 });
 it.each(['recuperarFacturaTmp','previewFacturaTmp','confirmarFacturaTmp'])('%s exige mismo contexto antes de proxy',async method=>{
  c.assertDocumentoPermitido.mockRejectedValueOnce(Error('denied'));
  await expect(c[method]('Bearer fixture','req','118','10','50',{confirmacionDocumental:{}})).rejects.toThrow('denied');expect(c.tmpRequest).not.toHaveBeenCalled();
 });
 it('confirmación conserva actor autenticado y exige permisos adicionales',async()=>{
  await c.confirmarFacturaTmp('Bearer fixture','req','118','10','50',{confirmacionDocumental:{expedienteId:118}});
  expect(c.assertAnyActionPermitida).toHaveBeenCalledWith({permisos:{menus:['compras']}},['documentos.confirmar_ocr','ocr.confirmar'],'confirmar factura TEMP');
  expect(c.tmpHeaders).toHaveBeenCalledWith('Bearer fixture','req');
 });
 it('no interpola rutas ni contextos arbitrarios',async()=>{
  await expect(c.listarFacturasTmp('x','r','../118','10')).rejects.toThrow();expect(c.tmpRequest).not.toHaveBeenCalled();
 });
 it('reserva reenvía solo contexto validado junto al PDF',async()=>{
  const file={fieldname:'archivo',originalname:'factura.pdf',mimetype:'application/pdf',size:9,buffer:Buffer.from('%PDF-1.4')};
  await c.reservarTmp('x','req','key',[file],{comprasFactura:JSON.stringify({expedienteId:118,documentoBaseId:10})});
  expect(c.assertExpedientePermitido).toHaveBeenCalledTimes(1);expect(c.tmpRequest.mock.calls[0][1]).toBe('/documentos/tmp');
 });
});
