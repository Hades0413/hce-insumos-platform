import { Inject, Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '@hce/contracts';
import * as sql from 'mssql';
import { setTimeout as sleep } from 'node:timers/promises';
import { AppError } from '@hce/core';
import { MSSQL_POOL, SQL_BUSINESS_ERRORS, SQL_TRANSIENT_ERRORS, SQL_UNIQUE_VIOLATION } from './mssql.constants';

export type RequestBinder = (request: sql.Request) => void;

export interface ExecuteOptions {
  readonly maxRetries?: number;
}

@Injectable()
export class MssqlExecutor {
  private readonly logger = new Logger(MssqlExecutor.name);

  constructor(@Inject(MSSQL_POOL) private readonly pool: sql.ConnectionPool) {}

  async execute<T = Record<string, unknown>>(
    procedure: string,
    bind: RequestBinder = () => undefined,
    options: ExecuteOptions = {},
  ): Promise<sql.IProcedureResult<T>> {
    const maxRetries = options.maxRetries ?? 3;
    for (let attempt = 0; ; attempt++) {
      const request = this.pool.request();
      bind(request);
      try {
        return await request.execute<T>(procedure);
      } catch (error: unknown) {
        const number = sqlErrorNumber(error);
        if (number !== undefined && SQL_TRANSIENT_ERRORS.has(number) && attempt < maxRetries) {
          const delay = Math.min(1000, 50 * 2 ** attempt) + Math.floor(Math.random() * 50);
          this.logger.warn(
            { procedure, sqlError: number, attempt: attempt + 1, delay },
            'Error transitorio SQL, reintentando',
          );
          await sleep(delay);
          continue;
        }
        throw translateSqlError(error, procedure, this.logger);
      }
    }
  }

  async ping(): Promise<void> {
    await this.pool.request().query('SELECT 1 AS ok');
  }
}

export function sqlErrorNumber(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const e = error as { number?: unknown; originalError?: { info?: { number?: unknown } } };
  if (typeof e.number === 'number') return e.number;
  const inner = e.originalError?.info?.number;
  return typeof inner === 'number' ? inner : undefined;
}

function translateSqlError(error: unknown, procedure: string, logger: Logger): unknown {
  const number = sqlErrorNumber(error);
  const message = error instanceof Error ? error.message : 'Error SQL';
  switch (number) {
    case SQL_BUSINESS_ERRORS.NOT_FOUND:
      return new AppError(ErrorCode.NOT_FOUND, message);
    case SQL_BUSINESS_ERRORS.CONCURRENCY_CONFLICT:
      return new AppError(ErrorCode.CONCURRENCY_CONFLICT, message);
    case SQL_BUSINESS_ERRORS.DUPLICATE:
      return new AppError(ErrorCode.DUPLICATE, message);
    case SQL_BUSINESS_ERRORS.HAS_MOVEMENTS:
      return new AppError(ErrorCode.HAS_MOVEMENTS, message);
    case SQL_BUSINESS_ERRORS.INVALID_DOCUMENT:
    case SQL_BUSINESS_ERRORS.PRODUCTO_CON_STOCK:
    case SQL_BUSINESS_ERRORS.INMUTABLE:
      return new AppError(ErrorCode.BUSINESS_RULE, message);
    default:
      break;
  }
  if (number !== undefined && SQL_UNIQUE_VIOLATION.has(number)) {
    return new AppError(ErrorCode.DUPLICATE, 'El registro ya existe.');
  }
  logger.error({ procedure, sqlError: number, err: { message } }, 'Error SQL no controlado');
  return error;
}
