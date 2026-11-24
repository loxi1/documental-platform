/** Explicit opt-in: actual postgres@3.4.9 reserved API, session READ ONLY, SELECT only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{parseEnv}=require('node:util'),{createRequire}=require('node:module');
async function main(){
 assert.equal(process.env.BBTI_NAS_RESERVED_READONLY,'1');
 const root='/home/loxi1/projects/apps/documental-platform';assert.equal(process.cwd(),root);
 const compiled=process.env.BBTI_NAS_RESERVED_COMPILED;
 assert(['/tmp/bbti-nas-physical-correction-build/dist',root+'/apps/ms-documentos/dist'].includes(compiled));
 const req=createRequire(root+'/apps/ms-documentos/package.json');
 const postgres=req('postgres'),{drizzle}=req('drizzle-orm/postgres-js');
 assert.equal(JSON.parse(fs.readFileSync(path.resolve(path.dirname(req.resolve('postgres')),'../../package.json'),'utf8')).version,'3.4.9');
 const url=new URL(parseEnv(fs.readFileSync(root+'/.env','utf8')).DATABASE_URL);
 assert.equal(decodeURIComponent(url.pathname.slice(1)),'gestion_documental_g2_prodclone_20261028');
 assert(['127.0.0.1','localhost','bbti-mvp3005-postgres','172.29.0.2'].includes(url.hostname));
 const db=postgres(url.href,{max:3,connect_timeout:5,idle_timeout:1,onnotice:()=>{},connection:{default_transaction_read_only:'on',application_name:'nas-reserved-readonly-test'}});drizzle(db);
 let reserved,business;
 try{
  const [identity]=await db`SELECT current_database() AS name,current_setting('transaction_read_only') AS ro`;assert.equal(identity.ro,'on');assert.equal(identity.name,'gestion_documental_g2_prodclone_20261028');
  const {transaccionReservaDurable}=req(path.join(compiled,'documentos/archivado/archivado-materializacion.service.js'));
  reserved=await db.reserve();assert.equal(typeof reserved.begin,'undefined');assert.equal(typeof reserved.release,'function');
  const [before]=await reserved`SELECT pg_backend_pid() AS pid`;
  const retained=()=>assert.fail('unexpected quarantine in healthy real driver');
  const current=await transaccionReservaDurable(reserved,async()=>{const [r]=await reserved`SELECT pg_backend_pid() AS pid,current_setting('transaction_read_only') AS ro`;assert.equal(r.ro,'on');return r.pid},retained);assert.equal(current,before.pid);
  const state=async()=>{const [r]=await db`SELECT state FROM pg_stat_activity WHERE pid=${before.pid}`;return r.state};assert.equal(await state(),'idle');
  await assert.rejects(()=>transaccionReservaDurable(reserved,async()=>{throw Error('SYNTHETIC_WORK_FAILURE')},retained),/SYNTHETIC_WORK_FAILURE/);assert.equal(await state(),'idle');
  await assert.rejects(()=>transaccionReservaDurable(reserved,()=>reserved`SELECT 1/0 AS synthetic_error`,retained),{code:'22012'});assert.equal(await state(),'idle');
  business=await db.reserve();await business.unsafe('BEGIN READ ONLY');const [other]=await business`SELECT pg_backend_pid() AS pid`;assert.notEqual(other.pid,before.pid);
  await transaccionReservaDurable(reserved,()=>reserved`SELECT 'independent-readonly-commit' AS proof`,retained);
  await business.unsafe('ROLLBACK');assert.equal(await state(),'idle');
  console.log(JSON.stringify({driver:'postgres@3.4.9',read_only:'on',reserved_begin:'ABSENT',same_connection:'PASS',commit:'PASS',work_rollback:'PASS',sql_error_rollback:'PASS',independent_business_rollback:'PASS',returned_state:'idle',dml_executed:0,storage_operations:0,result:'PASS'}));
 }finally{
  // Only this process's test pool. No shared application pool, server, records or services are changed.
  try{if(business){await business.unsafe('ROLLBACK');business.release()}}catch{}
  try{if(reserved){await reserved.unsafe('ROLLBACK');reserved.release()}}catch{}
  await db.end({timeout:0});
 }
}
main().catch(e=>{console.error(JSON.stringify({result:'FAIL',name:e.name,code:e.code??'ASSERTION_FAILED'}));process.exitCode=1});
