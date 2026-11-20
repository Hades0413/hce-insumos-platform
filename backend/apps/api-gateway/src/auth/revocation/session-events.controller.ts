import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AUTH_EVENTS, PermissionsChangedEvent, SessionRevokedEvent } from '@hce/contracts';
import { PermissionsChangedStore } from './permissions-changed.store';
import { RevokedSessionsStore } from './revoked-sessions.store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
export class SessionEventsController {
  private readonly logger = new Logger(SessionEventsController.name);

  constructor(
    private readonly store: RevokedSessionsStore,
    private readonly permissions: PermissionsChangedStore,
  ) {}

  @EventPattern(AUTH_EVENTS.SESSION_REVOKED)
  onSessionRevoked(@Payload() event: SessionRevokedEvent): void {
    const ttl = Number(event?.ttlSeconds);
    if (typeof event?.sid !== 'string' || !UUID.test(event.sid) || !Number.isFinite(ttl) || ttl <= 0 || ttl > 86_400) {
      this.logger.warn('Evento de revocación inválido descartado');
      return;
    }
    this.store.revoke(event.sid.toLowerCase(), ttl);
  }

  @EventPattern(AUTH_EVENTS.PERMISSIONS_CHANGED)
  onPermissionsChanged(@Payload() event: PermissionsChangedEvent): void {
    const at = Number(event?.changedAt);
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof event?.userId !== 'string' ||
      !UUID.test(event.userId) ||
      !Number.isInteger(at) ||
      Math.abs(at - now) > 300
    ) {
      this.logger.warn('Evento de cambio de permisos inválido descartado');
      return;
    }
    this.permissions.markChanged(event.userId.toLowerCase(), at);
  }
}
