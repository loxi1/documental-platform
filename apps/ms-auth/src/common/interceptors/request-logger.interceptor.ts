import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { logger } from '../logger/app-logger';
import { REQUEST_ID_HEADER } from '@documental/shared';

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
          logger.error({
            requestId: req.headers[REQUEST_ID_HEADER],
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      }),
    );
  }
}
