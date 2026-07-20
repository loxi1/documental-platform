export const CARGA_SEGURA_FINGERPRINT_VERSION = 'canonical-json-v1' as const;

export const CARGA_SEGURA_IDEMPOTENCY_TTL_HOURS = 24;

export const CARGA_SEGURA_ESTADOS = [
  'iniciada',
  'almacenada',
  'completada',
  'fallida',
  'requiere_reconciliacion',
] as const;

export type CargaSeguraEstado = (typeof CARGA_SEGURA_ESTADOS)[number];

export const CARGA_SEGURA_RESULT_KINDS = [
  'CREATED',
  'REPLAYED',
  'DUPLICATE',
  'IDEMPOTENCY_CONFLICT',
  'RECONCILIATION_REQUIRED',
] as const;

export type CargaSeguraResultKind = (typeof CARGA_SEGURA_RESULT_KINDS)[number];

export const CARGA_SEGURA_ERROR_CODES = [
  'CARGA_SEGURA_DESHABILITADA',
  'CARGA_SEGURA_SOLICITUD_INVALIDA',
  'CARGA_SEGURA_IDEMPOTENCY_CONFLICT',
  'CARGA_SEGURA_DUPLICATE',
  'CARGA_SEGURA_STORAGE_FAILED',
  'CARGA_SEGURA_PERSISTENCE_FAILED',
  'ARCHIVO_REQUIERE_RECONCILIACION',
] as const;

export type CargaSeguraErrorCode = (typeof CARGA_SEGURA_ERROR_CODES)[number];
