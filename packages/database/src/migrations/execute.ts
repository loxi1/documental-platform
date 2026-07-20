import { readFile } from 'node:fs/promises';

import type {
  MigrationReservedSql,
  MigrationTransactionSql,
} from './database.js';
import type { ManifestEntry } from './types.js';

export const DEFAULT_MIGRATION_EXECUTED_BY =
  'documental-platform-migration-runner';

export async function readMigrationSql(
  entry: ManifestEntry,
): Promise<string> {
  const migrationSql = await readFile(
    entry.absolutePath,
    'utf8',
  );

  if (migrationSql.trim().length === 0) {
    throw new Error(
      `La migración ${entry.filename} está vacía`,
    );
  }

  return migrationSql;
}

function validateExecutedBy(
  executedBy: string,
): void {
  if (executedBy.trim().length === 0) {
    throw new Error(
      'ejecutado_por no puede estar vacío',
    );
  }
}

async function executeMigrationStatements(
  sql: MigrationReservedSql | MigrationTransactionSql,
  entry: ManifestEntry,
  migrationSql: string,
  executedBy: string,
): Promise<void> {
  await sql.unsafe(migrationSql);

  await sql`
    INSERT INTO core.schema_migrations (
      version,
      descripcion,
      checksum,
      ejecutado_por
    )
    VALUES (
      ${entry.version},
      ${entry.description},
      ${entry.checksum},
      ${executedBy}
    )
  `;
}

export async function executeMigrationInTransaction(
  transactionSql: MigrationTransactionSql,
  entry: ManifestEntry,
  executedBy: string =
    DEFAULT_MIGRATION_EXECUTED_BY,
): Promise<void> {
  const migrationSql =
    await readMigrationSql(entry);

  validateExecutedBy(executedBy);

  await executeMigrationStatements(
    transactionSql,
    entry,
    migrationSql,
    executedBy,
  );
}

export async function executeMigrationOnReservedConnection(
  reservedSql: MigrationReservedSql,
  entry: ManifestEntry,
  executedBy: string =
    DEFAULT_MIGRATION_EXECUTED_BY,
): Promise<void> {
  /*
   * El archivo y ejecutado_por se validan antes de abrir la transacción.
   * reserve() garantiza que BEGIN, DDL, registro y COMMIT usan la misma
   * conexión física que mantiene el advisory lock.
   */
  const migrationSql =
    await readMigrationSql(entry);

  validateExecutedBy(executedBy);

  await reservedSql.unsafe('BEGIN');

  try {
    await executeMigrationStatements(
      reservedSql,
      entry,
      migrationSql,
      executedBy,
    );

    await reservedSql.unsafe('COMMIT');
  } catch (operationError) {
    try {
      await reservedSql.unsafe('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError(
        [operationError, rollbackError],
        `Fallaron la migración ${entry.version} y su rollback`,
      );
    }

    throw operationError;
  }
}
