import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { AppError } from '@hce/common';
import { ERROR_HTTP_STATUS, ErrorCode, ErrorDetail } from '@hce/contracts';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { GatewayRequest } from '../security/authenticated-user';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail: string;
  instance: string;
  requestId?: string;
  errors?: readonly ErrorDetail[];
}

const FALLBACK_CODES: Record<number, ErrorCode> = {
  400: ErrorCode.VALIDATION_ERROR,
  401: ErrorCode.UNAUTHENTICATED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  413: ErrorCode.VALIDATION_ERROR,
  415: ErrorCode.VALIDATION_ERROR,
  422: ErrorCode.BUSINESS_RULE,
  429: ErrorCode.RATE_LIMITED,
};

/**
 * Un ÚNICO formato de error para toda la API: RFC 7807 problem+json.
 * Los 5xx nunca exponen stack ni mensajes internos (OWASP A05/A09).
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<GatewayRequest>();
    const problem = this.toProblem(exception, req);

    if (problem.status >= 500) {
      this.logger.error(
        { requestId: req.requestId, code: problem.code, err: exception instanceof Error ? exception.stack : exception },
        'Error de servidor',
      );
    }
    if (problem.status === 429) res.setHeader('Retry-After', '60');
    res.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown, req: GatewayRequest): ProblemDetails {
    const base = { instance: (req.originalUrl ?? req.url ?? '').split('?')[0], requestId: req.requestId };

    if (exception instanceof AppError) {
      const status = ERROR_HTTP_STATUS[exception.code] ?? 500;
      return this.build(status, exception.code, exception.message, base, exception.details);
    }
    if (exception instanceof ThrottlerException) {
      return this.build(429, ErrorCode.RATE_LIMITED, 'Demasiadas solicitudes. Intente nuevamente en un momento.', base);
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const code = FALLBACK_CODES[status] ?? (status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BUSINESS_RULE);
      const detail = status >= 500 ? 'Ocurrió un error interno.' : (extractMessage(response) ?? exception.message);
      const errors =
        isObject(response) && Array.isArray(response.errors) ? (response.errors as ErrorDetail[]) : undefined;
      return this.build(status, code, detail, base, errors);
    }
    return this.build(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR, 'Ocurrió un error interno.', base);
  }

  private build(
    status: number,
    code: ErrorCode,
    detail: string,
    base: { instance: string; requestId?: string },
    errors?: readonly ErrorDetail[],
  ): ProblemDetails {
    return {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      code,
      detail,
      ...base,
      ...(errors?.length ? { errors } : {}),
    };
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function extractMessage(response: unknown): string | undefined {
  if (typeof response === 'string') return response;
  if (isObject(response)) {
    const m = response.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join('; ');
  }
  return undefined;
}
