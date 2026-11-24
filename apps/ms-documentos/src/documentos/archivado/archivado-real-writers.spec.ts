jest.mock('@documental/database',()=>({sql:jest.fn()}));
import { ArchivadoDocumentalService } from './archivado-documental.service';
import { ArchivadoPostcommit } from './archivado-postcommit';
import { CargaSeguraPersistence } from '../carga-segura/carga-segura.persistence';
describe('Caminos efectivos de persistencia y confirmación transversal NAS',()=>{
 const config={get:(k:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_ACCOUNT_ID:'dev',R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z'} as any)[k]};
 it.each(['GUIA_REMISION','NOTA_INGRESO'])('persistencia real de %s marca el archivo, no solo el documento',async tipo=>{
  let fileMetadata:any;
  const input:any={operacion:{id:390,hashSha256:'a'.repeat(64)},command:{workspaceId:1,empresaCodigo:'BBTEC',clienteDestinoId:1,
   expedienteId:4,actorId:4,canalIngreso:'ALMACEN_LEGACY_UPLOAD_'+(tipo==='GUIA_REMISION'?'GUIA':'NOTA_INGRESO'),tipoDocumental:tipo,
   nombreArchivo:'scan.pdf',contentType:'application/pdf',tamanoBytes:10,metadata:{}}};
  const tx:any=jest.fn(async(strings:any,...params:any[])=>{
   const q=strings.join('?');
   if(q.includes('UPDATE documentos.carga_operaciones'))return [{id:390}];
   if(q.includes('FROM documentos.carga_operaciones'))return [{id:390,estado:'almacenada',workspace_id:1,empresa_codigo:'BBTEC',cliente_destino_id:1,expediente_id:4,actor_id:4,canal_ingreso:input.command.canalIngreso,nombre_archivo_original:'scan.pdf',content_type:'application/pdf',tamano_bytes:10,hash_sha256:'a'.repeat(64),storage_provider:'r2',storage_bucket:'dev',storage_key:'documentos/2026/03/BBTEC/390__scan.pdf'}];
   if(q.includes('FROM documentos.expedientes'))return [{id:4,empresa_codigo:'BBTEC',cliente_destino_id:1}];
   if(q.includes('INSERT INTO documentos.documentos_archivos')){fileMetadata=params.filter(v=>typeof v==='string'&&v.startsWith('{')).map(v=>JSON.parse(v))[0];return [{id:559}];}
   if(q.includes('INSERT INTO documentos.documentos ('))return [{id:554}];
   return [];
  });
  // Execute the real transaction body with an in-memory executor: no real SQL/storage.
  await (new CargaSeguraPersistence({} as any,config as any) as any).persistirEnTx(tx,input);
  expect(fileMetadata).toMatchObject({archivadoNuevo:true,tipoDocumental:tipo,contentType:'application/pdf',tamanoBytes:10});
 });
 it.each([
  ['OC',undefined,'002952',undefined,'OC_002952.pdf'],['OS',undefined,'000177',undefined,'OS_000177.pdf'],
  ['ORDEN_PAGO',undefined,'000123',undefined,'OP_000123.pdf'],
  ['FACTURA','OC','00001878','FF62','OC_002952__FACTURA_FF62-00001878_20101351921.pdf'],
  ['GUIA_REMISION','OC','307','T004','OC_002952__GUIA_T004-307_20101351921.pdf'],
  ['NOTA_INGRESO','OS','0000003279',undefined,'OS_002952__NOTA_INGRESO_0000003279.pdf'],
  ['FACTURA','OP','00001878','FF62','OP_002952__FACTURA_FF62-00001878_20101351921.pdf'],
  ['RECIBO_HONORARIO','OP','123','E001','OP_002952__RH_E001-123_20101351921.pdf'],
 ])('confirmación %s/%s propaga tipo, destino, reserva y postcommit',async(tipo,parent,numero,serie,name)=>{
  const events:string[]=[],post=new ArchivadoPostcommit();post.conectar(async(ids,files)=>{expect(ids).toEqual([901]);expect(files).toEqual([801]);events.push('nas')});
  const material:any={conSesion:(w:any)=>w(),ejecutar:jest.fn(async(_tx,f,n)=>{expect(f.tipo_documental).toBe(tipo);expect(n.rutaRelativa).toBe('documentos/2026/03/BBTEC/'+name);events.push('materializar-y-reservar')})};
  const service=new ArchivadoDocumentalService(config as any,post,material);
  const tx:any={unsafe:jest.fn(async(q:string)=>{
   if(q.includes('SELECT f.*'))return [{id:801,documento_id:901,version:1,empresa_codigo:'BBTEC',cliente_destino_id:1,expediente_id:4,
    workspace_id:2,bytes:10,hash_sha256:'a'.repeat(64),documento_mime:'application/pdf',storage_key:'documentos/2026/03/BBTEC/390__scan.pdf',
    tipo_documental:tipo,numero,serie,ruc_emisor:'20101351921',fecha_emision_documental:'2026-03-27',creado_en:'2026-11-24T18:00:00Z',metadata:{archivadoNuevo:true}}];
   if(q.includes('SELECT DISTINCT p.id'))return [{principal_id:11,tipo_documental:parent==='OP'?'ORDEN_PAGO':parent,numero:'002952',fecha_principal:'2026-03-27',grupo_id:12,factura_documento_id:13,fecha_factura:'2026-03-27'}];
   return [];
  })};
  await service.conConfirmacion(async()=>{await service.registrarDocumentoConfirmado(tx,901,4,'CONFIRMACION_DOCUMENTAL',801);expect(events).not.toContain('nas');events.push('commit')});
  expect(material.ejecutar).toHaveBeenCalledTimes(1);expect(events).toEqual(['materializar-y-reservar','commit','nas']);
 });
});
