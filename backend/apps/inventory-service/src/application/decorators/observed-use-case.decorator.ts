import { Logger } from '@nestjs/common';
import { AppError, operationDuration } from '@hce/common';
import { RequestContext } from '@hce/contracts';
import { UseCase } from '../ports/use-case';

/**
 * Patrón DECORATOR (GoF): envuelve cualquier caso de uso con la MISMA interfaz
 * y le agrega observabilidad (log estructurado con requestId + histograma
 * Prometheus de latencia por resultado) sin modificar el caso de uso (OCP/SRP).
 * Se puede apilar con otros decoradores (cache, autorización, reintentos...).
 */
export class ObservedUseCase<I, O> implements UseCase<I, O> {
  private readonly logger: Logger;

  constructor(
    private readonly name: string,
    private readonly inner: UseCase<I, O>,
  ) {
    this.logger = new Logger(`UseCase:${name}`);
  }

  async execute(input: I, ctx: RequestContext): Promise<O> {
    const end = operationDuration.startTimer({ operation: this.name });
    const started = performance.now();
    try {
      const result = await this.inner.execute(input, ctx);
      end({ outcome: 'success' });
      this.logger.debug(
        { requestId: ctx.requestId, userId: ctx.userId, ms: Math.round(performance.now() - started) },
        'ok',
      );
      return result;
    } catch (error: unknown) {
      const outcome = error instanceof AppError ? `business:${error.code}` : 'error';
      end({ outcome });
      const log = {
        requestId: ctx.requestId,
        userId: ctx.userId,
        outcome,
        ms: Math.round(performance.now() - started),
      };
      if (error instanceof AppError) this.logger.log(log, error.message);
      else this.logger.error({ ...log, err: error instanceof Error ? error.message : error }, 'fallo inesperado');
      throw error;
    }
  }
}
