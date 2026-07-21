import { createHash } from 'node:crypto';

import { CARGA_SEGURA_FINGERPRINT_VERSION } from './carga-segura.constants';
import type { CargaSeguraFingerprintPayload } from './carga-segura.types';

type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

export interface CargaSeguraFingerprintResult {
  version: typeof CARGA_SEGURA_FINGERPRINT_VERSION;
  canonicalJson: string;
  fingerprint: string;
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(normalizeCanonicalValue(value));
}

export function calculateCargaSeguraFingerprint(
  payload: CargaSeguraFingerprintPayload,
): CargaSeguraFingerprintResult {
  const normalizedPayload = normalizeFingerprintPayload(payload);

  const canonicalJson = canonicalizeJson(normalizedPayload);

  const fingerprint = createHash('sha256')
    .update(canonicalJson, 'utf8')
    .digest('hex');

  return {
    version: CARGA_SEGURA_FINGERPRINT_VERSION,
    canonicalJson,
    fingerprint,
  };
}

function normalizeFingerprintPayload(
  payload: CargaSeguraFingerprintPayload,
): CargaSeguraFingerprintPayload {
  return {
    workspaceId: normalizePositiveInteger(payload.workspaceId, 'workspaceId'),
    empresaCodigo: normalizeRequiredString(
      payload.empresaCodigo,
      'empresaCodigo',
    ),
    clienteDestinoId: normalizeNullablePositiveInteger(
      payload.clienteDestinoId,
      'clienteDestinoId',
    ),
    expedienteId: normalizeNullablePositiveInteger(
      payload.expedienteId,
      'expedienteId',
    ),
    actorId: normalizePositiveInteger(payload.actorId, 'actorId'),
    canalIngreso: normalizeRequiredString(payload.canalIngreso, 'canalIngreso'),
    tipoDocumental: normalizeRequiredString(
      payload.tipoDocumental,
      'tipoDocumental',
    ),
    tipoRelacion: normalizeNullableString(payload.tipoRelacion, 'tipoRelacion'),
    esPrincipal: payload.esPrincipal,
    nombreArchivo: normalizeRequiredString(
      payload.nombreArchivo,
      'nombreArchivo',
    ),
    contentType: normalizeRequiredString(
      payload.contentType,
      'contentType',
    ).toLowerCase(),
    tamanoBytes: normalizePositiveInteger(payload.tamanoBytes, 'tamanoBytes'),
    hashSha256: normalizeSha256(payload.hashSha256),
  };
}

function normalizeCanonicalValue(value: unknown): CanonicalJsonValue {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('canonical-json-v1 no admite números no finitos');
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeCanonicalValue(item));
  }

  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;

    const normalized: Record<string, CanonicalJsonValue> = {};

    for (const key of Object.keys(source).sort()) {
      const item = source[key];

      if (item === undefined) {
        continue;
      }

      normalized[key] = normalizeCanonicalValue(item);
    }

    return normalized;
  }

  throw new TypeError(
    `canonical-json-v1 no admite valores de tipo ${typeof value}`,
  );
}

function normalizeRequiredString(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new TypeError(`${field} es obligatorio`);
  }

  return normalized;
}

function normalizeNullableString(
  value: string | null,
  field: string,
): string | null {
  if (value === null) {
    return null;
  }

  return normalizeRequiredString(value, field);
}

function normalizePositiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} debe ser un entero positivo`);
  }

  return value;
}

function normalizeNullablePositiveInteger(
  value: number | null,
  field: string,
): number | null {
  if (value === null) {
    return null;
  }

  return normalizePositiveInteger(value, field);
}

function normalizeSha256(value: string): string {
  const normalized = normalizeRequiredString(value, 'hashSha256').toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new TypeError('hashSha256 debe ser SHA-256 hexadecimal');
  }

  return normalized;
}
