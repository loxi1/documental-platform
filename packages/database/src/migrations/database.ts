import postgres, {
  type ReservedSql,
  type Sql,
  type TransactionSql,
} from 'postgres';

import type {
  MigrationDatabaseConfig,
} from './config.js';

export type MigrationSql = Sql;
export type MigrationReservedSql = ReservedSql;
export type MigrationTransactionSql = TransactionSql;

export function createMigrationConnection(
  config: MigrationDatabaseConfig,
): MigrationSql {
  return postgres(config.connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });
}
