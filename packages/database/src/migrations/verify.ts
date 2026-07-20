import { access, readdir } from 'node:fs/promises';
import path from 'node:path';

import { calculateFileSha256 } from './checksum.js';
import {
  MANAGED_VERSION_MIN,
  readMigrationManifest,
} from './manifest.js';
import type {
  ManifestEntry,
  ManifestValidationResult,
} from './types.js';

const SQL_FILENAME_PATTERN =
  /^(\d{4})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;

async function assertFileExists(
  entry: ManifestEntry,
): Promise<void> {
  try {
    await access(entry.absolutePath);
  } catch (error) {
    throw new Error(
      `El manifest declara un archivo inexistente: ${entry.filename}`,
      { cause: error },
    );
  }
}

async function verifyChecksum(
  entry: ManifestEntry,
): Promise<void> {
  const calculatedChecksum =
    await calculateFileSha256(entry.absolutePath);

  if (calculatedChecksum !== entry.checksum) {
    throw new Error(
      [
        `Checksum divergente para ${entry.filename}`,
        `esperado=${entry.checksum}`,
        `calculado=${calculatedChecksum}`,
      ].join('; '),
    );
  }
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
  const manifestPath = path.join(
    migrationsDirectory,
    'manifest.sha256',
  );

  const entries = await readMigrationManifest(
    manifestPath,
    migrationsDirectory,
  );

  const directoryEntries = await readdir(
    migrationsDirectory,
    { withFileTypes: true },
  );

  const sqlFiles = directoryEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  const declaredFiles = new Set(
    entries.map((entry) => entry.filename),
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

  for (const entry of entries) {
    await assertFileExists(entry);
    await verifyChecksum(entry);
  }

  return {
    manifestPath,
    migrationsDirectory,
    entries,
    ignoredLegacyFiles,
  };
}
