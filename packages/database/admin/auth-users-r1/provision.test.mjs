import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { provision, recoverDelivery, verifyIntegrity, TARGETS, PERMISSIONS_A, PERMISSIONS_G,
  samePermissions, HISTORICAL_EMAILS } from './provision.mjs';

const requireDb = createRequire(new URL('../../package.json', import.meta.url));
const requireAuth = createRequire(new URL('../../../../apps/ms-auth/package.json', import.meta.url));
const postgres = requireDb('postgres');
const bcrypt = requireAuth('bcrypt');
const evidenceDirectory = pathToFileURL(join(homedir(), 'evidencias', 'documental-platform',
  'auth-users-g2-r1-20261026', 'evidencias') + sep);
const evidence = { action: 'BBTI_AUTH_USERS_G2_IMPLEMENTATION_R1', checks: {}, limitations: [
  'Production delivery adapter and operational approval pending.',
  'Mandatory first-login password change is not supported by the current auth contract.',
  'Creation/failure tests use session-local temporary tables; actual LAB baseline is preserved.',
] };
const pass = name => { evidence.checks[name] = 'PASS'; };
const safeHash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');

const mapTables = text => text.replaceAll('auth.usuarios', 'pg_temp.test_users')
  .replaceAll('auth.usuario_workspaces', 'pg_temp.test_workspaces')
  .replaceAll('auth.perfiles', 'pg_temp.test_profiles')
  .replaceAll('core.sistemas', 'pg_temp.test_systems')
  .replaceAll('core.clientes_destino', 'pg_temp.test_companies')
  .replaceAll('core.auditoria_eventos', 'pg_temp.test_audit');

async function fixture(sql, fn) {
  return sql.begin(async tx => {
    await tx.unsafe(`
      CREATE TEMP TABLE test_systems(id int primary key,codigo text,estado text) ON COMMIT DROP;
      CREATE TEMP TABLE test_companies(id int primary key,abreviatura text,estado boolean) ON COMMIT DROP;
      CREATE TEMP TABLE test_profiles(id int primary key,sistema_id int,codigo text,estado text) ON COMMIT DROP;
      CREATE TEMP TABLE test_users(id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,nombres text NOT NULL,
        email text UNIQUE NOT NULL,password_hash text NOT NULL,estado text) ON COMMIT DROP;
      CREATE TEMP TABLE test_workspaces(id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,usuario_id int REFERENCES test_users(id),
        empresa_codigo text,cliente_destino_id int,sistema_id int,perfil_id int,estado text,es_favorito boolean,
        permission_version int,permisos jsonb,vigencia_desde date,vigencia_hasta date,
        UNIQUE(usuario_id,empresa_codigo,sistema_id,perfil_id)) ON COMMIT DROP;
      CREATE TEMP TABLE test_audit(modulo text,entidad text,accion text,descripcion text,despues jsonb) ON COMMIT DROP;
      INSERT INTO test_systems VALUES(71,'DOCUMENTAL','activo');
      INSERT INTO test_companies VALUES(17,'BBTI',true),(33,'BBTEC',true);
      INSERT INTO test_profiles VALUES(301,71,'almacen','activo'),(302,71,'admin','activo');
    `);
    const adapter = { unsafe: (s, p = []) => tx.unsafe(mapTables(s), p), begin: fn => tx.savepoint(inner => fn({ unsafe: (s, p = []) => inner.unsafe(mapTables(s), p) })) };
    return fn({ tx, adapter });
  });
}

const memorySink = (receive = async () => {}) => {
  const staged = new Map(), delivered = new Set();
  return {
    prepare: async ({ operationId, credentials }) => staged.set(operationId, credentials.map(x => ({ ...x }))),
    deliver: async ({ operationId }) => {
      if (delivered.has(operationId)) return;
      const rows = staged.get(operationId);
      if (!rows) throw new Error('PRIVATE_PREPARATION_UNAVAILABLE');
      for (const row of rows) await receive(row);
      delivered.add(operationId); staged.delete(operationId);
    },
  };
};
let testDatabase = 'gestion_documental_lab';
const resultFilename = process.env.BBTI_USE_ISOLATED_EVIDENCE === '1' ? 'isolated-regression-result.json' : 'result.json';
const run = async (sql, sink = memorySink(), extra = {}) => provision({
  sql, expectedDatabase: testDatabase, credentialSink: sink, approvedIntegrity: await verifyIntegrity(), ...extra,
});
const checkMatrix = rows => {
  assert.equal(rows.length, 8);
  for (const t of TARGETS) {
    const workspaces = rows.filter(r => r.email === t.email);
    assert.equal(workspaces.length, 2);
    for (const company of ['BBTI', 'BBTEC']) {
      const matches = workspaces.filter(w => w.empresa_codigo === company);
      assert.equal(matches.length, 1);
      const w = matches[0];
      assert.equal(w.sistema, 'DOCUMENTAL'); assert.equal(w.perfil, t.profile);
      assert.equal(w.usuario_estado, 'activo'); assert.equal(w.estado, 'activo');
      assert.equal(w.cliente, company); assert.equal(w.es_favorito, t.favorite === company);
      assert.equal(w.vigencia_desde, null); assert.equal(w.vigencia_hasta, null);
      assert.ok(samePermissions(w.permisos, t.profile === 'admin' ? PERMISSIONS_G : PERMISSIONS_A));
    }
  }
};
const liveMatrix = sql => sql.unsafe(`SELECT u.id AS usuario_id,u.email,u.estado AS usuario_estado,
  w.id AS workspace_id,w.empresa_codigo,c.abreviatura AS cliente,s.codigo AS sistema,p.codigo AS perfil,
  w.estado,w.es_favorito,w.vigencia_desde,w.vigencia_hasta,w.permisos,w.permission_version
  FROM auth.usuarios u JOIN auth.usuario_workspaces w ON w.usuario_id=u.id
  JOIN core.clientes_destino c ON c.id=w.cliente_destino_id
  JOIN core.sistemas s ON s.id=w.sistema_id JOIN auth.perfiles p ON p.id=w.perfil_id
  WHERE lower(u.email)=ANY($1::text[]) ORDER BY u.email,w.empresa_codigo`, [TARGETS.map(t => t.email)]);
const historical = async sql => ({
  users: await sql.unsafe('SELECT id,nombres,apellidos,email,estado,creado_en,actualizado_en FROM auth.usuarios WHERE email=ANY($1::text[]) ORDER BY email', [HISTORICAL_EMAILS]),
  workspaces: await sql.unsafe('SELECT w.* FROM auth.usuario_workspaces w JOIN auth.usuarios u ON u.id=w.usuario_id WHERE u.email=ANY($1::text[]) ORDER BY w.id', [HISTORICAL_EMAILS]),
});

test('G2 focal integration, temporary fixtures and existing LAB (explicit opt-in)', {
  skip: process.env.BBTI_LAB_TESTS !== '1',
}, async t => {
  // Reuse the authorized LAB application's configuration in memory; never print it.
  let sql;
  try {
    if (process.env.BBTI_USE_ISOLATED_EVIDENCE === '1') {
      const record = JSON.parse(await readFile(new URL('corrections-result.json', evidenceDirectory), 'utf8'));
      testDatabase = record.isolation.databases[0];
      assert.match(testDatabase, /^bbti_auth_g2_isolated_[a-z0-9_]+$/);
      sql = postgres({host:record.isolation.host,port:record.isolation.port,database:testDatabase,username:'bbti_validation',
        max:1,onnotice:()=>{},debug:false,connection:{statement_timeout:30000}});
    } else {
      const [container] = JSON.parse(execFileSync('docker', ['inspect', 'dp_ms_auth'], { encoding: 'utf8' }));
      const item = container.Config.Env.find(v => v.startsWith('DATABASE_URL='));
      const url = new URL(item?.slice('DATABASE_URL='.length));
      assert.equal(url.hostname, 'dp_postgres_documental_lab');
      assert.equal(url.pathname, '/gestion_documental_lab');
      url.hostname = '127.0.0.1'; url.port = '55432';
      sql = postgres(url.toString(), { max: 1, onnotice: () => {}, debug: false,
        connection: { application_name: 'bbti-auth-users-g2-tests', statement_timeout: 30000 } });
    }
  } catch { throw new Error('LAB_CONNECTION_SETUP_FAILED'); }
  try {
    const [id] = await sql.unsafe('SELECT current_database() AS database,current_user AS role,inet_server_addr()::text AS server,inet_server_port() AS port');
    assert.equal(id.database, testDatabase);
    evidence.identity = id;
    evidence.integrity = await verifyIntegrity();

    await t.test('creation, exact matrix, bcrypt, private memory delivery and idempotency', async () => fixture(sql, async ({ tx, adapter }) => {
      const received = new Map();
      const sink = memorySink(async ({ email, temporaryPassword }) => { received.set(email, temporaryPassword); });
      const seedHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);
      for (const email of HISTORICAL_EMAILS) await tx.unsafe("INSERT INTO test_users(nombres,email,password_hash,estado) VALUES('historical',$1,$2,'activo')", [email, seedHash]);
      const before = await tx.unsafe('SELECT * FROM test_users ORDER BY id');
      const first = await run(adapter, sink);
      assert.equal(first.usersCreated, 4); assert.equal(first.workspacesCreated, 8);
      assert.equal(received.size, 4); assert.equal(new Set(received.values()).size, 4);
      const rows = await adapter.begin(inner => liveMatrix(inner));
      checkMatrix(rows);
      const credentials = await tx.unsafe('SELECT email,password_hash FROM test_users WHERE email=ANY($1::text[])', [TARGETS.map(t => t.email)]);
      for (const row of credentials) {
        assert.equal(bcrypt.getRounds(row.password_hash), 12);
        assert.ok(await bcrypt.compare(received.get(row.email), row.password_hash));
      }
      for (const secret of received.values()) assert.ok(!JSON.stringify(first).includes(secret));
      for (const row of credentials) assert.ok(!JSON.stringify(first).includes(row.password_hash));
      const moduleText = await readFile(new URL('provision.mjs', import.meta.url), 'utf8');
      assert.ok(!/\bconsole\.|process\.(stdout|stderr)|writeFile/.test(moduleText));
      pass('CREDENTIALS_NOT_EXPOSED');
      const snapshot = await tx.unsafe('SELECT * FROM test_users ORDER BY id');
      const second = await run(adapter, memorySink(async () => assert.fail('Existing credentials must not be delivered or replaced')));
      assert.equal(second.usersCreated, 0); assert.equal(second.workspacesCreated, 0);
      assert.ok(samePermissions(snapshot, await tx.unsafe('SELECT * FROM test_users ORDER BY id')));
      const after = await tx.unsafe('SELECT * FROM test_users WHERE email=ANY($1::text[]) ORDER BY id', [HISTORICAL_EMAILS]);
      assert.ok(samePermissions(before, after));
      received.clear();
      pass('INITIAL_CREATION_FOUR_USERS_EIGHT_WORKSPACES'); pass('BCRYPT_COMPATIBILITY');
      pass('INDEPENDENT_IN_MEMORY_CREDENTIALS'); pass('EXISTING_CREDENTIALS_PRESERVED');
      pass('FIXTURE_HISTORICAL_USERS_PRESERVED'); pass('SECOND_EXECUTION_NO_DUPLICATES');
    }));

    await t.test('existing user conflict fails atomically', async () => fixture(sql, async ({ tx, adapter }) => {
      const hash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);
      await tx.unsafe("INSERT INTO test_users(nombres,email,password_hash,estado) VALUES('conflict',$1,$2,'inactivo')", [TARGETS[3].email, hash]);
      await assert.rejects(run(adapter), { code: 'EXISTING_USER_CONFLICT' });
      const [r] = await tx.unsafe('SELECT count(*)::int AS n FROM test_users'); assert.equal(r.n, 1);
      pass('EXISTING_USER_CONFLICT_DETECTION');
    }));

    await t.test('missing and ambiguous natural identity fail closed', async () => fixture(sql, async ({ tx, adapter }) => {
      await tx.unsafe("UPDATE test_companies SET estado=false WHERE abreviatura='BBTEC'");
      await assert.rejects(run(adapter), { code: 'COMPANY_IDENTITY_MISSING_OR_AMBIGUOUS' });
      await tx.unsafe("UPDATE test_companies SET estado=true; INSERT INTO test_companies VALUES(99,'BBTEC',true)");
      await assert.rejects(run(adapter), { code: 'COMPANY_IDENTITY_MISSING_OR_AMBIGUOUS' });
      const [r] = await tx.unsafe('SELECT count(*)::int AS n FROM test_users'); assert.equal(r.n, 0);
      pass('MISSING_IDENTITY_FAIL_CLOSED'); pass('AMBIGUOUS_IDENTITY_FAIL_CLOSED');
    }));

    await t.test('workspace conflicts and delivery errors rollback, errors sanitized', async () => fixture(sql, async ({ tx, adapter }) => {
      const secret = randomBytes(32).toString('base64url');
      await assert.rejects(run(adapter, { prepare: async () => { throw new Error(secret); }, deliver: async () => assert.fail('Must not deliver before commit') }), error =>
        error.code === 'PRIVATE_PREPARATION_FAILED' && !JSON.stringify(error).includes(secret));
      const [r] = await tx.unsafe('SELECT count(*)::int AS n FROM test_users'); assert.equal(r.n, 0);
      await run(adapter);
      await tx.unsafe("UPDATE test_workspaces SET permisos='{}'::jsonb WHERE id=(SELECT min(id) FROM test_workspaces)");
      await assert.rejects(run(adapter), { code: 'EXISTING_WORKSPACE_CONFLICT' });
      pass('ATOMIC_ROLLBACK'); pass('EXISTING_WORKSPACE_CONFLICT_DETECTION'); pass('CREDENTIAL_ERROR_SANITIZATION');
    }));

    await t.test('wrong database and unapproved production delivery blocked', async () => {
      await assert.rejects(run(sql, undefined, { expectedDatabase: 'gestion_documental' }), { code: 'PRODUCTION_EXECUTION_NOT_AUTHORIZED' });
      await assert.rejects(run(sql, undefined, { expectedDatabase: 'bbti_auth_g2_isolated_wrong' }), { code: 'DATABASE_IDENTITY_MISMATCH' });
      pass('DATABASE_IDENTITY_FAIL_CLOSED'); pass('PRODUCTION_DELIVERY_GUARD');
    });

    await t.test('existing LAB baseline, two executions and historical preservation', async () => {
      const before = await historical(sql);
      assert.equal(before.users.length, 5);
      const matrixBefore = await liveMatrix(sql); checkMatrix(matrixBefore);
      evidence.baseline = { users: 4, workspaces: 8, historicalUsers: before.users.length,
        historicalWorkspaces: before.workspaces.length, historicalSafeProjectionSha256: safeHash(before), matrix: matrixBefore };
      const evidenceDir = evidenceDirectory;
      await mkdir(evidenceDir, { recursive: true });
      await writeFile(new URL(resultFilename, evidenceDir), JSON.stringify({ ...evidence, executionStatus: 'BASELINE_RECORDED_BEFORE_LIVE_EXECUTION' }, null, 2) + '\n');
      const sink = memorySink(async () => assert.fail('Baseline users already exist'));
      const first = await run(sql, sink); const second = await run(sql, sink);
      assert.equal(first.usersCreated, 0); assert.equal(first.workspacesCreated, 0);
      assert.equal(second.usersCreated, 0); assert.equal(second.workspacesCreated, 0);
      const after = await historical(sql); assert.deepEqual(after, before);
      const matrix = await liveMatrix(sql); checkMatrix(matrix); assert.deepEqual(matrix, matrixBefore);
      evidence.liveExecutions = [first, second];
      evidence.final = { users: 4, workspaces: 8, historicalSafeProjectionSha256: safeHash(after) };
      for (const name of ['FOUR_USERS','EIGHT_WORKSPACES','ACUEVA_PERMISSIONS_A','SPAREDES_PERMISSIONS_A',
        'SGUTIERREZ_PERMISSIONS_A','GERENTE_PERMISSIONS_G','ACUEVA_FAVORITE_BBTI','SPAREDES_FAVORITE_BBTI',
        'SGUTIERREZ_NO_FAVORITE','GERENTE_FAVORITE_BBTI','LAB_SECOND_EXECUTION_NO_DUPLICATES',
        'HISTORICAL_USERS_PRESERVED','HISTORICAL_WORKSPACES_PRESERVED']) pass(name);
    });
  } finally {
    if (sql) await sql.end({ timeout: 5 });
  }
  const required = ['FOUR_USERS','EIGHT_WORKSPACES','ACUEVA_PERMISSIONS_A','SPAREDES_PERMISSIONS_A',
    'SGUTIERREZ_PERMISSIONS_A','GERENTE_PERMISSIONS_G','ACUEVA_FAVORITE_BBTI','SPAREDES_FAVORITE_BBTI',
    'SGUTIERREZ_NO_FAVORITE','GERENTE_FAVORITE_BBTI','SECOND_EXECUTION_NO_DUPLICATES',
    'EXISTING_USER_CONFLICT_DETECTION','MISSING_IDENTITY_FAIL_CLOSED','HISTORICAL_USERS_PRESERVED',
    'CREDENTIALS_NOT_EXPOSED','INITIAL_CREATION_FOUR_USERS_EIGHT_WORKSPACES','ATOMIC_ROLLBACK',
    'EXISTING_WORKSPACE_CONFLICT_DETECTION','BCRYPT_COMPATIBILITY'];
  evidence.executionStatus = required.every(name => evidence.checks[name] === 'PASS') ? 'PASS' : 'FAIL';
  evidence.recordedAt = new Date().toISOString();
  const dir = evidenceDirectory;
  await mkdir(dir, { recursive: true });
  await writeFile(new URL(resultFilename, dir), JSON.stringify(evidence, null, 2) + '\n');
});
