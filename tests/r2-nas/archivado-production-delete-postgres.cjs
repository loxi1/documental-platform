/** Real driver/SQL contract and real advisory exclusion; no DML execution or storage I/O. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseEnv}=require('node:util'),{createRequire,Module}=require('node:module'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
async function main(){
 assert.equal(process.env.BBTI_PG_READONLY_REGRESSION,'1');assert.equal(process.cwd(),root);
 const req=createRequire(path.join(root,'packages/database/package.json'));
 const postgres=req('postgres'),{drizzle}=req('drizzle-orm/postgres-js');
 const env=parseEnv(fs.readFileSync(path.join(root,'.env'),'utf8')),url=new URL(env.DATABASE_URL);
 assert.equal(decodeURIComponent(url.pathname.slice(1)),'gestion_documental_g2_prodclone_20261028');
 assert(['localhost','127.0.0.1','bbti-mvp3005-postgres','172.29.0.2'].includes(url.hostname));
 const db=postgres(url.href,{max:2,connect_timeout:5,idle_timeout:1,
  connection:{default_transaction_read_only:'on',application_name:'bbti-prod-delete-readonly-contract'}});drizzle(db);
 try{
  const report=await db.begin('read only',async tx=>{
   const [identity]=await tx`SELECT current_database() AS database,current_setting('transaction_read_only') AS read_only`;
   assert.equal(identity.database,'gestion_documental_g2_prodclone_20261028');assert.equal(identity.read_only,'on');
   const repositoryPath=path.join(root,'apps/ms-documentos/src/documentos/archivado/archivado.repository.ts');
   const local=createRequire(repositoryPath),ts=local('typescript');
   const code=ts.transpileModule(fs.readFileSync(repositoryPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
   const mod=new Module(repositoryPath);mod.filename=repositoryPath;mod.paths=Module._nodeModulePaths(path.dirname(repositoryPath));mod._compile(code,repositoryPath);
   const statements=[],repo=new mod.exports.ArchivadoRepository({query:async(text,params)=>{statements.push({text,params});return[{id:'1'}]}});
   const lease={id:'1',token:randomUUID(),generacion:'1'},attempt=randomUUID();
   await repo.autorizarEliminacion(lease,{decisionId:'SYNTHETIC_ONLY',proteccion:{tipo:'BACKUP_RECUPERABLE',referencia:'MOCK'},identidad:{archivoId:1}});
   await repo.iniciarEliminacion(lease,attempt);await repo.respuestaDelete(lease,attempt,204,'synthetic-request');
   await repo.completar(lease,attempt);await repo.liberar(lease,'ARCHIVADO_DELETE_AUTORIA_INCIERTA',true);
   const allowed=new Map([[2950,'uuid'],[25,'text'],[23,'integer'],[20,'bigint'],[3802,'jsonb'],[16,'boolean'],[1043,'varchar']]);
   let parameters=0;
   for(const s of statements){
    assert(s.text.includes('evidencia=evidencia||'));assert(s.text.includes('lease_hasta>clock_timestamp()'));
    // Parse/Describe only; these UPDATE statements are NEVER executed.
    const desc=await tx.unsafe(s.text,s.params).describe();
    const select='SELECT '+desc.types.map((oid,i)=>{assert(allowed.has(oid),String(oid));return `$${i+1}::${allowed.get(oid)} AS p${i+1}`}).join(',');
    const values=await tx.unsafe(select,s.params);assert.equal(values.length,1);parameters+=s.params.length;
   }
   return {database:'DEV_G2_VERIFIED',transaction:'READ_ONLY',repositoryStatementsDescribed:statements.length,
    realDriverParametersBound:parameters,additiveAuditAndLease:'PASS',executedDML:0};
  });
  const a=await db.reserve(),b=await db.reserve(),key='bbti-production-delete-test-'+randomUUID();
  try{
   assert.equal((await a.unsafe('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[key]))[0].locked,true);
   assert.equal((await b.unsafe('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[key]))[0].locked,false);
   assert.equal((await a.unsafe('SELECT pg_advisory_unlock(hashtextextended($1,0)) AS unlocked',[key]))[0].unlocked,true);
  }finally{await a.unsafe('SELECT pg_advisory_unlock_all()');await b.unsafe('SELECT pg_advisory_unlock_all()');a.release();b.release();}
  console.log(JSON.stringify({...report,twoSessionAdvisoryExclusion:'PASS',realStorageOperations:0,result:'PASS'},null,2));
 }finally{await db.end({timeout:1})}
}
main().catch(e=>{console.error(JSON.stringify({result:'FAIL',name:e.name,code:e.code??'ASSERTION_OR_TARGET_MISMATCH'}));process.exitCode=1});
