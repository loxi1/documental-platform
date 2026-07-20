export interface ManifestEntry {
  checksum: string;
  filename: string;
  version: string;
  description: string;
  absolutePath: string;
}

export interface VerifiedMigration extends ManifestEntry {
  sqlText: string;
}

export interface ManifestValidationResult {
  manifestPath: string;
  migrationsDirectory: string;
  entries: VerifiedMigration[];
  ignoredLegacyFiles: string[];
}

export interface SchemaMigrationRow {
  version: string;
  description: string | null;
  checksum: string | null;
  executedAt: Date;
  executedBy: string;
}

export type MigrationStateKind =
  | 'pending'
  | 'applied'
  | 'drift'
  | 'invalid_null_checksum';

export interface MigrationState {
  entry: VerifiedMigration;
  kind: MigrationStateKind;
  databaseChecksum: string | null;
}
