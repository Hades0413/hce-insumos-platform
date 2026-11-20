import { ClientProxy } from '@nestjs/microservices';
import { INVENTORY_EVENTS } from '@hce/contracts';
import { of, throwError } from 'rxjs';
import { OutboxRelay } from './outbox-relay';
import { MssqlOutboxStore, OutboxRecord } from './outbox.store';

const record = (id: number, type = 'VentaRegistrada'): OutboxRecord => ({
  id,
  eventId: `e-${id}`,
  type,
  aggregateId: id,
  payload: { documentoId: id },
  occurredAt: new Date('2026-11-19T06:00:00Z'),
  requestId: 'r',
});

function setup(emit: jest.Mock) {
  const store = {
    reclamar: jest.fn(),
    marcarPublicados: jest.fn(),
    registrarFallo: jest.fn(),
    purgar: jest.fn(),
  } as unknown as jest.Mocked<MssqlOutboxStore>;
  const bus = { emit, close: jest.fn() } as unknown as ClientProxy;
  return { store, relay: new OutboxRelay(store, bus) };
}

describe('OutboxRelay (Transactional Outbox)', () => {
  it('publica en el subject versionado y confirma solo lo publicado', async () => {
    const emit = jest.fn().mockReturnValue(of(undefined));
    const { store, relay } = setup(emit);
    store.reclamar.mockResolvedValue([record(1), record(2, 'CompraRegistrada')]);
    await expect(relay.tick()).resolves.toBe(2);
    expect(emit).toHaveBeenCalledWith(INVENTORY_EVENTS.VENTA_REGISTRADA, expect.objectContaining({ eventId: 'e-1' }));
    expect(emit).toHaveBeenCalledWith(INVENTORY_EVENTS.COMPRA_REGISTRADA, expect.objectContaining({ eventId: 'e-2' }));
    expect(store.marcarPublicados).toHaveBeenCalledWith([1, 2]);
  });

  it('si el bus falla registra el fallo (reintento con backoff) y no lo confirma', async () => {
    const emit = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('NATS caído')))
      .mockReturnValue(of(undefined));
    const { store, relay } = setup(emit);
    store.reclamar.mockResolvedValue([record(1), record(2)]);
    await relay.tick();
    expect(store.registrarFallo).toHaveBeenCalledWith(1, 'NATS caído');
    expect(store.marcarPublicados).toHaveBeenCalledWith([2]);
  });
});
