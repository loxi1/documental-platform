import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const REQUEST_ID_HEADER = 'x-request-id';

const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
} as const;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      request.headers[REQUEST_ID_HEADER]?.toString() ?? randomUUID();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Error interno del servidor';
    let code: string = this.codeFromStatus(status);
    let details: unknown = null;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const body = exceptionResponse as Record<string, unknown>;

      if (body.message === 'Validation failed') {
        message = 'Error de validación';
        code = ERROR_CODES.VALIDATION_ERROR;
        details = body.errors ?? null;
      } else {
        message =
          typeof body.message === 'string'
            ? body.message
            : String(body.message);

        if (typeof body.code === 'string' && body.code.trim()) {
          code = body.code;
          details = body.details ?? null;
        } else {
          code = this.codeFromStatus(status);
          details = body;
        }
      }
    }

    response.status(status).json({
      success: false,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: {
        code,
        message,
        details,
      },
    });
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return ERROR_CODES.BAD_REQUEST;
      case 401:
        return ERROR_CODES.UNAUTHORIZED;
      case 403:
        return ERROR_CODES.FORBIDDEN;
      case 404:
        return ERROR_CODES.NOT_FOUND;
      case 409:
        return ERROR_CODES.CONFLICT;
      case 413:
        return ERROR_CODES.PAYLOAD_TOO_LARGE;
      case 415:
        return ERROR_CODES.UNSUPPORTED_MEDIA_TYPE;
      case 422:
        return ERROR_CODES.VALIDATION_ERROR;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }
}
