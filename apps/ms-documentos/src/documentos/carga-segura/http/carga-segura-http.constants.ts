export const CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const CARGA_SEGURA_HTTP_MAX_FILES = 1;

export const CARGA_SEGURA_HTTP_MAX_IDEMPOTENCY_KEY_LENGTH = 128;

export const CARGA_SEGURA_HTTP_MAX_FILENAME_BYTES = 255;

export const CARGA_SEGURA_HTTP_MAX_METADATA_BYTES = 32 * 1024;

export const CARGA_SEGURA_HTTP_MAX_METADATA_DEPTH = 10;

export const CARGA_SEGURA_HTTP_ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type CargaSeguraHttpAllowedContentType =
  (typeof CARGA_SEGURA_HTTP_ALLOWED_CONTENT_TYPES)[number];

export const CARGA_SEGURA_HTTP_RESERVED_METADATA_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'workspaceId',
  'empresaCodigo',
  'clienteDestinoId',
  'expedienteId',
  'actorId',
  'usuarioId',
  'idempotencyKey',
  'requestId',
  'correlationId',
  'cargaOperacionId',
  'canalIngreso',
  'tipoDocumental',
  'tipoRelacion',
  'esPrincipal',
  'nombreArchivo',
  'contentType',
  'tamanoBytes',
  'hashSha256',
  'storageProvider',
  'storageBucket',
  'storageKey',
  'origen',
]);

export const CARGA_SEGURA_HTTP_FILE_FIELDS = ['archivo'] as const;

export type CargaSeguraHttpFileField =
  (typeof CARGA_SEGURA_HTTP_FILE_FIELDS)[number];
