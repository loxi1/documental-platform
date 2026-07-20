export interface ManifestEntry {
  checksum: string;
  filename: string;
  version: string;
  description: string;
  absolutePath: string;
}

export interface ManifestValidationResult {
  manifestPath: string;
  migrationsDirectory: string;
  entries: ManifestEntry[];
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
  entry: ManifestEntry;
  kind: MigrationStateKind;
  databaseChecksum: string | null;
}
