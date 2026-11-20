import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { metricsRegistry } from '@hce/common';
import { INVENTORY_EVENTS, IntegrationEvent } from '@hce/contracts';
import { Counter } from 'prom-client';
import { lastValueFrom } from 'rxjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { EVENTOS_INVENTARIO } from '../../../domain/shared/eventos';
import { MssqlOutboxStore, OutboxRecord } from './outbox.store';

export const INVENTORY_EVENTS_CLIENT = Symbol('INVENTORY_EVENTS_CLIENT');

const SUBJECT_BY_TYPE: Readonly<Record<string, string>> = {
  [EVENTOS_INVENTARIO.COMPRA_REGISTRADA]: INVENTORY_EVENTS.COMPRA_REGISTRADA,
  [EVENTOS_INVENTARIO.VENTA_REGISTRADA]: INVENTORY_EVENTS.VENTA_REGISTRADA,
};

const BATCH = 50;
const LEASE_SECONDS = 30;
const IDLE_MS = 1_000;
const PURGE_EVERY_MS = 3_600_000;

const published = new Counter({
  name: 'hce_outbox_published_total',
  help: 'Eventos de integración publicados desde el outbox',
  labelNames: ['type'] as const,
  registers: [metricsRegistry],
});
const failed = new Counter({
  name: 'hce_outbox_failed_total',
  help: 'Fallos al publicar eventos del outbox (se reintentan con backoff)',
  labelNames: ['type'] as const,
  registers: [metricsRegistry],
});

@Injectable()
export class OutboxRelay implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxRelay.name);
  private running = false;
  private loop?: Promise<void>;
  private lastPurge = 0;

  constructor(
    private readonly store: MssqlOutboxStore,
    @Inject(INVENTORY_EVENTS_CLIENT) private readonly bus: ClientProxy,
  ) {}

  onApplicationBootstrap(): void {
    this.running = true;
    this.loop = this.run();
  }

  async onApplicationShutdown(): Promise<void> {
    this.running = false;
    await this.loop;
    await this.bus.close();
  }

  private async run(): Promise<void> {
    while (this.running) {
      try {
        const procesados = await this.tick();
        await this.purgeIfDue();
        if (procesados < BATCH) await sleep(IDLE_MS);
      } catch (error: unknown) {
        this.logger.error({ err: (error as Error).message }, 'Ciclo del outbox falló; se reintenta');
        await sleep(IDLE_MS * 5);
      }
    }
  }

  async tick(): Promise<number> {
    const lote = await this.store.reclamar(BATCH, LEASE_SECONDS);
    const ok: number[] = [];
    for (const record of lote) {
      if (await this.publish(record)) ok.push(record.id);
    }
    await this.store.marcarPublicados(ok);
    return lote.length;
  }

  private async publish(record: OutboxRecord): Promise<boolean> {
    const subject = SUBJECT_BY_TYPE[record.type];
    if (!subject) {
      await this.store.registrarFallo(record.id, `Tipo de evento sin subject: ${record.type}`);
      return false;
    }
    const event: IntegrationEvent = {
      eventId: record.eventId,
      type: subject,
      occurredAt: record.occurredAt.toISOString(),
      payload: record.payload,
    };
    try {
      await lastValueFrom(this.bus.emit(subject, event), { defaultValue: undefined });
      published.inc({ type: record.type });
      return true;
    } catch (error: unknown) {
      failed.inc({ type: record.type });
      await this.store.registrarFallo(record.id, (error as Error).message ?? 'error de publicación');
      this.logger.warn({ eventId: record.eventId, err: (error as Error).message }, 'No se pudo publicar el evento');
      return false;
    }
  }

  private async purgeIfDue(): Promise<void> {
    if (Date.now() - this.lastPurge < PURGE_EVERY_MS) return;
    this.lastPurge = Date.now();
    const n = await this.store.purgar(7);
    if (n > 0) this.logger.log(`Outbox: ${n} eventos publicados antiguos purgados`);
  }
}
