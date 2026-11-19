import { ClientProxy } from '@nestjs/microservices';
import { AppError } from '@hce/common';
import { ErrorCode, isRpcErrorPayload } from '@hce/contracts';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';

/**
 * Request/reply NATS con timeout y traducción de errores:
 *  - error de negocio del microservicio -> AppError con el mismo código
 *  - timeout -> UPSTREAM_TIMEOUT (504)
 *  - sin suscriptores / NATS caído -> UPSTREAM_UNAVAILABLE (503)
 * Nunca deja colgada la petición HTTP (evita agotar sockets del gateway).
 */
export async function rpc<T>(client: ClientProxy, pattern: string, payload: unknown, timeoutMs: number): Promise<T> {
  try {
    return await firstValueFrom(client.send<T, unknown>(pattern, payload).pipe(timeout(timeoutMs)));
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    if (isRpcErrorPayload(error)) throw new AppError(error.code, error.message, error.details);
    if (error instanceof TimeoutError) {
      throw new AppError(ErrorCode.UPSTREAM_TIMEOUT, 'El servicio tardó demasiado en responder. Intente nuevamente.');
    }
    throw new AppError(ErrorCode.UPSTREAM_UNAVAILABLE, 'Servicio no disponible temporalmente. Intente nuevamente.');
  }
}
