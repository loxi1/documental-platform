jest.mock('@documental/database',()=>({sql:jest.fn()}));
import { sql } from '@documental/database';
import { DocumentosUploadService } from './documentos-upload.service';
describe('Carga guiada elegible: identidad del escritor persistida',()=>{
 const actor={actorId:4,workspaceId:7,empresaCodigo:'BBTI',clienteDestinoId:2};
 const file={buffer:Buffer.from('%PDF-synthetic'),originalname:'scan.pdf',mimetype:'application/pdf'};
 const body={clienteAbreviatura:'BBTI',expedienteId:900,tipoEsperado:'OC'};
 let service:any,upload:jest.SpyInstance;
 beforeEach(()=>{
  (sql as unknown as jest.Mock).mockReset().mockResolvedValue([{id:901}]);
  service=new DocumentosUploadService({get:(k:string)=>k==='R2_NAS_ARCHIVE_ENABLED'?'true':undefined} as any,
    {registrarEvento:jest.fn()} as any,{} as any,{} as any);
  jest.spyOn(service,'obtenerResumenExpediente').mockResolvedValue({empresaCodigo:'BBTI',clienteDestinoId:2});
  jest.spyOn(service,'buscarDuplicadosPorHash').mockResolvedValue([]);
  jest.spyOn(service,'crearDocumentoContenedor').mockResolvedValue(800);
  jest.spyOn(service,'resolveBucket').mockReturnValue('dev');
  upload=jest.spyOn(service,'subirAR2').mockResolvedValue(undefined);
 });
 it('persiste tenant/workspace/actor del Gateway, no del nombre del archivo',async()=>{
  await service.cargaGuiada(file,body,actor);
  const call=(sql as unknown as jest.Mock).mock.calls[0];
  expect(call[0].join('')).toContain('workspace_id,empresa_codigo,cliente_destino_id,expediente_id,creado_por');
  expect(call.slice(-5)).toEqual([7,'BBTI',2,900,4]);expect(upload).toHaveBeenCalledTimes(1);
 });
 it('sin identidad o con tenant distinto no escribe R2',async()=>{
  await expect(service.cargaGuiada(file,body)).rejects.toThrow('CARGA_GUIADA_CONTEXTO_REQUERIDO');
  await expect(service.cargaGuiada(file,body,{...actor,clienteDestinoId:99})).rejects.toThrow('TENANT_INVALIDO');
  expect(upload).not.toHaveBeenCalled();expect(sql).not.toHaveBeenCalled();
 });
});
