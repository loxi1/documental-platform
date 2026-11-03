import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { logger } from '../logger/app-logger';
import { REQUEST_ID_HEADER } from '@documental/shared';

// Keep locations, never the arbitrary exception message, SQL parameters or cause.
function diagnostic(error: unknown) {
  const fallback = {
    exceptionName: 'NonErrorThrown',
    error: 'Unexpected exception',
  };
  try {
    if (!(error instanceof Error)) return fallback;
    const names = [
      'Error',
      'TypeError',
      'RangeError',
      'ReferenceError',
      'SyntaxError',
      'URIError',
      'EvalError',
      'AggregateError',
      'PostgresError',
    ];
    const exceptionName = names.includes(error.name) ? error.name : 'Error';
    const code = Object.getOwnPropertyDescriptor(error, 'code')?.value;
    const technicalCode =
      typeof code === 'string' &&
      (/^[0-9]{2}[A-Z0-9]{3}$/.test(code) ||
        [
          'ERR_INVALID_ARG_TYPE',
          'ERR_INVALID_ARG_VALUE',
          'ERR_OUT_OF_RANGE',
          'ERR_BUFFER_OUT_OF_BOUNDS',
          'ECONNREFUSED',
          'ECONNRESET',
          'ETIMEDOUT',
          'EPIPE',
        ].includes(code))
        ? code
        : undefined;
    const stack = typeof error.stack === 'string' ? error.stack : '';
    const locations = stack
      .slice(0, 16000)
      .split('\n')
      .slice(1, 41)
      .flatMap((line) => {
        const match = line.match(
          /(?:\(|\s)(?:file:\/\/)?(node:[\w./-]+:\d+:\d+|\/(?:app|home\/loxi1\/projects\/apps\/documental-platform)\/[\w./@+-]+\.(?:[cm]?js|ts):\d+:\d+)\)?$/,
        );
        return match && match[1].length <= 320 ? [`    at ${match[1]}`] : [];
      })
      .slice(0, 20);
    return {
      error: 'Unexpected exception',
      exceptionName,
      technicalCode,
      stack: locations.length ? locations.join('\n') : undefined,
    };
  } catch {
    return { error: 'Unexpected exception', exceptionName: 'Error' };
  }
}

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      tap({
        next: () => {
          logger.info({
            requestId: req.headers[REQUEST_ID_HEADER],
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
          });
        },
        error: (error) => {
          const incomingId = req.headers[REQUEST_ID_HEADER];
          const requestId =
            typeof incomingId === 'string' &&
            /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(incomingId)
              ? incomingId
              : undefined;
          // Route templates omit user-controlled path values and query strings.
          const path =
            typeof req.route?.path === 'string'
              ? req.route.path
              : '[unmatched route]';
          try {
            logger.error({
              requestId,
              method: req.method,
              path,
              statusCode:
                error instanceof HttpException ? error.getStatus() : 500,
              durationMs: Date.now() - startedAt,
              ...(error instanceof HttpException
                ? { error: 'HTTP exception', exceptionName: 'HttpException' }
                : diagnostic(error)),
            });
          } catch {
            // Diagnostics must not replace the exception delivered to the filter.
          }
        },
      }),
    );
  }
}
