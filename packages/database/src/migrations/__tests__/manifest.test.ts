import assert from 'node:assert/strict';
import {
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readMigrationManifest } from '../manifest.js';

test('rechaza versiones duplicadas', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-manifest-'),
  );

  try {
    const manifestPath = path.join(
      directory,
      'manifest.sha256',
    );

    const checksum = 'a'.repeat(64);

    await writeFile(
      manifestPath,
      [
        `${checksum}  0011_primera.sql`,
        `${checksum}  0011_segunda.sql`,
        '',
      ].join('\n'),
      'utf8',
    );

    await assert.rejects(
      readMigrationManifest(
        manifestPath,
        directory,
      ),
      /Versión duplicada en manifest: 0011/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza entradas duplicadas', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-manifest-'),
  );

  try {
    const manifestPath = path.join(
      directory,
      'manifest.sha256',
    );

    const checksum = 'b'.repeat(64);

    await writeFile(
      manifestPath,
      [
        `${checksum}  0011_primera.sql`,
        `${checksum}  0011_primera.sql`,
        '',
      ].join('\n'),
      'utf8',
    );

    await assert.rejects(
      readMigrationManifest(
        manifestPath,
        directory,
      ),
      /Entrada duplicada en manifest/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});
