const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {ArchivadoMoveService}=require(path.join(process.env.BBTI_ARCHIVE_COMPILED,'archivado-move.service.js'));
const {ArchivadoRepository}=require(path.join(process.env.BBTI_ARCHIVE_COMPILED,'archivado.repository.js'));
function fixture({row:over={},enabled=false,absent=false}={}){
 const events=[],row={id:'1',archivo_id:5,documento_id:6,version:1,confirmado_en:'2026-11-19',r2_cuenta:'dev',r2_bucket:'dev-bucket',r2_key:'documentos/2026/11/BBTI/OC_1.pdf',r2_estado:'PRESENTE',sha256:'a'.repeat(64),tamano_bytes:'3',nas_estado:'PENDIENTE',lease_token:'lease',generacion:'1',delete_respuesta_http:null,delete_respuesta_en:null,...over};
 let deleted=absent;
 const repo={observarAusencia:async()=>events.push('absence-observed'),reclamar:async()=>row,renovar:async()=>events.push('renew'),nasVerificado:async()=>events.push('nas-durable'),iniciarEliminacion:async()=>events.push('intent-durable'),respuestaDelete:async()=>events.push('response-durable'),completar:async()=>events.push('complete'),liberar:async(_l,reason,uncertain)=>events.push([reason,uncertain])};
 const proof={sha256:row.sha256,bytes:3};
 const r2={identidad:()=>({cuenta:'dev',bucket:'dev-bucket'}),leer:async()=>{events.push('read');return []},comprobar:async()=>deleted?'AUSENTE':'PRESENTE',eliminarExacto:async()=>{events.push('delete');deleted=true;return{http:204,requestId:'request'}}};
 const nas={publicarSinReemplazo:async()=>{events.push('publish');return proof},verificar:async()=>{events.push('verify-nas');return proof}};
 const disponibilidad={verificarLectura:async()=>true,verificarReferenciasYExclusion:async()=>true};
 const service=()=>new ArchivadoMoveService(repo,r2,nas,disponibilidad,{eliminacionRealHabilitada:enabled});return{row,events,repo,r2,nas,disponibilidad,service};
}
test('default policy preserves R2 after verified NAS',async()=>{const f=fixture();assert.equal(await f.service().procesarUno('BBTI',1),'NAS_VERIFICADO_DELETE_DESHABILITADO');assert(!f.events.includes('delete'));assert(f.events.includes('nas-durable'))});
test('durable intent and response precede completion',async()=>{const f=fixture({enabled:true});assert.equal(await f.service().procesarUno('BBTI',1),'COMPLETADO');for(const[a,b]of[['nas-durable','intent-durable'],['intent-durable','delete'],['delete','response-durable'],['response-durable','complete']])assert(f.events.indexOf(a)<f.events.indexOf(b))});
test('wrong account stops before copying or deletion',async()=>{const f=fixture({enabled:true});f.r2.identidad=()=>({cuenta:'prod',bucket:'dev-bucket'});await assert.rejects(()=>f.service().procesarUno('BBTI',1),/ENTORNO_NO_COINCIDE/);assert(!f.events.includes('read'));assert(!f.events.includes('delete'))});
test('incomplete reservation never reaches storage',async()=>{const f=fixture({row:{confirmado_en:null}});await assert.rejects(()=>f.service().procesarUno('BBTI',1),/NO_CONFIRMADO/);assert(!f.events.includes('read'))});
test('NAS hash mismatch prevents delete',async()=>{const f=fixture({enabled:true});f.nas.publicarSinReemplazo=async()=>({sha256:'b'.repeat(64),bytes:3});await assert.rejects(()=>f.service().procesarUno('BBTI',1),/INTEGRIDAD_NO_COINCIDE/);assert(!f.events.includes('delete'))});
test('viewer failure prevents deletion',async()=>{const f=fixture({enabled:true});f.disponibilidad.verificarLectura=async()=>false;assert.equal(await f.service().procesarUno('BBTI',1),'NAS_VERIFICADO_VISOR_PENDIENTE');assert(f.events.includes('nas-durable'));assert(!f.events.includes('delete'))});
test('shared reference/exclusion failure prevents deletion',async()=>{const f=fixture({enabled:true});f.disponibilidad.verificarReferenciasYExclusion=async()=>false;await assert.rejects(()=>f.service().procesarUno('BBTI',1),/REFERENCIAS_O_EXCLUSION/);assert(!f.events.includes('delete'))});
test('lost response and 404 stays uncertain without another DELETE',async()=>{const f=fixture({row:{r2_estado:'ELIMINACION_INCIERTA',nas_estado:'VERIFICADO'},enabled:true,absent:true});assert.equal(await f.service().procesarUno('BBTI',1),'ELIMINACION_INCIERTA');assert(!f.events.includes('delete'));assert(!f.events.includes('complete'))});
test('persisted successful DELETE plus 404 recovers completion',async()=>{const f=fixture({row:{r2_estado:'ELIMINACION_INCIERTA',nas_estado:'VERIFICADO',delete_respuesta_http:204,delete_respuesta_en:'2026-11-19T01:00:01Z',eliminacion_iniciada_en:'2026-11-19T01:00:00Z',eliminacion_intento_id:'attempt-a',delete_respuesta_intento_id:'attempt-a'},enabled:true,absent:true});assert.equal(await f.service().procesarUno('BBTI',1),'COMPLETADO');assert(!f.events.includes('delete'))});
test('lost lease prevents stale worker writes and deletion',async()=>{const f=fixture({enabled:true});f.repo.renovar=async()=>{throw Error('ARCHIVADO_LEASE_PERDIDO')};await assert.rejects(()=>f.service().procesarUno('BBTI',1),/LEASE_PERDIDO/);assert.deepEqual(f.events,[])});
test('DELETE succeeded but response persistence failed remains uncertain',async()=>{const f=fixture({enabled:true});f.repo.respuestaDelete=async()=>{throw Error('DB_UNAVAILABLE')};await assert.rejects(()=>f.service().procesarUno('BBTI',1),/IO_ERROR/);assert(f.events.includes('delete'));assert(!f.events.includes('complete'));assert.deepEqual(f.events.at(-1),['ARCHIVADO_IO_ERROR',true])});
const reservation={reservaId:'reservation',empresa:'BBTI',clienteId:1,expedienteId:2,workspaceId:3,contexto:{},regla:'R1',anio:2026,mes:11,cuenta:'dev',bucket:'bucket',key:'documentos/2026/11/BBTI/OC_1.pdf',sha256:'a'.repeat(64),bytes:3,nasDestino:'DEV',ruta:'documentos/2026/11/BBTI/OC_1.pdf',actorId:4};
test('archived permanent identity cannot replay a PUT',async()=>{const results=[[],[{id:'1',r2_estado:'ELIMINADO_ACREDITADO'}]];const repo=new ArchivadoRepository({query:async()=>results.shift()});await assert.rejects(()=>repo.reservar(reservation),/IDENTIDAD_YA_ARCHIVADA/)});
test('different reservation colliding with durable path cannot adopt it',async()=>{const repo=new ArchivadoRepository({query:async()=>[]});await assert.rejects(()=>repo.reservar(reservation),/COLISION_RESERVA_PERMANENTE/)});
test('stale CAS is rejected explicitly',async()=>{const repo=new ArchivadoRepository({query:async()=>[]});await assert.rejects(()=>repo.renovar({id:'1',token:'old',generacion:'1'}),/LEASE_PERDIDO/)});

test('NAS durable state precedes exercising the actual viewer',async()=>{const f=fixture();f.disponibilidad.verificarLectura=async()=>{assert(f.events.includes('nas-durable'));return false};assert.equal(await f.service().procesarUno('BBTI',1),'NAS_VERIFICADO_VISOR_PENDIENTE')});
test('response from a previous attempt cannot complete current deletion',async()=>{const f=fixture({row:{r2_estado:'ELIMINACION_INCIERTA',nas_estado:'VERIFICADO',eliminacion_intento_id:'current',delete_respuesta_intento_id:'previous',eliminacion_iniciada_en:'2026-11-19T01:00:00Z',delete_respuesta_en:'2026-11-19T01:00:01Z',delete_respuesta_http:204},enabled:true,absent:true});assert.equal(await f.service().procesarUno('BBTI',1),'ELIMINACION_INCIERTA');assert(!f.events.includes('complete'))});
test('repository binds deletion response to exact persisted attempt',async()=>{let call;const repo=new ArchivadoRepository({query:async(q,v)=>{call={q,v};return[{id:1}]}});await repo.respuestaDelete({id:'1',token:'lease',generacion:'2'},'attempt',204,'request');assert(call.q.includes('AND eliminacion_intento_id=$8::uuid'));assert.equal(call.v.at(-1),'attempt');assert(call.q.includes('respuestaAnterior'));});
test('new late document materializes and binds final location before NAS read',async()=>{const f=fixture({row:{contexto:{modo:'NUEVO_TARDIO',origenFisico:{bucket:'dev-bucket',key:'old'}}}});f.r2.materializar=async()=>f.events.push('materialize');f.repo.materializado=async()=>f.events.push('bind');await f.service().procesarUno('BBTI',1);assert(f.events.indexOf('materialize')<f.events.indexOf('bind'));assert(f.events.indexOf('bind')<f.events.indexOf('read'));assert(!f.events.includes('delete'))});
test('observed absence is persisted without inventing DELETE response',async()=>{const f=fixture({row:{nas_estado:'VERIFICADO'},absent:true});await assert.rejects(()=>f.service().procesarUno('BBTI',1),/ORIGEN_AUSENTE_SIN_DELETE/);assert(f.events.includes('absence-observed'));assert(!f.events.includes('response-durable'));assert(!f.events.includes('complete'))});


test('reclamacion exacta conserva identidad y lease',async()=>{
 let call;
 const repo=new ArchivadoRepository({query:async(q,v)=>{
   call={q,v};return[{id:'2',archivo_id:546,documento_id:541,lease_token:v[6],generacion:'1'}];
 }});
 const row=await repo.reclamarReservaExacta(2,546,541,'BBTI',2,121);
 assert.equal(row.id,'2');
 assert.deepEqual(call.v.slice(0,6),[2,546,541,'BBTI',2,121]);
 assert.match(call.v[6],/^[0-9a-f-]{36}$/);
 for(const clause of [
   'id=$1::bigint','archivo_id=$2','documento_id=$3',
   'empresa_codigo=$4','cliente_destino_id=$5',
   'expediente_id IS NOT DISTINCT FROM $6::bigint','FOR UPDATE SKIP LOCKED',
   "trabajo_estado='PROCESANDO'",'generacion=a.generacion+1',
   'lease_token=$7'
 ])assert(call.q.includes(clause),clause);
});

test('reclamacion exacta rechaza identidad invalida sin SQL',async()=>{
 let queries=0;
 const repo=new ArchivadoRepository({query:async()=>{queries++;return[]}});
 await assert.rejects(
   ()=>repo.reclamarReservaExacta(2,0,541,'BBTI',2,121),
   /IDENTIDAD_FOCAL_INVALIDA/
 );
 assert.equal(queries,0);
});

test('reserva ocupada o identidad ajena no reclama otro trabajo',async()=>{
 let queries=0;
 const repo=new ArchivadoRepository({query:async(q,v)=>{
   queries++;
   assert(q.includes('id=$1::bigint'));
   assert.equal(v[0],2);
   return[];
 }});
 assert.equal(await repo.reclamarReservaExacta(2,546,541,'BBTI',2,121),null);
 assert.equal(queries,1);
});

test('movimiento focal no utiliza selector general',async()=>{
 const f=fixture();
 let claims=0;
 f.repo.reclamar=async()=>{throw Error('SELECTOR_GENERAL_PROHIBIDO')};
 f.repo.reclamarReservaExacta=async(...args)=>{
   claims++;
   assert.deepEqual(args,[2,546,541,'BBTI',2,121]);
   return null;
 };
 assert.equal(
   await f.service().procesarReservaExacta(2,546,541,'BBTI',2,121),
   'SIN_TRABAJO'
 );
 assert.equal(claims,1);
 assert.deepEqual(f.events,[]);
});

test('exact OP without expediente is fenced by persisted operational relationships',async()=>{
 let call;const repo=new ArchivadoRepository({query:async(q,v)=>{call={q,v};return[]}});
 assert.equal(await repo.reclamarReservaExacta(8,900,901,'BBTI',2,null,1),null);
 assert.deepEqual(call.v.slice(0,6),[8,900,901,'BBTI',2,null]);
 assert.equal(call.v[7],1);
 for(const part of ["p.tipo_principal='ORDEN_PAGO'","c.expediente_v1_id IS NULL","c.empresa_codigo=$4","c.cliente_destino_id=$5","r.documento_id=$3","version=$8::integer"])assert(call.q.includes(part),part);
});
function conOrigen({enabled=true,lost=false,refs=true}={}){
 const f=fixture({enabled,row:{contexto:{modo:'NUEVO',origenMaterializacion:{bucket:'dev-bucket',key:'documentos/2026/11/BBTI/technical.pdf'}},evidencia:[]}});
 let present=true;
 f.r2.comprobarOrigen=async()=>present?'PRESENTE':'AUSENTE';
 f.r2.verificarOrigen=async()=>f.events.push('verify-origin');
 f.r2.eliminarOrigen=async()=>{present=false;f.events.push('delete-origin');if(lost)throw Error('lost response');return{http:204,requestId:'origin-request'}};
 f.disponibilidad.verificarOrigenMaterializacion=async()=>refs;
 f.repo.evidenciaOrigen=async(_l,evento,datos)=>{f.events.push(evento);f.row.evidencia.push({evento,datos,fecha:new Date().toISOString()})};
 return f;
}
test('completed ordinary MOVE leaves only NAS, not canonical or technical R2 copies',async()=>{
 const f=conOrigen();assert.equal(await f.service().procesarUno('BBTI',1),'COMPLETADO');
 assert.equal(await f.r2.comprobarOrigen(f.row),'AUSENTE');assert.equal(await f.r2.comprobar(f.row),'AUSENTE');
 for(const[a,b]of[['nas-durable','delete-origin'],['ORIGEN_INTENTO','delete-origin'],['delete-origin','ORIGEN_RESPUESTA'],['ORIGEN_RESPUESTA','ORIGEN_AUSENCIA'],['ORIGEN_AUSENCIA','delete']])assert(f.events.indexOf(a)<f.events.indexOf(b),a+' before '+b);
});
test('without explicit DELETE authorization both R2 copies are preserved',async()=>{
 const f=conOrigen({enabled:false});assert.equal(await f.service().procesarUno('BBTI',1),'NAS_VERIFICADO_DELETE_DESHABILITADO');
 assert(!f.events.includes('delete-origin'));assert(!f.events.includes('delete'));
});
test('shared origin reference prevents cleanup and canonical deletion',async()=>{
 const f=conOrigen({refs:false});await assert.rejects(()=>f.service().procesarUno('BBTI',1),/ORIGEN_REFERENCIAS_PENDIENTES/);
 assert(!f.events.includes('delete-origin'));assert(!f.events.includes('delete'));
});
test('lost origin DELETE response is not retried or falsely accredited from 404',async()=>{
 const f=conOrigen({lost:true});await assert.rejects(()=>f.service().procesarUno('BBTI',1),/IO_ERROR/);
 await assert.rejects(()=>f.service().procesarUno('BBTI',1),/ORIGEN_ELIMINACION_INCIERTA/);
 assert.equal(f.events.filter(e=>e==='delete-origin').length,1);assert(!f.events.includes('delete'));assert(!f.events.includes('complete'));
});
test('NUEVO_TARDIO destructive guard remains intact',async()=>{
 const f=fixture({enabled:true,row:{contexto:{modo:'NUEVO_TARDIO',origenFisico:{bucket:'dev-bucket',key:'different'}}}});
 f.r2.materializar=async()=>{};f.repo.materializado=async()=>{};
 await assert.rejects(()=>f.service().procesarUno('BBTI',1),/ORIGEN_PREVIO_REQUIERE_REGULARIZACION/);
 assert(!f.events.includes('delete'));
});
test('successful durable origin response recovers missing absence acknowledgement without another DELETE',async()=>{
 const f=conOrigen();const record=f.repo.evidenciaOrigen;let fail=true;
 f.repo.evidenciaOrigen=async(l,event,data)=>{if(event==='ORIGEN_AUSENCIA'&&fail){fail=false;throw Error('DB unavailable')}return record(l,event,data)};
 await assert.rejects(()=>f.service().procesarUno('BBTI',1),/IO_ERROR/);
 assert.equal(await f.service().procesarUno('BBTI',1),'COMPLETADO');
 assert.equal(f.events.filter(e=>e==='delete-origin').length,1);assert.equal(f.events.filter(e=>e==='delete').length,1);
});
test('source deletion journal is additive and fenced by the same lease and generation',async()=>{
 let call;const repo=new ArchivadoRepository({query:async(q,v)=>{call={q,v};return[{evento:{evento:'ORIGEN_INTENTO',datos:{intento:'a'},fecha:'2026-11-23T00:00:00Z'}}]}});
 await repo.evidenciaOrigen({id:'1',token:'lease',generacion:'2'},'ORIGEN_INTENTO',{intento:'a',key:'exact-key'});
 assert.deepEqual(call.v.slice(0,4),['1','lease','2','ORIGEN_INTENTO']);
 assert.deepEqual(JSON.parse(call.v[4]),{intento:'a',key:'exact-key'});
 for(const part of ['evidencia=evidencia||','lease_token=$2','generacion=$3','lease_hasta>clock_timestamp()'])assert(call.q.includes(part));
});
test('shared reservation INSERT and replay send JSON text without mutating context',async()=>{
 const original={origen:'COMPRAS',tempId:385,tipo:'OC',documentoBaseId:null,nested:{values:[1,null,'á']}};
 const calls=[],repo=new ArchivadoRepository({query:async(q,v)=>{calls.push({q,v});return calls.length===1?[]:[{id:'1',r2_estado:'PRESENTE'}]}});
 assert.equal(await repo.reservar({...reservation,contexto:original}),'REPLAY');
 assert.equal(calls.length,2);
 for(const {v} of calls){assert.equal(typeof v[5],'string');assert(Buffer.byteLength(v[5])>0);assert.deepEqual(JSON.parse(v[5]),original)}
 assert.equal(calls[0].v[5],calls[1].v[5]);assert.equal(original.nested.values[2],'á');
});
test('uncertain earlier DELETE still present is never automatically repeated',async()=>{
 const f=fixture({enabled:true,row:{r2_estado:'ELIMINACION_INCIERTA',nas_estado:'VERIFICADO'}});
 assert.equal(await f.service().procesarUno('BBTI',1),'ELIMINACION_INCIERTA');
 assert(!f.events.includes('delete'));assert(!f.events.includes('complete'));
});
test('production authorization and source verification must be durable before DELETE intent',async()=>{
 const f=fixture({enabled:true});
 f.disponibilidad.autorizarEliminacion=async()=>({decisionId:'PO-TEST',proteccion:'SYNTHETIC'});
 f.repo.autorizarEliminacion=async()=>f.events.push('production-decision-durable');
 f.r2.verificarParaEliminar=async()=>{f.events.push('source-bytes-reverified');return {etag:'"identity"',sha256:f.row.sha256,bytes:3}};
 const s=new ArchivadoMoveService(f.repo,f.r2,f.nas,f.disponibilidad,{eliminacionRealHabilitada:true,autorizacionDurableRequerida:true});
 assert.equal(await s.procesarUno('BBTI',1),'COMPLETADO');
 assert(f.events.indexOf('production-decision-durable')<f.events.indexOf('intent-durable'));
 assert(f.events.indexOf('source-bytes-reverified')<f.events.indexOf('delete'));
});
test('revoked production decision or failed audit cannot issue DELETE',async()=>{
 for(const failAudit of [false,true]){
  const f=fixture({enabled:true});
  f.disponibilidad.autorizarEliminacion=async()=>failAudit?{decisionId:'PO-TEST'}:null;
  f.r2.verificarParaEliminar=async()=>({etag:'"identity"',sha256:f.row.sha256,bytes:3});f.repo.autorizarEliminacion=async()=>{throw Error('DB unavailable')};
  const s=new ArchivadoMoveService(f.repo,f.r2,f.nas,f.disponibilidad,{eliminacionRealHabilitada:true,autorizacionDurableRequerida:true});
  await assert.rejects(()=>s.procesarUno('BBTI',1));assert(!f.events.includes('delete'));
 }
});
