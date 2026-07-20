import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { isValidSha256 } from './checksum.js';
import type { ManifestEntry } from './types.js';

const MIGRATION_FILENAME_PATTERN =
  /^(\d{4})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;

const MANIFEST_LINE_PATTERN =
  /^([0-9a-f]{64})[ \t]+(\d{4}_[a-z0-9]+(?:_[a-z0-9]+)*\.sql)$/;

export const MANAGED_VERSION_MIN = 11;

function buildDescription(filename: string): string {
  return filename
    .replace(/^\d{4}_/, '')
    .replace(/\.sql$/, '')
    .replaceAll('_', ' ');
}

export async function readMigrationManifest(
  manifestPath: string,
  migrationsDirectory: string,
): Promise<ManifestEntry[]> {
  let manifestContents: string;

  try {
    manifestContents = await readFile(manifestPath, 'utf8');
  } catch (error) {
    throw new Error(
      `No se pudo leer el manifest: ${manifestPath}`,
      { cause: error },
    );
  }

  const entries: ManifestEntry[] = [];
  const filenames = new Set<string>();
  const versions = new Set<string>();

  const lines = manifestContents.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const originalLine = lines[index] ?? '';
    const line = originalLine.trim();

    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const match = MANIFEST_LINE_PATTERN.exec(line);

    if (!match) {
      throw new Error(
        `Entrada inválida en manifest.sha256, línea ${index + 1}`,
      );
    }

    const checksum = match[1];
    const filename = match[2];

    if (!checksum || !filename || !isValidSha256(checksum)) {
      throw new Error(
        `Checksum o nombre inválido en manifest.sha256, línea ${index + 1}`,
      );
    }

    const filenameMatch =
      MIGRATION_FILENAME_PATTERN.exec(filename);

    if (!filenameMatch) {
      throw new Error(
        `Nombre de migración fuera de convención: ${filename}`,
      );
    }

    const version = filenameMatch[1];

    if (!version) {
      throw new Error(
        `No se pudo extraer versión de: ${filename}`,
      );
    }

    const numericVersion = Number.parseInt(version, 10);

    if (numericVersion < MANAGED_VERSION_MIN) {
      throw new Error(
        `El manifest contiene una migración legacy no administrada: ${filename}`,
      );
    }

    if (filenames.has(filename)) {
      throw new Error(
        `Entrada duplicada en manifest para archivo: ${filename}`,
      );
    }

    if (versions.has(version)) {
      throw new Error(
        `Versión duplicada en manifest: ${version}`,
      );
    }

    filenames.add(filename);
    versions.add(version);

    entries.push({
      checksum,
      filename,
      version,
      description: buildDescription(filename),
      absolutePath: path.join(
        migrationsDirectory,
        filename,
      ),
    });
  }

  if (entries.length === 0) {
    throw new Error(
      'manifest.sha256 no contiene migraciones administradas',
    );
  }

  return entries.sort((left, right) =>
    left.version.localeCompare(right.version),
  );
}
