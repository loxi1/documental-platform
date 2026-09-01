import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

export interface MigrationDatabaseConfig {
  connectionString: string;
  sanitizedTarget: {
    host: string;
    port: string;
    database: string;
  };
}

function loadEnvironmentFiles(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../../../.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({
        path: candidate,
        override: false,
      });

      return;
    }
  }
}

function sanitizeConnectionTarget(
  connectionString: string,
): MigrationDatabaseConfig['sanitizedTarget'] {
  let parsed: URL;

  try {
    parsed = new URL(connectionString);
  } catch (error) {
    throw new Error('DATABASE_URL no tiene un formato válido', {
      cause: error,
    });
  }

  if (
    parsed.protocol !== 'postgres:' &&
    parsed.protocol !== 'postgresql:'
  ) {
    throw new Error(
      'DATABASE_URL debe usar el protocolo postgres o postgresql',
    );
  }

  const database = decodeURIComponent(
    parsed.pathname.replace(/^\/+/, ''),
  );

  if (!parsed.hostname || !database) {
    throw new Error(
      'DATABASE_URL debe incluir host y nombre de base de datos',
    );
  }

  return {
    host: parsed.hostname,
    port: parsed.port || '5432',
    database,
  };
}

export function loadMigrationDatabaseConfig():
  MigrationDatabaseConfig {
  loadEnvironmentFiles();

  const connectionString =
    process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error('DATABASE_URL no está definido');
  }

  return {
    connectionString,
    sanitizedTarget:
      sanitizeConnectionTarget(connectionString),
  };
}
