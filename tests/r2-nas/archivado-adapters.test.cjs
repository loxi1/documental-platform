const{test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const{ArchivadoR2Adapter}=require(path.join(process.env.BBTI_ARCHIVE_COMPILED,'archivado-r2.adapter.js'));
const{ArchivadoSmbAdapter}=require(path.join(process.env.BBTI_ARCHIVE_COMPILED,'archivado-smb.adapter.js'));
const row={r2_cuenta:'dev',r2_bucket:'bucket',r2_key:'documentos/2026/11/BBTI/OC_1.pdf',tamano_bytes:'3',sha256:'a'.repeat(64)};
test('R2 exact delete uses only reserved key',async()=>{let input;const a=new ArchivadoR2Adapter({send:async c=>{input=c.input;return{$metadata:{httpStatusCode:204}}}},'dev','bucket');assert.equal((await a.eliminarExacto(row)).http,204);assert.deepEqual(input,{Bucket:'bucket',Key:row.r2_key})});
test('R2 wrong account rejected before SDK call',async()=>{let calls=0;const a=new ArchivadoR2Adapter({send:async()=>calls++},'dev','bucket');await assert.rejects(()=>a.eliminarExacto({...row,r2_cuenta:'prod'}),/ENTORNO_NO_COINCIDE/);assert.equal(calls,0)});
test('R2 TEMP rejected before SDK call',async()=>{const a=new ArchivadoR2Adapter({send:async()=>assert.fail('SDK must not run')},'dev','bucket');await assert.rejects(()=>a.eliminarExacto({...row,r2_key:'documentos/tmp/1/2'}),/ENTORNO_NO_COINCIDE/)});
for(const code of [403,500])test('R2 '+code+' is not absence',async()=>{const a=new ArchivadoR2Adapter({send:async()=>{throw{$metadata:{httpStatusCode:code}}}},'dev','bucket');await assert.rejects(()=>a.comprobar(row))});
test('R2 404 is observed absence',async()=>{const a=new ArchivadoR2Adapter({send:async()=>{throw{$metadata:{httpStatusCode:404}}}},'dev','bucket');assert.equal(await a.comprobar(row),'AUSENTE')});
test('HEAD hash mismatch rejected',async()=>{const a=new ArchivadoR2Adapter({send:async()=>({ContentLength:3,Metadata:{sha256:'b'.repeat(64)}})},'dev','bucket');await assert.rejects(()=>a.comprobar(row),/HASH_NO_COINCIDE/)});
const config={host:'192.168.0.198',share:'GESTION-DOCUMENTARIA',raiz:'_DEV_DOCUMENTAL_PLATFORM',usuario:'documental_platform_dev',password:()=>assert.fail('No credentials needed for invalid paths'),destino:'DEV'};
test('SMB rejects non DEV destination',()=>assert.throws(()=>new ArchivadoSmbAdapter({...config,raiz:'PRODUCTION'}),/DESTINO_NO_AUTORIZADO/));
for(const route of ['../secret','documentos/2026/11/BBTI/OC_1.pdf;quit','documentos/2026/11/BBTI/../file.pdf','documentos/2026/13/BBTI/OC_1.pdf'])test('SMB rejects unsafe path '+route,async()=>{const a=new ArchivadoSmbAdapter(config);await assert.rejects(()=>a.verificar({nas_destino:'DEV',ruta_relativa:route}),/RUTA_INVALIDA/)});
test('late materialization reuses existing safe transfer and preserves original',async()=>{const calls=[],r={...row,reserva_id:'reservation',contexto:{modo:'NUEVO_TARDIO',origenFisico:{bucket:'bucket',key:'documentos/2026/11/BBTI/old.pdf'}}};const a=new ArchivadoR2Adapter({send:async()=>{throw{$metadata:{httpStatusCode:404}}}},'dev','bucket',{copyObject:async i=>{calls.push(i)},verifyExistingObject:async()=>assert.fail('no preexisting target')});await a.materializar(r);assert.equal(calls[0].sourceKey,r.contexto.origenFisico.key);assert.equal(calls[0].destinationKey,r.r2_key);assert.equal(calls[0].operationIdentity,'reservation')});
test('historical materialization never copies or renames its technical R2 key',async()=>{const a=new ArchivadoR2Adapter({send:async()=>assert.fail('no SDK call')},'dev','bucket',{copyObject:async()=>assert.fail('no copy'),verifyExistingObject:async()=>assert.fail('no verify')});await a.materializar({...row,contexto:{modo:'HISTORICO'}})});
test('origin cleanup verifies actual bytes and addresses only persisted technical key',async()=>{
 const body=Buffer.from('pdf'),sha=require('node:crypto').createHash('sha256').update(body).digest('hex'),calls=[];
 const original='documentos/2026/11/BBTI/technical.pdf';
 const r={...row,sha256:sha,contexto:{modo:'NUEVO',origenMaterializacion:{bucket:'bucket',key:original}}};
 const adapter=new ArchivadoR2Adapter({send:async cmd=>{calls.push(cmd.input);
  return cmd.constructor.name==='GetObjectCommand'?{ContentLength:3,Body:require('node:stream').Readable.from([body])}:{$metadata:{httpStatusCode:204}};
 }},'dev','bucket');
 await adapter.verificarOrigen(r);await adapter.eliminarOrigen(r);
 assert(calls.every(input=>input.Key===original&&input.Bucket==='bucket'));
});
test('origin with different SHA cannot pass verification',async()=>{
 const r={...row,contexto:{modo:'NUEVO',origenMaterializacion:{bucket:'bucket',key:'documentos/2026/11/BBTI/technical.pdf'}}};
 const adapter=new ArchivadoR2Adapter({send:async()=>({ContentLength:3,Body:require('node:stream').Readable.from([Buffer.from('pdf')])})},'dev','bucket');
 await assert.rejects(()=>adapter.verificarOrigen(r),/ORIGEN_INTEGRIDAD/);
});
test('historical or foreign origin is rejected before any SDK operation',async()=>{
 const adapter=new ArchivadoR2Adapter({send:async()=>assert.fail('no SDK')},'dev','bucket');
 await assert.rejects(()=>adapter.comprobarOrigen({...row,contexto:{modo:'HISTORICO',origenMaterializacion:{bucket:'bucket',key:'documentos/technical.pdf'}}}),/ORIGEN_MATERIALIZACION_INVALIDO/);
});

const {conExclusionFisica}=require(path.join(process.env.BBTI_ARCHIVE_COMPILED,'archivado-exclusion.js'));
const lock={unsafe:async()=>[{locked:true}]};
test('production deletion requires exclusion and reverified actual SHA, not ETag as a hash',async()=>{
 const body=Buffer.from('pdf'),digest=require('node:crypto').createHash('sha256').update(body).digest('hex');
 const r={...row,sha256:digest},date=new Date('2026-11-25T00:00:00Z'),calls=[];
 let etag='"identity-a"';
 const a=new ArchivadoR2Adapter({send:async cmd=>{
  calls.push(cmd.constructor.name);
  if(cmd.constructor.name==='GetObjectCommand')return {ContentLength:3,ETag:etag,LastModified:date,Body:require('node:stream').Readable.from([body])};
  if(cmd.constructor.name==='HeadObjectCommand')return {ContentLength:3,ETag:etag,LastModified:date};
  return {$metadata:{httpStatusCode:204,requestId:'single-request'}};
 }},'dev','bucket',undefined,{exclusionRequerida:true});
 a.client.config={endpoint:async()=>({protocol:'https:',hostname:'dev.r2.cloudflarestorage.com',path:'/'})};
 await assert.rejects(()=>a.verificarParaEliminar(r),/SIN_EXCLUSION/);
 await conExclusionFisica(lock,'dev','bucket',r.r2_key,async()=>{
  await a.verificarParaEliminar(r);etag='"identity-b"';
  await assert.rejects(()=>a.eliminarExacto(r),/OBJETO_SUSTITUIDO/);
 });
 assert(!calls.includes('DeleteObjectCommand'));
});
test('real SDK makes only one DELETE transport attempt even with a retryable server failure',async()=>{
 const {createRequire}=require('node:module');
 const req=createRequire(path.join(process.env.BBTI_ARCHIVE_COMPILED,'../package.json'));
 const {S3Client}=req('@aws-sdk/client-s3');let attempts=0;
 const client=new S3Client({region:'auto',endpoint:'https://synthetic.invalid',
  credentials:{accessKeyId:'synthetic',secretAccessKey:'synthetic'},maxAttempts:4,
  requestHandler:{handle:async()=>{attempts++;return {response:{statusCode:503,headers:{},body:Buffer.from('')}}}}});
 const a=new ArchivadoR2Adapter(client,'dev','bucket');
 await assert.rejects(()=>a.eliminarExacto(row));assert.equal(attempts,1);
});
test('production source SHA mismatch never authorizes a later DELETE',async()=>{
 const calls=[],a=new ArchivadoR2Adapter({send:async cmd=>{
  calls.push(cmd.constructor.name);return {ContentLength:3,ETag:'"not-a-sha"',LastModified:new Date(),
    Body:require('node:stream').Readable.from([Buffer.from('pdf')])};
 }},'dev','bucket',undefined,{exclusionRequerida:true});
 a.client.config={endpoint:async()=>({protocol:'https:',hostname:'dev.r2.cloudflarestorage.com',path:'/'})};
 await conExclusionFisica(lock,'dev','bucket',row.r2_key,async()=>{
  await assert.rejects(()=>a.verificarParaEliminar(row),/R2_INTEGRIDAD/);
  await assert.rejects(()=>a.eliminarExacto(row),/IDENTIDAD_NO_ACREDITADA/);
 });assert(!calls.includes('DeleteObjectCommand'));
});
test('production SDK sends If-Match for the independently hashed object with no unconditional fallback',async()=>{
 const {createRequire}=require('node:module'),req=createRequire(path.join(process.env.BBTI_ARCHIVE_COMPILED,'../package.json'));
 const {S3Client}=req('@aws-sdk/client-s3'),body=Buffer.from('pdf');
 const hash=require('node:crypto').createHash('sha256').update(body).digest('hex'),etag='"opaque-identity"',calls=[];
 const client=new S3Client({region:'auto',endpoint:'https://dev.r2.cloudflarestorage.com',credentials:{accessKeyId:'synthetic',secretAccessKey:'synthetic'},
  requestHandler:{handle:async request=>{
   calls.push(request.method);
   if(request.method==='DELETE'){
    assert.equal(request.headers['if-match'],etag);
    return{response:{statusCode:204,headers:{},body:Buffer.from('')}};
   }
   return{response:{statusCode:200,headers:{'content-length':'3',etag,'last-modified':'Wed, 25 Nov 2026 00:00:00 GMT'},
    body:require('node:stream').Readable.from(request.method==='GET'?[body]:[])}};
  }}});
 const adapter=new ArchivadoR2Adapter(client,'dev','bucket',undefined,{exclusionRequerida:true}),r={...row,sha256:hash};
 await conExclusionFisica(lock,'dev','bucket',r.r2_key,async()=>{
  assert.equal((await adapter.verificarParaEliminar(r)).sha256,hash);
  assert.equal((await adapter.eliminarExacto(r)).http,204);
 });assert.deepEqual(calls,['GET','HEAD','DELETE']);
});
test('production account must match the actual SDK endpoint, not just a configured label',async()=>{
 const a=new ArchivadoR2Adapter({send:async()=>assert.fail('SDK must not run')},'dev','bucket',undefined,{exclusionRequerida:true});
 a.client.config={endpoint:async()=>({protocol:'https:',hostname:'other-account.r2.cloudflarestorage.com',path:'/'})};
 await conExclusionFisica(lock,'dev','bucket',row.r2_key,async()=>{
  await assert.rejects(()=>a.verificarParaEliminar(row),/ENDPOINT_NO_ACREDITADO/);
 });
});
