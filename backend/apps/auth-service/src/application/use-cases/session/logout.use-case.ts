import { LogoutRequest, TraceContext } from '@hce/contracts';
import { UseCase } from '@hce/core';
import { SessionEventsPublisher } from '../../../domain/events/session-events.port';
import { hashRefreshToken, REFRESH_TOKEN_REGEX } from '../../../domain/sesion/refresh-token';
import { SesionRepository } from '../../../domain/sesion/sesion.repository.port';

export class LogoutUseCase implements UseCase<LogoutRequest, void, TraceContext> {
  constructor(
    private readonly sesiones: SesionRepository,
    private readonly events: SessionEventsPublisher,
    private readonly accessTtlSeconds: number,
  ) {}

  async execute(input: LogoutRequest, _ctx?: TraceContext): Promise<void> {
    if (typeof input?.refreshToken !== 'string' || !REFRESH_TOKEN_REGEX.test(input.refreshToken)) return;
    const familiaId = await this.sesiones.revocarPorToken(hashRefreshToken(input.refreshToken));
    if (familiaId) this.events.sessionRevoked(familiaId, this.accessTtlSeconds);
  }
}
