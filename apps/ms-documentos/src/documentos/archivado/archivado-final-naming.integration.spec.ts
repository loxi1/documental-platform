jest.mock('@documental/database',()=>({sql:{reserve:jest.fn()}}));
import { ArchivadoDocumentalService } from './archivado-documental.service';
import { ArchivadoPostcommit } from './archivado-postcommit';
import { buildClaveDocumental } from '../identidad-documental';
describe('Escritores efectivos con nomenclatura final aprobada',()=>{
 const config={get:(k:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_ACCOUNT_ID:'dev',R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z'} as any)[k]};
 function fixture(tipo:string,parent:'OC'|'OS'|'OP',version=1){
  const events:string[]=[],post=new ArchivadoPostcommit();post.conectar(async(ids,files)=>{expect(ids).toEqual([701]);expect(files).toEqual([801]);events.push('nas')});
  const f:any={id:801,documento_id:701,version,empresa_codigo:'BBTEC',cliente_destino_id:1,expediente_id:6,workspace_id:10,
   hash_sha256:'a'.repeat(64),bytes:10,storage_bucket:'dev',storage_key:'documentos/2026/11/BBTEC/999__wrong_bank_filename.pdf',
   metadata:{archivadoNuevo:true},creado_en:'2026-11-24T20:00:00Z',documento_mime:'application/pdf',tipo_documental:tipo,
   numero:'0001',serie:'F001',ruc_emisor:'20100041953',fecha_emision_documental:'2026-11-17',
   documento_metadata:{ocr:{estado:'confirmado',metadata:{banco:'BBVA',numeroOperacion:'00114460'}}}};
  const material={conSesion:(w:any)=>w(),ejecutar:jest.fn(async(_tx,file,n,p)=>{expect(file).toBe(f);events.push('materializar');})};
  const tx:any={unsafe:jest.fn(async(q:string)=>{
   if(q.startsWith('UPDATE documentos.documentos_archivos SET expediente_id'))return [{id:f.id}];
   if(q.includes('SELECT f.*'))return [f];
   if(q.includes('SELECT id FROM documentos.archivados_documentales'))return [];
   if(q.includes('SELECT DISTINCT p.id'))return [{principal_id:180,tipo_documental:parent==='OP'?'ORDEN_PAGO':parent,numero:'000180',fecha_principal:'2026-10-02',grupo_id:157,factura_documento_id:99,fecha_factura:'2026-09-12'}];
   if(q.includes('AS ruta_original'))return [{expediente_id:6,ruta_original:'documentos/2026/09/BBTEC/OC_000180__FACTURA_F001-0001_20100041953.pdf'}];
   return [];
  })};
  const service=new ArchivadoDocumentalService(config as any,post,material as any);
  const confirm=()=>service.conConfirmacion(async()=>{await service.registrarDocumentoConfirmado(tx,701,5,'CONFIRMACION_DOCUMENTAL',801);events.push('commit')});
  return {f,tx,material,confirm,events};
 }
 it.each(['OC','OS','OP'] as const)('transferencia/detracción %s: banco persistido, periodo institucional, materializar→commit→NAS',async parent=>{
  for(const tipo of ['TRANSFERENCIA','DETRACCION']){
   const h=fixture(tipo,parent);const clave=buildClaveDocumental('BBTEC','TRANSFERENCIA',{banco:'BBVA',numeroOperacion:'00114460'});
   await h.confirm();expect(h.events).toEqual(['materializar','commit','nas']);
   expect(h.material.ejecutar.mock.calls[0][2]).toMatchObject({rutaRelativa:`documentos/2026/${parent==='OP'?'10':'09'}/BBTEC/${parent}_000180__${tipo}_BBVA_00114460.pdf`});
   expect(buildClaveDocumental('BBTEC','TRANSFERENCIA',h.f.documento_metadata.ocr.metadata)).toBe(clave);
  }
 });
 it.each(['banco','numeroOperacion'])('dato %s ausente conserva archivo sin fabricar nombre',async field=>{
  const h=fixture('TRANSFERENCIA','OC');delete h.f.documento_metadata.ocr.metadata[field];await h.confirm();
  expect(h.material.ejecutar).not.toHaveBeenCalled();expect(h.events).toEqual(['commit']);
  expect(h.tx.unsafe.mock.calls.some((c:any)=>c[1]?.[1]==='IDENTIDAD_BANCARIA_INCOMPLETA')).toBe(true);
 });
 it.each([2,3])('versiónV%s conserva base/periodo original aunque fecha actual y carga sean otras',async version=>{
  const h=fixture('FACTURA','OC',version);await h.confirm();
  expect(h.material.ejecutar.mock.calls[0][2]).toMatchObject({rutaRelativa:`documentos/2026/09/BBTEC/OC_000180__FACTURA_F001-0001_20100041953__V${version}.pdf`});
  expect(h.events).toEqual(['materializar','commit','nas']);
 });
 it('versión sin original unívoco se bloquea individualmente',async()=>{
  const h=fixture('FACTURA','OC',2),old=h.tx.unsafe.getMockImplementation();h.tx.unsafe.mockImplementation((q:string,v:any[])=>q.includes('AS ruta_original')?[]:old!(q,v));
  await h.confirm();expect(h.material.ejecutar).not.toHaveBeenCalled();expect(h.events).toEqual(['commit']);
 });
 it.each([['application/pdf','pdf'],['image/png','png'],['image/jpeg','jpg']])('OP inicial%s reserva destino de formato real antes de escritura',async(mime,ext)=>{
  const tx:any={unsafe:jest.fn(async(q:string)=>q.startsWith('SELECT d.numero')?[{numero:'000180',expediente_v1_id:6}]:[{id:15}])};
  const service=new ArchivadoDocumentalService(config as any);
  const result=await service.prepararOp(tx,{id:901,empresa_codigo:'BBTEC',cliente_destino_id:1,workspace_id:10,storage_bucket:'dev',hash_sha256:'a'.repeat(64),tamano_bytes:10,content_type:mime},
   {documentoId:700,ordenPagoId:180},'documentos/2026/10/BBTEC/901__wrong.pdf',{id:5},'identity');
  expect(result.destination).toBe(`documentos/2026/10/BBTEC/OP_000180.${ext}`);expect(result.reserva?.key).toBe(result.destination);
  const insert=tx.unsafe.mock.calls.find((c:any)=>c[0].includes('INSERT INTO documentos.archivados_documentales'));expect(insert![1][11]).toBe(result.destination);
 });
 it('versión completa contexto faltante desde original antes de buscar padre; contexto cruzado se rechaza',async()=>{
  const h=fixture('FACTURA','OC',2);h.f.expediente_id=null;await h.confirm();
  expect(h.f.expediente_id).toBe(6);expect(h.material.ejecutar).toHaveBeenCalledTimes(1);
  const bad=fixture('FACTURA','OC',2);bad.f.expediente_id=99;await bad.confirm();expect(bad.material.ejecutar).not.toHaveBeenCalled();
 });

 it.each(['OC','OS','OP'] as const)('sustento%s admite operación bancaria validada con coma y preserva clave institucional',async parent=>{
  for(const tipo of ['TRANSFERENCIA','DETRACCION']){
   const h=fixture(tipo,parent);h.f.documento_metadata.ocr.metadata.numeroOperacion='2,453-0';h.f.numero='NOT_THE_OPERATION';await h.confirm();
   expect(h.material.ejecutar.mock.calls[0][2]).toMatchObject({rutaRelativa:`documentos/2026/${parent==='OP'?'10':'09'}/BBTEC/${parent}_000180__${tipo}_BBVA_2,453-0.pdf`});
   expect(buildClaveDocumental('BBTEC','TRANSFERENCIA',h.f.documento_metadata.ocr.metadata)).toBe('BBTEC|TRANSFERENCIA|BBVA|2,453-0');
  }
 });

});
