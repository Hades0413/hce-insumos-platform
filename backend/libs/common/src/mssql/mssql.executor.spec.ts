import { ErrorCode } from '@hce/contracts';
import type * as sql from 'mssql';
import { AppError } from '../errors/app-error';
import { MssqlExecutor } from './mssql.executor';

const sqlError = (number: number, message: string) => Object.assign(new Error(message), { number });

function poolFailing(errors: Error[], result: unknown = { recordset: [] }) {
  const execute = jest.fn().mockImplementation(() => {
    const next = errors.shift();
    return next ? Promise.reject(next) : Promise.resolve(result);
  });
  const pool = { request: () => ({ input: jest.fn(), output: jest.fn(), execute }) } as unknown as sql.ConnectionPool;
  return { pool, execute };
}

describe('MssqlExecutor', () => {
  it('reintenta ante deadlock (1205) y luego tiene éxito', async () => {
    const { pool, execute } = poolFailing([sqlError(1205, 'deadlock')]);
    await new MssqlExecutor(pool).execute('dbo.usp_X');
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('traduce THROW 50004 a DUPLICATE y 50005 a HAS_MOVEMENTS sin reintentar', async () => {
    const { pool, execute } = poolFailing([sqlError(50004, 'dup')]);
    await expect(new MssqlExecutor(pool).execute('dbo.usp_X')).rejects.toMatchObject({ code: ErrorCode.DUPLICATE });
    expect(execute).toHaveBeenCalledTimes(1);

    const second = poolFailing([sqlError(50005, 'mov')]);
    await expect(new MssqlExecutor(second.pool).execute('dbo.usp_X')).rejects.toBeInstanceOf(AppError);
  });

  it('violación de índice único -> DUPLICATE', async () => {
    const { pool } = poolFailing([sqlError(2627, 'Violation of UNIQUE KEY')]);
    await expect(new MssqlExecutor(pool).execute('dbo.usp_X')).rejects.toMatchObject({ code: ErrorCode.DUPLICATE });
  });
});
