import { ClientProxy } from '@nestjs/microservices';
import { AppError } from '@hce/core';
import { ErrorCode, isRpcErrorPayload } from '@hce/contracts';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';

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
