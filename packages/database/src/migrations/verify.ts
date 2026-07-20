import {
  lstat,
  readFile,
  readdir,
  realpath,
} from 'node:fs/promises';
import path from 'node:path';

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

async function readAndVerifyMigration(
  entry: ManifestEntry,
  realMigrationsDirectory: string,
): Promise<VerifiedMigration> {
  let fileStats;

  try {
    fileStats = await lstat(entry.absolutePath);
  } catch (error) {
    throw new Error(
      `El manifest declara un archivo inexistente: ${entry.filename}`,
      { cause: error },
    );
  }

  if (fileStats.isSymbolicLink()) {
    throw new Error(
      `La migración no puede ser un enlace simbólico: ${entry.filename}`,
    );
  }

  if (!fileStats.isFile()) {
    throw new Error(
      `La migración debe ser un archivo regular: ${entry.filename}`,
    );
  }

  const resolvedPath =
    await realpath(entry.absolutePath);

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
   * Esta es la única lectura del archivo administrado.
   * El SHA-256 y el SQL ejecutable se derivan del mismo Buffer.
   */
  const sqlBytes = await readFile(resolvedPath);

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

  const sqlText = sqlBytes.toString('utf8');

  if (sqlText.trim().length === 0) {
    throw new Error(
      `La migración ${entry.filename} está vacía`,
    );
  }

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
