import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const requireAuth = createRequire(new URL('../../../../apps/ms-auth/package.json', import.meta.url));
const bcrypt = requireAuth('bcrypt');
export const VERSION = 'BBTI_AUTH_USERS_ADMIN_R1';
export const ACTIONS_A = Object.freeze(['documentos.subir', 'documentos.validar',
  'documentos.editar_ocr', 'documentos.confirmar_ocr', 'documentos.rechazar_ocr',
  'documentos.vincular_expediente', 'ocr.confirmar', 'ocr.rechazar']);
export const PERMISSIONS_A = Object.freeze({ menus: Object.freeze(['almacen']), actions: ACTIONS_A });
export const PERMISSIONS_G = Object.freeze({
  menus: Object.freeze(['documentos', 'compras', 'almacen', 'finanzas', 'revision_contable',
    'alertas', 'proyectos', 'caja_chica', 'requerimientos']),
  actions: Object.freeze([...ACTIONS_A, 'alertas.crear', 'alertas.resolver']),
});
export const TARGETS = Object.freeze([
  Object.freeze({ email: 'acueva@gestion.documental', profile: 'almacen', favorite: 'BBTI' }),
  Object.freeze({ email: 'sparedes@gestion.documental', profile: 'almacen', favorite: 'BBTI' }),
  Object.freeze({ email: 'sgutierrez@gestion.documental', profile: 'almacen', favorite: null }),
  Object.freeze({ email: 'gerente@gestion.documental', profile: 'admin', favorite: 'BBTI' }),
]);
export const COMPANIES = Object.freeze(['BBTI', 'BBTEC']);
export const HISTORICAL_EMAILS = Object.freeze(['admin', 'almacen', 'contabilidad',
  'compras', 'finanzas'].map(name => `${name}@documental.local`));

export class ProvisionError extends Error {
  constructor(code) { super(code); this.name = 'ProvisionError'; this.code = code; }
}
const fail = code => { throw new ProvisionError(code); };
const normalize = value => Array.isArray(value) ? value.map(normalize).sort((a, b) =>
  JSON.stringify(a).localeCompare(JSON.stringify(b))) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, normalize(value[k])])) : value;
export const samePermissions = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

export async function verifyIntegrity() {
  const entries = (await readFile(new URL('SHA256SUMS', import.meta.url), 'utf8')).trim().split('\n');
  const expected = ['provision.mjs', 'provision.test.mjs', 'isolated.test.mjs', 'README.md', 'rotation-proposal.md', 'private-delivery.mjs', 'production-entrypoint.mjs', 'production.test.mjs'];
  if (entries.length !== expected.length) fail('INTEGRITY_MANIFEST_INVALID');
  for (let i = 0; i < entries.length; i++) {
    const match = /^([a-f0-9]{64})  ([a-zA-Z.-]+)$/.exec(entries[i]);
    if (!match || match[2] !== expected[i]) fail('INTEGRITY_MANIFEST_INVALID');
    const bytes = await readFile(new URL(match[2], import.meta.url));
    if (createHash('sha256').update(bytes).digest('hex') !== match[1]) fail('INTEGRITY_MISMATCH');
  }
  return createHash('sha256').update(entries.join('\n') + '\n').digest('hex');
}

// LAB remains the default; production requires an explicit, artifact-bound authorization.
const assertEnvironment = (name, authorization, integrity) => {
  if (name === 'gestion_documental_lab' || /^bbti_auth_g2_isolated_[a-z0-9_]+$/.test(name ?? '')) return;
  if (name !== 'gestion_documental' || authorization?.environment !== 'production' ||
      authorization.database !== name || authorization.role !== 'document_platform' ||
      authorization.scope !== '4_USERS_8_WORKSPACES_ONLY' || !authorization.approvalId ||
      !authorization.server || authorization.artifactIntegrity !== integrity) fail('PRODUCTION_EXECUTION_NOT_AUTHORIZED');
};
const assertSink = sink => {
  if (typeof sink?.prepare !== 'function' || typeof sink?.deliver !== 'function') fail('PRIVATE_DELIVERY_REQUIRED');
};

export async function provision({ sql, expectedDatabase, credentialSink, approvedIntegrity, productionAuthorization }) {
  const operationId = randomUUID();
  let result;
  try {
    const integrity = await verifyIntegrity();
    if (approvedIntegrity !== integrity) fail('APPROVED_ARTIFACT_MISMATCH');
    assertEnvironment(expectedDatabase, productionAuthorization, integrity); assertSink(credentialSink);
    result = await sql.begin(async tx => provisionTransaction({ tx, expectedDatabase, credentialSink, integrity, operationId, productionAuthorization }));
  } catch (error) {
    if (error instanceof ProvisionError) throw error;
    // COMMIT transport failures can have an unknown outcome. Never promise rollback or retry secrets.
    return { operationId, state: 'TRANSACTION_OUTCOME_UNKNOWN', recoveryRequired: true };
  }
  if (!result.usersCreated) return { ...result, deliveryState: 'NO_NEW_CREDENTIALS' };
  // begin() has resolved after COMMIT; recovery additionally verifies the committed audit record.
  const delivery = await recoverDelivery({ sql, expectedDatabase, credentialSink, operationId, approvedIntegrity, productionAuthorization });
  return { ...result, deliveryState: delivery.state };
}

/** Retry only the same prepared operation, never create/reset a password. Sink delivery must be idempotent. */
export async function recoverDelivery({ sql, expectedDatabase, credentialSink, operationId, approvedIntegrity, productionAuthorization }) {
  assertSink(credentialSink);
  const integrity = await verifyIntegrity();
  if (approvedIntegrity !== integrity) fail('APPROVED_ARTIFACT_MISMATCH');
  assertEnvironment(expectedDatabase, productionAuthorization, integrity);
  if (!/^[a-f0-9-]{36}$/.test(operationId ?? '')) fail('INVALID_OPERATION_ID');
  try {
    const [identity] = await sql.unsafe('SELECT current_database() AS database,current_user AS actor_role,inet_server_addr()::text AS server');
    if (identity?.database !== expectedDatabase || (expectedDatabase === 'gestion_documental' && (identity.actor_role !== productionAuthorization.role || identity.server !== productionAuthorization.server))) fail('DATABASE_IDENTITY_MISMATCH');
    const rows = await sql.unsafe(`SELECT despues FROM core.auditoria_eventos
      WHERE accion='ADMIN_PROVISION_R1' AND descripcion=$1 AND despues->>'operationId'=$2`, [VERSION, operationId]);
    if (!rows.length) return { operationId, state: 'NOT_COMMITTED' };
    if (rows.length !== 1 || rows[0].despues.integrity !== integrity) fail('COMMITTED_ARTIFACT_MISMATCH');
    const done = await sql.unsafe(`SELECT 1 FROM core.auditoria_eventos
      WHERE accion='ADMIN_DELIVERY_CONFIRMED' AND descripcion=$1 AND despues->>'operationId'=$2`, [VERSION, operationId]);
    if (done.length) return { operationId, state: 'DELIVERED' };
    try { await credentialSink.deliver({ operationId, integrity }); }
    catch { return { operationId, state: 'COMMITTED_DELIVERY_PENDING' }; }
    await sql.unsafe(`INSERT INTO core.auditoria_eventos(modulo,entidad,accion,descripcion,despues)
      VALUES('auth','usuarios','ADMIN_DELIVERY_CONFIRMED',$1,$2::jsonb)`, [VERSION, { operationId, integrity }]);
    return { operationId, state: 'DELIVERED' };
  } catch (error) {
    if (error instanceof ProvisionError) throw error;
    return { operationId, state: 'COMMIT_OR_DELIVERY_STATUS_UNKNOWN', recoveryRequired: true };
  }
}

async function provisionTransaction({ tx, expectedDatabase, credentialSink, integrity, operationId, productionAuthorization }) {
  const q = (text, params = []) => tx.unsafe(text, params);
  const [identity] = await q('SELECT current_database() AS database,current_user AS actor_role,inet_server_addr()::text AS server');
  if (identity?.database !== expectedDatabase || (expectedDatabase === 'gestion_documental' && (identity.actor_role !== productionAuthorization.role || identity.server !== productionAuthorization.server))) fail('DATABASE_IDENTITY_MISMATCH');
  await q("SELECT pg_advisory_xact_lock(hashtext('BBTI_AUTH_USERS_ADMIN_R1'))");
  const systems = await q("SELECT id, codigo, estado FROM core.sistemas WHERE codigo='DOCUMENTAL' FOR SHARE");
  if (systems.length !== 1 || systems[0].estado !== 'activo') fail('SYSTEM_IDENTITY_MISSING_OR_AMBIGUOUS');
  const system = systems[0];
  const companies = await q("SELECT id, abreviatura, estado FROM core.clientes_destino WHERE upper(abreviatura) IN ('BBTI','BBTEC') FOR SHARE");
  const companyMap = new Map();
  for (const company of COMPANIES) {
    const rows = companies.filter(c => c.abreviatura === company);
    if (rows.length !== 1 || !rows[0].estado || companies.filter(c => c.abreviatura.toUpperCase() === company).length !== 1) {
      fail('COMPANY_IDENTITY_MISSING_OR_AMBIGUOUS');
    }
    companyMap.set(company, rows[0].id);
  }
  const profiles = await q("SELECT id,codigo,estado FROM auth.perfiles WHERE sistema_id=$1 AND codigo IN ('almacen','admin') FOR SHARE", [system.id]);
  const profileMap = new Map();
  for (const profile of ['almacen', 'admin']) {
    const rows = profiles.filter(p => p.codigo === profile);
    if (rows.length !== 1 || rows[0].estado !== 'activo') fail('PROFILE_IDENTITY_MISSING_OR_AMBIGUOUS');
    profileMap.set(profile, rows[0].id);
  }
  const emails = TARGETS.map(t => t.email);
  const existing = await q('SELECT id,email,estado FROM auth.usuarios WHERE lower(email)=ANY($1::text[]) FOR UPDATE', [emails]);
  const plans = [];
  // Validate the entire existing composition before the first write or credential generation.
  for (const target of TARGETS) {
    const rows = existing.filter(u => u.email.toLowerCase() === target.email);
    if (rows.length > 1 || (rows.length === 1 && (rows[0].email !== target.email || rows[0].estado !== 'activo'))) {
      fail('EXISTING_USER_CONFLICT');
    }
    const user = rows[0];
    const permissions = target.profile === 'admin' ? PERMISSIONS_G : PERMISSIONS_A;
    const workspaces = user ? await q('SELECT id,empresa_codigo,cliente_destino_id,sistema_id,perfil_id,estado,es_favorito,vigencia_desde,vigencia_hasta,permisos FROM auth.usuario_workspaces WHERE usuario_id=$1 FOR UPDATE', [user.id]) : [];
    if (workspaces.length > 2) fail('EXISTING_WORKSPACE_CONFLICT');
    for (const w of workspaces) {
      if (!COMPANIES.includes(w.empresa_codigo) || Number(w.cliente_destino_id) !== Number(companyMap.get(w.empresa_codigo)) ||
          Number(w.sistema_id) !== Number(system.id) || Number(w.perfil_id) !== Number(profileMap.get(target.profile)) ||
          w.estado !== 'activo' || w.es_favorito !== (target.favorite === w.empresa_codigo) ||
          w.vigencia_desde !== null || w.vigencia_hasta !== null || !samePermissions(w.permisos, permissions) ||
          workspaces.filter(x => x.empresa_codigo === w.empresa_codigo).length !== 1) fail('EXISTING_WORKSPACE_CONFLICT');
    }
    plans.push({ target, user, permissions, missing: COMPANIES.filter(c => !workspaces.some(w => w.empresa_codigo === c)) });
  }
  let usersCreated = 0, workspacesCreated = 0;
  const preparedCredentials = [];
  for (const plan of plans) {
    let user = plan.user;
    if (!user) {
      let secret = randomBytes(32).toString('base64url');
      try {
        const hash = await bcrypt.hash(secret, 12);
        [user] = await q("INSERT INTO auth.usuarios(nombres,email,password_hash,estado) VALUES($1,$2,$3,'activo') RETURNING id", [plan.target.email.split('@')[0], plan.target.email, hash]);
        preparedCredentials.push({ email: plan.target.email, temporaryPassword: secret });
      } finally { secret = undefined; }
      usersCreated++;
    }
    for (const company of plan.missing) {
      await q(`INSERT INTO auth.usuario_workspaces(usuario_id,empresa_codigo,cliente_destino_id,sistema_id,perfil_id,estado,es_favorito,permission_version,permisos)
        VALUES($1,$2,$3,$4,$5,'activo',$6,1,$7::jsonb)`, [user.id, company, companyMap.get(company), system.id,
        profileMap.get(plan.target.profile), plan.target.favorite === company, plan.permissions]);
      workspacesCreated++;
    }
  }
  if (preparedCredentials.length) {
    try { await credentialSink.prepare({ operationId, integrity, credentials: preparedCredentials }); }
    catch { fail('PRIVATE_PREPARATION_FAILED'); }
    finally { preparedCredentials.length = 0; }
  }
  if (usersCreated || workspacesCreated) {
    await q(`INSERT INTO core.auditoria_eventos(modulo,entidad,accion,descripcion,despues)
      VALUES('auth','usuarios','ADMIN_PROVISION_R1',$1,$2::jsonb)`, [VERSION, { operationId, integrity, usersCreated, workspacesCreated, actorRole: identity.actor_role, targetEmails: emails }]);
  }
  return { version: VERSION, operationId, integrity, users: 4, workspaces: 8, usersCreated, workspacesCreated };
}
