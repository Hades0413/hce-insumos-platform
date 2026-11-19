import { DynamicModule, Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import * as sql from 'mssql';
import { setTimeout as sleep } from 'node:timers/promises';
import { MSSQL_OPTIONS, MSSQL_POOL } from './mssql.constants';
import { MssqlExecutor } from './mssql.executor';
import { MssqlModuleOptions } from './mssql.options';

interface AsyncOptions {
  imports?: DynamicModule['imports'];
  inject?: (string | symbol | (abstract new (...args: never[]) => unknown))[];
  useFactory: (...args: never[]) => MssqlModuleOptions | Promise<MssqlModuleOptions>;
}

async function connectWithRetry(options: MssqlModuleOptions, logger: Logger): Promise<sql.ConnectionPool> {
  const config: sql.config = {
    server: options.server,
    port: options.port,
    database: options.database,
    user: options.user,
    password: options.password,
    requestTimeout: options.requestTimeoutMs,
    connectionTimeout: 15_000,
    pool: { max: options.poolMax, min: options.poolMin, idleTimeoutMillis: 30_000 },
    options: {
      encrypt: options.encrypt,
      trustServerCertificate: options.trustServerCertificate,
      appName: options.appName,
      enableArithAbort: true,
    },
  };
  const maxAttempts = 30;
  for (let attempt = 1; ; attempt++) {
    try {
      const pool = await new sql.ConnectionPool(config).connect();
      pool.on('error', (err: Error) => logger.error({ err: { message: err.message } }, 'Error en pool SQL'));
      logger.log(`Pool SQL Server conectado (${options.database}, max=${options.poolMax})`);
      return pool;
    } catch (error: unknown) {
      if (attempt >= maxAttempts) throw error;
      logger.warn(`SQL Server no disponible (intento ${attempt}/${maxAttempts}): ${(error as Error).message}`);
      await sleep(Math.min(5_000, 500 * attempt));
    }
  }
}

@Global()
@Module({})
export class MssqlModule implements OnApplicationShutdown {
  private static readonly logger = new Logger('MssqlModule');

  constructor(@Inject(MSSQL_POOL) private readonly pool: sql.ConnectionPool) {}

  static forRootAsync(options: AsyncOptions): DynamicModule {
    return {
      module: MssqlModule,
      imports: options.imports ?? [],
      providers: [
        { provide: MSSQL_OPTIONS, useFactory: options.useFactory, inject: options.inject ?? [] },
        {
          provide: MSSQL_POOL,
          inject: [MSSQL_OPTIONS],
          useFactory: (opts: MssqlModuleOptions) => connectWithRetry(opts, MssqlModule.logger),
        },
        MssqlExecutor,
      ],
      exports: [MssqlExecutor, MSSQL_POOL],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.close();
    MssqlModule.logger.log('Pool SQL Server cerrado');
  }
}
