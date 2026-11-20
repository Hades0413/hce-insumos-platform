import { ArgumentsHost, Catch, Logger, RpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ErrorCode, RpcErrorPayload, isRpcErrorPayload } from '@hce/contracts';
import { Observable, throwError } from 'rxjs';
import { AppError } from '@hce/core';

@Catch()
export class RpcProblemFilter implements RpcExceptionFilter<unknown> {
  private readonly logger = new Logger(RpcProblemFilter.name);

  catch(exception: unknown, _host: ArgumentsHost): Observable<RpcErrorPayload> {
    return throwError(() => this.toPayload(exception));
  }

  private toPayload(exception: unknown): RpcErrorPayload {
    if (exception instanceof AppError) {
      return exception.toPayload();
    }
    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (isRpcErrorPayload(error)) return error;
    }
    this.logger.error(
      { err: exception instanceof Error ? { message: exception.message, stack: exception.stack } : exception },
      'Error no controlado en microservicio',
    );
    return { code: ErrorCode.INTERNAL_ERROR, message: 'Ocurrió un error interno. Intente nuevamente.' };
  }
}
