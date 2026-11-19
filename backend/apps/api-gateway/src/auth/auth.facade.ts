import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_PATTERNS, ClientInfo, HealthDto, IssuedTokens } from '@hce/contracts';
import { rpc } from '../common/rpc/rpc';
import { AUTH_CLIENT } from '../config/gateway.config';

/**
 * FACADE sobre auth-service: los controladores no conocen NATS, subjects,
 * timeouts ni el formato de errores remotos; solo una API simple y tipada.
 */
@Injectable()
export class AuthFacade {
  private readonly timeoutMs: number;

  constructor(
    @Inject(AUTH_CLIENT) private readonly client: ClientProxy,
    config: ConfigService,
  ) {
    this.timeoutMs = config.get<number>('RPC_TIMEOUT_MS', 8000);
  }

  login(email: string, password: string, info: ClientInfo): Promise<IssuedTokens> {
    return rpc(this.client, AUTH_PATTERNS.LOGIN, { email, password, ...info }, this.timeoutMs);
  }

  refresh(refreshToken: string, info: ClientInfo): Promise<IssuedTokens> {
    return rpc(this.client, AUTH_PATTERNS.REFRESH, { refreshToken, ...info }, this.timeoutMs);
  }

  async logout(refreshToken: string): Promise<void> {
    await rpc(this.client, AUTH_PATTERNS.LOGOUT, { refreshToken }, this.timeoutMs);
  }

  health(): Promise<HealthDto> {
    return rpc(this.client, AUTH_PATTERNS.HEALTH, {}, 2_000);
  }
}
