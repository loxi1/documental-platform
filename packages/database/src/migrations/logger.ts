import path from 'node:path';

export function toRelativeDisplayPath(
  repositoryRoot: string,
  absolutePath: string,
): string {
  return path.relative(
    repositoryRoot,
    absolutePath,
  );
}

export function logInfo(
  message: string,
  details?: Record<string, unknown>,
): void {
  if (details) {
    console.log(`[migrations] ${message}`, details);
    return;
  }

  console.log(`[migrations] ${message}`);
}

export function logError(error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : 'Error desconocido';

  console.error(`[migrations] ERROR: ${message}`);
}
