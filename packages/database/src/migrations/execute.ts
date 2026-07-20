import type {
  MigrationReservedSql,
  MigrationTransactionSql,
} from './database.js';
import type { VerifiedMigration } from './types.js';

export const DEFAULT_MIGRATION_EXECUTED_BY =
  'documental-platform-migration-runner';

function validateExecutedBy(
  executedBy: string,
): void {
  if (executedBy.trim().length === 0) {
    throw new Error(
      'ejecutado_por no puede estar vacío',
    );
  }
}

function validateVerifiedSql(
  entry: VerifiedMigration,
): void {
  if (entry.sqlText.trim().length === 0) {
    throw new Error(
      `La migración ${entry.filename} está vacía`,
    );
  }
}

async function executeMigrationStatements(
  sql: MigrationReservedSql | MigrationTransactionSql,
  entry: VerifiedMigration,
  executedBy: string,
): Promise<void> {
  await sql.unsafe(entry.sqlText);

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
  entry: VerifiedMigration,
  executedBy: string =
    DEFAULT_MIGRATION_EXECUTED_BY,
): Promise<void> {
  validateVerifiedSql(entry);
  validateExecutedBy(executedBy);

  await executeMigrationStatements(
    transactionSql,
    entry,
    executedBy,
  );
}

export async function executeMigrationOnReservedConnection(
  reservedSql: MigrationReservedSql,
  entry: VerifiedMigration,
  executedBy: string =
    DEFAULT_MIGRATION_EXECUTED_BY,
): Promise<void> {
  /*
   * sqlText ya fue leído, hasheado y validado antes de conectar.
   * Este método no vuelve a abrir el archivo.
   */
  validateVerifiedSql(entry);
  validateExecutedBy(executedBy);

  await reservedSql.unsafe('BEGIN');

  try {
    await executeMigrationStatements(
      reservedSql,
      entry,
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
