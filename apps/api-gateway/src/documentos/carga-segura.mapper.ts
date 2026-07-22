import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

import {
  SECURE_UPLOAD_PUBLIC_ERROR_CODES,
  SecureUploadExternalData,
  SecureUploadPublicErrorCode,
} from './carga-segura.contract';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown, key: string): UnknownRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const child = value[key];
  return isRecord(child) ? child : null;
}

function readString(value: UnknownRecord, key: string): string | null {
  const candidate = value[key];

  return typeof candidate === 'string' ? candidate : null;
}

function readPositiveId(value: UnknownRecord, key: string): number | null {
  const candidate = value[key];
  const parsed =
    typeof candidate === 'number'
      ? candidate
      : typeof candidate === 'string'
        ? Number(candidate)
        : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function unwrapData(payload: unknown): UnknownRecord | null {
  if (!isRecord(payload)) {
    return null;
  }

  const nested = readRecord(payload, 'data');
  return nested ?? payload;
}

export function mapSecureUploadSuccess(payload: unknown): {
  status: number;
  data: SecureUploadExternalData;
} {
  const source = unwrapData(payload);

  if (!source) {
    throw new Error('Resultado de carga segura no reconocido');
  }

  const kind = readString(source, 'kind');

  if (kind === 'CREATED') {
    const documentoId = readPositiveId(source, 'documentoId');

    if (!documentoId) {
      throw new Error('Respuesta CREATED inválida');
    }

    return {
      status: HttpStatus.CREATED,
      data: {
        kind: 'CREATED',
        documentoId,
      },
    };
  }

  if (kind === 'REPLAYED') {
    const documentoId = readPositiveId(source, 'documentoId');

    if (!documentoId) {
      throw new Error('Respuesta REPLAYED inválida');
    }

    return {
      status: HttpStatus.OK,
      data: {
        kind: 'REPLAYED',
        documentoId,
      },
    };
  }

  if (kind === 'RECONCILIATION_REQUIRED') {
    const operacionId = readPositiveId(source, 'operacionId');

    if (!operacionId) {
      throw new Error('Respuesta RECONCILIATION_REQUIRED inválida');
    }

    const rawErrorCode = readString(source, 'errorCode');
    const errorCode = rawErrorCode?.trim() || undefined;

    return {
      status: HttpStatus.ACCEPTED,
      data: {
        kind: 'RECONCILIATION_REQUIRED',
        operacionId,
        ...(errorCode ? { errorCode } : {}),
      },
    };
  }

  throw new Error('Resultado de carga segura no reconocido');
}

function normalizePublicCode(
  value: unknown,
): SecureUploadPublicErrorCode | null {
  if (
    typeof value === 'string' &&
    SECURE_UPLOAD_PUBLIC_ERROR_CODES.has(value)
  ) {
    return value as SecureUploadPublicErrorCode;
  }

  return null;
}

function statusForCode(code: SecureUploadPublicErrorCode): number {
  switch (code) {
    case 'CARGA_SEGURA_DUPLICATE':
    case 'CARGA_SEGURA_IDEMPOTENCY_CONFLICT':
    case 'CARGA_SEGURA_OPERACION_EN_PROGRESO':
      return HttpStatus.CONFLICT;

    case 'CARGA_SEGURA_SOLICITUD_INVALIDA':
      return HttpStatus.UNPROCESSABLE_ENTITY;

    case 'PAYLOAD_TOO_LARGE':
      return HttpStatus.PAYLOAD_TOO_LARGE;

    case 'UNSUPPORTED_MEDIA_TYPE':
      return HttpStatus.UNSUPPORTED_MEDIA_TYPE;

    case 'CARGA_SEGURA_DESHABILITADA':
    case 'CARGA_SEGURA_STORAGE_FAILED':
    case 'CARGA_SEGURA_PERSISTENCE_FAILED':
    case 'CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED':
      return HttpStatus.SERVICE_UNAVAILABLE;

    case 'UNAUTHORIZED':
      return HttpStatus.UNAUTHORIZED;

    case 'FORBIDDEN':
      return HttpStatus.FORBIDDEN;

    default:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

export function throwSecureUploadError(error: unknown): never {
  if (axios.isAxiosError<unknown>(error) && error.response) {
    const payload = error.response.data;
    const payloadRecord = isRecord(payload) ? payload : null;
    const upstream = readRecord(payloadRecord, 'error') ?? payloadRecord;

    if (upstream) {
      const code = normalizePublicCode(upstream.code);

      if (code) {
        const rawMessage = readString(upstream, 'message');
        const message =
          rawMessage?.trim() ||
          'No se pudo completar la carga documental segura';

        throw new HttpException(
          {
            code,
            message,
            details: null,
          },
          statusForCode(code),
        );
      }
    }
  }

  throw new HttpException(
    {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'No se pudo confirmar el resultado de la carga documental segura',
      details: null,
    },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
