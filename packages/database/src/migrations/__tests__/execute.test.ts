import assert from 'node:assert/strict';
import {
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DEFAULT_MIGRATION_EXECUTED_BY,
  executeMigrationOnReservedConnection,
  readMigrationSql,
} from '../execute.js';
import type { ManifestEntry } from '../types.js';

function createEntry(
  absolutePath: string,
): ManifestEntry {
  return {
    version: '0099',
    filename: '0099_prueba.sql',
    checksum: 'a'.repeat(64),
    description: 'prueba',
    absolutePath,
  };
}

test('lee el archivo SQL completo sin dividir sentencias', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-execute-'),
  );

  try {
    const filePath = path.join(
      directory,
      '0099_prueba.sql',
    );

    const contents = [
      'CREATE TABLE prueba_uno (id integer);',
      '',
      'CREATE TABLE prueba_dos (id integer);',
      '',
    ].join('\n');

    await writeFile(filePath, contents, 'utf8');

    const migrationSql =
      await readMigrationSql(
        createEntry(filePath),
      );

    assert.equal(migrationSql, contents);
    assert.match(
      migrationSql,
      /CREATE TABLE prueba_uno/,
    );
    assert.match(
      migrationSql,
      /CREATE TABLE prueba_dos/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza una migración vacía', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-execute-'),
  );

  try {
    const filePath = path.join(
      directory,
      '0099_prueba.sql',
    );

    await writeFile(filePath, '   \n', 'utf8');

    await assert.rejects(
      readMigrationSql(
        createEntry(filePath),
      ),
      /está vacía/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('define ejecutado_por estable para el runner', () => {
  assert.equal(
    DEFAULT_MIGRATION_EXECUTED_BY,
    'documental-platform-migration-runner',
  );
});

test('ejecuta BEGIN, SQL, registro y COMMIT sobre la conexión reservada', async () => {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-execute-success-',
    ),
  );

  const sqlPath = path.join(
    directory,
    '0091_success.sql',
  );

  await writeFile(
    sqlPath,
    'CREATE TABLE prueba_exitosa (id INTEGER);',
    'utf8',
  );

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

  try {
    await executeMigrationOnReservedConnection(
      reservedSql as never,
      {
        version: '0091',
        filename: '0091_success.sql',
        checksum: 'a'.repeat(64),
        description: 'prueba exitosa',
        absolutePath: sqlPath,
      },
    );

    assert.deepEqual(calls, [
      'BEGIN',
      'CREATE TABLE prueba_exitosa (id INTEGER);',
      'INSERT',
      'COMMIT',
    ]);
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('ejecuta ROLLBACK y no COMMIT cuando falla el SQL', async () => {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-execute-rollback-',
    ),
  );

  const sqlPath = path.join(
    directory,
    '0092_failure.sql',
  );

  await writeFile(
    sqlPath,
    'SQL INVALIDO;',
    'utf8',
  );

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

  try {
    await assert.rejects(
      executeMigrationOnReservedConnection(
        reservedSql as never,
        {
          version: '0092',
          filename: '0092_failure.sql',
          checksum: 'b'.repeat(64),
          description: 'prueba rollback',
          absolutePath: sqlPath,
        },
      ),
      /fallo controlado/,
    );

    assert.deepEqual(calls, [
      'BEGIN',
      'SQL INVALIDO;',
      'ROLLBACK',
    ]);
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});
