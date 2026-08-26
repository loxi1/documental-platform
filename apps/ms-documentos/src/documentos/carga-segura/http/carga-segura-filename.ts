import path from 'node:path';

import {
  CARGA_SEGURA_HTTP_MAX_FILENAME_BYTES,
  type CargaSeguraHttpAllowedContentType,
} from './carga-segura-http.constants';

const EXTENSION_BY_CONTENT_TYPE: Readonly<
  Record<CargaSeguraHttpAllowedContentType, string>
> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export function sanitizeCargaSeguraFilename(
  originalName: string | undefined,
  contentType: CargaSeguraHttpAllowedContentType,
): string {
  const normalizedSeparators = (originalName ?? '').replaceAll('\\', '/');

  let basename = path.posix.basename(normalizedSeparators);

  basename = removeControlCharacters(basename).replace(/\s+/g, ' ').trim();

  const fallback = `documento${EXTENSION_BY_CONTENT_TYPE[contentType]}`;

  if (!basename || basename === '.' || basename === '..') {
    return fallback;
  }

  return truncateFilenameUtf8(
    basename,
    CARGA_SEGURA_HTTP_MAX_FILENAME_BYTES,
    EXTENSION_BY_CONTENT_TYPE[contentType],
  );
}

function truncateFilenameUtf8(
  filename: string,
  maxBytes: number,
  fallbackExtension: string,
): string {
  if (Buffer.byteLength(filename, 'utf8') <= maxBytes) {
    return filename;
  }

  const extension = resolveExtension(filename, fallbackExtension);
  const extensionBytes = Buffer.byteLength(extension, 'utf8');
  const stemLimit = Math.max(1, maxBytes - extensionBytes);

  const stem = extension
    ? filename.slice(0, Math.max(0, filename.length - extension.length))
    : filename;

  const truncatedStem = truncateUtf8(stem.trim(), stemLimit);

  const result = `${truncatedStem || 'documento'}${extension}`;

  if (Buffer.byteLength(result, 'utf8') <= maxBytes) {
    return result;
  }

  return truncateUtf8(result, maxBytes);
}

function resolveExtension(filename: string, fallback: string): string {
  const extension = path.extname(filename);

  if (
    extension &&
    extension.length <= 16 &&
    !containsControlOrWhitespace(extension)
  ) {
    return extension;
  }

  return fallback;
}

function truncateUtf8(value: string, maxBytes: number): string {
  let result = '';

  for (const character of value) {
    const candidate = result + character;

    if (Buffer.byteLength(candidate, 'utf8') > maxBytes) {
      break;
    }

    result = candidate;
  }

  return result;
}

function removeControlCharacters(value: string): string {
  let result = '';

  for (const character of value) {
    if (!isControlCharacter(character)) {
      result += character;
    }
  }

  return result;
}

function containsControlOrWhitespace(value: string): boolean {
  for (const character of value) {
    if (isControlCharacter(character) || character.trim() === '') {
      return true;
    }
  }

  return false;
}

function isControlCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0);

  return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
}
