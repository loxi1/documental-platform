import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  calculateFileSha256,
  isValidSha256,
} from '../checksum.js';

test('calcula SHA-256 sobre bytes exactos', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-checksum-'),
  );

  try {
    const filePath = path.join(directory, 'archivo.sql');

    await writeFile(filePath, 'SELECT 1;\n', {
      encoding: 'utf8',
    });

    const checksum =
      await calculateFileSha256(filePath);

    assert.equal(
      checksum,
      'b4e0497804e46e0a0b0b8c31975b062152d551bac49c3c2e80932567b4085dcd',
    );

    assert.equal(isValidSha256(checksum), true);
    assert.equal(isValidSha256('INVALIDO'), false);
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});
