import { HttpException, HttpStatus } from '@nestjs/common';

import { SECURE_UPLOAD } from './carga-segura.contract';

export type SecureUploadValidatedBody = {
  expedienteId: number;
  tipoDocumental: string;
  tipoRelacion: string | null;
  esPrincipal: boolean;
  canalIngreso: string;
  metadata?: Record<string, unknown>;
};

export type SecureUploadFile = {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

function invalid(message: string): never {
  throw new HttpException(
    {
      code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      message,
      details: null,
    },
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);

    if (code <= 31 || code === 127) {
      return true;
    }
  }

  return false;
}

function scalarText(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return null;
}

function parsePositiveInteger(value: unknown, field: string): number {
  const text = scalarText(value);

  if (text === null) {
    invalid(`${field} debe ser un entero positivo`);
  }

  const normalized = text.trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    invalid(`${field} debe ser un entero positivo`);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    invalid(`${field} debe ser un entero positivo`);
  }

  return parsed;
}

function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    invalid(`${field} es obligatorio`);
  }

  const normalized = value.trim();

  if (!normalized || hasControlCharacters(normalized)) {
    invalid(`${field} es inválido`);
  }

  return normalized;
}

function parseOptionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return parseRequiredString(value, field);
}

function parseStrictBoolean(value: unknown): boolean {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  invalid('esPrincipal debe ser booleano');
}

function assertSafeMetadata(value: unknown, depth = 0): void {
  if (depth > 6) {
    invalid('metadata excede la profundidad permitida');
  }

  if (value === null || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertSafeMetadata(item, depth + 1);
    }

    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECURE_UPLOAD.forbiddenMetadataKeys.has(key)) {
      invalid(`metadata contiene la clave no permitida: ${key}`);
    }

    assertSafeMetadata(child, depth + 1);
  }
}

function parseMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  let parsed: unknown;

  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    invalid('metadata debe contener JSON válido');
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    invalid('metadata debe ser un objeto JSON');
  }

  assertSafeMetadata(parsed);

  const serialized = JSON.stringify(parsed);

  if (Buffer.byteLength(serialized, 'utf8') > SECURE_UPLOAD.maxFieldSizeBytes) {
    invalid('metadata excede el tamaño permitido');
  }

  return parsed as Record<string, unknown>;
}

export function validateSecureUploadBody(
  body: Record<string, unknown>,
): SecureUploadValidatedBody {
  for (const key of Object.keys(body)) {
    if (!SECURE_UPLOAD.allowedBodyFields.has(key)) {
      invalid(`Campo multipart no permitido: ${key}`);
    }
  }

  return {
    expedienteId: parsePositiveInteger(body.expedienteId, 'expedienteId'),
    tipoDocumental: parseRequiredString(body.tipoDocumental, 'tipoDocumental'),
    tipoRelacion: parseOptionalString(body.tipoRelacion, 'tipoRelacion'),
    esPrincipal: parseStrictBoolean(body.esPrincipal),
    canalIngreso: parseRequiredString(body.canalIngreso, 'canalIngreso'),
    metadata: parseMetadata(body.metadata),
  };
}

export function validateIdempotencyKey(value: unknown): string {
  if (Array.isArray(value)) {
    invalid('Idempotency-Key debe contener un solo valor');
  }

  if (typeof value !== 'string') {
    invalid('Idempotency-Key es obligatoria');
  }

  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed !== value ||
    value.length > SECURE_UPLOAD.maxIdempotencyKeyLength ||
    hasControlCharacters(value)
  ) {
    invalid('Idempotency-Key es inválida');
  }

  return value;
}

export function validateSecureUploadFile(
  file: SecureUploadFile | undefined,
): SecureUploadFile {
  if (!file?.buffer || file.fieldname !== SECURE_UPLOAD.fileField) {
    invalid('El archivo es obligatorio en el campo archivo');
  }

  if (file.size <= 0) {
    invalid('El archivo está vacío');
  }

  if (file.size > SECURE_UPLOAD.fileSizeBytes) {
    throw new HttpException(
      {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'El archivo excede el límite de 15 MiB',
        details: null,
      },
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }

  if (!SECURE_UPLOAD.allowedMimeTypes.has(file.mimetype)) {
    throw new HttpException(
      {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Tipo de archivo no permitido',
        details: null,
      },
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  }

  return file;
}
