jest.mock('@documental/database',()=>({sql:jest.fn()}));
jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'}}));
import { ArchivadoController } from './archivado.controller';
describe('Mismo visor NAS devuelve PDF/PNG/JPG real',()=>{
 it.each([
  ['application/pdf','pdf',Buffer.from('%PDF-1.7')],
  ['image/png','png',Buffer.from([137,80,78,71,13,10,26,10])],
  ['image/jpeg','jpg',Buffer.from([255,216,255])],
 ])('%s conserva bytes, ruta y cabeceras seguras',async(mime,ext,data)=>{
  const runtime={leerPreview:jest.fn().mockResolvedValue(data)},controller=new ArchivadoController(runtime as any);
  const res:any={set:jest.fn().mockReturnThis(),send:jest.fn()};await controller.preview(800,'synthetic',res);
  expect(runtime.leerPreview).toHaveBeenCalledWith(800,'synthetic');expect(res.set).toHaveBeenCalledWith(expect.objectContaining({'Content-Type':mime,'Content-Disposition':`inline; filename="documento.${ext}"`,'X-Content-Type-Options':'nosniff'}));expect(res.send).toHaveBeenCalledWith(data);
 });
 it('contenido no admitido no se maquilla como PDF',async()=>{
  const controller=new ArchivadoController({leerPreview:async()=>Buffer.from('<html>')} as any),res:any={set:jest.fn(),send:jest.fn()};
  await expect(controller.preview(800,'synthetic',res)).rejects.toThrow('ARCHIVADO_FORMATO_NO_COINCIDE');expect(res.send).not.toHaveBeenCalled();
 });
});
