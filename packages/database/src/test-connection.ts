import { count } from 'drizzle-orm';
import { db, documentos, documentosArchivos, clientesDestino, proveedores, sql } from './index.js';

async function main() {
  const [docs] = await db.select({ total: count() }).from(documentos);
  const [files] = await db.select({ total: count() }).from(documentosArchivos);
  const [clientes] = await db.select({ total: count() }).from(clientesDestino);
  const [provs] = await db.select({ total: count() }).from(proveedores);

  console.log({
    documentos: docs.total,
    archivos: files.total,
    clientesDestino: clientes.total,
    proveedores: provs.total,
  });

  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
