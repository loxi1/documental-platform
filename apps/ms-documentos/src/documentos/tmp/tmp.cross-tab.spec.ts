jest.mock('@documental/database',()=>({sql:{}}));
jest.mock('@documental/shared',()=>({NatsSubjects:{OcrProcesarArchivo:'ocr.procesar-archivo'}}));
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {TmpRepository, comprasFacturaContext} from './tmp.repository';
import {TmpService} from './tmp.service';

// Model of locks and tagged SQL, not a PostgreSQL connection/concurrency accreditation.
function fixture() {
 const session=new AsyncLocalStorage<any>();
 const rows:any[]=[]; const queries:{text:string;values:any[];inTransaction:boolean}[]=[];
 const mutexes=new Map<string,Promise<void>>();
 async function lock(key:string){const before=mutexes.get(key)??Promise.resolve();let release!:()=>void;const next=new Promise<void>(r=>release=r);mutexes.set(key,next);await before;return release;}
 let nextId=1;
 const connection=()=>{
  let inTransaction=false;let release:(()=>void)|undefined;
  const c:any=jest.fn(async(strings:TemplateStringsArray,...v:any[])=>{
   const q=strings.join('?');queries.push({text:q,values:v,inTransaction});
   if(q.includes('pg_advisory_xact_lock')){expect(inTransaction).toBe(true);release=await lock(v[0]);return [];}
   if(q.includes('AND (idempotency_key='))return rows.filter(r=>r.workspace_id===v[0]&&r.empresa_codigo===v[1]&&(r.idempotency_key===v[2]||Object.hasOwn(r.metadata.comprasTempAliases??{},v[3]))).map(r=>structuredClone(r));
   if(q.includes('AND actor_id=')&&q.includes('ORDER BY id FOR UPDATE'))return rows.filter(r=>r.actor_id===v[0]&&r.workspace_id===v[1]&&r.empresa_codigo===v[2]&&r.cliente_destino_id===v[3]&&r.hash_sha256===v[4]&&r.content_type===v[5]&&r.tamano_bytes===v[6]&&r.storage_bucket===v[7]&&JSON.stringify(r.metadata.comprasFactura)===JSON.stringify(JSON.parse(v[8]))&&new Date(r.expira_en).getTime()>Date.now()).map(r=>structuredClone(r));
   if(q.includes('INSERT INTO documentos.carga_operaciones')){const r={id:nextId++,workspace_id:v[0],empresa_codigo:v[1],cliente_destino_id:v[2],actor_id:v[3],idempotency_key:v[4],payload_fingerprint:v[5],request_id:v[6],correlation_id:v[7],nombre_archivo_original:v[8],content_type:v[9],tamano_bytes:v[10],hash_sha256:v[11],storage_provider:'r2',storage_bucket:v[12],metadata:JSON.parse(v[13]),estado:'iniciada',expira_en:new Date(Date.now()+86400000).toISOString()};rows.push(r);return [structuredClone(r)];}
   if(q.includes("'{comprasTempAliases}'")){const r=rows.find(r=>r.id===v[1]);r.metadata.comprasTempAliases={...r.metadata.comprasTempAliases,...JSON.parse(v[0])};return [structuredClone(r)];}
   if(q.includes('SET storage_key=')){rows.find(r=>r.id===v[1]).storage_key=v[0];return [];}
   if(q.includes("SET estado='almacenada'")){rows.find(r=>r.id===v[0]).estado='almacenada';return [];}
   if(q.includes('SET metadata=')&&!q.includes('jsonb_set')){const r=rows.find(r=>r.id===v[1]);const saved=r.metadata.comprasTempAliases;r.metadata=JSON.parse(v[0]);if(q.includes("jsonb_build_object('comprasTempAliases'")&&saved)r.metadata.comprasTempAliases=saved;return [];}
   if(q.includes("'{physicalFile}'")){rows.find(r=>r.id===v[1]).metadata.physicalFile=JSON.parse(v[0]);return [];}
   if(q.includes("'{ocrCandidate}'")){rows.find(r=>r.id===v[1]).metadata.ocrCandidate=JSON.parse(v[0]);return [{id:v[1]}];}
   if(q.includes('SELECT *')&&q.includes('FOR UPDATE'))return [structuredClone(rows.find(r=>r.id===v[0]))];
   if(q.includes("'{integration,completed}'")){rows.find(r=>r.id===v[0]).metadata.integration.completed=true;return [];}
   if(q.includes("SET estado='requiere_reconciliacion'")){Object.assign(rows.find(r=>r.id===v[1]),{estado:'requiere_reconciliacion',promovida_en:'now',destino_storage_key:v[0]});return [];}
   if(q.includes('INSERT INTO core.auditoria_eventos'))return [];
   throw new Error('UNMODELLED_SQL '+q);
  });
  c.json=(value:any)=>value;
  c.unsafe=jest.fn(async(q:string)=>{if(q==='BEGIN'){inTransaction=true;c.active=true;}else if(q==='COMMIT'||q==='ROLLBACK'){inTransaction=false;c.active=false;release?.();release=undefined;}else throw Error(q);});
  return c;
 };
 const repo=new TmpRepository();
 jest.spyOn(repo,'locked').mockImplementation(async(key,work)=>{const unlock=await lock('session:'+key);try{const c=connection();return await session.run(c,()=>work(c));}finally{unlock();}});
 jest.spyOn(repo,'own').mockImplementation(async(_c,id,actor)=>{const r=rows.find(r=>r.id===id);if(!r||r.actor_id!==actor.actorId||r.workspace_id!==actor.workspaceId)throw Error('OWNER');return structuredClone(r);});
 jest.spyOn(repo,'assertDocumentalScope').mockResolvedValue(undefined);
 const objects=new Map<string,{hashSha256:string;tamanoBytes:number}>();
 const storage:any={
  statObject:jest.fn(async(x:any)=>({exists:objects.has(x.key),...objects.get(x.key)})),
  putObject:jest.fn(async(x:any)=>{expect(session.getStore()?.active).not.toBe(true);objects.set(x.key,{hashSha256:createHash('sha256').update(x.body).digest('hex'),tamanoBytes:x.body.length});return {kind:'CREATED',provider:'r2',bucket:x.bucket,key:x.key};})
 };
 const service=new TmpService(repo,{get:()=> 'dev'} as any,storage,{} as any,{} as any);
 const actor:any={actorId:7,workspaceId:12,empresaCodigo:'BBTI',clienteDestinoId:2,idempotencyKey:'original',requestId:'req',correlationId:'corr'};
 const context=comprasFacturaContext(4,551);
 const file={originalname:'one.pdf',mimetype:'application/pdf',buffer:Buffer.from('%PDF-1.4\nsynthetic invoice')};
 const reserve=(key:string,ctx:any=context,a:any=actor,f:any=file)=>service.reserve({...a,idempotencyKey:key},f,ctx);
 return {rows,repo,objects,storage,service,actor,context,file,reserve,connection,queries};
}

describe('Compras FACTURA reutilización cross-tab offline',()=>{
 it('misma clave/fingerprint reutiliza; fingerprint distinto conserva conflicto',async()=>{const f=fixture();const a=await f.reserve('a');expect((await f.reserve('a')).tempId).toBe(a.tempId);await expect(f.reserve('a',f.context,f.actor,{...f.file,originalname:'changed.pdf'})).rejects.toThrow('IDEMPOTENCY_CONFLICT');expect(f.rows).toHaveLength(1);expect(f.storage.putObject).toHaveBeenCalledTimes(1);});
 it('claves distintas equivalentes conservan identidad, nombre y caducidad originales',async()=>{const f=fixture();const a=await f.reserve('a');const expiry=f.rows[0].expira_en;const b=await f.reserve('b',f.context,f.actor,{...f.file,originalname:'another-name.pdf'});expect(b.tempId).toBe(a.tempId);expect(f.rows[0]).toMatchObject({idempotency_key:'a',nombre_archivo_original:'one.pdf',actor_id:7,workspace_id:12,expira_en:expiry});expect(f.rows[0].metadata.comprasTempAliases.b.fingerprint).toMatch(/^[0-9a-f]{64}$/);expect(f.storage.putObject).toHaveBeenCalledTimes(1);});
 it('alias replay tras promoción no crea TEMP ni consulta objeto original',async()=>{const f=fixture();await f.reserve('a');await f.reserve('b');Object.assign(f.rows[0],{estado:'completada',promovida_en:'now'});f.rows[0].metadata.documentalResult={documentoId:9};f.storage.statObject.mockClear();expect((await f.reserve('b')).estado).toBe('PROMOTED');expect(f.rows).toHaveLength(1);expect(f.storage.statObject).not.toHaveBeenCalled();});
 it('alias incompatible en contexto, actor, fingerprint o bucket no autoriza reutilización',async()=>{const f=fixture();await f.reserve('a');await f.reserve('b');
  await expect(f.service.reserve({...f.actor,idempotencyKey:'b'},f.file)).rejects.toThrow('IDEMPOTENCY_CONFLICT');
  await expect(f.reserve('b',comprasFacturaContext(4,552))).rejects.toThrow('IDEMPOTENCY_CONFLICT');await expect(f.reserve('b',f.context,{...f.actor,actorId:8})).rejects.toThrow('IDEMPOTENCY_CONFLICT');});
 it('dos reservas concurrentes usan una fila y un PUT, con xact lock dentro de BEGIN',async()=>{const f=fixture();const [a,b]=await Promise.all([f.reserve('a'),f.reserve('b')]);expect(a.tempId).toBe(b.tempId);expect(f.rows).toHaveLength(1);expect(f.storage.putObject).toHaveBeenCalledTimes(1);expect(f.queries.filter(q=>q.text.includes('pg_advisory_xact_lock'))).toHaveLength(2);});
 it.each(['actorId','workspaceId','empresaCodigo','clienteDestinoId'])('separa %s',async key=>{const f=fixture();const a=await f.reserve('a');const b=await f.reserve('b',f.context,{...f.actor,[key]:key==='empresaCodigo'?'BBTEC':99});expect(b.tempId).not.toBe(a.tempId);});
 it.each([comprasFacturaContext(5,551),comprasFacturaContext(4,552)])('separa contexto %j',async ctx=>{const f=fixture();const a=await f.reserve('a');expect((await f.reserve('b',ctx)).tempId).not.toBe(a.tempId);});
 it('recupera iniciada sin objeto mediante el mismo TEMP',async()=>{const f=fixture();await f.reserve('a');f.rows[0].estado='iniciada';f.objects.clear();expect((await f.reserve('b')).tempId).toBe(1);expect(f.rows[0].estado).toBe('almacenada');expect(f.rows).toHaveLength(1);});
 it('PUT existente con DB interrumpida se verifica sin otro PUT',async()=>{const f=fixture();await f.reserve('a');f.rows[0].estado='iniciada';await f.reserve('b');expect(f.storage.putObject).toHaveBeenCalledTimes(1);expect(f.rows[0].estado).toBe('almacenada');});
 it('almacenada ausente produce conflicto sin reparación',async()=>{const f=fixture();await f.reserve('a');f.objects.clear();await expect(f.reserve('b')).rejects.toThrow('OBJETO_AUSENTE');expect(f.rows).toHaveLength(1);expect(f.storage.putObject).toHaveBeenCalledTimes(1);});
 it('almacenada corrupta no se sobrescribe',async()=>{const f=fixture();await f.reserve('a');f.objects.set(f.rows[0].storage_key,{hashSha256:'bad',tamanoBytes:1});await expect(f.reserve('b')).rejects.toThrow();expect(f.storage.putObject).toHaveBeenCalledTimes(1);});
 it('vencida no se renueva: replay falla y otra clave crea una reserva distinta',async()=>{const f=fixture();await f.reserve('a');f.rows[0].expira_en='2000-01-01T00:00:00Z';await expect(f.reserve('a')).rejects.toThrow('EXPIRADO');expect((await f.reserve('b')).tempId).toBe(2);expect(f.rows[0].expira_en).toBe('2000-01-01T00:00:00Z');});
 it('múltiples equivalentes no se consolidan ni eligen arbitrariamente',async()=>{const f=fixture();await f.reserve('a');f.rows.push({...structuredClone(f.rows[0]),id:9,idempotency_key:'legacy'});await expect(f.reserve('b')).rejects.toThrow('EQUIVALENCIA_AMBIGUA');expect(f.rows).toHaveLength(2);});
 it.each(['DONE','PROCESSING'])('preserva OCR %s y borrador',async status=>{const f=fixture();await f.reserve('a');const original={ocrCandidate:{status,resultado:{monto:12}},borradorDocumental:{metadata:{numero:'F1'}}};Object.assign(f.rows[0].metadata,structuredClone(original));const result=await f.reserve('b');expect(result.ocrCandidate).toEqual(original.ocrCandidate);expect(result.borradorDocumental).toEqual(original.borradorDocumental);});
 it('confirmación reservada bloquea nueva clave sin nuevo TEMP',async()=>{const f=fixture();await f.reserve('a');f.rows[0].metadata.integration={consumer:'COMPRAS_TEMP_DOCUMENTAL'};await expect(f.reserve('b')).rejects.toThrow('CONFIRMACION_RESERVADA');expect(f.rows).toHaveLength(1);});
 it('relee bajo tempId y detecta confirmación que ganó después de reservar alias',async()=>{const f=fixture();await f.reserve('a');const own=f.repo.own as jest.Mock;own.mockImplementationOnce(async()=>{f.rows[0].metadata.integration={consumer:'COMPRAS_TEMP_DOCUMENTAL'};return structuredClone(f.rows[0]);});await expect(f.reserve('b')).rejects.toThrow('CONFIRMACION_RESERVADA');expect(f.storage.putObject).toHaveBeenCalledTimes(1);});
 it('save/bind con snapshot anterior no pierden alias; OCR y promoción lo conservan',async()=>{const f=fixture();await f.reserve('a');const stale=structuredClone(f.rows[0]);await f.reserve('b');const aliases=structuredClone(f.rows[0].metadata.comprasTempAliases);const c=f.connection();await f.repo.saveDocumentalMetadata(c,1,{...stale.metadata,borradorDocumental:{metadata:{numero:'F2'}}});expect(f.rows[0].metadata.comprasTempAliases).toEqual(aliases);await f.repo.bind(c,stale,'documentos/target.pdf','a');expect(f.rows[0].metadata.comprasTempAliases).toEqual(aliases);await f.repo.ocrProcessing(c,1,'FACTURA');expect(f.rows[0].metadata.comprasTempAliases).toEqual(aliases);await f.repo.ocrDone(c,1,'FACTURA',{});await f.repo.promoted(c,f.rows[0],f.actor,'documentos/target.pdf');expect(f.rows[0].metadata.comprasTempAliases).toEqual(aliases);});
 it('identidad física bucket/MIME/tamaño y tipo documental no se omiten de equivalencia',async()=>{
  const f=fixture();const file={name:'one.pdf',mime:'application/pdf',size:20,hash:'a'.repeat(64)};
  const base=(f.repo as any).comprasEquivalence(f.actor,file,'dev',f.context);
  for(const [changed,bucket] of [[{...file,size:21},'dev'],[{...file,mime:'image/png'},'dev'],[file,'other']] as any[])
    expect((f.repo as any).comprasEquivalence(f.actor,changed,bucket,f.context)).not.toBe(base);
  expect(()=>(f.repo as any).comprasEquivalence(f.actor,file,'dev',{...f.context,tipoDocumental:'OC'})).toThrow('CONTEXT_INVALID');
 });
 it('un alias conserva su fingerprint propio y rechaza otro nombre al reintentar esa clave',async()=>{const f=fixture();await f.reserve('a');await f.reserve('b',f.context,f.actor,{...f.file,originalname:'alias.pdf'});await expect(f.reserve('b')).rejects.toThrow('IDEMPOTENCY_CONFLICT');expect((await f.reserve('b',f.context,f.actor,{...f.file,originalname:'alias.pdf'})).tempId).toBe(1);});
 it('relectura rechaza cambio contextual entre reserva y bloqueo TEMP sin PUT',async()=>{const f=fixture();await f.reserve('a');(f.repo.own as jest.Mock).mockImplementationOnce(async()=>({...structuredClone(f.rows[0]),metadata:{comprasFactura:comprasFacturaContext(99,999)}}));await expect(f.reserve('b')).rejects.toThrow('CONTEXT_CONFLICT');expect(f.storage.putObject).toHaveBeenCalledTimes(1);});
 it('sin contexto no deduplica por equivalencia ni adquiere xact lock',async()=>{const f=fixture();await f.service.reserve({...f.actor,idempotencyKey:'a'},f.file);await f.service.reserve({...f.actor,idempotencyKey:'b'},f.file);expect(f.rows).toHaveLength(2);expect(f.queries.some(q=>q.text.includes('pg_advisory_xact_lock'))).toBe(false);});
});
