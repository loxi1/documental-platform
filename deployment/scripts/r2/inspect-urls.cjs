const fs=require('node:fs');
const dotenv=require('dotenv');
const postgres=require('postgres');
const env=dotenv.parse(fs.readFileSync('deployment/env/.env.production'));
const sql=postgres(env.DATABASE_URL,{max:1,connect_timeout:10});
(async()=>{try{await sql.begin('read only',async tx=>{
 const inventory=JSON.parse(fs.readFileSync('/tmp/r2-migration-copy-parallel.json'));
 const rows=await tx`SELECT id, storage_provider, storage_bucket, storage_key, ruta_archivo, public_url, hash_sha256 FROM documentos.documentos_archivos`;
 const keys=new Set(inventory.objects.map(o=>o.key));
 const hosts={},prefixes={};
 const matches=[];
 const shaKeys=new Map(inventory.objects.filter(o=>o.sha256).map(o=>[o.sha256,o.key]));
 let matchingHashes=0;
 const samples=[];
 const normalize=value=>{
  if(!value)return '';
  let v=value.trim();
  try { if(/^https?:\/\//i.test(v))v=new URL(v).pathname; v=decodeURIComponent(v); }catch{}
  v=v.replace(/^\/+/, '');
  if(v.startsWith('data-prod/')||v.startsWith('proyectos-prod/'))v=v.slice(v.indexOf('/')+1);
  return v;
 };
 for(const row of rows){
  if(shaKeys.has(row.hash_sha256))matchingHashes++;
  if(samples.length<4)samples.push({id:row.id,storage_key:row.storage_key,hash_sha256:row.hash_sha256});
  const fields={};
  for(const field of ['storage_key','ruta_archivo','public_url']){
   const v=row[field]; if(!v)continue;
   let host='relative';try {host=new URL(v).hostname;}catch{}
   const label=field+':'+host; hosts[label]=(hosts[label]||0)+1;
   const normalized=normalize(v); const prefix=field+':'+normalized.split('/').slice(0,2).join('/');prefixes[prefix]=(prefixes[prefix]||0)+1;
   if(keys.has(normalized))fields[field]=normalized;
  }
  if(Object.keys(fields).length)matches.push({...row,matchedFields:fields});
 }
 fs.writeFileSync('/tmp/r2-production-url-matches.json',JSON.stringify({total:rows.length,matches,rows},null,2),{mode:0o600});
 console.log(JSON.stringify({total:rows.length,matchedRows:matches.length,matchingHashes,samples,hosts,prefixes:Object.entries(prefixes).sort((a,b)=>b[1]-a[1]).slice(0,15)},null,2));
});}catch(e){console.error('URL inspection failed:',e.code||e.name);process.exitCode=1;}finally{await sql.end({timeout:2});}})();
