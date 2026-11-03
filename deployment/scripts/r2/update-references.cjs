// Update only production records whose destination objects were SHA-256 verified.
const fs = require('node:fs');
const dotenv = require('dotenv');
const postgres = require('postgres');
const env = dotenv.parse(fs.readFileSync('deployment/env/.env.production'));
const sql = postgres(env.DATABASE_URL, { max: 1, connect_timeout: 10 });
const apply = process.argv.includes('--apply');
(async () => {
 try {
  const plan = JSON.parse(fs.readFileSync('/tmp/r2-production-reconciled.json'));
  if (!plan.length || plan.some(p => p.status !== 'verified')) throw Error('Unverified destination');
  const ids = plan.map(p=>p.id), keys = [...new Set(plan.map(p=>p.key))];
  await sql.begin(async tx => {
   await tx`SET LOCAL lock_timeout = '5s'`;
   const documents = await tx`SELECT * FROM documentos.documentos_archivos WHERE id = ANY(${tx.array(ids, 23)}) FOR UPDATE`;
   if (documents.length !== plan.length) throw Error('Document count changed');
   for (const row of documents) {
    const expected = plan.find(p=>p.id===row.id);
    if (row.storage_provider!=='r2' || !['data-prod','proyectos-prod'].includes(row.storage_bucket) || row.storage_key!==expected.key || row.hash_sha256!==expected.sha256) throw Error('Document identity changed');
    if (row.public_url) throw Error('Review existing public URL before updating');
   }
   const operations = await tx`SELECT * FROM documentos.carga_operaciones WHERE (storage_bucket='data-prod' AND storage_key=ANY(${tx.array(keys, 25)})) OR (destino_storage_bucket='data-prod' AND destino_storage_key=ANY(${tx.array(keys, 25)})) FOR UPDATE`;
   console.log(JSON.stringify({apply,documentRows:documents.length,operationRows:operations.length}));
   if (!apply) return;
   const backupPath = '/tmp/r2-reference-backup-'+Date.now()+'.json';
   fs.writeFileSync(backupPath,JSON.stringify({createdAt:new Date().toISOString(),documents,operations},null,2),{mode:0o600,flag:'wx'});
   console.log('Backup:',backupPath);
   let updated=0;
   for(const p of plan) {
    const result=await tx`UPDATE documentos.documentos_archivos SET storage_bucket='proyectos-prod' WHERE id=${p.id} AND storage_provider='r2' AND storage_bucket='data-prod' AND storage_key=${p.key} AND hash_sha256=${p.sha256} RETURNING id`;
    updated+=result.length;
   }
   const direct = await tx`UPDATE documentos.carga_operaciones SET storage_bucket='proyectos-prod' WHERE storage_bucket='data-prod' AND storage_key=ANY(${tx.array(keys, 25)}) RETURNING id`;
   const destination = await tx`UPDATE documentos.carga_operaciones SET destino_storage_bucket='proyectos-prod' WHERE destino_storage_bucket='data-prod' AND destino_storage_key=ANY(${tx.array(keys, 25)}) RETURNING id`;
   console.log(JSON.stringify({updatedDocuments:updated,updatedOperationSource:direct.length,updatedOperationDestination:destination.length}));
  });
  console.log(apply?'Transaction committed':'Read-only plan complete; no references changed');
 } catch(e) { console.error('Reference update failed:',e.code||e.message);process.exitCode=1; }
 finally { await sql.end({timeout:2}); }
})();
