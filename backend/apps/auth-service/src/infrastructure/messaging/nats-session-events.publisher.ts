import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_EVENTS, PermissionsChangedEvent, SessionRevokedEvent } from '@hce/contracts';
import { SessionEventsPublisher } from '../../domain/events/session-events.port';

export const AUTH_EVENTS_CLIENT = Symbol('AUTH_EVENTS_CLIENT');

@Injectable()
export class NatsSessionEventsPublisher implements SessionEventsPublisher, OnApplicationShutdown {
  private readonly logger = new Logger(NatsSessionEventsPublisher.name);

  constructor(@Inject(AUTH_EVENTS_CLIENT) private readonly client: ClientProxy) {}

  sessionRevoked(sid: string, ttlSeconds: number): void {
    const event: SessionRevokedEvent = { sid, ttlSeconds };
    this.client.emit(AUTH_EVENTS.SESSION_REVOKED, event).subscribe({
      error: (err: Error) =>
        this.logger.error({ sid, err: err.message }, 'No se pudo publicar la revocación de sesión'),
    });
  }

  permissionsChanged(userId: string): void {
    const event: PermissionsChangedEvent = { userId, changedAt: Math.floor(Date.now() / 1000) };
    this.client.emit(AUTH_EVENTS.PERMISSIONS_CHANGED, event).subscribe({
      error: (err: Error) =>
        this.logger.error({ userId, err: err.message }, 'No se pudo publicar el cambio de permisos'),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}
