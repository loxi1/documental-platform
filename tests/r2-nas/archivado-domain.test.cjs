const{test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const{ArchivadoDocumentalService}=require(path.join(process.env.BBTI_ARCHIVE_COMPILED,'archivado-documental.service.js'));
const row={id:382,empresa_codigo:'BBTI',cliente_destino_id:2,workspace_id:4,storage_bucket:'dev',hash_sha256:'a'.repeat(64),tamano_bytes:123,content_type:'application/pdf'};
const input={tipoDocumental:'FACTURA',expedienteId:121,documentoBaseId:541,metadata:{numero:'004198',serie:'F004',ruc:'20123456789',fechaEmision:'1999-01-01'}};
const technical='documentos/2026/11/BBTI/382__original.pdf';
const config=(enabled=true)=>({get:k=>({R2_NAS_ARCHIVE_ENABLED:enabled?'true':'false',R2_ACCOUNT_ID:'devaccount'})[k]});
function fixture(){const calls=[];return{calls,tx:{unsafe:async(q,v)=>{calls.push({q,v});if(q.startsWith('SELECT d.tipo_documental'))return[{tipo_documental:'OC',numero:'008979'}];if(q.includes('INSERT INTO'))return[{id:1}];return[{id:1}]}}}}
test('feature off preserves existing key and never queries table',async()=>{const s=new ArchivadoDocumentalService(config(false));const r=await s.prepararCompras({unsafe:async()=>assert.fail('no SQL')},row,input,technical,{actorId:4},'fingerprint');assert.equal(r.destination,technical);assert.equal(r.reserva,null)});
test('semantic key consumes already resolved period not metadata date',async()=>{const f=fixture(),s=new ArchivadoDocumentalService(config());const r=await s.prepararCompras(f.tx,row,input,technical,{actorId:4},'fingerprint');assert.equal(r.destination,'documentos/2026/11/BBTI/OC_008979__FACTURA_F004-004198_20123456789.pdf');const insert=f.calls.find(c=>c.q.includes('INSERT INTO'));assert.equal(insert.v[7],2026);assert.equal(insert.v[8],11);assert.equal(insert.v[11],r.destination)});
test('principal comes from authorized PostgreSQL context not original filename',async()=>{const f=fixture(),s=new ArchivadoDocumentalService(config());await s.prepararCompras(f.tx,{...row,nombre_archivo_original:'OS_999999.pdf'},input,technical,{actorId:4},'f');const query=f.calls[0];assert.deepEqual(query.v,[541,'BBTI',2,121]);assert(query.q.includes('f.expediente_id=$4'));assert(query.q.includes("d.estado='confirmado'"))});
test('same domain request reserves stable identity before PUT',async()=>{const f=fixture(),s=new ArchivadoDocumentalService(config());const a=await s.prepararCompras(f.tx,row,input,technical,{actorId:4},'f');const b=await s.prepararCompras(f.tx,row,input,technical,{actorId:4},'f');assert.equal(a.reserva.reservaId,b.reserva.reservaId)});
test('missing rule preserves upload and records only archive blockage',async()=>{const f=fixture(),s=new ArchivadoDocumentalService(config());const r=await s.prepararCompras(f.tx,row,{...input,metadata:{...input.metadata,ruc:''}},technical,{actorId:4},'f');assert.equal(r.destination,technical);assert.equal(r.reserva,null);assert(r.bloqueo);assert(!f.calls.some(c=>c.q.includes('INSERT INTO')))});
test('semantic namespace requires durable reservation proof',async()=>{const f=fixture(),s=new ArchivadoDocumentalService(config());assert.equal(await s.acreditarDestino(f.tx,row,'documentos/2026/11/BBTI/OC_1.pdf'),false);assert.equal(f.calls.length,0)});
test('confirmation uses supplied domain transaction and exact file',async()=>{const f=fixture(),s=new ArchivadoDocumentalService(config());await s.confirmar(f.tx,{metadata:{archivadoReserva:{reservaId:'r'}}},10,11);assert.deepEqual(f.calls[0].v,['r',10,11,1]);assert(f.calls[0].q.includes("d.estado='confirmado'"))});

test('semantic collision preserves existing path and ordinary technical fallback',async()=>{
 const tx={unsafe:async q=>q.startsWith('SELECT d.tipo_documental')?[{tipo_documental:'OC',numero:'008979'}]:[]};
 const s=new ArchivadoDocumentalService(config());const r=await s.prepararCompras(tx,row,input,technical,{actorId:4},'f');
 assert.equal(r.destination,technical);assert.equal(r.reserva,null);assert.equal(r.bloqueo,'COLISION_NOMENCLATURA_REQUIERE_REGLA');
});
test('OP consumes its persisted documentary number and existing period',async()=>{const calls=[],s=new ArchivadoDocumentalService(config());const tx={unsafe:async(q,v)=>{calls.push({q,v});return q.startsWith('SELECT d.numero')?[{numero:'0000000163',expediente_v1_id:121}]:[{id:1}]}};const r=await s.prepararOp(tx,row,{documentoId:10,ordenPagoId:163},technical,{id:4},'operation');assert.equal(r.destination,'documentos/2026/11/BBTI/OP_0000000163.pdf');assert.deepEqual(calls[0].v,[10,163,'BBTI',2])});
test('final confirmation hook off never touches SQL',async()=>{const s=new ArchivadoDocumentalService(config(false));await s.registrarDocumentoConfirmado({unsafe:async()=>assert.fail('no SQL')},10,4,'ALMACEN')});
function guiaHook(key,nuevo=false){const calls=[],file={id:10,documento_id:11,version:1,storage_key:key,storage_bucket:'dev',empresa_codigo:'BBTI',cliente_destino_id:2,workspace_id:4,expediente_id:121,hash_sha256:'a'.repeat(64),bytes:100,documento_mime:'application/pdf',tipo_documental:'GUIA_REMISION',numero:'9261',serie:'T001',ruc_emisor:'20123456789',metadata:nuevo?{archivadoNuevo:true}:{}};const tx={unsafe:async(q,v)=>{calls.push({q,v});if(q.startsWith('SELECT f.*'))return[file];if(q.includes('SELECT id FROM documentos.archivados_documentales')&&q.includes('WHERE archivo_id=$1'))return[];if(q.startsWith('SELECT DISTINCT'))return[{principal_id:9,tipo_documental:'OC',numero:'008410',grupo_id:30,factura_documento_id:31,fecha_factura:'2026-11-01'}];return[{id:1}]}};return{calls,tx,file}}
test('historical Guia preserves physical R2 key and directly reserves semantic NAS route',async()=>{const key='documentos/2026/11/BBTI/10__original.pdf',f=guiaHook(key);await new ArchivadoDocumentalService(config()).registrarDocumentoConfirmado(f.tx,11,4,'ALMACEN');const call=f.calls.find(c=>c.q.includes('INSERT INTO'));assert.equal(call.v[11],key);assert.equal(call.v[15],'documentos/2026/11/BBTI/OC_008410__GUIA_T001-9261_20123456789.pdf');assert.equal(JSON.parse(call.v[5]).modo,'HISTORICO')});
test('new Guia uses precommit materializer, not NUEVO_TARDIO',async()=>{
 const f=guiaHook('documentos/2026/11/BBTI/10__original.pdf',true);let planned;
 const materializer={ejecutar:async(tx,file,n,periodo)=>{planned={tx,file,n,periodo}}};
 await new ArchivadoDocumentalService(config(),undefined,materializer).registrarDocumentoConfirmado(f.tx,11,4,'ALMACEN');
 assert.equal(planned.tx,f.tx);assert.equal(planned.n.rutaRelativa,'documentos/2026/11/BBTI/OC_008410__GUIA_T001-9261_20123456789.pdf');
 assert(!f.calls.some(c=>c.q.includes('INSERT INTO')));
});

test('Guia definitive key registers intent using same confirmation executor',async()=>{const f=guiaHook('documentos/2026/11/BBTI/OC_008410__GUIA_T001-9261_20123456789.pdf');await new ArchivadoDocumentalService(config()).registrarDocumentoConfirmado(f.tx,11,4,'ALMACEN');assert(f.calls.some(c=>c.q.includes('INSERT INTO documentos.archivados_documentales')));assert(f.calls.at(-1).q.includes("d.estado='confirmado'"))});
test('regularizador OP reserva antes del PUT y consume periodo existente, no fecha factura',async()=>{
 const calls=[],tx={unsafe:async(q,v)=>{calls.push({q,v});
  if(q.startsWith('SELECT p.documento_id'))return[{documento_id:70,expediente_v1_id:null}];
  if(q.startsWith('SELECT d.tipo_documental'))return[{tipo_documental:'ORDEN_PAGO',numero:'163'}];
  return[{id:1}];
 }};
 const result=await new ArchivadoDocumentalService(config()).prepararRegularizador(tx,row,30,'RECIBO_HONORARIO',
  {serie:'E001',numero:'94',rucEmisor:'20123456789',fechaEmision:'1999-01-01'},technical,{actorId:4},'stable');
 assert.equal(result.destination,'documentos/2026/11/BBTI/OP_163__RH_E001-94_20123456789.pdf');
 const insert=calls.find(c=>c.q.includes('INSERT INTO'));
 assert.equal(insert.v[3],null);assert.equal(JSON.parse(insert.v[5]).ordenPagoId,30);
 assert.equal(insert.v[7],2026);assert.equal(insert.v[8],11);
});
test('principales distintos de igual numero siguen siendo ambiguos',async()=>{
 const f=guiaHook('documentos/2026/11/BBTI/technical.pdf',true),old=f.tx.unsafe;
 f.tx.unsafe=async(q,v)=>q.startsWith('SELECT DISTINCT')?
  [{principal_id:1,tipo_documental:'OC',numero:'008410'},{principal_id:2,tipo_documental:'OC',numero:'008410'}]:old(q,v);
 await new ArchivadoDocumentalService(config()).registrarDocumentoConfirmado(f.tx,11,4,'ALMACEN');
 assert(!f.calls.some(c=>c.q.includes('INSERT INTO documentos.archivados_documentales')));
 assert(f.calls.some(c=>c.q.startsWith('UPDATE documentos.documentos_archivos')&&c.v[1]==='ARCHIVADO_ASOCIACION_NO_UNIVOCA'));
});
test('replay archivado verifica identidad durable sin HEAD ni PUT',async()=>{
 let values;const s=new ArchivadoDocumentalService(config());
 const r={...row,promovida_en:'2026-11-23',archivo_id:700,documento_id:701,
  metadata:{archivadoReserva:{reservaId:'uuid',key:technical},destinoReservado:technical,integration:{completed:true}}};
 assert.equal(await s.confirmacionArchivada({unsafe:async(q,v)=>{values=v;assert(q.includes("r2_estado='ELIMINADO_ACREDITADO'"));return[{id:1}]}},r,technical),true);
 assert.deepEqual(values.slice(0,5),['uuid',700,701,'dev',technical]);
 assert.equal(await s.confirmacionArchivada({unsafe:async()=>assert.fail('no SQL')},r,'other'),false);
});
test('TMP pre-reservado no crea una segunda identidad durante integracion V2',async()=>{
 let calls=0;
 const tx={unsafe:async(q)=>{calls++;assert(q.startsWith('SELECT f.*'));return[{id:10,documento_id:11,version:1,
  origen_archivo:'TEMP_DOCUMENTAL',metadata:{archivadoReserva:{reservaId:'existing'}}}]}};
 await new ArchivadoDocumentalService(config()).registrarDocumentoConfirmado(tx,11,4,'CONFIRMACION_DOCUMENTAL');
 assert.equal(calls,1);
});

test('OC normal resolves emission period before canonical PUT, never upload month',async()=>{
 const f=guiaHook('documentos/2026/11/BBTI/technical.pdf',true);Object.assign(f.file,{tipo_documental:'OC',numero:'3214',fecha_emision_documental:'2026-04-02'});
 let plan;const materializer={ejecutar:async(_tx,_f,n,p)=>{plan={n,p}}};
 await new ArchivadoDocumentalService(config(),undefined,materializer).registrarDocumentoConfirmado(f.tx,11,4,'CONFIRMACION_SIMPLE',10);
 assert.equal(plan.n.rutaRelativa,'documentos/2026/04/BBTI/OC_3214.pdf');assert.equal(plan.p.mes,4);
});
test('missing emission fails closed instead of inventing upload period for new file',async()=>{
 const f=guiaHook('documentos/2026/11/BBTI/technical.pdf',true);Object.assign(f.file,{tipo_documental:'OC',numero:'3214'});
 await new ArchivadoDocumentalService(config(),undefined,{ejecutar:async()=>assert.fail('no PUT')}).registrarDocumentoConfirmado(f.tx,11,4,'CONFIRMACION_SIMPLE');
 assert(f.calls.some(c=>c.v[1]==='ARCHIVADO_PERIODO_DOCUMENTAL_INCOMPLETO'));
});
test('Factura OC discovers its principal through founding group, not only attachment links',async()=>{
 const f=guiaHook('documentos/2026/11/BBTI/technical.pdf',true);
 Object.assign(f.file,{tipo_documental:'FACTURA',numero:'22',serie:'F001',fecha_emision_documental:'2026-04-20'});
 let plan;await new ArchivadoDocumentalService(config(),undefined,{ejecutar:async(_tx,_f,n)=>{plan=n}}).registrarDocumentoConfirmado(f.tx,11,4,'CONFIRMACION_DOCUMENTAL');
 assert.equal(plan.rutaRelativa,'documentos/2026/04/BBTI/OC_008410__FACTURA_F001-22_20123456789.pdf');
 assert(f.calls.some(c=>c.q.includes('OR g.factura_documento_id=$1')));
 assert(f.calls[0].q.includes('FOR UPDATE OF f,d'));
});
test('RH OP uses persisted OP emission rather than its own date',async()=>{
 const f=guiaHook('documentos/2026/11/BBTI/technical.pdf',true),old=f.tx.unsafe;
 Object.assign(f.file,{tipo_documental:'RECIBO_HONORARIO',numero:'94',serie:'E001',fecha_emision_documental:'2026-05-20',expediente_id:null});
 f.tx.unsafe=async(q,v)=>q.startsWith('SELECT DISTINCT')?[{principal_id:163,tipo_documental:'ORDEN_PAGO',numero:'0000000163',fecha_principal:'2026-04-02'}]:old(q,v);
 let plan;await new ArchivadoDocumentalService(config(),undefined,{ejecutar:async(_tx,_f,n)=>{plan=n}}).registrarDocumentoConfirmado(f.tx,11,4,'REGULARIZACION_OP');
 assert.equal(plan.rutaRelativa,'documentos/2026/04/BBTI/OP_0000000163__RH_E001-94_20123456789.pdf');
});
