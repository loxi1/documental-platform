import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MIGRATION_EXECUTED_BY,
  executeMigrationOnReservedConnection,
} from '../execute.js';
import type { VerifiedMigration } from '../types.js';

function createEntry(
  version: string,
  sqlText: string,
): VerifiedMigration {
  return {
    version,
    filename: `${version}_prueba.sql`,
    checksum: 'a'.repeat(64),
    description: 'prueba',
    absolutePath: `/verificado/${version}_prueba.sql`,
    sqlText,
  };
}

test('define ejecutado_por estable para el runner', () => {
  assert.equal(
    DEFAULT_MIGRATION_EXECUTED_BY,
    'documental-platform-migration-runner',
  );
});

test('ejecuta BEGIN, SQL, registro y COMMIT sobre la conexión reservada', async () => {
  const calls: string[] = [];

  const reservedSql = Object.assign(
    (
      _template: TemplateStringsArray,
      ..._parameters: unknown[]
    ) => {
      calls.push('INSERT');
      return Promise.resolve([]);
    },
    {
      unsafe: async (query: string) => {
        calls.push(query);
        return [];
      },
    },
  );

  await executeMigrationOnReservedConnection(
      reservedSql as never,
      createEntry(
        '0091',
        'CREATE TABLE prueba_exitosa (id INTEGER);',
      ),
    );

    assert.deepEqual(calls, [
      'BEGIN',
      'CREATE TABLE prueba_exitosa (id INTEGER);',
      'INSERT',
      'COMMIT',
    ]);
});

test('ejecuta ROLLBACK y no COMMIT cuando falla el SQL', async () => {
  const calls: string[] = [];

  const reservedSql = Object.assign(
    (
      _template: TemplateStringsArray,
      ..._parameters: unknown[]
    ) => {
      calls.push('INSERT');
      return Promise.resolve([]);
    },
    {
      unsafe: async (query: string) => {
        calls.push(query);

        if (query === 'SQL INVALIDO;') {
          throw new Error('fallo controlado');
        }

        return [];
      },
    },
  );

  await assert.rejects(
      executeMigrationOnReservedConnection(
        reservedSql as never,
        {
          ...createEntry(
            '0092',
            'SQL INVALIDO;',
          ),
          checksum: 'b'.repeat(64),
          description: 'prueba rollback',
        },
      ),
      /fallo controlado/,
    );

    assert.deepEqual(calls, [
      'BEGIN',
      'SQL INVALIDO;',
      'ROLLBACK',
    ]);
});
