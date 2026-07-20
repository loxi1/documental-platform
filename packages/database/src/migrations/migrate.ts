import type {
  MigrationReservedSql,
  MigrationSql,
} from './database.js';
import {
  executeMigrationOnReservedConnection,
} from './execute.js';
import {
  acquireMigrationAdvisoryLock,
  releaseMigrationAdvisoryLock,
} from './lock.js';
import {
  assertNoBlockingMigrationState,
  classifyAllMigrationStates,
  readSchemaMigrations,
} from './state.js';
import type {
  ManifestEntry,
  MigrationState,
} from './types.js';

export interface MigrationExecutionPlan {
  pending: ManifestEntry[];
  applied: ManifestEntry[];
}

export interface MigrationRunResult {
  applied: string[];
  skipped: string[];
}

export function buildMigrationExecutionPlan(
  states: MigrationState[],
): MigrationExecutionPlan {
  assertNoBlockingMigrationState(states);

  return {
    pending: states
      .filter((state) => state.kind === 'pending')
      .map((state) => state.entry),
    applied: states
      .filter((state) => state.kind === 'applied')
      .map((state) => state.entry),
  };
}

async function executePendingMigrations(
  reservedSql: MigrationReservedSql,
  entries: ManifestEntry[],
): Promise<string[]> {
  const applied: string[] = [];

  for (const entry of entries) {
    await executeMigrationOnReservedConnection(
      reservedSql,
      entry,
    );

    applied.push(entry.version);
  }

  return applied;
}

export async function runMigrations(
  sql: MigrationSql,
  entries: ManifestEntry[],
): Promise<MigrationRunResult> {
  const reservedSql = await sql.reserve();

  let lockAcquired = false;
  let operationError: unknown;
  let releaseError: unknown;
  let result: MigrationRunResult | undefined;

  try {
    await acquireMigrationAdvisoryLock(
      reservedSql,
    );

    lockAcquired = true;

    const databaseRows =
      await readSchemaMigrations(reservedSql);

    const states = classifyAllMigrationStates(
      entries,
      databaseRows,
    );

    const plan =
      buildMigrationExecutionPlan(states);

    const applied =
      await executePendingMigrations(
        reservedSql,
        plan.pending,
      );

    result = {
      applied,
      skipped:
        plan.applied.map((entry) => entry.version),
    };
  } catch (error) {
    operationError = error;
  }

  if (lockAcquired) {
    try {
      await releaseMigrationAdvisoryLock(
        reservedSql,
      );
    } catch (error) {
      releaseError = error;
    }
  }

  reservedSql.release();

  if (operationError && releaseError) {
    throw new AggregateError(
      [operationError, releaseError],
      'Fallaron la ejecución de migraciones y la liberación del advisory lock',
    );
  }

  if (operationError) {
    throw operationError;
  }

  if (releaseError) {
    throw releaseError;
  }

  if (!result) {
    throw new Error(
      'El runner terminó sin resultado de migración',
    );
  }

  return result;
}
