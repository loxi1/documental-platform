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


test('target 0020 ejecuta pending hasta 0020 y deja 0023 fuera del plan', () => {
  const plan = buildMigrationExecutionPlan(
    [
      state('0019', 'pending'),
      state('0020', 'pending'),
      state('0023', 'pending'),
    ],
    '0020',
  );

  assert.deepEqual(
    plan.pending.map((item) => item.version),
    ['0019', '0020'],
  );
});

test('target 0020 aplicado produce no-op aunque 0023 siga pending', () => {
  const plan = buildMigrationExecutionPlan(
    [
      state('0020', 'applied'),
      state('0023', 'pending'),
    ],
    '0020',
  );

  assert.deepEqual(plan.pending, []);
});

test('target no administrado falla explicitamente', () => {
  assert.throws(
    () =>
      buildMigrationExecutionPlan(
        [
          state('0020', 'pending'),
          state('0023', 'pending'),
        ],
        '0021',
      ),
    /TARGET_VERSION no administrado: 0021/,
  );
});

test('target menor que version aplicada bloquea downgrade', () => {
  assert.throws(
    () =>
      buildMigrationExecutionPlan(
        [
          state('0020', 'pending'),
          state('0023', 'applied'),
        ],
        '0020',
      ),
    /es menor que una migración ya aplicada: 0023/,
  );
});

test('drift antes del target bloquea', () => {
  const driftState = state('0019', 'drift');
  driftState.databaseChecksum = 'b'.repeat(64);

  assert.throws(
    () =>
      buildMigrationExecutionPlan(
        [
          driftState,
          state('0020', 'pending'),
          state('0023', 'pending'),
        ],
        '0020',
      ),
    /DRIFT detectado/,
  );
});

test('drift despues del target bloquea igualmente', () => {
  const driftState = state('0023', 'drift');
  driftState.databaseChecksum = 'b'.repeat(64);

  assert.throws(
    () =>
      buildMigrationExecutionPlan(
        [
          state('0019', 'pending'),
          state('0020', 'pending'),
          driftState,
        ],
        '0020',
      ),
    /DRIFT detectado/,
  );
});

test('sin target conserva todas las pending administradas', () => {
  const plan = buildMigrationExecutionPlan([
    state('0019', 'pending'),
    state('0020', 'pending'),
    state('0023', 'pending'),
  ]);

  assert.deepEqual(
    plan.pending.map((item) => item.version),
    ['0019', '0020', '0023'],
  );
});
