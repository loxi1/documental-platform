import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiErrorCode, REQUEST_ID_HEADER } from '@documental/shared';

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
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    let message = 'Error interno del servidor';
    let code: ApiErrorCode = this.codeFromStatus(status);
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
        code = ApiErrorCode.VALIDATION_ERROR;
        details = body.errors ?? null;
      } else {
        message = String(body.message);
        code = this.codeFromStatus(status);
        details = body;
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

  private codeFromStatus(status: number): ApiErrorCode {
    switch (status) {
      case 400:
        return ApiErrorCode.BAD_REQUEST;
      case 401:
        return ApiErrorCode.UNAUTHORIZED;
      case 403:
        return ApiErrorCode.FORBIDDEN;
      case 404:
        return ApiErrorCode.NOT_FOUND;
      case 409:
        return ApiErrorCode.CONFLICT;
      default:
        return ApiErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}
