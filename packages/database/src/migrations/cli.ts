import { pathToFileURL } from 'node:url';

import {
  loadMigrationDatabaseConfig,
} from './config.js';
import {
  createMigrationConnection,
} from './database.js';
import {
  logError,
  logInfo,
  toRelativeDisplayPath,
} from './logger.js';
import { runMigrations } from './migrate.js';
import {
  findRepositoryRoot,
  resolveMigrationsDirectory,
} from './paths.js';
import { getMigrationStatus } from './status.js';
import { verifyMigrationFiles } from './verify.js';

type SupportedCommand =
  | 'verify'
  | 'status'
  | 'migrate';

export function parseCommand(
  rawCommand: string | undefined,
): SupportedCommand {
  if (
    rawCommand === 'verify' ||
    rawCommand === 'status' ||
    rawCommand === 'migrate'
  ) {
    return rawCommand;
  }

  throw new Error(
    'Comando inválido. Comandos habilitados: verify, status, migrate',
  );
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv[2]);

  const repositoryRoot =
    await findRepositoryRoot();

  const migrationsDirectory =
    resolveMigrationsDirectory(repositoryRoot);

  /*
   * Esta validación debe ocurrir antes de crear cualquier conexión:
   * manifest, nombres, archivos y checksums quedan verificados primero.
   */
  const verification =
    await verifyMigrationFiles(
      migrationsDirectory,
    );

  if (command === 'verify') {
    logInfo('Manifest y migraciones verificados', {
      manifest: toRelativeDisplayPath(
        repositoryRoot,
        verification.manifestPath,
      ),
      migracionesAdministradas:
        verification.entries.map((entry) => ({
          version: entry.version,
          archivo: entry.filename,
          checksum: entry.checksum,
        })),
      legacyIgnorado:
        verification.ignoredLegacyFiles,
    });

    return;
  }

  const config =
    loadMigrationDatabaseConfig();

  logInfo('Destino PostgreSQL', {
    host: config.sanitizedTarget.host,
    port: config.sanitizedTarget.port,
    database: config.sanitizedTarget.database,
  });

  const sql =
    createMigrationConnection(config);

  try {
    if (command === 'status') {
      const states = await getMigrationStatus(
        sql,
        verification.entries,
      );

      logInfo('Estado de migraciones', {
        migraciones: states.map((state) => ({
          version: state.entry.version,
          archivo: state.entry.filename,
          estado: state.kind,
        })),
      });

      return;
    }

    const result = await runMigrations(
      sql,
      verification.entries,
    );

    logInfo('Ejecución de migraciones finalizada', {
      aplicadas: result.applied,
      omitidas: result.skipped,
    });
  } finally {
    await sql.end({
      timeout: 5,
    });
  }
}

function isDirectExecution(): boolean {
  const executedFile = process.argv[1];

  if (!executedFile) {
    return false;
  }

  return import.meta.url ===
    pathToFileURL(executedFile).href;
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    logError(error);
    process.exitCode = 1;
  });
}
