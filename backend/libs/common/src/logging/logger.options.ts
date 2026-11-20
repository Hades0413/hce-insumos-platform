import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';

export interface HttpLoggingOptions {
  readonly ignoreUrlsContaining?: readonly string[];
}

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
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const r = req as IncomingMessage & { requestId?: string };
        r.requestId ??= randomUUID();
        res.setHeader('X-Request-Id', r.requestId);
        return r.requestId;
      },
      customProps: (req: IncomingMessage) => {
        const client = req.headers['x-request-id'];
        return typeof client === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(client) ? { clientRequestId: client } : {};
      },
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
