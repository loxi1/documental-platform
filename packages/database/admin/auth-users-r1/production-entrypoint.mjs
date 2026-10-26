import { readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { provision, recoverDelivery, verifyIntegrity, TARGETS, HISTORICAL_EMAILS,
  PERMISSIONS_A, PERMISSIONS_G, samePermissions } from './provision.mjs';
import { createPrivateDelivery } from './private-delivery.mjs';
const require=createRequire(new URL('../../package.json',import.meta.url));
const fail=code=>{throw new Error(code);};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const SCOPE='4_USERS_8_WORKSPACES_ONLY';
export function validateApproval(a,integrity,now=Date.now()) {
  if(!a||a.environment!=='production'||a.database!=='gestion_documental'||a.role!=='document_platform'||a.scope!==SCOPE||a.artifactIntegrity!==integrity||a.dbWriteAuthorized!==true||a.privateDeliveryApproved!==true||((a.custodyMode??'INDIVIDUAL')!=='PO_MANAGED'&&a.administrativeRotationApproved!==true))fail('PRODUCTION_APPROVAL_INCOMPLETE');
  if(!a.approvalId||!a.custodian||!a.operator||!a.keysApprovalId||!a.deliveryChannelApprovalId||((a.custodyMode??'INDIVIDUAL')!=='PO_MANAGED'&&!a.rotationApprovalId))fail('OPERATIONAL_RESPONSIBILITIES_REQUIRED');
  if(!Number.isFinite(Date.parse(a.expiresAt))||Date.parse(a.expiresAt)<=now)fail('PRODUCTION_APPROVAL_EXPIRED');
  if(!/^[a-f0-9]{40}$/.test(a.enterpriseCommit??'')||!/^[a-f0-9]{40}$/.test(a.sourceCommit??'')||!a.enterpriseRoot?.startsWith('/')||!a.expectedServer||!a.expectedHost?.endsWith('.rds.amazonaws.com'))fail('PROMOTED_IDENTITY_REQUIRED');
  const mode=a.custodyMode??'INDIVIDUAL';
  if(!['INDIVIDUAL','PO_MANAGED'].includes(mode))fail('CUSTODY_MODE_INVALID');
  if(mode==='PO_MANAGED'&&!a.custodianDeliveryDirectory?.startsWith('/'))fail('PO_PRIVATE_CHANNEL_REQUIRED');
  const recipients=a.recipients??(mode==='PO_MANAGED'?TARGETS:[]);
  if(recipients.length!==4||new Set(recipients.map(r=>r.email)).size!==4||TARGETS.some(t=>!recipients.some(r=>r.email===t.email)))fail('PRODUCTION_RECIPIENT_SCOPE_INVALID');
  return true;
}
async function snapshot(sql) {
  const users=await sql.unsafe('SELECT id,email,estado,nombres,apellidos,creado_en,actualizado_en FROM auth.usuarios WHERE email=ANY($1::text[]) ORDER BY email',[HISTORICAL_EMAILS]);
  const workspaces=await sql.unsafe('SELECT w.id,w.usuario_id,w.empresa_codigo,w.cliente_destino_id,w.sistema_id,w.perfil_id,w.estado,w.es_favorito,w.ultimo_uso_en,w.vigencia_desde,w.vigencia_hasta,w.permission_version,w.permisos,w.creado_en,w.actualizado_en FROM auth.usuario_workspaces w JOIN auth.usuarios u ON u.id=w.usuario_id WHERE u.email=ANY($1::text[]) ORDER BY w.id',[HISTORICAL_EMAILS]);
  if(users.length!==5||users.some(u=>u.estado!=='activo')||workspaces.length!==11)fail('HISTORICAL_BASELINE_MISMATCH');
  return hash({users,workspaces});
}
async function checkIdentity(sql,a) {
  const [i]=await sql.unsafe("SELECT current_database() AS database,current_user AS role,inet_server_addr()::text AS server,current_setting('transaction_read_only') AS readonly");
  if(i.database!==a.database||i.role!==a.role||i.server!==a.expectedServer||i.readonly!=='on')fail('PRODUCTION_IDENTITY_OR_READONLY_MISMATCH');
  return i;
}
export async function executeAdministrative({approval,credentialSink,sql,approvedIntegrity,command='preflight',operationId}) {
  // Library integration seam: caller must use the verified entrypoint below for actual production.
  const integrity=await verifyIntegrity();validateApproval(approval,integrity);
  if(approvedIntegrity!==integrity)fail('APPROVED_DIGEST_MISMATCH');
  if(!['preflight','execute','recover'].includes(command))fail('COMMAND_NOT_ALLOWED');
  const before=await sql.begin('read only',async tx=>{await checkIdentity(tx,approval);return snapshot(tx);});
  if(command==='preflight')return {state:'PREFLIGHT_ONLY_NO_WRITES',integrity,historicalProjection:before};
  const productionAuthorization={environment:'production',database:approval.database,role:approval.role,
    server:approval.expectedServer,scope:SCOPE,approvalId:approval.approvalId,artifactIntegrity:integrity};
  const args={sql,expectedDatabase:approval.database,approvedIntegrity:integrity,credentialSink,productionAuthorization};
  const result=command==='recover'?await recoverDelivery({...args,operationId}):await provision(args);
  if(['TRANSACTION_OUTCOME_UNKNOWN','COMMIT_OR_DELIVERY_STATUS_UNKNOWN','NOT_COMMITTED'].includes(result.state))return result;
  let after;
  try { after=await sql.begin('read only',async tx=>{
    await checkIdentity(tx,approval);
    if(await snapshot(tx)!==before)fail('HISTORICAL_POSTCHECK_MISMATCH');
    const rows=await tx.unsafe(`SELECT u.email,u.estado AS user_state,w.empresa_codigo,w.cliente_destino_id,w.es_favorito,w.estado,w.permisos,w.vigencia_desde,w.vigencia_hasta,
      c.abreviatura AS client,s.codigo AS system,p.codigo AS profile FROM auth.usuarios u JOIN auth.usuario_workspaces w ON w.usuario_id=u.id
      JOIN core.clientes_destino c ON c.id=w.cliente_destino_id JOIN core.sistemas s ON s.id=w.sistema_id JOIN auth.perfiles p ON p.id=w.perfil_id
      WHERE lower(u.email)=ANY($1::text[]) ORDER BY u.email,w.empresa_codigo`,[TARGETS.map(t=>t.email)]);
    if(rows.length!==8)fail('TARGET_POSTCHECK_FAILED');
    for(const t of TARGETS)for(const company of ['BBTI','BBTEC']) {
      const matches=rows.filter(w=>w.email===t.email&&w.empresa_codigo===company);
      if(matches.length!==1)fail('TARGET_POSTCHECK_FAILED');const w=matches[0];
      if(w.user_state!=='activo'||w.estado!=='activo'||w.client!==company||w.system!=='DOCUMENTAL'||w.profile!==t.profile||w.es_favorito!==(company===t.favorite)||w.vigencia_desde!==null||w.vigencia_hasta!==null||!samePermissions(w.permisos,t.profile==='admin'?PERMISSIONS_G:PERMISSIONS_A))fail('TARGET_POSTCHECK_FAILED');
    }
    return {users:4,workspaces:8,historicalPreserved:true};
  });
  } catch { return {...result,state:'COMMITTED_POSTCHECK_REQUIRES_REVIEW',postcheck:'FAILED_VERIFY_READONLY'}; }
  return {...result,postcheck:after};
}
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export async function main(argv=process.argv.slice(2)) {
  let sql;
  try {
    if(argv.length<3||!['preflight','execute','recover'].includes(argv[0])||argv[1]!=='--approval'||(argv[0]==='recover'?argv.length!==5||argv[3]!=='--operation':argv.length!==3))fail('USAGE_COMMAND_APPROVAL_FILE_REQUIRED');
    const approvalPath=await realpath(argv[2]);const stat=await lstat(argv[2]);
    if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)fail('APPROVAL_FILE_UNSAFE');
    const approval=JSON.parse(await readFile(approvalPath,'utf8'));const integrity=await verifyIntegrity();validateApproval(approval,integrity);
    const root=await realpath(approval.enterpriseRoot);
    const moduleRoot=await realpath(new URL('../../../..',import.meta.url));
    if(root!==moduleRoot||git(root,'branch','--show-current')!=='main'||git(root,'rev-parse','HEAD')!==approval.enterpriseCommit||git(root,'status','--porcelain'))fail('ENTERPRISE_CHECKOUT_NOT_APPROVED_CLEAN_MAIN');
    if(relative(root,approvalPath).startsWith('..')===false)fail('APPROVAL_MUST_BE_OUTSIDE_GIT');
    const configPath=join(root,'deployment/env/.env.production');
    const config=require('dotenv').parse(await readFile(configPath));
    const expand=s=>String(s??'').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,(_,key)=>{if(!(key in config))fail('CONFIG_REFERENCE_MISSING');return config[key];});
    const url=new URL(expand(config.DATABASE_URL));
    if(url.hostname!==approval.expectedHost||decodeURIComponent(url.pathname.slice(1))!==approval.database||decodeURIComponent(url.username)!==approval.role)fail('AUTHORIZED_CONNECTION_MISMATCH');
    const sink=await createPrivateDelivery({custodyMode:approval.custodyMode??'INDIVIDUAL',custodianDeliveryDirectory:approval.custodianDeliveryDirectory,custodyRoot:approval.custodyRoot,gpgHome:approval.gpgHome,
      custodianFingerprint:approval.custodianFingerprint,recipients:approval.recipients,
      forbiddenRoots:[root,approval.sourceRoot??'/home/loxi1/projects/apps/documental-platform'],verifiedKeysApproval:approval.keysApprovalId});
    sql=require('postgres')(url.toString(),{max:1,debug:false,onnotice:()=>{},connect_timeout:10,
      connection:{application_name:'bbti-auth-users-admin-r1',statement_timeout:30000}});
    const result=await executeAdministrative({approval,credentialSink:sink,sql,approvedIntegrity:integrity,command:argv[0],operationId:argv[4]});
    console.log(JSON.stringify(result));
    if(result.recoveryRequired||['COMMITTED_POSTCHECK_REQUIRES_REVIEW','NOT_COMMITTED'].includes(result.state)||result.deliveryState==='COMMITTED_DELIVERY_PENDING')process.exitCode=1;
  }catch{console.error('ADMIN_EXECUTION_BLOCKED_OR_OUTCOME_REQUIRES_READONLY_VERIFICATION');process.exitCode=1;}
  finally{if(sql)await sql.end({timeout:5});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
