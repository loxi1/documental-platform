import { access } from 'node:fs/promises';
import path from 'node:path';

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function findRepositoryRoot(
  initialDirectory: string = process.cwd(),
): Promise<string> {
  let currentDirectory = path.resolve(initialDirectory);

  while (true) {
    const workspaceFile = path.join(
      currentDirectory,
      'pnpm-workspace.yaml',
    );

    const manifestFile = path.join(
      currentDirectory,
      'infra',
      'postgres',
      'migrations',
      'manifest.sha256',
    );

    if (
      await exists(workspaceFile) &&
      await exists(manifestFile)
    ) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      throw new Error(
        'No se pudo localizar la raíz del repositorio ni manifest.sha256',
      );
    }

    currentDirectory = parentDirectory;
  }
}

export function resolveMigrationsDirectory(
  repositoryRoot: string,
): string {
  return path.join(
    repositoryRoot,
    'infra',
    'postgres',
    'migrations',
  );
}
