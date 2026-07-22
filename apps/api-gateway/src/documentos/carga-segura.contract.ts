export const SECURE_UPLOAD = {
  permission: 'documentos.subir',
  system: 'DOCUMENTAL',
  fileField: 'archivo',

  fileSizeBytes: 15 * 1024 * 1024,
  multipartTotalBytes: 16 * 1024 * 1024,
  timeoutMs: 55_000,

  maxFields: 6,
  maxParts: 7,
  maxFieldSizeBytes: 64 * 1024,
  maxIdempotencyKeyLength: 128,

  allowedMimeTypes: new Set<string>([
    'application/pdf',
    'image/jpeg',
    'image/png',
  ]),

  allowedBodyFields: new Set<string>([
    'expedienteId',
    'tipoDocumental',
    'tipoRelacion',
    'esPrincipal',
    'canalIngreso',
    'metadata',
  ]),

  forbiddenMetadataKeys: new Set<string>([
    '__proto__',
    'prototype',
    'constructor',
    'workspaceId',
    'empresaCodigo',
    'clienteDestinoId',
    'actorId',
    'usuarioId',
    'perfil',
    'permisos',
    'archivoId',
    'hashSha256',
    'storageKey',
    'storageBucket',
    'storageProvider',
    'publicUrl',
  ]),
} as const;

export type SecureUploadExternalData =
  | {
      kind: 'CREATED';
      documentoId: number;
    }
  | {
      kind: 'REPLAYED';
      documentoId: number;
    }
  | {
      kind: 'RECONCILIATION_REQUIRED';
      operacionId: number;
      errorCode?: string;
    };

export const SECURE_UPLOAD_PUBLIC_ERROR_CODES = new Set<string>([
  'CARGA_SEGURA_DUPLICATE',
  'CARGA_SEGURA_IDEMPOTENCY_CONFLICT',
  'CARGA_SEGURA_OPERACION_EN_PROGRESO',
  'CARGA_SEGURA_SOLICITUD_INVALIDA',
  'CARGA_SEGURA_DESHABILITADA',
  'CARGA_SEGURA_STORAGE_FAILED',
  'CARGA_SEGURA_PERSISTENCE_FAILED',
  'CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INTERNAL_SERVER_ERROR',
]);

export type SecureUploadPublicErrorCode =
  | 'CARGA_SEGURA_DUPLICATE'
  | 'CARGA_SEGURA_IDEMPOTENCY_CONFLICT'
  | 'CARGA_SEGURA_OPERACION_EN_PROGRESO'
  | 'CARGA_SEGURA_SOLICITUD_INVALIDA'
  | 'CARGA_SEGURA_DESHABILITADA'
  | 'CARGA_SEGURA_STORAGE_FAILED'
  | 'CARGA_SEGURA_PERSISTENCE_FAILED'
  | 'CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_SERVER_ERROR';
