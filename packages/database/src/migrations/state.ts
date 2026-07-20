import type { MigrationSql } from './database.js';
import type {
  ManifestEntry,
  MigrationState,
  SchemaMigrationRow,
} from './types.js';

interface SchemaMigrationDatabaseRow {
  version: string;
  descripcion: string | null;
  checksum: string | null;
  ejecutado_en: Date;
  ejecutado_por: string;
}

export function classifyMigrationState(
  entry: ManifestEntry,
  databaseRow: SchemaMigrationRow | undefined,
): MigrationState {
  if (!databaseRow) {
    return {
      entry,
      kind: 'pending',
      databaseChecksum: null,
    };
  }

  if (databaseRow.checksum === null) {
    return {
      entry,
      kind: 'invalid_null_checksum',
      databaseChecksum: null,
    };
  }

  if (databaseRow.checksum === entry.checksum) {
    return {
      entry,
      kind: 'applied',
      databaseChecksum: databaseRow.checksum,
    };
  }

  return {
    entry,
    kind: 'drift',
    databaseChecksum: databaseRow.checksum,
  };
}

export async function readSchemaMigrations(
  sql: MigrationSql,
): Promise<Map<string, SchemaMigrationRow>> {
  const rows = await sql<SchemaMigrationDatabaseRow[]>`
    SELECT
      version,
      descripcion,
      checksum,
      ejecutado_en,
      ejecutado_por
    FROM core.schema_migrations
    ORDER BY version
  `;

  return new Map(
    rows.map((row) => [
      row.version,
      {
        version: row.version,
        description: row.descripcion,
        checksum: row.checksum,
        executedAt: row.ejecutado_en,
        executedBy: row.ejecutado_por,
      },
    ]),
  );
}

export function classifyAllMigrationStates(
  entries: ManifestEntry[],
  databaseRows: Map<string, SchemaMigrationRow>,
): MigrationState[] {
  return entries.map((entry) =>
    classifyMigrationState(
      entry,
      databaseRows.get(entry.version),
    ),
  );
}

export function assertNoBlockingMigrationState(
  states: MigrationState[],
): void {
  const blockingState = states.find(
    (state) =>
      state.kind === 'drift' ||
      state.kind === 'invalid_null_checksum',
  );

  if (!blockingState) {
    return;
  }

  if (blockingState.kind === 'invalid_null_checksum') {
    throw new Error(
      `La migración administrada ${blockingState.entry.version} ` +
      'está registrada con checksum NULL',
    );
  }

  throw new Error(
    [
      `DRIFT detectado en versión ${blockingState.entry.version}`,
      `manifest=${blockingState.entry.checksum}`,
      `database=${blockingState.databaseChecksum}`,
    ].join('; '),
  );
}
