jest.mock('@documental/database',()=>({sql:Object.assign(jest.fn(),{begin:jest.fn()})}));
import { sql } from '@documental/database';
import { FacturaTempMaterializationRepository } from '../factura-temp/factura-temp-materialization.repository';
import { ReciboHonorarioTempMaterializationRepository } from '../recibo-honorario-temp/recibo-honorario-temp-materialization.repository';
import { RegularizarObligacionOpFacturaUseCase } from '../../documental-v2/use-cases/regularizar-obligacion-op-factura.usecase';
import { RegularizarObligacionOpReciboHonorarioUseCase } from '../../documental-v2/use-cases/regularizar-obligacion-op-recibo-honorario.usecase';
import { ArchivadoDocumentalService } from './archivado-documental.service';
import { ArchivadoPostcommit } from './archivado-postcommit';
describe.each([
 ['FACTURA',FacturaTempMaterializationRepository,RegularizarObligacionOpFacturaUseCase],
 ['RECIBO_HONORARIO',ReciboHonorarioTempMaterializationRepository,RegularizarObligacionOpReciboHonorarioUseCase],
] as const)('PROMOTED → regularización institucional %s', (tipo,Repository,UseCase)=>{
 const actor={actorId:5,workspaceId:10,empresaCodigo:'BBTEC',clienteDestinoId:1};
 const key='documentos/2026/10/BBTEC/OP_180__'+tipo+'_E001-1_20100041953.pdf';
 const reservation={reservaId:'00000000-0000-8000-a000-000000000001',key};
 function fixture(exp:number|null=6){
  let file:any,associated=false,regularized=false,fail=false,opValid=true,bound=false;
  const events:string[]=[];
  const row:any={id:900,documento_id:901,actor_id:5,workspace_id:10,empresa_codigo:'BBTEC',cliente_destino_id:1,
   metadata:{integration:{identity:'identity',consumer:tipo==='FACTURA'?'OP_FACTURA_REGULARIZER_MATERIALIZATION':'OP_RECIBO_HONORARIO_REGULARIZER_MATERIALIZATION'},destinoReservado:key,promocionIdentity:'identity',archivadoReserva:reservation,regularizacionOp:{ordenPagoId:180}},
   storage_bucket:'dev',hash_sha256:'a'.repeat(64),tamano_bytes:100,nombre_archivo_original:'scan.pdf',content_type:'application/pdf'};
  const tx:any=jest.fn(async(strings:any,...v:any[])=>{
   const q=strings.join('?');
   if(q.includes('SELECT c.expediente_v1_id'))return opValid?[{expediente_id:exp}]:[];
   if(q.includes('FROM documentos.documentos_archivos'))return file?[file]:[];
   if(q.includes('FROM documentos.documentos'))return [{id:901,tipo_documental:tipo,estado:'confirmado',cliente_abreviatura:'BBTEC'}];
   if(q.includes('INSERT INTO documentos.documentos_archivos')){
    const columns=q.slice(q.indexOf('(')+1,q.indexOf(')')).split(',').map((s:string)=>s.trim());
    const expressions=q.slice(q.indexOf('VALUES (')+8,q.indexOf('RETURNING')).replace(/\)\s*$/,'').split(',');
    let i=0;file={};columns.forEach((c:string,j:number)=>{file[c]=expressions[j]?.includes('?')?v[i++]:undefined});
    file={...file,id:902,documento_id:901,version:1,metadata:JSON.parse(file.metadata),bytes:100,
     creado_en:'2026-11-24T20:00:00Z',documento_mime:'application/pdf',tipo_documental:tipo};
    return [{id:902}];
   }
   return [];
  });
  tx.unsafe=jest.fn(async(q:string,v:any[])=>{
   if(q.includes('SELECT f.*'))return [file];
   if(q.includes('SELECT id FROM documentos.archivados_documentales'))return bound?[{id:12}]:[];
   if(q.startsWith('UPDATE documentos.archivados_documentales')){
    // Mirrors the actual accredited SQL predicate that rejected NULL vs OP expedition.
    if(fail || file.expediente_id!==exp)return [];
    events.push('reserva-confirmada');return [{id:12}];
   }
   throw Error('UNEXPECTED_SQL');
  });
  (sql.begin as jest.Mock).mockImplementation(async work=>{
   const previous={associated,regularized};
   try{const r=await work(tx);events.push('commit');return r;}
   catch(e){associated=previous.associated;regularized=previous.regularized;events.push('rollback');throw e;}
  });
  const post=new ArchivadoPostcommit();const nas=jest.fn(async(ids,files)=>{expect(ids).toEqual([901]);expect(files).toEqual([902]);events.push('nas')});post.conectar(nas);
  const archive=new ArchivadoDocumentalService({get:(k:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z'} as any)[k]} as any,post);
  const snapshots={obtenerRegularizacionPorGrupoFacturaId:jest.fn(async()=>({requiereRegularizacionAplicada:true,estadoRegularizacion:regularized?'REGULARIZADO':'PENDIENTE'})),
   marcarRegularizadoDesdePendiente:jest.fn(async()=>{regularized=true;return true;})};
  const assoc={execute:jest.fn(async()=>{associated=true;return {documentoGrupoFactura:{id:77},idempotente:false};})};
  const service=new UseCase(snapshots as any,{permiteTipoDocumental:async()=>true} as any,
   {buscarActivoPorGrupoDocumentoRelacion:async()=>associated?{id:77}:null} as any,assoc as any,{registrarRegularizacion:async()=>{}} as any,archive);
  const promote=()=>new Repository().createOrReuseDocumentAndFileWithExecutor(tx,row,901,'identity',key,actor);
  const regularize=()=>service.execute({grupoFacturaId:157,documentoId:901,usuario:{id:5,...actor}});
  return {promote,regularize,events,nas,assoc,tx,getFile:()=>file,state:()=>({associated,regularized}),
   fail:()=>{fail=true},invalid:()=>{opValid=false},bound:()=>{bound=true}};
 }
 it.each([6,null])('propaga expediente %s de OP, confirma y publica postcommit exacto; replay sin duplicados',async exp=>{
  const h=fixture(exp);await h.promote();expect(h.getFile().expediente_id).toBe(exp);
  expect(h.getFile().metadata).toMatchObject({archivadoNuevo:true,archivadoReserva:reservation});
  expect(await h.regularize()).toMatchObject({estadoRegularizacion:'REGULARIZADO',idempotente:false});
  expect(h.events).toEqual(['reserva-confirmada','commit','nas']);
  expect(await h.regularize()).toMatchObject({idempotente:true});expect(h.assoc.execute).toHaveBeenCalledTimes(1);expect(h.nas).toHaveBeenCalledTimes(1);
 });
 it('fallo de confirmación revierte asociación y snapshot, sin postcommit',async()=>{
  const h=fixture();await h.promote();h.fail();await expect(h.regularize()).rejects.toThrow('ARCHIVADO_CONFIRMACION_NO_ACREDITADA');
  expect(h.state()).toEqual({associated:false,regularized:false});expect(h.nas).not.toHaveBeenCalled();expect(h.events).toEqual(['rollback']);
 });
 it('contexto OP ajeno se rechaza antes de INSERT',async()=>{
  const h=fixture();h.invalid();await expect(h.promote()).rejects.toThrow('OP_CONTEXTO_NO_ACREDITADO');expect(h.getFile()).toBeUndefined();
 });
 it('reserva ya confirmada conserva postcommit de la asociación posterior sin UPDATE redundante',async()=>{
  const h=fixture();await h.promote();h.bound();await h.regularize();expect(h.events).toEqual(['commit','nas']);
 });
});
