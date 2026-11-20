import { Logger } from '@nestjs/common';
import { metricsRegistry } from '@hce/common';
import { Counter } from 'prom-client';
import { GatewayRequest } from './authenticated-user';

export const securityEventsTotal = new Counter({
  name: 'hce_security_events_total',
  help: 'Eventos de seguridad en el gateway (401, 403, CSRF, rate limit, payload rechazado)',
  labelNames: ['type'] as const,
  registers: [metricsRegistry],
});

const logger = new Logger('SecurityEvent');

const TYPE_BY_CODE: Record<string, string> = {
  UNAUTHENTICATED: 'unauthenticated',
  INVALID_CREDENTIALS: 'login_failed',
  FORBIDDEN: 'forbidden',
  CSRF_INVALID: 'csrf_invalid',
  RATE_LIMITED: 'rate_limited',
  VALIDATION_ERROR: 'rejected_input',
};

export function recordSecurityEvent(code: string, status: number, req: GatewayRequest): void {
  const type = TYPE_BY_CODE[code] ?? (status === 415 ? 'rejected_input' : undefined);
  if (!type) return;
  securityEventsTotal.inc({ type });
  if (type === 'rejected_input') return;
  logger.warn({
    securityEvent: type,
    requestId: req.requestId,
    ip: req.ip?.replace(/^::ffff:/, ''),
    userId: req.user?.id ?? null,
    method: req.method,
    route: (req.originalUrl ?? '').split('?')[0],
  });
}
