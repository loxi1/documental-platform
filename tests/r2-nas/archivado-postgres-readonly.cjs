/** Opt-in real Bind regression. Never executes INSERT/UPDATE/DELETE or storage operations. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseEnv}=require('node:util'),{createRequire,Module}=require('node:module');
const root=path.resolve(__dirname,'../..');
async function main(){
 assert.equal(process.env.BBTI_PG_READONLY_REGRESSION,'1','Explicit DEV read-only opt-in required');
 assert.equal(process.cwd(),root,'Run only from canonical SOURCE');
 const req=createRequire(path.join(root,'packages/database/package.json'));
 const postgres=req('postgres'),{drizzle}=req('drizzle-orm/postgres-js');
 const version=JSON.parse(fs.readFileSync(path.resolve(path.dirname(req.resolve('postgres')),'../../package.json'),'utf8')).version;
 assert.equal(version,'3.4.9');
 const env=parseEnv(fs.readFileSync(path.join(root,'.env'),'utf8'));
 const url=new URL(env.DATABASE_URL);
 assert.equal(decodeURIComponent(url.pathname.slice(1)),'gestion_documental_g2_prodclone_20261028');
 assert(['127.0.0.1','localhost','bbti-mvp3005-postgres','172.29.0.2'].includes(url.hostname),'Unaccredited DEV host');
 const db=postgres(url.href,{max:1,connect_timeout:5,idle_timeout:1,
  connection:{default_transaction_read_only:'on',application_name:'bbti-nas-json-bind-readonly'}});
 // Match @documental/database initialization, including Drizzle's transparent JSON serializers.
 drizzle(db);
 try{
  // Session-level READ ONLY also permits testing a client-side Bind rejection without poisoning a transaction scope.
  const result=await (async tx=>{
   const [identity]=await tx`SELECT current_database() AS database,current_setting('transaction_read_only') AS read_only`;
   assert.equal(identity.database,'gestion_documental_g2_prodclone_20261028');assert.equal(identity.read_only,'on');
   const before=await tx`SELECT id,estado,documento_id,archivo_id,promovida_en,requiere_reconciliacion,
     expira_en>clock_timestamp() AS vigente,storage_key IS NOT NULL AS origen_registrado,
     metadata->>'destinoReservado' IS NOT NULL AS destino_reservado,
     metadata->'archivadoReserva' IS NOT NULL AS reserva_metadata,
     metadata#>>'{integration,completed}' AS integration_completed
     FROM documentos.carga_operaciones WHERE id=385 AND operacion_tipo='tmp'`;
   assert.equal(before.length,1);
   const [references]=await tx`SELECT
     (SELECT count(*)::integer FROM documentos.documentos_archivos WHERE carga_operacion_id=385) AS archivos,
     (SELECT count(*)::integer FROM documentos.archivados_documentales a
       WHERE a.contexto->>'tempId'='385' OR a.archivo_id IN
         (SELECT archivo_id FROM documentos.carga_operaciones WHERE id=385 AND archivo_id IS NOT NULL)) AS reservas`;
   const repositoryPath=path.join(root,'apps/ms-documentos/src/documentos/archivado/archivado.repository.ts');
   const local=createRequire(repositoryPath),ts=local('typescript');
   const code=ts.transpileModule(fs.readFileSync(repositoryPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
   const mod=new Module(repositoryPath);mod.filename=repositoryPath;mod.paths=Module._nodeModulePaths(path.dirname(repositoryPath));mod._compile(code,repositoryPath);
   const captured=[];
   const repo=new mod.exports.ArchivadoRepository({query:async(text,params)=>{
    captured.push({text,params});return captured.length===1?[]:[{id:'synthetic',r2_estado:'PRESENTE'}];
   }});
   const contexto={origen:'COMPRAS',tempId:385,documentoBaseId:null,tipo:'OC',nested:{values:[1,null,'á'],confirmed:false}};
   assert.equal(await repo.reservar({reservaId:'00000000-0000-8000-a000-000000000001',empresa:'BBTEC',clienteId:2,expedienteId:6,workspaceId:4,
    contexto,regla:'R2_NAS_NOMENCLATURA_R1',anio:2026,mes:4,cuenta:'synthetic',bucket:'synthetic',
    key:'documentos/2026/04/BBTEC/OC_031437.pdf',sha256:'a'.repeat(64),bytes:123,nasDestino:'SYNOLOGY_DEV',
    ruta:'documentos/2026/04/BBTEC/OC_031437.pdf',actorId:4}),'REPLAY');
   assert.equal(captured.length,2);
   const allowed=new Map([[2950,'uuid'],[25,'text'],[23,'int4'],[20,'int8'],[3802,'jsonb'],[1043,'varchar']]);
   for(const statement of captured){
    // Describe performs Parse/Describe only: even the INSERT text is NEVER executed.
    const info=await tx.unsafe(statement.text,statement.params).describe();
    assert.equal(info.types[5],3802);
    const select='SELECT '+info.types.map((oid,i)=>{assert(allowed.has(oid));return `$${i+1}::${allowed.get(oid)} AS p${i+1}`}).join(',');
    assert.equal(typeof statement.params[5],'string');assert.deepEqual(JSON.parse(statement.params[5]),contexto);
    const broken=[...statement.params];broken[5]=contexto;
    assert.equal(db.options.serializers[3802](broken[5]),contexto);
    await assert.rejects(()=>tx.unsafe(select,broken),{code:'ERR_INVALID_ARG_TYPE'});
    const [roundtrip]=await tx.unsafe(select,statement.params);
    assert.deepEqual(roundtrip.p6,contexto);assert.equal(typeof roundtrip.p6,'object');
   }
   const [scalars]=await tx.unsafe('SELECT $1::bigint AS n,$2::date::text AS fecha',[123n,'2026-04-18']);
   assert.equal(String(scalars.n),'123');assert.equal(scalars.fecha,'2026-04-18');
   const after=await tx`SELECT id,estado,documento_id,archivo_id,promovida_en,requiere_reconciliacion,
     expira_en>clock_timestamp() AS vigente,storage_key IS NOT NULL AS origen_registrado,
     metadata->>'destinoReservado' IS NOT NULL AS destino_reservado,
     metadata->'archivadoReserva' IS NOT NULL AS reserva_metadata,
     metadata#>>'{integration,completed}' AS integration_completed
     FROM documentos.carga_operaciones WHERE id=385 AND operacion_tipo='tmp'`;
   assert.deepEqual([...after],[...before]);
   return {driver:'postgres@'+version,readOnly:identity.read_only,previousError:'ERR_INVALID_ARG_TYPE',
    parameter:6,postgresOid:3802,serializer:'Drizzle transparent JSONB',fixedJsType:'string',
    insertAndReplayBind:'PASS',bigintAndDate:'PASS',temp385:before[0],references,rowsChanged:0,
    r2NasOperations:0,result:'PASS'};
  })(db);
  console.log(JSON.stringify(result,null,2));
 }finally{await db.end({timeout:1})}
}
main().catch(e=>{console.error(JSON.stringify({result:'FAIL',name:e.name,code:e.code??'ASSERTION_OR_TARGET_MISMATCH'}));process.exitCode=1});
