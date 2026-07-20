import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMigrationExecutionPlan,
} from '../migrate.js';
import type {
  MigrationState,
  VerifiedMigration,
} from '../types.js';

function entry(version: string): VerifiedMigration {
  return {
    version,
    filename: `${version}_prueba.sql`,
    checksum: version.padEnd(64, 'a'),
    description: `prueba ${version}`,
    absolutePath: `/verificado/${version}_prueba.sql`,
    sqlText: `SELECT '${version}';`,
  };
}

function state(
  version: string,
  kind: MigrationState['kind'],
): MigrationState {
  const migrationEntry = entry(version);

  return {
    entry: migrationEntry,
    kind,
    databaseChecksum:
      kind === 'applied'
        ? migrationEntry.checksum
        : null,
  };
}

test('separa migraciones pending y applied conservando orden', () => {
  const plan = buildMigrationExecutionPlan([
    state('0011', 'applied'),
    state('0012', 'pending'),
    state('0013', 'pending'),
  ]);

  assert.deepEqual(
    plan.applied.map((item) => item.version),
    ['0011'],
  );

  assert.deepEqual(
    plan.pending.map((item) => item.version),
    ['0012', '0013'],
  );
});

test('bloquea el plan cuando existe drift', () => {
  const driftState = state('0012', 'drift');

  driftState.databaseChecksum = 'b'.repeat(64);

  assert.throws(
    () =>
      buildMigrationExecutionPlan([
        state('0011', 'applied'),
        driftState,
        state('0013', 'pending'),
      ]),
    /DRIFT detectado/,
  );
});

test('bloquea el plan cuando checksum administrado es NULL', () => {
  assert.throws(
    () =>
      buildMigrationExecutionPlan([
        state('0011', 'invalid_null_checksum'),
      ]),
    /checksum NULL/,
  );
});
