jest.mock('axios',()=>({__esModule:true,default:{get:jest.fn()}}));
jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'},REQUEST_ID_HEADER:'x-request-id'}));
import axios from 'axios';
import { DocumentosGatewayController } from './documentos.controller';
describe('Visor NAS conserva MIME institucional sin convertir imágenes en PDF',()=>{
 it.each([['application/pdf','pdf'],['image/png','png'],['image/jpeg','jpg']])('%s fluye por el mismo endpoint',async(mime,ext)=>{
  const c:any=Object.create(DocumentosGatewayController.prototype);c.getBaseUrl=()=> 'http://documentos.invalid';
  const data=Buffer.from('synthetic');(axios.get as jest.Mock).mockResolvedValue({data,headers:{'content-type':mime}});
  const res:any={getHeader:jest.fn(),setHeader:jest.fn(),removeHeader:jest.fn(),set:jest.fn().mockReturnThis(),send:jest.fn()};
  await c.previewArchivado('800','synthetic',res);
  expect(res.set).toHaveBeenCalledWith(expect.objectContaining({'Content-Type':mime,'Content-Disposition':`inline; filename="documento.${ext}"`,'X-Content-Type-Options':'nosniff'}));
  expect(res.send).toHaveBeenCalledWith(data);
 });
 it('MIME ajeno o ausente no se representa como PDF',async()=>{
  const c:any=Object.create(DocumentosGatewayController.prototype);c.getBaseUrl=()=> 'http://documentos.invalid';
  const res:any={getHeader:jest.fn(),set:jest.fn(),send:jest.fn()};
  for(const mime of ['text/html','constructor',undefined]){
   (axios.get as jest.Mock).mockResolvedValue({data:Buffer.from('synthetic'),headers:{'content-type':mime}});
   await expect(c.previewArchivado('800','synthetic',res)).rejects.toThrow('ARCHIVADO_PREVIEW_NO_DISPONIBLE');expect(res.send).not.toHaveBeenCalled();
  }
 });
});
