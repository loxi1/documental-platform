import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { provision, recoverDelivery, TARGETS, HISTORICAL_EMAILS, PERMISSIONS_A,
  PERMISSIONS_G, samePermissions, verifyIntegrity } from './provision.mjs';

const dbRequire = createRequire(new URL('../../package.json', import.meta.url));
const authRequire = createRequire(new URL('../../../../apps/ms-auth/package.json', import.meta.url));
const postgres = dbRequire('postgres'), bcrypt = authRequire('bcrypt');
const evidenceDirectory = pathToFileURL(join(homedir(), 'evidencias', 'documental-platform',
  'auth-users-g2-r1-20261026', 'evidencias') + sep);
const directory = evidenceDirectory;
const record = { action: 'BBTI_AUTH_USERS_G2_FINAL_CORRECTIONS_R1', checks: {},
  productionExecuted: false, mainLabWritten: false, credentialsPersisted: false };
const docker = args => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const count = async sql => Number((await sql.unsafe('SELECT count(*) AS n FROM auth.usuarios WHERE email=ANY($1::text[])', [TARGETS.map(t => t.email)]))[0].n);
const safeSnapshot = async sql => ({
  users: await sql.unsafe('SELECT id,nombres,apellidos,email,estado,creado_en,actualizado_en FROM auth.usuarios WHERE email=ANY($1::text[]) ORDER BY email', [HISTORICAL_EMAILS]),
  workspaces: await sql.unsafe('SELECT w.* FROM auth.usuario_workspaces w JOIN auth.usuarios u ON u.id=w.usuario_id WHERE u.email=ANY($1::text[]) ORDER BY w.id', [HISTORICAL_EMAILS]),
});
const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');

async function seed(sql) {
  const [s] = await sql.unsafe("INSERT INTO core.sistemas(codigo,nombre,estado) VALUES('DOCUMENTAL','Documental prueba aislada','activo') RETURNING id");
  for (const company of ['BBTI','BBTEC']) await sql.unsafe('INSERT INTO core.clientes_destino(nombre_oficial,abreviatura,estado) VALUES($1,$2,true)', [`${company} fixture aislada`, company]);
  for (const p of ['almacen','admin']) await sql.unsafe("INSERT INTO auth.perfiles(sistema_id,codigo,nombre,estado) VALUES($1,$2,$2,'activo')", [s.id, p]);
  for (const email of HISTORICAL_EMAILS) {
    const hash = await bcrypt.hash(randomBytes(32).toString('base64url'),12);
    const [u] = await sql.unsafe("INSERT INTO auth.usuarios(nombres,email,password_hash,estado) VALUES('Historico fixture',$1,$2,'activo') RETURNING id", [email,hash]);
    await sql.unsafe(`INSERT INTO auth.usuario_workspaces(usuario_id,empresa_codigo,cliente_destino_id,sistema_id,perfil_id,estado,es_favorito)
      SELECT $1,'BBTI',c.id,$2,p.id,'activo',true FROM core.clientes_destino c CROSS JOIN auth.perfiles p
      WHERE c.abreviatura='BBTI' AND p.codigo='admin' AND p.sistema_id=$2`,[u.id,s.id]);
  }
}

function simulatedSink(observer, { failOnceAfterRecipient = false } = {}) {
  const staged = new Map(), received = new Map(), operations = new Set();
  let fail = failOnceAfterRecipient;
  return { staged, received, operations,
    prepare: async ({ operationId, integrity, credentials }) => {
      assert.equal(await count(observer), 0); // independent connection cannot see uncommitted accounts
      assert.ok(integrity); assert.equal(credentials.length, 4);
      staged.set(operationId, credentials.map(c => ({ ...c })));
    },
    deliver: async ({ operationId, integrity }) => {
      assert.equal(await count(observer),4); // actual COMMIT visible on independent connection
      const [audit] = await observer.unsafe("SELECT despues FROM core.auditoria_eventos WHERE accion='ADMIN_PROVISION_R1' AND despues->>'operationId'=$1", [operationId]);
      assert.equal(audit.despues.integrity,integrity);
      const credentials = staged.get(operationId);
      if (!credentials && operations.has(operationId)) return;
      if (!credentials) throw new Error('PREPARATION_UNAVAILABLE');
      for (const c of credentials) {
        if (received.has(c.email)) continue; // simulated recipient acknowledgements, no duplicate delivery
        received.set(c.email,c.temporaryPassword);
        if (fail) { fail=false; throw new Error('SIMULATED_DELIVERY_INTERRUPTION'); }
      }
      operations.add(operationId); staged.delete(operationId);
    },
  };
}

test('O1/O4 independent PostgreSQL, real institutional tables and recoverable delivery', {
  skip: process.env.BBTI_ISOLATED_TESTS !== '1',
}, async t => {
  const suffix = `${Date.now()}_${randomBytes(3).toString('hex')}`;
  const container = process.env.BBTI_ISOLATED_CONTAINER || `bbti_auth_g2_o4_${suffix}`, network = container;
  assert.match(container,/^bbti_auth_g2_o4_[0-9]+_[a-f0-9]+$/);
  const databases = ['main','rollback','unknown'].map(n => `bbti_auth_g2_isolated_${n}_${suffix}`);
  const clients = []; let admin;
  await mkdir(directory,{recursive:true});
  const persist = async () => writeFile(new URL('corrections-result.json',directory),JSON.stringify(record,null,2)+'\n');
  try {
    if (!process.env.BBTI_ISOLATED_CONTAINER) {
    docker(['network','create','--internal','--label','bbti.scope=auth-g2-o4',network]);
    docker(['run','-d','--pull=never','--name',container,'--network',network,
      '--label','bbti.scope=auth-g2-o4','-e','POSTGRES_HOST_AUTH_METHOD=trust',
      '-e','POSTGRES_USER=bbti_validation','-e','POSTGRES_DB=postgres',
      'postgres:18.6']);
    }
    record.phase='inspect_isolation';
    const [inspect] = JSON.parse(docker(['inspect',container]));
    assert.equal(inspect.Config.Labels['bbti.scope'],'auth-g2-o4');
    record.phase='inspect_network';
    const [networkInfo]=JSON.parse(docker(['network','inspect',network]));
    assert.equal(networkInfo.Internal,true);
    const host=inspect.NetworkSettings.Networks[network].IPAddress, port=5432;
    const options = database => ({ host,port,database,username:'bbti_validation',
      max:1,debug:false,onnotice:()=>{},connection:{statement_timeout:30000,application_name:'bbti-auth-g2-o4'} });
    record.phase='connect_isolation';
    admin=postgres(options('postgres'));
    let ready=false;
    for(let i=0;i<30;i++) { try {await admin.unsafe('SELECT 1');ready=true;break;} catch {await new Promise(r=>setTimeout(r,200));} }
    assert.ok(ready,'Isolated PostgreSQL must become ready');
    // Only schema from authorized LAB: no rows, credentials, ownership or grants are copied.
    const tables=['auth.usuarios','auth.usuario_workspaces','auth.perfiles','core.sistemas','core.clientes_destino','core.auditoria_eventos'];
    record.phase='read_schema_sequences';
    const serials=JSON.parse(docker(['exec','-e','PGOPTIONS=-c default_transaction_read_only=on','dp_postgres_documental_lab',
      'psql','-X','-U','document_platform_lab','-d','gestion_documental_lab','-At','-c',
      `SELECT json_agg(pg_get_serial_sequence(t,'id')) FROM unnest(ARRAY[${tables.map(t=>`'${t}'`).join(',')}]) t` ]));
    const dumpArgs=['exec','-e','PGOPTIONS=-c default_transaction_read_only=on','dp_postgres_documental_lab','pg_dump',
      '-U','document_platform_lab','-d','gestion_documental_lab','--schema-only','--no-owner','--no-privileges'];
    for (const table of [...new Set([...tables,...serials.filter(Boolean),'core.clientes_destino_id_seq'])]) dumpArgs.push('-t',table);
    record.phase='dump_schema';
    const schema=docker(dumpArgs).split('\n').filter(line=>!line.startsWith('\\')).join('\n');
    record.isolation={container,network,host,port,databases,
      image:inspect.Config.Image,internalNetwork:true,schemaSource:'gestion_documental_lab_SCHEMA_ONLY_SIX_TABLES',
      schemaSha256:createHash('sha256').update(schema).digest('hex'),tables};
    record.phase='integrity';
    record.integrity=await verifyIntegrity(); await persist();
    const connections=[];
    record.phase='create_isolated_databases';
    for (const name of databases) {
      // Identifier is internally generated from the fixed safe pattern, never supplied by an operator.
      assert.match(name,/^bbti_auth_g2_isolated_[a-z0-9_]+$/);
      await admin.unsafe(`CREATE DATABASE "${name}"`);
      const sql=postgres(options(name));clients.push(sql);
      await sql.unsafe('CREATE SCHEMA auth; CREATE SCHEMA core;');
      record.phase='restore_isolated_schema';
      await sql.unsafe(schema); record.phase='seed_isolated_fixtures';await seed(sql);
      const observer=postgres(options(name));clients.push(observer);connections.push({sql,observer,name});
    }
    const [main,rollback,unknown]=connections;
    const provisionIn=(c,sink,sql=c.sql)=>provision({sql,expectedDatabase:c.name,credentialSink:sink,approvedIntegrity:record.integrity});

    await t.test('real tables, zero baseline, COMMIT then partial delivery, recovery and idempotency',async()=>{
      assert.equal(await count(main.sql),0);
      const [initialWorkspaces]=await main.sql.unsafe('SELECT count(*)::int AS n FROM auth.usuario_workspaces w JOIN auth.usuarios u ON u.id=w.usuario_id WHERE u.email=ANY($1::text[])',[TARGETS.map(t=>t.email)]);
      assert.equal(initialWorkspaces.n,0);
      const before=await safeSnapshot(main.sql);assert.equal(before.users.length,5);assert.equal(before.workspaces.length,5);
      record.baseline={targetUsers:0,targetWorkspaces:0,historicalUsers:5,historicalWorkspaces:5,historicalProjection:digest(before)};
      await persist();
      const sink=simulatedSink(main.observer,{failOnceAfterRecipient:true});
      const first=await provisionIn(main,sink);
      assert.equal(first.usersCreated,4);assert.equal(first.workspacesCreated,8);
      assert.equal(first.deliveryState,'COMMITTED_DELIVERY_PENDING'); assert.equal(sink.received.size,1);
      const originalSecret=sink.received.values().next().value;
      const recovery=await recoverDelivery({sql:main.sql,expectedDatabase:main.name,credentialSink:sink,approvedIntegrity:record.integrity,operationId:first.operationId});
      assert.equal(recovery.state,'DELIVERED');assert.equal(sink.received.size,4);
      assert.ok([...sink.received.values()].includes(originalSecret));
      const repeated=await recoverDelivery({sql:main.sql,expectedDatabase:main.name,credentialSink:sink,approvedIntegrity:record.integrity,operationId:first.operationId});
      assert.equal(repeated.state,'DELIVERED'); assert.equal(sink.received.size,4);
      const rows=await main.sql.unsafe(`SELECT u.email,u.estado AS usuario_estado,w.*,c.abreviatura AS cliente,
        s.codigo AS sistema,p.codigo AS perfil FROM auth.usuarios u JOIN auth.usuario_workspaces w ON w.usuario_id=u.id
        JOIN core.clientes_destino c ON c.id=w.cliente_destino_id JOIN core.sistemas s ON s.id=w.sistema_id
        JOIN auth.perfiles p ON p.id=w.perfil_id WHERE u.email=ANY($1::text[]) ORDER BY u.email,w.empresa_codigo`,[TARGETS.map(t=>t.email)]);
      assert.equal(rows.length,8);
      for(const target of TARGETS) {
        const ws=rows.filter(r=>r.email===target.email);assert.equal(ws.length,2);
        for(const company of ['BBTI','BBTEC']) {
          const w=ws.find(r=>r.empresa_codigo===company);assert.ok(w);
          assert.equal(w.cliente,company);assert.equal(w.sistema,'DOCUMENTAL');assert.equal(w.perfil,target.profile);
          assert.equal(w.estado,'activo');assert.equal(w.usuario_estado,'activo');
          assert.equal(w.es_favorito,target.favorite===company);assert.equal(w.vigencia_desde,null);assert.equal(w.vigencia_hasta,null);
          assert.ok(samePermissions(w.permisos,target.profile==='admin'?PERMISSIONS_G:PERMISSIONS_A));
        }
      }
      const credentials=await main.sql.unsafe('SELECT email,password_hash FROM auth.usuarios WHERE email=ANY($1::text[])',[TARGETS.map(t=>t.email)]);
      assert.equal(new Set(sink.received.values()).size,4);
      for(const c of credentials) { assert.ok(await bcrypt.compare(sink.received.get(c.email),c.password_hash));assert.equal(bcrypt.getRounds(c.password_hash),12); }
      const second=await provisionIn(main,sink);assert.equal(second.usersCreated,0);assert.equal(second.workspacesCreated,0);
      assert.deepEqual(await safeSnapshot(main.sql),before);
      const afterCredentials=await main.sql.unsafe('SELECT email,password_hash FROM auth.usuarios WHERE email=ANY($1::text[])',[TARGETS.map(t=>t.email)]);
      assert.ok(samePermissions(credentials,afterCredentials));
      const serialized=JSON.stringify([first,second,recovery,repeated]);
      for(const secret of sink.received.values())assert.ok(!serialized.includes(secret));
      for(const c of credentials)assert.ok(!serialized.includes(c.password_hash));
      record.executions={first,second,recovery,repeated};
      record.final={targetUsers:4,targetWorkspaces:8,historicalProjection:digest(await safeSnapshot(main.sql))};
      for(const name of ['REAL_TABLE_INITIAL_CREATION','FOUR_USERS','EIGHT_WORKSPACES','PERMISSIONS_A_EXACT','PERMISSIONS_G_EXACT',
        'FAVORITES_EXACT','COMMIT_BEFORE_DELIVERY','PARTIAL_DELIVERY_RECOVERY','NO_PASSWORD_REGENERATION','IDEMPOTENT_DELIVERY',
        'SECOND_EXECUTION_NO_DUPLICATES','HISTORICAL_USERS_PRESERVED','HISTORICAL_WORKSPACES_PRESERVED','CREDENTIALS_NOT_EXPOSED'])record.checks[name]='PASS';
      sink.received.clear();
    });

    await t.test('rollback after preparation cannot release credentials',async()=>{
      const sink=simulatedSink(rollback.observer);
      const wrapper={begin:fn=>rollback.sql.begin(async tx=>{await fn(tx);throw new Error('SIMULATED_PRE_COMMIT_FAILURE');})};
      const result=await provisionIn(rollback,sink,wrapper);
      assert.equal(result.state,'TRANSACTION_OUTCOME_UNKNOWN');assert.equal(await count(rollback.sql),0);
      const recovered=await recoverDelivery({sql:rollback.sql,expectedDatabase:rollback.name,credentialSink:sink,approvedIntegrity:record.integrity,operationId:result.operationId});
      assert.equal(recovered.state,'NOT_COMMITTED');assert.equal(sink.received.size,0);
      record.checks.REAL_TABLE_ROLLBACK='PASS';record.checks.NO_DELIVERY_WITHOUT_COMMIT='PASS';
    });

    await t.test('lost COMMIT acknowledgement recovers persisted accounts without resetting credentials',async()=>{
      const sink=simulatedSink(unknown.observer);
      const wrapper={begin:async fn=>{await unknown.sql.begin(fn);throw new Error('SIMULATED_COMMIT_ACK_LOSS');}};
      const result=await provisionIn(unknown,sink,wrapper);
      assert.equal(result.state,'TRANSACTION_OUTCOME_UNKNOWN');assert.equal(await count(unknown.sql),4);assert.equal(sink.received.size,0);
      const recovered=await recoverDelivery({sql:unknown.sql,expectedDatabase:unknown.name,credentialSink:sink,approvedIntegrity:record.integrity,operationId:result.operationId});
      assert.equal(recovered.state,'DELIVERED');assert.equal(sink.received.size,4);
      record.checks.COMMIT_ACK_LOSS_RECOVERY='PASS';sink.received.clear();
    });

    await t.test('existing composition conflicts and production guard remain closed',async()=>{
      const inert={prepare:async()=>assert.fail('No preparation on conflict'),deliver:async()=>assert.fail('No delivery on conflict')};
      await main.sql.begin(async tx=>{
        await tx.unsafe("UPDATE auth.usuario_workspaces SET permisos='{}'::jsonb WHERE id=(SELECT min(w.id) FROM auth.usuario_workspaces w JOIN auth.usuarios u ON u.id=w.usuario_id WHERE u.email=$1)",[TARGETS[0].email]);
        const wrapper={begin:fn=>tx.savepoint(fn)};
        await assert.rejects(provisionIn(main,inert,wrapper),{code:'EXISTING_WORKSPACE_CONFLICT'});
        // Roll back only this isolated test mutation, not existing principal LAB data.
        throw new Error('ROLLBACK_ISOLATED_TEST');
      }).catch(error=>{assert.equal(error.message,'ROLLBACK_ISOLATED_TEST');});
      await assert.rejects(provision({sql:main.sql,expectedDatabase:'gestion_documental',credentialSink:inert,approvedIntegrity:record.integrity}),{code:'PRODUCTION_EXECUTION_NOT_AUTHORIZED'});
      await assert.rejects(provision({sql:main.sql,expectedDatabase:main.name,credentialSink:inert,approvedIntegrity:'0'.repeat(64)}),{code:'APPROVED_ARTIFACT_MISMATCH'});
      record.checks.APPROVED_ARTIFACT_PIN='PASS';
      record.checks.EXISTING_CONFLICT_DETECTION='PASS';record.checks.PRODUCTION_EXECUTION_BLOCKED='PASS';
    });
    record.status=Object.keys(record.checks).length===20?'PASS':'FAIL';
  } catch (error) {
    record.failureCode=typeof error.code==='string' && /^[A-Z0-9_]+$/.test(error.code)?error.code:'SANITIZED';
    record.status='FAIL';record.error='ISOLATED_VALIDATION_FAILED_REVIEW_SANITIZED_TEST_OUTPUT';
    throw new Error('ISOLATED_VALIDATION_FAILED');
  } finally {
    for(const sql of clients)await sql.end({timeout:5});
    if(admin)await admin.end({timeout:5});
    record.recordedAt=new Date().toISOString();
    record.source={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
      branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()};
    await persist(); // no passwords/hashes; the isolated container is preserved, never reset or removed
  }
});
