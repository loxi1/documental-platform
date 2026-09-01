import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

export function isValidSha256(value: string): boolean {
  return SHA256_HEX_PATTERN.test(value);
}

export function calculateBytesSha256(
  contents: Uint8Array,
): string {
  return createHash('sha256')
    .update(contents)
    .digest('hex');
}

export async function calculateFileSha256(
  filePath: string,
): Promise<string> {
  const contents = await readFile(filePath);

  return calculateBytesSha256(contents);
}
