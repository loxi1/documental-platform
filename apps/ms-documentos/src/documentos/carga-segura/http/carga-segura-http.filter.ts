import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { CargaSeguraError } from '../carga-segura.errors';
import { CargaSeguraHttpValidationError } from './carga-segura-http.error';

interface MulterErrorLike {
  name: 'MulterError';
  code: string;
  field?: string;
}

interface PublicError {
  status: number;
  code: string;
  message: string;
  details: Readonly<Record<string, unknown>> | null;
}

@Catch()
export class CargaSeguraHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const requestId = resolveSafeRequestId(request.headers['x-request-id']);

    const publicError = this.mapException(exception);

    response.status(publicError.status).json({
      success: false,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: {
        code: publicError.code,
        message: publicError.message,
        details: publicError.details,
      },
    });
  }

  private mapException(exception: unknown): PublicError {
    if (isMulterError(exception)) {
      return this.mapMulterError(exception);
    }

    if (exception instanceof CargaSeguraHttpValidationError) {
      return this.mapTransportValidationError(exception);
    }

    if (exception instanceof CargaSeguraError) {
      return this.mapCargaSeguraError(exception);
    }

    if (exception instanceof HttpException) {
      return this.mapHttpException(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor',
      details: null,
    };
  }

  private mapMulterError(error: MulterErrorLike): PublicError {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
        message: 'El archivo supera el límite permitido de 15 MiB',
        details: null,
      };
    }

    if (
      error.code === 'LIMIT_FILE_COUNT' ||
      error.code === 'LIMIT_UNEXPECTED_FILE'
    ) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
        message: 'La solicitud debe contener exactamente un archivo',
        details: error.field
          ? {
              field: error.field,
            }
          : null,
      };
    }

    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      message: 'La solicitud multipart es inválida',
      details: null,
    };
  }

  private mapTransportValidationError(
    error: CargaSeguraHttpValidationError,
  ): PublicError {
    const status =
      error.kind === 'PAYLOAD_TOO_LARGE'
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : error.kind === 'UNSUPPORTED_MEDIA_TYPE'
          ? HttpStatus.UNSUPPORTED_MEDIA_TYPE
          : HttpStatus.UNPROCESSABLE_ENTITY;

    return {
      status,
      code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      message: error.message,
      details: error.details,
    };
  }

  private mapHttpException(exception: HttpException): PublicError {
    const status = exception.getStatus();

    if (status === 413) {
      return {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
        message: 'El archivo supera el límite permitido de 15 MiB',
        details: null,
      };
    }

    if (status === 400) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
        message: 'La solicitud multipart es inválida',
        details: null,
      };
    }

    return {
      status,
      code: codeFromHttpStatus(status),
      message: publicHttpMessage(status),
      details: null,
    };
  }

  private mapCargaSeguraError(error: CargaSeguraError): PublicError {
    switch (error.code) {
      case 'CARGA_SEGURA_SOLICITUD_INVALIDA':
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: error.code,
          message: error.message,
          details: error.details,
        };

      case 'CARGA_SEGURA_IDEMPOTENCY_CONFLICT':
      case 'CARGA_SEGURA_DUPLICATE':
      case 'CARGA_SEGURA_OPERACION_EN_PROGRESO':
        return {
          status: HttpStatus.CONFLICT,
          code: error.code,
          message: error.message,
          details: error.details,
        };

      case 'CARGA_SEGURA_DESHABILITADA':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          code: error.code,
          message: 'La carga documental segura no está disponible',
          details: null,
        };

      case 'CARGA_SEGURA_STORAGE_FAILED':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          code: error.code,
          message: 'El almacenamiento documental no está disponible',
          details: null,
        };

      case 'CARGA_SEGURA_PERSISTENCE_FAILED':
      case 'CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED':
      case 'ARCHIVO_REQUIERE_RECONCILIACION':
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          code: error.code,
          message: 'No se pudo completar la operación documental',
          details: null,
        };
    }
  }
}

function isMulterError(value: unknown): value is MulterErrorLike {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.name === 'MulterError' &&
    typeof candidate.code === 'string' &&
    (candidate.field === undefined || typeof candidate.field === 'string')
  );
}

function resolveSafeRequestId(
  value: string | readonly string[] | undefined,
): string {
  if (typeof value !== 'string') {
    return randomUUID();
  }

  const normalized = value.trim();

  if (!normalized || hasControlCharacters(normalized)) {
    return randomUUID();
  }

  return normalized;
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

function codeFromHttpStatus(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case 422:
      return 'VALIDATION_ERROR';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

function publicHttpMessage(status: number): string {
  return status >= 500
    ? 'Error interno del servidor'
    : 'La solicitud no pudo ser procesada';
}
