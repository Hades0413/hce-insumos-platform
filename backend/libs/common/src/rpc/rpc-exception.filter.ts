import { ArgumentsHost, Catch, Logger, RpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ErrorCode, RpcErrorPayload, isRpcErrorPayload } from '@hce/contracts';
import { Observable, throwError } from 'rxjs';
import { AppError } from '../errors/app-error';

/**
 * Filtro global de los microservicios: todo error sale por NATS como un
 * RpcErrorPayload serializable. Los errores inesperados se registran con su
 * stack pero al cliente solo llega un mensaje genérico (sin fuga de detalles
 * internos — OWASP A05/A09).
 */
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
