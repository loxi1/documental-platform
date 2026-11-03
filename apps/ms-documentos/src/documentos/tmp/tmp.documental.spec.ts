jest.mock('@documental/shared',()=>({NatsSubjects:{OcrProcesarArchivo:'lab.ocr.procesar-archivo'}}));
jest.mock('@documental/database',()=>({sql:{}}));
import {TmpService} from './tmp.service';
import {TmpController} from './tmp.controller';
import {TmpRepository} from './tmp.repository';
import {Subject, of} from 'rxjs';
describe('G2 TEMP documental, storage/DB simulados',()=>{
 const actor={actorId:6,workspaceId:12,empresaCodigo:'BBTI',clienteDestinoId:2,idempotencyKey:'confirm',requestId:'req',correlationId:'req'};
 const input=(t='OC')=>({tipoDocumental:t,expedienteId:118,esPrincipal:t!=='FACTURA',tipoRelacion:t==='FACTURA'?'adjunto_factura':`principal_${t.toLowerCase()}`,...(t==='FACTURA'?{documentoBaseId:10}:{}),metadata:{fechaEmision:'2026-01-31',numero:'1'}});
 let row:any,repo:any,storage:any,docs:any,v2:any,svc:TmpService,objects:Set<string>,commit:jest.Mock;
 beforeEach(()=>{
  row={id:50,estado:'almacenada',metadata:{},expira_en:new Date(Date.now()+3600000),workspace_id:12,empresa_codigo:'BBTI',cliente_destino_id:2,actor_id:6,storage_provider:'r2',storage_bucket:'lab',storage_key:'documentos/tmp/12/50',nombre_archivo_original:'a.pdf',tamano_bytes:9,hash_sha256:'a'.repeat(64)};
  objects=new Set([row.storage_key]);commit=jest.fn();let queue=Promise.resolve();
  const tx:any=jest.fn(async()=>{row.metadata.documentalResult={documentoId:90,archivoId:91,tempId:50};return [];});
  repo={locked:jest.fn((_:any,f:any)=>{const p=queue.then(()=>f(tx));queue=p.catch(()=>undefined);return p;}),own:jest.fn(async(_:any,id:any,a:any)=>{if(a.workspaceId!==12)throw Error('scope');return structuredClone(row);}),assertDocumentalScope:jest.fn(async()=>undefined),saveDocumentalMetadata:jest.fn(async(_:any,__:any,m:any)=>{row.metadata=m;}),bind:jest.fn(async()=>undefined),promoted:jest.fn(async(_:any,__:any,___:any,d:any,i:any)=>{await commit();await i.persist(tx,structuredClone(row),d);row.metadata.integration.completed=true;row.promovida_en=new Date();row.destino_storage_key=d;}),cleaned:jest.fn(async()=>{row.estado='completada';})};
  storage={statObject:jest.fn(async(o:any)=>({exists:objects.has(o.key),tamanoBytes:9,hashSha256:row.hash_sha256})),copyObject:jest.fn(async(o:any)=>{objects.add(o.destinationKey);}),deleteObject:jest.fn(async(o:any)=>{objects.delete(o.key);})};
  docs={validarTemporalAntesDeReserva:jest.fn(async()=>undefined),materializarTemporalConExecutor:jest.fn(async()=>({documentoId:90,archivoId:91,confirmed:{documento:{id:90},tipoDocumental:'OC'}}))};v2={integrarTemporalConExecutor:jest.fn(async(_:any,c:any)=>c)};
  svc=new TmpService(repo,{get:()=> 'lab'} as any,storage,{} as any,{} as any,docs,v2);
 });
 it.each(['OC','OS','FACTURA'])('%s usa fecha documental',async t=>{expect(await svc.documental(50,actor,input(t))).toEqual({documentoId:90,archivoId:91,tempId:50});expect(row.destino_storage_key).toBe('documentos/2026/01/BBTI/50__a.pdf');expect(v2.integrarTemporalConExecutor).toHaveBeenCalledTimes(1);expect(objects.has(row.storage_key)).toBe(false);});
 it.each([undefined,'2026-02-30','2026-13-01','2026-01-31T23:00:00Z'])('rechaza fecha %s antes de storage',async f=>{const x=input();x.metadata.fechaEmision=f as any;await expect(svc.documental(50,actor,x)).rejects.toThrow('DATE_INVALID');expect(repo.saveDocumentalMetadata).not.toHaveBeenCalled();});
 it('borrador sin archivoId simulado',async()=>{const r=await svc.documental(50,actor,input(),true);expect(r.borradorDocumental).toEqual(input());expect(r).not.toHaveProperty('archivoId');expect(storage.copyObject).not.toHaveBeenCalled();});
 it('rechaza vencimiento previo a reserva',async()=>{row.expira_en=new Date(0);await expect(svc.documental(50,actor,input())).rejects.toThrow('EXPIRED');expect(storage.copyObject).not.toHaveBeenCalled();});
 it('confirmación concurrente y repetida integra una vez',async()=>{await Promise.all([svc.documental(50,actor,input()),svc.documental(50,actor,input())]);expect(docs.materializarTemporalConExecutor).toHaveBeenCalledTimes(1);expect(storage.copyObject).toHaveBeenCalledTimes(1);});
 it('payload diferente con misma identidad entra en conflicto',async()=>{await svc.documental(50,actor,input());const x=input();x.metadata.numero='2';await expect(svc.documental(50,actor,x)).rejects.toThrow('IDEMPOTENCY_CONFLICT');});
 it('reintento tras copia y fallo DB conserva reserva incluso vencida',async()=>{commit.mockRejectedValueOnce(Error('commit'));await expect(svc.documental(50,actor,input())).rejects.toThrow('commit');row.expira_en=new Date(0);await svc.documental(50,actor,input());expect(storage.copyObject).toHaveBeenCalledTimes(2);});
 it('fallo antes de copia recuperable',async()=>{storage.copyObject.mockRejectedValueOnce(Error('copy'));await expect(svc.documental(50,actor,input())).rejects.toThrow('copy');expect(docs.materializarTemporalConExecutor).not.toHaveBeenCalled();await svc.documental(50,actor,input());});
 it('delete fallido conserva definitivo y no reintegra',async()=>{storage.deleteObject.mockRejectedValueOnce(Error('delete'));await svc.documental(50,actor,input());expect(objects.has(row.destino_storage_key)).toBe(true);await svc.documental(50,actor,input());expect(docs.materializarTemporalConExecutor).toHaveBeenCalledTimes(1);});
 it('conserva destino histórico reservado',async()=>{storage.copyObject.mockRejectedValueOnce(Error('copy'));await expect(svc.documental(50,actor,input())).rejects.toThrow();row.metadata.destinoReservado='documentos/carga-segura/2025/12/BBTI/50__a.pdf';await svc.documental(50,actor,input());expect(row.destino_storage_key).toContain('/2025/12/');});
 it('scope rechazado antes de copia',async()=>{repo.assertDocumentalScope.mockRejectedValueOnce(Error('scope'));await expect(svc.documental(50,actor,input())).rejects.toThrow('scope');expect(storage.copyObject).not.toHaveBeenCalled();});
 it('contrato mixto rechazado',()=>{expect(()=>new TmpController(svc).promote({} as any,'50',{destinoStorageKey:'x',confirmacionDocumental:input()})).toThrow();});
 it('OCR tardío no modifica una materialización admitida',async()=>{
   const response=new Subject<any>();let entered!:()=>void;
   const started=new Promise<void>(r=>{entered=r;});
   const nats={send:jest.fn(()=>{entered();return response;})};
   repo.ocrProcessing=jest.fn(async(_:any,__:any,t:any,identity:any)=>{
     row.metadata.ocrCandidate={status:'PROCESSING',tipoEsperado:t,...identity};
   });repo.ocrDone=jest.fn();
   const service=new TmpService(repo,{get:()=> 'lab'} as any,storage,nats as any,{} as any,docs,v2);
   const pending=service.procesarOcr(50,actor,'OC');await started;
   row.metadata.integration={consumer:'COMPRAS_TEMP_DOCUMENTAL',identity:actor.idempotencyKey,completed:false};
   row.metadata.destinoReservado='documentos/2026/01/BBTI/50__a.pdf';
   row.metadata.promocionIdentity=actor.idempotencyKey;
   row.metadata.borradorDocumental=input();
   const reserved=structuredClone(row);
   response.next({ok:true,metadata:{numero:'1'}});response.complete();
   await expect(pending).rejects.toThrow('STALE_RESULT_DISCARDED');
   expect(repo.ocrDone).not.toHaveBeenCalled();expect(nats.send).toHaveBeenCalledTimes(1);
   expect(row).toEqual(reserved);
 });
 it('errores de validación no reservan ni copian',async()=>{
   docs.validarTemporalAntesDeReserva.mockRejectedValueOnce(Error('metadata invalid'));
   await expect(svc.documental(50,actor,input())).rejects.toThrow('metadata invalid');
   expect(repo.saveDocumentalMetadata).not.toHaveBeenCalled();expect(storage.copyObject).not.toHaveBeenCalled();
 });
 it('relación existente rechazada por integración conserva fuente y reserva para recuperación',async()=>{
   v2.integrarTemporalConExecutor.mockRejectedValueOnce(Error('existing relation'));
   await expect(svc.documental(50,actor,input())).rejects.toThrow('existing relation');
   expect(storage.deleteObject).not.toHaveBeenCalled();expect(row.metadata.integration.completed).toBe(false);
 });
 it('tenant contradictorio se rechaza antes de storage',async()=>{
   const x:any=input();x.metadata.empresaCodigo='OTHER';
   await expect(svc.documental(50,actor,x)).rejects.toThrow('TENANT_CONFLICT');expect(storage.copyObject).not.toHaveBeenCalled();
 });

 it.each([{rows:[]},{rows:[{id:50}]}])('repository devuelve aceptación y aplica condición en el UPDATE',async ({rows})=>{
   let query='';
   const c:any=jest.fn(async(s:TemplateStringsArray)=>{query=s.join('?');return rows;});
   const accepted=await new TmpRepository().ocrDone(c,50,'FACTURA',{ok:true},{storageKey:row.storage_key,attemptId:'attempt'});
   expect(accepted).toBe(rows.length===1);
   expect(query).toContain("(metadata #>> '{integration,consumer}') IS DISTINCT FROM 'COMPRAS_TEMP_DOCUMENTAL'");
   expect(query).toContain('RETURNING id');expect(c).toHaveBeenCalledTimes(1);
 });
 it('service descarta si el UPDATE atómico no acepta el resultado',async()=>{
   repo.ocrProcessing=jest.fn(async(_:any,__:any,t:any,identity:any)=>{row.metadata.ocrCandidate={status:'PROCESSING',tipoEsperado:t,...identity};});
   repo.ocrDone=jest.fn(async()=>false);
   const nats={send:jest.fn(()=>of({ok:true}))};
   const service=new TmpService(repo,{get:()=> 'lab'} as any,storage,nats as any,{} as any,docs,v2);
   await expect(service.procesarOcr(50,actor,'OS')).rejects.toThrow('STALE_RESULT_DISCARDED');
   expect(row.metadata.ocrCandidate.status).toBe('PROCESSING');
 });

});
