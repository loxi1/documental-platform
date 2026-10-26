import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,symlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join,resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash,randomUUID } from 'node:crypto';
import { createPrivateDelivery,runGpg } from './private-delivery.mjs';
import { validateApproval,executeAdministrative,SCOPE } from './production-entrypoint.mjs';
import { provision,recoverDelivery,verifyIntegrity,TARGETS,PERMISSIONS_A,PERMISSIONS_G } from './provision.mjs';
const evidenceRoot=process.env.BBTI_COMPONENT_EVIDENCE_DIR??join(homedir(),'evidencias/documental-platform/auth-users-final-components-r1');
const checks={};const digest=b=>createHash('sha256').update(b).digest('hex');
const approval=integrity=>({environment:'production',database:'gestion_documental',role:'document_platform',scope:SCOPE,
 artifactIntegrity:integrity,dbWriteAuthorized:true,privateDeliveryApproved:true,administrativeRotationApproved:true,
 approvalId:'SYNTHETIC_APPROVAL',custodian:'Fixture custodian',operator:'Fixture operator',keysApprovalId:'FIXTURE_KEYS',
 deliveryChannelApprovalId:'FIXTURE_HANDOFF',rotationApprovalId:'FIXTURE_ROTATION',expiresAt:'2099-01-01T00:00:00Z',
 enterpriseCommit:'1'.repeat(40),sourceCommit:'2'.repeat(40),enterpriseRoot:process.cwd(),
 expectedServer:'192.0.2.1/32',expectedHost:'fixture.rds.amazonaws.com',recipients:TARGETS.map(t=>({email:t.email}))});
function fakeDatabase({role='document_platform',corruptPostcheck=false}={}) {
 let readonly=false,writes=0,committed=false;
 const rows=TARGETS.flatMap((t,i)=>['BBTI','BBTEC'].map((c,j)=>({email:t.email,user_state:'activo',empresa_codigo:c,client:c,system:'DOCUMENTAL',profile:t.profile,
   estado:'activo',es_favorito:t.favorite===c,vigencia_desde:null,vigencia_hasta:null,permisos:t.profile==='admin'?PERMISSIONS_G:PERMISSIONS_A,
   cliente_destino_id:j+11,sistema_id:30,perfil_id:t.profile==='admin'?41:42,id:100+i*2+j})));
 const db={get writes(){return writes;},get committed(){return committed;},
  begin:async(...args)=>{const fn=args.at(-1);const previous=readonly;readonly=args[0]==='read only';try{const r=await fn(db);committed=true;return r;}finally{readonly=previous;}},
  unsafe:async(text,params=[])=>{
   if(text.includes('current_database()'))return [{database:'gestion_documental',actor_role:role,role,server:'192.0.2.1/32',readonly:readonly?'on':'off'}];
   if(text.includes('SELECT id,email,estado,nombres'))return Array.from({length:5},(_,i)=>({id:i+1,email:'historical'+i,estado:'activo'}));
   if(text.includes('w.ultimo_uso_en'))return Array.from({length:11},(_,i)=>({id:i+1,estado:'activo'}));
   if(text.includes('AS user_state'))return corruptPostcheck?[]:rows;
   if(text.includes('pg_advisory'))return [];
   if(text.includes('FROM core.auditoria_eventos'))return [];
   if(text.includes('FROM core.sistemas'))return [{id:30,codigo:'DOCUMENTAL',estado:'activo'}];
   if(text.includes('FROM core.clientes_destino'))return [{id:11,abreviatura:'BBTI',estado:true},{id:12,abreviatura:'BBTEC',estado:true}];
   if(text.includes('FROM auth.perfiles'))return [{id:41,codigo:'admin',estado:'activo'},{id:42,codigo:'almacen',estado:'activo'}];
   if(text.includes('SELECT id,email,estado FROM auth.usuarios'))return TARGETS.map((t,i)=>({id:i+20,email:t.email,estado:'activo'}));
   if(text.includes('FROM auth.usuario_workspaces WHERE usuario_id'))return rows.filter(w=>w.email===TARGETS[params[0]-20].email).map(w=>({...w,sistema_id:30,perfil_id:w.profile==='admin'?41:42}));
   if(/^\s*(INSERT|UPDATE|DELETE)/i.test(text)){writes++;throw Error('UNEXPECTED_WRITE_IN_EXISTING_COMPOSITION');}
   throw Error('UNEXPECTED_SYNTHETIC_QUERY');
  }};
 return db;
}

test('final production components only; no LAB baseline, RDS or real credentials',async t=>{
 await mkdir(evidenceRoot,{recursive:true,mode:0o700});const fixture=await mkdtemp(join(evidenceRoot,'synthetic-keys-'));
 const home=join(fixture,'gpg'),custody=join(fixture,'custody');await mkdir(home,{mode:0o700});await mkdir(custody,{mode:0o700});
 const fingerprints=[];
 await t.test('OpenPGP verified-key preparation; synthetic test keys only',async()=>{
  for(let i=0;i<5;i++) {
   await runGpg(home,['--pinentry-mode','loopback','--passphrase','','--quick-generate-key',`Fixture ${i} <fixture${i}@example.invalid>`,'rsa2048','sign,encr','1d']);
   const {output}=await runGpg(home,['--with-colons','--list-keys',`fixture${i}@example.invalid`]);
   fingerprints.push(output.toString().split('\n').find(l=>l.startsWith('fpr:')).split(':')[9]);
  }
  assert.equal(new Set(fingerprints).size,5);checks.SYNTHETIC_PUBLIC_KEYS='PASS';
 });
 const recipients=[];
 for(let i=0;i<4;i++){const path=join(fixture,'recipient-'+i);await mkdir(path,{mode:0o700});recipients.push({email:TARGETS[i].email,fingerprint:fingerprints[i+1],deliveryDirectory:path});}
 const config={custodyRoot:custody,gpgHome:home,custodianFingerprint:fingerprints[0],recipients,forbiddenRoots:[process.cwd()],verifiedKeysApproval:'SYNTHETIC_KEYS_APPROVAL'};
 let sink,operationId,integrity;
 await t.test('encrypt once, defer unacknowledged delivery and recover individual signed receipts',async()=>{
  integrity=await verifyIntegrity();sink=await createPrivateDelivery(config);operationId=randomUUID();
  const payload='SYNTHETIC_TEST_PAYLOAD_NO_ACCOUNT';
  await sink.prepare({operationId,integrity,credentials:TARGETS.map(t=>({email:t.email,temporaryPassword:payload}))});
  const before=await readFile(join(custody,operationId,'acueva.gpg'));
  assert.ok(!before.includes(Buffer.from(payload)));
  await assert.rejects(sink.prepare({operationId,integrity,credentials:[{email:TARGETS[0].email,temporaryPassword:payload}]}));
  await assert.rejects(sink.deliver({operationId,integrity}));
  for(let i=0;i<4;i++) {
   const path=join(recipients[i].deliveryDirectory,operationId+'.gpg'),encrypted=await readFile(path);
   const {output}=await runGpg(home,['--decrypt'],encrypted);const decoded=JSON.parse(output.toString());
   assert.ok(decoded.temporaryPassword===payload&&decoded.email===TARGETS[i].email);output.fill(0);
   const ack=Buffer.from(JSON.stringify({operationId,integrity,email:TARGETS[i].email,envelopeSha256:digest(encrypted)}));
   const signature=(await runGpg(home,['--pinentry-mode','loopback','--passphrase','','--local-user',recipients[i].fingerprint,'--detach-sign','--output','-'],ack)).output;
   await writeFile(join(recipients[i].deliveryDirectory,operationId+'.ack.json'),ack,{mode:0o600});
   await writeFile(join(recipients[i].deliveryDirectory,operationId+'.ack.json.sig'),signature,{mode:0o600});
   if(i<3)await assert.rejects(sink.deliver({operationId,integrity}));
  }
  await sink.deliver({operationId,integrity});await sink.deliver({operationId,integrity});
  assert.equal(digest(before),digest(await readFile(join(custody,operationId,'acueva.gpg'))));
  checks.ENCRYPTED_ENVELOPES='PASS';checks.PARTIAL_SIGNED_ACK_RECOVERY='PASS';checks.NO_REGENERATION='PASS';checks.NO_PLAINTEXT_FILES='PASS';
 });
 await t.test('PO_MANAGED works with one public key, four encrypted envelopes and PO acknowledgements',async()=>{
  const poHome=join(fixture,'po-public-only'),poCustody=join(fixture,'po-custody'),poDelivery=join(fixture,'po-delivery');
  for(const dir of [poHome,poCustody,poDelivery])await mkdir(dir,{mode:0o700});
  const publicKey=(await runGpg(home,['--armor','--export',fingerprints[0]])).output;
  await runGpg(poHome,['--import'],publicKey);
  const po=await createPrivateDelivery({custodyMode:'PO_MANAGED',custodyRoot:poCustody,gpgHome:poHome,
    custodianFingerprint:fingerprints[0],custodianDeliveryDirectory:poDelivery,
    forbiddenRoots:[process.cwd()],verifiedKeysApproval:'PO_SYNTHETIC_APPROVAL'});
  const id=randomUUID(),i=await verifyIntegrity(),payload='PO_SYNTHETIC_PAYLOAD_NO_ACCOUNT';
  await po.prepare({operationId:id,integrity:i,credentials:TARGETS.map(t=>({email:t.email,temporaryPassword:payload}))});
  await assert.rejects(po.deliver({operationId:id,integrity:i}));
  const before=[];
  for(let n=0;n<4;n++) {
    const user=TARGETS[n],name=id+'-'+user.email.split('@')[0],cipher=await readFile(join(poDelivery,name+'.gpg'));
    before.push(digest(cipher));assert.ok(!cipher.includes(Buffer.from(payload)));
    const {output,status}=await runGpg(home,['--status-fd','3','--decrypt'],cipher);
    const decoded=JSON.parse(output.toString());assert.ok(decoded.email===user.email&&decoded.temporaryPassword===payload);
    assert.ok(status.includes(fingerprints[0]));output.fill(0);
    const ack=Buffer.from(JSON.stringify({operationId:id,integrity:i,email:user.email,envelopeSha256:digest(cipher)}));
    const signature=(await runGpg(home,['--pinentry-mode','loopback','--passphrase','','--local-user',fingerprints[0],'--detach-sign','--output','-'],ack)).output;
    await writeFile(join(poDelivery,name+'.ack.json'),ack,{mode:0o600});await writeFile(join(poDelivery,name+'.ack.json.sig'),signature,{mode:0o600});
    if(n<3)await assert.rejects(po.deliver({operationId:id,integrity:i}));
  }
  await po.deliver({operationId:id,integrity:i});await po.deliver({operationId:id,integrity:i});
  for(let n=0;n<4;n++)assert.equal(before[n],digest(await readFile(join(poDelivery,id+'-'+TARGETS[n].email.split('@')[0]+'.gpg'))));
  const a=approval(i);delete a.administrativeRotationApproved;delete a.rotationApprovalId;delete a.recipients;
  assert.equal(validateApproval({...a,custodyMode:'PO_MANAGED',custodianDeliveryDirectory:poDelivery},i),true);
  assert.throws(()=>validateApproval(a,i));
  checks.PO_SINGLE_PUBLIC_KEY='PASS';checks.PO_FOUR_DISTINCT_ENVELOPES='PASS';
  checks.PO_SIGNED_ACK_RECOVERY='PASS';checks.PO_ROTATION_OUT_OF_SCOPE='PASS';
 });
 await t.test('reject unverified keys, unsafe paths and altered receipts',async()=>{
  await assert.rejects(createPrivateDelivery({...config,verifiedKeysApproval:''}));
  await assert.rejects(createPrivateDelivery({...config,recipients:recipients.slice(1)}));
  await symlink(custody,join(fixture,'link'));
  await assert.rejects(createPrivateDelivery({...config,custodyRoot:join(fixture,'link')}));
  const ack=join(recipients[0].deliveryDirectory,operationId+'.ack.json');
  await writeFile(ack,JSON.stringify({operationId,integrity,email:TARGETS[0].email,envelopeSha256:'0'.repeat(64)}),{mode:0o600});
  await assert.rejects(sink.deliver({operationId,integrity}));
  checks.UNVERIFIED_KEYS_BLOCKED='PASS';checks.UNSAFE_PATHS_BLOCKED='PASS';checks.INVALID_ACK_BLOCKED='PASS';
 });
 await t.test('production approval absent, stale, wrong scope or wrong digest fails before DB writes',async()=>{
  const i=await verifyIntegrity(),a=approval(i);assert.equal(validateApproval(a,i),true);
  for(const altered of [{...a,dbWriteAuthorized:false},{...a,scope:'ALL_USERS'},{...a,expiresAt:'2000-01-01'},{...a,artifactIntegrity:'0'.repeat(64)}])assert.throws(()=>validateApproval(altered,i));
  const db={begin:()=>assert.fail('Must fail before opening transaction')};
  await assert.rejects(provision({sql:db,expectedDatabase:'gestion_documental',approvedIntegrity:i,credentialSink:{prepare(){},deliver(){}}}),{code:'PRODUCTION_EXECUTION_NOT_AUTHORIZED'});
  checks.EXPLICIT_PRODUCTION_SCOPE_REQUIRED='PASS';checks.APPROVED_ARTIFACT_REQUIRED='PASS';
 });
 await t.test('entrypoint integrates existing provisioner: readonly preflight and unchanged composition',async()=>{
  const i=await verifyIntegrity(),db=fakeDatabase(),a=approval(i);
  const noCredentials={prepare:()=>assert.fail('Existing users cannot regenerate credentials'),deliver:()=>assert.fail('No new credentials')};
  const pre=await executeAdministrative({approval:a,credentialSink:noCredentials,sql:db,approvedIntegrity:i});
  assert.equal(pre.state,'PREFLIGHT_ONLY_NO_WRITES');assert.equal(db.writes,0);
  const result=await executeAdministrative({approval:a,credentialSink:noCredentials,sql:db,approvedIntegrity:i,command:'execute'});
  assert.equal(result.usersCreated,0);assert.equal(result.workspacesCreated,0);assert.equal(result.postcheck.historicalPreserved,true);assert.equal(db.writes,0);
  await assert.rejects(executeAdministrative({approval:a,credentialSink:noCredentials,sql:fakeDatabase({role:'unexpected'}),approvedIntegrity:i}));
  const uncertain=await executeAdministrative({approval:a,credentialSink:noCredentials,sql:fakeDatabase({corruptPostcheck:true}),approvedIntegrity:i,command:'execute'});
  assert.equal(uncertain.state,'COMMITTED_POSTCHECK_REQUIRES_REVIEW');assert.ok(uncertain.operationId);
  checks.ENTRYPOINT_EXISTING_PROVISIONER_INTEGRATION='PASS';checks.READONLY_PREFLIGHT='PASS';checks.HISTORICAL_POSTCHECK='PASS';checks.WRONG_ROLE_BLOCKED='PASS';
 });
 await t.test('recoverDelivery never invokes adapter for uncommitted operation',async()=>{
  const i=await verifyIntegrity();const a=approval(i);let delivered=false;
  const db={unsafe:async text=>text.includes('current_database')?[{database:a.database,actor_role:a.role,server:a.expectedServer}]:[]};
  const r=await recoverDelivery({sql:db,expectedDatabase:a.database,approvedIntegrity:i,operationId:randomUUID(),credentialSink:{prepare(){},deliver(){delivered=true;}},
   productionAuthorization:{environment:'production',database:a.database,role:a.role,server:a.expectedServer,scope:SCOPE,approvalId:a.approvalId,artifactIntegrity:i}});
  assert.equal(r.state,'NOT_COMMITTED');assert.equal(delivered,false);
  const recovered=await executeAdministrative({approval:a,credentialSink:{prepare(){},deliver(){delivered=true;}},sql:fakeDatabase(),approvedIntegrity:i,command:'recover',operationId:randomUUID()});
  assert.equal(recovered.state,'NOT_COMMITTED');assert.equal(delivered,false);checks.NO_DELIVERY_BEFORE_COMMIT='PASS';
 });
 await t.test('actual CLI rejects SOURCE feature branch before reading productive configuration',async()=>{
  const i=await verifyIntegrity(),path=join(fixture,'synthetic-approval.json');await writeFile(path,JSON.stringify(approval(i)),{mode:0o600});
  const run=spawnSync(process.execPath,['packages/database/admin/auth-users-r1/production-entrypoint.mjs','execute','--approval',path],{encoding:'utf8'});
  assert.equal(run.status,1);assert.equal(run.stdout,'');assert.equal(run.stderr.trim(),'ADMIN_EXECUTION_BLOCKED_OR_OUTCOME_REQUIRES_READONLY_VERIFICATION');
  checks.SOURCE_EXECUTION_BLOCKED='PASS';checks.ERROR_OUTPUT_SANITIZED='PASS';
 });
 const record={action:'BBTI_AUTH_USERS_PO_MANAGED_ADAPTER_RESULT_R1',checks,status:Object.keys(checks).length===21?'PASS':'FAIL',
   syntheticTestKeysOnly:true,realCredentialsGenerated:false,productionConnected:false,labBaselineRepeated:false,
   fixturePath:fixture,artifactIntegrity:await verifyIntegrity(),recordedAt:new Date().toISOString()};
 await writeFile(join(evidenceRoot,'result.json'),JSON.stringify(record,null,2)+'\n');
});
