import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AppError } from '@hce/core';
import { ErrorCode } from '@hce/contracts';
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs';

@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  constructor(private readonly ms = 15_000) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.ms),
      catchError((err: unknown) =>
        throwError(() =>
          err instanceof TimeoutError
            ? new AppError(ErrorCode.UPSTREAM_TIMEOUT, 'La operación tardó demasiado. Intente nuevamente.')
            : err,
        ),
      ),
    );
  }
}
