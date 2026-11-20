import { Logger } from '@nestjs/common';
import { OperationObserver, OperationOutcome } from '@hce/core';
import { operationDuration } from './metrics-server';

export class PrometheusOperationObserver implements OperationObserver {
  private readonly logger = new Logger('UseCase');

  start(operation: string, ctx: { requestId: string; userId: string }): (outcome: OperationOutcome) => void {
    const end = operationDuration.startTimer({ operation });
    const started = performance.now();
    return (outcome) => {
      const ms = Math.round(performance.now() - started);
      const base = { operation, requestId: ctx.requestId, userId: ctx.userId, ms };
      switch (outcome.kind) {
        case 'success':
          end({ outcome: 'success' });
          this.logger.debug(base, 'ok');
          break;
        case 'business':
          end({ outcome: `business:${outcome.code}` });
          this.logger.log({ ...base, code: outcome.code }, 'regla de negocio');
          break;
        default:
          end({ outcome: 'error' });
          this.logger.error(
            { ...base, err: outcome.error instanceof Error ? outcome.error.message : outcome.error },
            'fallo inesperado',
          );
      }
    };
  }
}
