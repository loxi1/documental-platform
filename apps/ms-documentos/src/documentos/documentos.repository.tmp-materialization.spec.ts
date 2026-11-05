jest.mock('@documental/database',()=>({sql:{}}));
import {DocumentosRepository} from './documentos.repository';
describe('Materialización TEMP con executor existente',()=>{
 it.each([true,false])('OCR real=%s: no inventa extracción y no abre transacción',async real=>{
  const queries:string[]=[];const tx:any=jest.fn(async(s:TemplateStringsArray,...v:any[])=>{
   const q=s.join('?');queries.push(q);
   if(q.includes('INSERT INTO documentos.documentos_archivos'))return [{id:91,documento_id:90}];
   if(q.includes('INSERT INTO documentos.ocr_resultados'))return [{id:92,documento_id:90,archivo_id:91,metadata:{}}];
   if(q.includes('INSERT INTO documentos.documentos'))return [{id:90}];
   throw Error('unexpected SQL');
  });
  const repo:any=new DocumentosRepository();repo.confirmarDocumentoContextoConExecutor=jest.fn(async()=>({documento:{id:90}}));
  const row={id:50,empresa_codigo:'BBTI',storage_provider:'r2',storage_bucket:'lab',metadata:{ocrCandidate:{status:'DONE',resultado:{ok:real,confidence:.9}}},nombre_archivo_original:'a.pdf',hash_sha256:'abc',workspace_id:12,cliente_destino_id:2};
  const r=await repo.materializarTemporalConExecutor(tx,row,'documentos/2026/01/BBTI/50__a.pdf',{tipoDocumental:'OC',expedienteId:118,metadata:{fechaEmision:'2026-01-31'}},{actorId:6});
  expect(r.ocrId).toBe(real?92:null);
  expect(queries.filter(q=>q.includes('INSERT INTO documentos.ocr_resultados'))).toHaveLength(real?1:0);
  expect(repo.confirmarDocumentoContextoConExecutor.mock.calls[0][0]).toBe(tx);
  if(!real)expect(repo.confirmarDocumentoContextoConExecutor.mock.calls[0][4].metadata.origenValidacion).toBe('manual_sin_ocr');
 });
});
