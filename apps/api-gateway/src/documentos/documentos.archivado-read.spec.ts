jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'},REQUEST_ID_HEADER:'x-request-id'}));
import { DocumentosGatewayController } from './documentos.controller';
describe('Gateway archivado: lectura transversal sin privilegios OCR',()=>{
 it('resumen conserva validacion JWT y contexto sin exigir confirmar',async()=>{
  const c:any=Object.create(DocumentosGatewayController.prototype),actor={empresa:'BBTI',clienteDestinoId:2};
  c.validateAuthorization=jest.fn().mockResolvedValue(actor);
  c.assertSecureUploadExpedienteScope=jest.fn().mockResolvedValue({});
  c.assertAnyActionPermitida=jest.fn(()=>{throw new Error('no OCR permission')});
  c.proxy=jest.fn().mockResolvedValue({estados:[]});
  await c.resumenArchivado('121','Bearer synthetic','req');
  expect(c.validateAuthorization).toHaveBeenCalledWith('Bearer synthetic');
  expect(c.assertSecureUploadExpedienteScope).toHaveBeenCalledWith(121,actor,'req');
  expect(c.assertAnyActionPermitida).not.toHaveBeenCalled();
 });
 it('contexto ajeno impide proxy',async()=>{
  const c:any=Object.create(DocumentosGatewayController.prototype);
  c.validateAuthorization=jest.fn().mockResolvedValue({});
  c.assertSecureUploadExpedienteScope=jest.fn().mockRejectedValue(new Error('forbidden'));
  c.proxy=jest.fn();await expect(c.resumenArchivado('121','Bearer synthetic')).rejects.toThrow('forbidden');
  expect(c.proxy).not.toHaveBeenCalled();
 });
 it('carga guiada propaga identidad del JWT, no los campos manipulables del formulario',async()=>{
  const c:any=Object.create(DocumentosGatewayController.prototype);
  c.validateAuthorization=jest.fn().mockResolvedValue({});c.assertAnyActionPermitida=jest.fn();
  c.assertExpedientePermitido=jest.fn().mockResolvedValue({});
  c.assertSecureUploadContext=()=>({workspaceId:7,empresaCodigo:'BBTI',clienteDestinoId:2,actorId:'4'});
  c.getEmpresaFromContext=()=> 'BBTI';c.getBaseUrl=()=> 'http://unused.test';c.buildForwardHeaders=()=>({});c.unwrap=(v:any)=>v.data;
  const request=jest.spyOn(require('axios').default,'request').mockResolvedValue({data:{ok:true}});
  try{
   await c.cargaGuiada('Bearer synthetic','req',{file:[{buffer:Buffer.from('pdf'),originalname:'scan.pdf',mimetype:'application/pdf',size:3}]},
    {expedienteId:900,workspaceId:999,actorId:999});
   expect((request.mock.calls[0][0] as any).headers).toMatchObject({'x-workspace-id':'7','x-empresa-codigo':'BBTI','x-cliente-destino-id':'2','x-actor-id':'4'});
  }finally{request.mockRestore()}
 });

});
