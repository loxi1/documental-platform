const fs = require('node:fs');
const dotenv = require('dotenv');
const postgres = require('postgres');
const envFile = process.argv[2] || 'deployment/env/.env.production';
const env = dotenv.parse(fs.readFileSync(envFile));
const sql = postgres(env.DATABASE_URL, { max: 1, connect_timeout: 10, idle_timeout: 5 });
(async () => {
 try {
  await sql.begin('read only', async tx => {
   const columns = await tx`SELECT table_schema, table_name, column_name FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') AND column_name IN ('storage_bucket','storage_key','public_url','destino_storage_bucket','destino_storage_key') ORDER BY table_schema, table_name, column_name`;
   const tables = [...new Set(columns.filter(c=>c.column_name==='storage_bucket').map(c=>c.table_schema+'.'+c.table_name))];
   const counts = [];
   const inventory = JSON.parse(fs.readFileSync('/tmp/r2-migration-copy.json'));
   const keys = inventory.objects.map(o => o.key);
   for (const table of tables) {
    counts.push({ table, buckets: await tx`SELECT storage_bucket, count(*)::int AS count FROM ${tx(table)} GROUP BY storage_bucket`,
      matching: await tx`SELECT count(*)::int AS rows, count(DISTINCT storage_key)::int AS distinct_keys FROM ${tx(table)} WHERE storage_bucket = 'data-prod' AND storage_key = ANY(${tx.array(keys)})` });
   }
   const archiveColumns = await tx`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='documentos' AND table_name='documentos_archivos' ORDER BY ordinal_position`;
   console.log(JSON.stringify({archiveColumns}));
   fs.writeFileSync(envFile === 'apps/ms-documentos/.env' ? '/tmp/r2-migration-dev-db-inventory.json' : '/tmp/r2-migration-db-inventory.json', JSON.stringify({columns,counts}, null, 2));
   console.log(JSON.stringify({columns,counts}, null, 2));
  });
 } catch(e) { console.error('Database inspection failed:',e.code || e.name); process.exitCode=1; }
 finally { await sql.end({ timeout: 2 }); }
})();
