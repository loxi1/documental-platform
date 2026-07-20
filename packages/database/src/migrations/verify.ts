import { constants } from 'node:fs';
import {
  open,
  readdir,
  realpath,
} from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';

import { calculateBytesSha256 } from './checksum.js';
import {
  MANAGED_VERSION_MIN,
  readMigrationManifest,
} from './manifest.js';
import type {
  ManifestEntry,
  ManifestValidationResult,
  VerifiedMigration,
} from './types.js';

const SQL_FILENAME_PATTERN =
  /^(\d{4})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;

const UTF8_BOM = Buffer.from([
  0xef,
  0xbb,
  0xbf,
]);

const STRICT_UTF8_DECODER = new TextDecoder(
  'utf-8',
  {
    fatal: true,
    ignoreBOM: false,
  },
);

export function isPathInsideDirectory(
  parentDirectory: string,
  candidatePath: string,
): boolean {
  const relativePath = path.relative(
    parentDirectory,
    candidatePath,
  );

  return (
    relativePath.length > 0 &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function decodeMigrationSql(
  entry: ManifestEntry,
  sqlBytes: Buffer,
): string {
  if (
    sqlBytes.length >= UTF8_BOM.length &&
    sqlBytes.subarray(0, UTF8_BOM.length)
      .equals(UTF8_BOM)
  ) {
    throw new Error(
      `La migración ${entry.filename} no puede contener BOM UTF-8`,
    );
  }

  if (sqlBytes.includes(0x00)) {
    throw new Error(
      `La migración ${entry.filename} no puede contener bytes NUL`,
    );
  }

  let sqlText: string;

  try {
    sqlText = STRICT_UTF8_DECODER.decode(sqlBytes);
  } catch (error) {
    throw new Error(
      `La migración ${entry.filename} contiene UTF-8 inválido`,
      { cause: error },
    );
  }

  const roundTripBytes =
    Buffer.from(sqlText, 'utf8');

  if (!roundTripBytes.equals(sqlBytes)) {
    throw new Error(
      `La migración ${entry.filename} no supera el round-trip UTF-8`,
    );
  }

  if (sqlText.trim().length === 0) {
    throw new Error(
      `La migración ${entry.filename} está vacía`,
    );
  }

  return sqlText;
}

async function readMigrationBytesSecurely(
  entry: ManifestEntry,
): Promise<Buffer> {
  if (process.platform !== 'linux') {
    throw new Error(
      'El runner de migraciones requiere Linux para usar O_NOFOLLOW',
    );
  }

  let handle;

  try {
    handle = await open(
      entry.absolutePath,
      constants.O_RDONLY |
        constants.O_NOFOLLOW,
    );
  } catch (error) {
    const code =
      error instanceof Error &&
      'code' in error
        ? String(error.code)
        : '';

    if (code === 'ELOOP') {
      throw new Error(
        `La migración no puede ser un enlace simbólico: ${entry.filename}`,
        { cause: error },
      );
    }

    throw new Error(
      `No se pudo abrir de forma segura la migración: ${entry.filename}`,
      { cause: error },
    );
  }

  try {
    const fileStats = await handle.stat();

    if (!fileStats.isFile()) {
      throw new Error(
        `La migración debe ser un archivo regular: ${entry.filename}`,
      );
    }

    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

async function readAndVerifyMigration(
  entry: ManifestEntry,
  realMigrationsDirectory: string,
): Promise<VerifiedMigration> {
  let resolvedPath: string;

  try {
    resolvedPath =
      await realpath(entry.absolutePath);
  } catch (error) {
    throw new Error(
      `El manifest declara un archivo inexistente: ${entry.filename}`,
      { cause: error },
    );
  }

  if (
    !isPathInsideDirectory(
      realMigrationsDirectory,
      resolvedPath,
    )
  ) {
    throw new Error(
      `La ruta real de la migración está fuera del directorio autorizado: ${entry.filename}`,
    );
  }

  /*
   * O_NOFOLLOW impide seguir un symlink en el componente final.
   * fstat y readFile operan sobre el mismo descriptor abierto.
   */
  const sqlBytes =
    await readMigrationBytesSecurely(entry);

  const calculatedChecksum =
    calculateBytesSha256(sqlBytes);

  if (calculatedChecksum !== entry.checksum) {
    throw new Error(
      [
        `Checksum divergente para ${entry.filename}`,
        `esperado=${entry.checksum}`,
        `calculado=${calculatedChecksum}`,
      ].join('; '),
    );
  }

  const sqlText =
    decodeMigrationSql(entry, sqlBytes);

  return {
    ...entry,
    absolutePath: resolvedPath,
    sqlText,
  };
}

function extractNumericVersion(
  filename: string,
): number | null {
  const match = SQL_FILENAME_PATTERN.exec(filename);

  if (!match?.[1]) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

export async function verifyMigrationFiles(
  migrationsDirectory: string,
): Promise<ManifestValidationResult> {
  const realMigrationsDirectory =
    await realpath(migrationsDirectory);

  const manifestPath = path.join(
    realMigrationsDirectory,
    'manifest.sha256',
  );

  const manifestEntries =
    await readMigrationManifest(
      manifestPath,
      realMigrationsDirectory,
    );

  const directoryEntries = await readdir(
    realMigrationsDirectory,
    { withFileTypes: true },
  );

  const sqlFiles = directoryEntries
    .filter(
      (entry) =>
        entry.isFile() ||
        entry.isSymbolicLink(),
    )
    .map((entry) => entry.name)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  const declaredFiles = new Set(
    manifestEntries.map((entry) => entry.filename),
  );

  const managedFiles: string[] = [];
  const ignoredLegacyFiles: string[] = [];

  for (const filename of sqlFiles) {
    const numericVersion =
      extractNumericVersion(filename);

    if (numericVersion === null) {
      throw new Error(
        `Archivo SQL fuera de convención: ${filename}`,
      );
    }

    if (numericVersion < MANAGED_VERSION_MIN) {
      ignoredLegacyFiles.push(filename);
      continue;
    }

    managedFiles.push(filename);
  }

  for (const filename of managedFiles) {
    if (!declaredFiles.has(filename)) {
      throw new Error(
        `Migración administrada no declarada en manifest: ${filename}`,
      );
    }
  }

  const entries: VerifiedMigration[] = [];

  for (const entry of manifestEntries) {
    entries.push(
      await readAndVerifyMigration(
        entry,
        realMigrationsDirectory,
      ),
    );
  }

  return {
    manifestPath,
    migrationsDirectory:
      realMigrationsDirectory,
    entries,
    ignoredLegacyFiles,
  };
}
