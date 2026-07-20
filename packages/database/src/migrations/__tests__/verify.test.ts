import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  isPathInsideDirectory,
  verifyMigrationFiles,
} from '../verify.js';
import {
  executeMigrationOnReservedConnection,
} from '../execute.js';

function sha256(contents: string): string {
  return createHash('sha256')
    .update(Buffer.from(contents, 'utf8'))
    .digest('hex');
}

async function writeManifest(
  directory: string,
  filename: string,
  contents: string,
): Promise<void> {
  await writeFile(
    path.join(directory, 'manifest.sha256'),
    `${sha256(contents)}  ${filename}\n`,
    'utf8',
  );
}

test('conserva exactamente el SQL cuyos bytes fueron verificados', async () => {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-verify-bytes-',
    ),
  );

  try {
    const filename = '0011_prueba.sql';
    const originalSql = 'SELECT 1;\n';
    const replacementSql = 'SELECT 2;\n';

    await writeFile(
      path.join(directory, filename),
      originalSql,
      'utf8',
    );

    await writeManifest(
      directory,
      filename,
      originalSql,
    );

    const verification =
      await verifyMigrationFiles(directory);

    await writeFile(
      path.join(directory, filename),
      replacementSql,
      'utf8',
    );

    assert.equal(
      verification.entries[0]?.sqlText,
      originalSql,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza un enlace simbólico declarado como migración', async () => {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-verify-symlink-',
    ),
  );

  try {
    const filename = '0011_prueba.sql';
    const targetPath = path.join(
      directory,
      'contenido-real.txt',
    );

    await writeFile(
      targetPath,
      'SELECT 1;\n',
      'utf8',
    );

    await symlink(
      targetPath,
      path.join(directory, filename),
    );

    await writeManifest(
      directory,
      filename,
      'SELECT 1;\n',
    );

    await assert.rejects(
      verifyMigrationFiles(directory),
      /enlace simbólico/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza una migración que no sea archivo regular', async () => {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-verify-regular-',
    ),
  );

  try {
    const filename = '0011_prueba.sql';

    await mkdir(
      path.join(directory, filename),
    );

    await writeManifest(
      directory,
      filename,
      'SELECT 1;\n',
    );

    await assert.rejects(
      verifyMigrationFiles(directory),
      /archivo regular/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza checksum divergente antes de entregar SQL ejecutable', async () => {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-verify-drift-',
    ),
  );

  try {
    const filename = '0011_prueba.sql';

    await writeFile(
      path.join(directory, filename),
      'SELECT 2;\n',
      'utf8',
    );

    await writeManifest(
      directory,
      filename,
      'SELECT 1;\n',
    );

    await assert.rejects(
      verifyMigrationFiles(directory),
      /Checksum divergente/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza una migración vacía después de verificar sus bytes', async () => {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-verify-empty-',
    ),
  );

  try {
    const filename = '0011_prueba.sql';
    const contents = '   \n';

    await writeFile(
      path.join(directory, filename),
      contents,
      'utf8',
    );

    await writeManifest(
      directory,
      filename,
      contents,
    );

    await assert.rejects(
      verifyMigrationFiles(directory),
      /está vacía/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza conceptualmente una ruta real fuera del directorio autorizado', async () => {
  const parentDirectory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-verify-parent-',
    ),
  );

  const externalDirectory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-verify-external-',
    ),
  );

  try {
    assert.equal(
      isPathInsideDirectory(
        parentDirectory,
        path.join(
          externalDirectory,
          '0011_fuera.sql',
        ),
      ),
      false,
    );

    assert.equal(
      isPathInsideDirectory(
        parentDirectory,
        path.join(
          parentDirectory,
          '0011_dentro.sql',
        ),
      ),
      true,
    );
  } finally {
    await rm(parentDirectory, {
      recursive: true,
      force: true,
    });

    await rm(externalDirectory, {
      recursive: true,
      force: true,
    });
  }
});

test('ejecuta exactamente el SQL retenido aunque el archivo cambie después', async () => {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-verify-execute-bytes-',
    ),
  );

  try {
    const filename = '0011_prueba.sql';
    const originalSql = 'SELECT 1;\n';
    const replacementSql = 'SELECT 2;\n';

    await writeFile(
      path.join(directory, filename),
      originalSql,
      'utf8',
    );

    await writeManifest(
      directory,
      filename,
      originalSql,
    );

    const verification =
      await verifyMigrationFiles(directory);

    await writeFile(
      path.join(directory, filename),
      replacementSql,
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

    const verifiedEntry = verification.entries[0];

    assert.ok(verifiedEntry);

    await executeMigrationOnReservedConnection(
      reservedSql as never,
      verifiedEntry,
    );

    assert.deepEqual(calls, [
      'BEGIN',
      originalSql,
      'INSERT',
      'COMMIT',
    ]);

    assert.equal(
      calls.includes(replacementSql),
      false,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('no inicia transacción cuando el checksum verificado difiere', async () => {
  const directory = await mkdtemp(
    path.join(
      os.tmpdir(),
      'migration-verify-no-begin-',
    ),
  );

  try {
    const filename = '0011_prueba.sql';

    await writeFile(
      path.join(directory, filename),
      'SELECT 2;\n',
      'utf8',
    );

    await writeManifest(
      directory,
      filename,
      'SELECT 1;\n',
    );

    const calls: string[] = [];

    await assert.rejects(
      verifyMigrationFiles(directory),
      /Checksum divergente/,
    );

    assert.deepEqual(calls, []);
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});
test('acepta SQL ASCII válido con round-trip exacto', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-verify-ascii-'),
  );

  try {
    const filename = '0011_prueba.sql';
    const contents = 'SELECT 1;\n';

    await writeFile(
      path.join(directory, filename),
      Buffer.from(contents, 'utf8'),
    );

    await writeManifest(
      directory,
      filename,
      contents,
    );

    const verification =
      await verifyMigrationFiles(directory);

    const entry = verification.entries[0];

    assert.ok(entry);
    assert.equal(entry.sqlText, contents);
    assert.equal(
      Buffer.from(entry.sqlText, 'utf8')
        .equals(Buffer.from(contents, 'utf8')),
      true,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('acepta SQL UTF-8 válido con caracteres no ASCII', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-verify-unicode-'),
  );

  try {
    const filename = '0011_prueba.sql';
    const contents =
      "SELECT 'área contable — Perú';\n";

    await writeFile(
      path.join(directory, filename),
      Buffer.from(contents, 'utf8'),
    );

    await writeManifest(
      directory,
      filename,
      contents,
    );

    const verification =
      await verifyMigrationFiles(directory);

    const entry = verification.entries[0];

    assert.ok(entry);
    assert.equal(entry.sqlText, contents);
    assert.equal(
      Buffer.from(entry.sqlText, 'utf8')
        .equals(Buffer.from(contents, 'utf8')),
      true,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza una secuencia UTF-8 inválida', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-verify-invalid-utf8-'),
  );

  try {
    const filename = '0011_prueba.sql';
    const contents = Buffer.from([
      0x53,
      0x45,
      0x4c,
      0x45,
      0x43,
      0x54,
      0x20,
      0xc3,
      0x28,
      0x3b,
      0x0a,
    ]);

    await writeFile(
      path.join(directory, filename),
      contents,
    );

    await writeFile(
      path.join(directory, 'manifest.sha256'),
      `${createHash('sha256').update(contents).digest('hex')}  ${filename}\n`,
      'utf8',
    );

    await assert.rejects(
      verifyMigrationFiles(directory),
      /UTF-8 inválido/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza BOM UTF-8', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-verify-bom-'),
  );

  try {
    const filename = '0011_prueba.sql';
    const contents = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('SELECT 1;\n', 'utf8'),
    ]);

    await writeFile(
      path.join(directory, filename),
      contents,
    );

    await writeFile(
      path.join(directory, 'manifest.sha256'),
      `${createHash('sha256').update(contents).digest('hex')}  ${filename}\n`,
      'utf8',
    );

    await assert.rejects(
      verifyMigrationFiles(directory),
      /BOM UTF-8/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test('rechaza byte NUL', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'migration-verify-nul-'),
  );

  try {
    const filename = '0011_prueba.sql';
    const contents = Buffer.concat([
      Buffer.from('SELECT ', 'utf8'),
      Buffer.from([0x00]),
      Buffer.from('1;\n', 'utf8'),
    ]);

    await writeFile(
      path.join(directory, filename),
      contents,
    );

    await writeFile(
      path.join(directory, 'manifest.sha256'),
      `${createHash('sha256').update(contents).digest('hex')}  ${filename}\n`,
      'utf8',
    );

    await assert.rejects(
      verifyMigrationFiles(directory),
      /bytes NUL/,
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});
