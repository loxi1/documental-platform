jest.mock('./documentos.service', () => ({ DocumentosService: class {} }));
jest.mock('./documentos-preview.service', () => ({ DocumentosPreviewService: class {} }));
jest.mock('./documentos-upload.service', () => ({ DocumentosUploadService: class {} }));
import { DocumentosController } from './documentos.controller';
describe('OCR histórico exacto', () => {
 const findOcrResultados=jest.fn(); const controller=new DocumentosController({findOcrResultados} as any,{} as any,{} as any);
 it('filtra identidad antes de paginar, sin aumentar límite',()=>{
  controller.findOcrResultados('549','554');
  expect(findOcrResultados).toHaveBeenLastCalledWith(expect.objectContaining({documentoId:549,archivoId:554,limit:20,offset:0}));
 });
 it.each(['0','-1','1.5','texto','9007199254740992',''])('rechaza identidad inválida %s',value=>{
  expect(()=>controller.findOcrResultados(value,'554')).toThrow();
  expect(()=>controller.findOcrResultados('549',value)).toThrow();
 });
});
