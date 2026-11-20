import { ClientProxy } from '@nestjs/microservices';
import { ErrorCode } from '@hce/contracts';
import { NEVER, of, throwError } from 'rxjs';
import { rpc } from './rpc';

const client = (obs: unknown) => ({ send: jest.fn().mockReturnValue(obs) }) as unknown as ClientProxy;

describe('rpc (transporte del Facade)', () => {
  it('devuelve la respuesta', async () => {
    await expect(rpc(client(of({ ok: 1 })), 'p', {}, 100)).resolves.toEqual({ ok: 1 });
  });

  it('propaga el error de negocio remoto con su código', async () => {
    const remote = { code: ErrorCode.STOCK_INSUFICIENTE, message: 'La cantidad no debe ser mayor al stock' };
    await expect(rpc(client(throwError(() => remote)), 'p', {}, 100)).rejects.toMatchObject(remote);
  });

  it('timeout -> UPSTREAM_TIMEOUT; NATS sin respuesta -> UPSTREAM_UNAVAILABLE', async () => {
    await expect(rpc(client(NEVER), 'p', {}, 20)).rejects.toMatchObject({ code: ErrorCode.UPSTREAM_TIMEOUT });
    await expect(rpc(client(throwError(() => new Error('no responders'))), 'p', {}, 100)).rejects.toMatchObject({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
    });
  });
});
