import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertNoBlockingMigrationState,
  classifyMigrationState,
} from '../state.js';
import type {
  ManifestEntry,
  SchemaMigrationRow,
} from '../types.js';

const entry: ManifestEntry = {
  version: '0011',
  filename: '0011_prueba.sql',
  checksum: 'a'.repeat(64),
  description: 'prueba',
  absolutePath: '/tmp/0011_prueba.sql',
};

function databaseRow(
  checksum: string | null,
): SchemaMigrationRow {
  return {
    version: '0011',
    description: 'prueba',
    checksum,
    executedAt: new Date('2026-07-19T12:00:00Z'),
    executedBy: 'platform_app',
  };
}

test('clasifica migración ausente como pending', () => {
  const state =
    classifyMigrationState(entry, undefined);

  assert.equal(state.kind, 'pending');
});

test('clasifica checksum coincidente como applied', () => {
  const state = classifyMigrationState(
    entry,
    databaseRow(entry.checksum),
  );

  assert.equal(state.kind, 'applied');
});

test('clasifica checksum divergente como drift', () => {
  const state = classifyMigrationState(
    entry,
    databaseRow('b'.repeat(64)),
  );

  assert.equal(state.kind, 'drift');

  assert.throws(
    () => assertNoBlockingMigrationState([state]),
    /DRIFT detectado/,
  );
});

test('rechaza checksum NULL para migración administrada', () => {
  const state = classifyMigrationState(
    entry,
    databaseRow(null),
  );

  assert.equal(
    state.kind,
    'invalid_null_checksum',
  );

  assert.throws(
    () => assertNoBlockingMigrationState([state]),
    /checksum NULL/,
  );
});
