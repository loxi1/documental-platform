import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIGRATION_ADVISORY_LOCK_KEY,
  validateMigrationAdvisoryLockKey,
} from '../lock.js';

test('usa una clave advisory lock estable', () => {
  assert.equal(
    MIGRATION_ADVISORY_LOCK_KEY,
    7349927134510011n,
  );
});

test('acepta una clave dentro del rango bigint PostgreSQL', () => {
  assert.doesNotThrow(() =>
    validateMigrationAdvisoryLockKey(
      MIGRATION_ADVISORY_LOCK_KEY,
    ),
  );
});

test('rechaza una clave superior al bigint PostgreSQL', () => {
  assert.throws(
    () =>
      validateMigrationAdvisoryLockKey(
        2n ** 63n,
      ),
    /fuera del rango bigint/,
  );
});

test('rechaza una clave inferior al bigint PostgreSQL', () => {
  assert.throws(
    () =>
      validateMigrationAdvisoryLockKey(
        -(2n ** 63n) - 1n,
      ),
    /fuera del rango bigint/,
  );
});
