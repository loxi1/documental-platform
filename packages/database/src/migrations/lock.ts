import type { MigrationSql } from './database.js';

/**
 * Clave estable y exclusiva del runner de migraciones de Documental Platform.
 *
 * No debe modificarse después de poner el runner en uso, porque todos los
 * procesos deben competir por exactamente el mismo advisory lock.
 */
export const MIGRATION_ADVISORY_LOCK_KEY =
  7349927134510011n;

export function validateMigrationAdvisoryLockKey(
  lockKey: bigint,
): void {
  const minimumSignedInt64 = -(2n ** 63n);
  const maximumSignedInt64 = (2n ** 63n) - 1n;

  if (
    lockKey < minimumSignedInt64 ||
    lockKey > maximumSignedInt64
  ) {
    throw new Error(
      'La clave del advisory lock está fuera del rango bigint de PostgreSQL',
    );
  }
}

function migrationAdvisoryLockParameter(): string {
  validateMigrationAdvisoryLockKey(
    MIGRATION_ADVISORY_LOCK_KEY,
  );

  return MIGRATION_ADVISORY_LOCK_KEY.toString();
}

export async function acquireMigrationAdvisoryLock(
  sql: MigrationSql,
): Promise<void> {
  const lockKey =
    migrationAdvisoryLockParameter();

  await sql`
    SELECT pg_advisory_lock(
      ${lockKey}::bigint
    )
  `;
}

export async function releaseMigrationAdvisoryLock(
  sql: MigrationSql,
): Promise<void> {
  const lockKey =
    migrationAdvisoryLockParameter();

  const rows = await sql<{ released: boolean }[]>`
    SELECT pg_advisory_unlock(
      ${lockKey}::bigint
    ) AS released
  `;

  if (rows[0]?.released !== true) {
    throw new Error(
      'No se pudo liberar el advisory lock de migraciones',
    );
  }
}
