import type { IncomingMessage } from 'node:http';
import type { Params } from 'nestjs-pino';

export interface HttpLoggingOptions {
  /** Subcadenas de URL que no se registran (p. ej. health checks). */
  readonly ignoreUrlsContaining?: readonly string[];
}

/**
 * Logs estructurados JSON (pino). Nunca se registran secretos: cookies,
 * Authorization, CSRF y contraseñas se redactan (OWASP A09).
 * El request-id (correlation id) se reutiliza como id del log HTTP.
 */
export function buildLoggerParams(
  service: string,
  level: string,
  pretty: boolean,
  http: HttpLoggingOptions = {},
): Params {
  const ignore = http.ignoreUrlsContaining ?? [];
  return {
    pinoHttp: {
      level,
      base: { service },
      messageKey: 'msg',
      genReqId: (req: IncomingMessage) => (req as IncomingMessage & { requestId?: string }).requestId ?? 'n/a',
      autoLogging: { ignore: (req: IncomingMessage) => ignore.some((p) => req.url?.includes(p) ?? false) },
      redact: {
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'req.headers["x-csrf-token"]',
          'res.headers["set-cookie"]',
          '*.password',
          '*.refreshToken',
          '*.accessToken',
        ],
        censor: '[REDACTED]',
      },
      transport: pretty
        ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l' } }
        : undefined,
    },
  };
}
