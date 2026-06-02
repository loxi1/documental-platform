import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { map, Observable } from 'rxjs';
import { REQUEST_ID_HEADER } from '@documental/shared';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        requestId: req.headers[REQUEST_ID_HEADER]?.toString() ?? '',
        timestamp: new Date().toISOString(),
        data,
      })),
    );
  }
}
