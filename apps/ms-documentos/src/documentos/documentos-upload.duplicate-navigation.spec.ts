jest.mock('@documental/database',()=>({sql:jest.fn()}));
import {sql} from '@documental/database';
import {DocumentosUploadService} from './documentos-upload.service';
describe('Contrato focal de duplicidad Compras',()=>{
 let service:any;
 beforeEach(()=>{jest.clearAllMocks();service=new DocumentosUploadService({get:()=>undefined} as any,{} as any,{} as any,{} as any);});
 it('consulta asociación explícita legacy y V2 sin elegir principal activo del expediente',async()=>{
  (sql as any).mockResolvedValue([]);
  await service.buscarDuplicadosPorHash({sha256:'a',documentoId:null,expedienteId:4,empresaCodigo:'BBTEC'});
  const query=(sql as any).mock.calls[0][0].join('');
  expect(query).toContain("d.metadata->>'documentoBaseId'");expect(query).toContain('g.factura_documento_id=d.id');expect(query).toContain('count(DISTINCT candidate)=1');expect(query).toContain('p.documento_id');expect(query).toContain('estado_documento');
 });
 it('expone identidad documental, archivo, estado y orden para duplicados por hash',async()=>{
  jest.spyOn(service,'obtenerResumenExpediente').mockResolvedValue({empresaCodigo:'BBTEC',clienteDestinoId:1});
  jest.spyOn(service,'asociacionNavegableValida').mockResolvedValue(true);
  jest.spyOn(service,'buscarDuplicadosPorHash').mockResolvedValue([{id:557,documento_id:552,expediente_id:4,estado_documento:'confirmado',tipo_documental:'FACTURA',principal_documento_id:551}]);
  const result=await service.prevalidarCarga({buffer:Buffer.from('test'),originalname:'factura.pdf',mimetype:'application/pdf'},{expedienteId:4,tipoEsperado:'FACTURA',clienteAbreviatura:'BBTEC'});
  expect(result.duplicados[0]).toMatchObject({archivoId:557,documentoId:552,expedienteId:4,estadoDocumento:'confirmado',tipoDocumental:'FACTURA',principalDocumentoId:551});
 });
 it.each([{rows:[]},{rows:[{id:999}]},{rows:[{id:551},{id:551}]}])('no acredita asociación inválida o contradictoria %j',async ({rows})=>{
  (sql as any).mockResolvedValue(rows);
  expect(await service.asociacionNavegableValida(552,557,551,4,'BBTEC',1)).toBe(false);
 });
 it('valida tipo, actividad, expediente, empresa y cliente en legacy y V2',async()=>{
  (sql as any).mockResolvedValue([{id:551}]);
  expect(await service.asociacionNavegableValida(552,557,551,4,'BBTEC',1)).toBe(true);
  const [parts,...values]=(sql as any).mock.calls[0];const query=parts.join('?');
  for(const condition of ["p.tipo_documental IN ('OC','OS')","p.estado='confirmado'","op.estado='activo'","op.es_principal_activo=true","ed.expediente_id<>e.id","c.cliente_destino_id=e.cliente_destino_id","IS DISTINCT FROM"]) expect(query).toContain(condition);
  expect(values).toEqual(expect.arrayContaining([552,557,551,4,'BBTEC',1]));
 });
 it('mantiene detección de duplicidad pero elimina navegación no acreditada',async()=>{
  jest.spyOn(service,'obtenerResumenExpediente').mockResolvedValue({empresaCodigo:'BBTEC',clienteDestinoId:1});
  jest.spyOn(service,'buscarDuplicadosPorHash').mockResolvedValue([{id:557,documento_id:552,expediente_id:4,principal_documento_id:551}]);
  jest.spyOn(service,'asociacionNavegableValida').mockResolvedValue(false);
  const result=await service.prevalidarCarga({buffer:Buffer.from('test'),originalname:'f.pdf',mimetype:'application/pdf'},{expedienteId:4,tipoEsperado:'FACTURA',clienteAbreviatura:'BBTEC'});
  expect(result.duplicadoArchivo).toBe(true);expect(result.accionSugerida).toBe('abrir_existente');
  expect(result.duplicados[0].principalDocumentoId).toBeNull();expect(result.duplicados[0].documentoId).toBe(552);
 });

});
