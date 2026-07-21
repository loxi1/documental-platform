import { randomUUID } from 'node:crypto';

import {
  CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES,
  CARGA_SEGURA_HTTP_MAX_IDEMPOTENCY_KEY_LENGTH,
  CARGA_SEGURA_HTTP_MAX_METADATA_BYTES,
  CARGA_SEGURA_HTTP_MAX_METADATA_DEPTH,
  CARGA_SEGURA_HTTP_RESERVED_METADATA_KEYS,
} from './carga-segura-http.constants';
import { CargaSeguraHttpValidationError } from './carga-segura-http.error';

export type CargaSeguraHttpHeaderValue = string | readonly string[] | undefined;

export interface CargaSeguraHttpResolvedIdentity {
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number;
  actorId: number;
  requestId: string;
  correlationId: string;
  idempotencyKey: string;
}

export function resolveCargaSeguraHttpIdentity(input: {
  workspaceId: CargaSeguraHttpHeaderValue;
  empresaCodigo: CargaSeguraHttpHeaderValue;
  clienteDestinoId: CargaSeguraHttpHeaderValue;
  actorId: CargaSeguraHttpHeaderValue;
  userId: CargaSeguraHttpHeaderValue;
  requestId: CargaSeguraHttpHeaderValue;
  correlationId: CargaSeguraHttpHeaderValue;
  idempotencyKey: CargaSeguraHttpHeaderValue;
}): CargaSeguraHttpResolvedIdentity {
  const actorId = resolveActorId(input.actorId, input.userId);
  const requestId = resolveOptionalIdentifier(input.requestId) ?? randomUUID();
  const correlationId =
    resolveOptionalIdentifier(input.correlationId) ?? requestId;

  return {
    workspaceId: parseRequiredPositiveIntegerHeader(
      input.workspaceId,
      'x-workspace-id',
    ),
    empresaCodigo: parseRequiredTextHeader(
      input.empresaCodigo,
      'x-empresa-codigo',
    ),
    clienteDestinoId: parseRequiredPositiveIntegerHeader(
      input.clienteDestinoId,
      'x-cliente-destino-id',
    ),
    actorId,
    requestId,
    correlationId,
    idempotencyKey: parseIdempotencyKey(input.idempotencyKey),
  };
}

export function parseRequiredPositiveIntegerHeader(
  value: CargaSeguraHttpHeaderValue,
  headerName: string,
): number {
  const normalized = parseSingleHeader(value, headerName);
  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw validationError(`${headerName} debe ser un entero positivo`, {
      header: headerName,
    });
  }

  return parsed;
}

export function parseRequiredTextHeader(
  value: CargaSeguraHttpHeaderValue,
  headerName: string,
): string {
  const normalized = parseSingleHeader(value, headerName).trim();

  if (!normalized || hasControlCharacters(normalized)) {
    throw validationError(`${headerName} es inválido`, {
      header: headerName,
    });
  }

  return normalized;
}

export function parseIdempotencyKey(value: CargaSeguraHttpHeaderValue): string {
  const normalized = parseSingleHeader(value, 'Idempotency-Key').trim();

  if (
    !normalized ||
    normalized.length > CARGA_SEGURA_HTTP_MAX_IDEMPOTENCY_KEY_LENGTH ||
    hasControlCharacters(normalized)
  ) {
    throw validationError('Idempotency-Key es inválida');
  }

  return normalized;
}

export function parseRequiredBoolean(
  value: unknown,
  fieldName: string,
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  throw validationError(`${fieldName} debe ser true o false`, {
    field: fieldName,
  });
}

export function parseNullablePositiveInteger(
  value: unknown,
  fieldName: string,
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let parsed: number;

  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string') {
    parsed = Number(value.trim());
  } else {
    throw validationError(`${fieldName} debe ser un entero positivo o null`, {
      field: fieldName,
    });
  }

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw validationError(`${fieldName} debe ser un entero positivo o null`, {
      field: fieldName,
    });
  }

  return parsed;
}

export function parseRequiredBodyText(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== 'string') {
    throw validationError(`${fieldName} es obligatorio`, {
      field: fieldName,
    });
  }

  const normalized = value.trim();

  if (!normalized || hasControlCharacters(normalized)) {
    throw validationError(`${fieldName} es inválido`, {
      field: fieldName,
    });
  }

  return normalized;
}

export function parseNullableBodyText(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return parseRequiredBodyText(value, fieldName);
}

export function parseCargaSeguraMetadata(
  rawValue: unknown,
): Record<string, unknown> {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return {};
  }

  let value: unknown;

  if (typeof rawValue === 'string') {
    if (
      Buffer.byteLength(rawValue, 'utf8') > CARGA_SEGURA_HTTP_MAX_METADATA_BYTES
    ) {
      throw validationError('metadata supera el tamaño permitido');
    }

    try {
      value = JSON.parse(rawValue);
    } catch {
      throw validationError('metadata debe contener JSON válido');
    }
  } else {
    value = rawValue;
  }

  if (!isPlainObject(value)) {
    throw validationError('metadata debe ser un objeto JSON');
  }

  validateMetadataNode(value, 1);

  return value;
}

export function validateCargaSeguraFileSize(buffer: Buffer): void {
  if (!Buffer.isBuffer(buffer) || buffer.length <= 0) {
    throw validationError('archivo no puede estar vacío');
  }

  if (buffer.length > CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES) {
    throw new CargaSeguraHttpValidationError(
      'PAYLOAD_TOO_LARGE',
      'El archivo supera el límite permitido de 15 MiB',
      {
        maxBytes: CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES,
      },
    );
  }
}

function resolveActorId(
  actorValue: CargaSeguraHttpHeaderValue,
  userValue: CargaSeguraHttpHeaderValue,
): number {
  const actor = parseOptionalPositiveIntegerHeader(actorValue, 'x-actor-id');
  const user = parseOptionalPositiveIntegerHeader(userValue, 'x-user-id');

  if (actor !== null && user !== null && actor !== user) {
    throw validationError(
      'x-actor-id y x-user-id no pueden contener valores contradictorios',
    );
  }

  const resolved = actor ?? user;

  if (resolved === null) {
    throw validationError('x-actor-id es obligatorio');
  }

  return resolved;
}

function parseOptionalPositiveIntegerHeader(
  value: CargaSeguraHttpHeaderValue,
  headerName: string,
): number | null {
  if (value === undefined) {
    return null;
  }

  return parseRequiredPositiveIntegerHeader(value, headerName);
}

function resolveOptionalIdentifier(
  value: CargaSeguraHttpHeaderValue,
): string | null {
  if (value === undefined) {
    return null;
  }

  const normalized = parseSingleHeader(value, 'identificador').trim();

  if (!normalized || hasControlCharacters(normalized)) {
    return null;
  }

  return normalized;
}

function parseSingleHeader(
  value: CargaSeguraHttpHeaderValue,
  headerName: string,
): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined) {
    throw validationError(`${headerName} es obligatorio`, {
      header: headerName,
    });
  }

  const values: readonly string[] = value;

  if (values.length !== 1) {
    throw validationError(`${headerName} contiene valores ambiguos`, {
      header: headerName,
    });
  }

  return values[0] ?? '';
}

function validateMetadataNode(value: unknown, depth: number): void {
  if (depth > CARGA_SEGURA_HTTP_MAX_METADATA_DEPTH) {
    throw validationError('metadata supera la profundidad permitida');
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      validateMetadataNode(item, depth + 1);
    }

    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (CARGA_SEGURA_HTTP_RESERVED_METADATA_KEYS.has(key)) {
      throw validationError(`metadata contiene una clave reservada: ${key}`, {
        key,
      });
    }

    const child: unknown = value[key];

    validateMetadataNode(child, depth + 1);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Reflect.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);

    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }

  return false;
}

function validationError(
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): CargaSeguraHttpValidationError {
  return new CargaSeguraHttpValidationError(
    'VALIDATION_ERROR',
    message,
    details,
  );
}
