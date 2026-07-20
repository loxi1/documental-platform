import type { MigrationSql } from './database.js';
import {
  assertNoBlockingMigrationState,
  classifyAllMigrationStates,
  readSchemaMigrations,
} from './state.js';
import type {
  ManifestEntry,
  MigrationState,
} from './types.js';

export async function getMigrationStatus(
  sql: MigrationSql,
  entries: ManifestEntry[],
): Promise<MigrationState[]> {
  const databaseRows =
    await readSchemaMigrations(sql);

  const states = classifyAllMigrationStates(
    entries,
    databaseRows,
  );

  assertNoBlockingMigrationState(states);

  return states;
}
