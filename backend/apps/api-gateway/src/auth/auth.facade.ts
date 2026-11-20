import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import {
  AnonymousEnvelope,
  AUTH_PATTERNS,
  ClientInfo,
  HealthDto,
  IssuedTokens,
  MessageEnvelope,
  RequestContext,
  TraceContext,
} from '@hce/contracts';
import { rpc } from '../common/rpc/rpc';
import { AUTH_CLIENT } from '../config/gateway.config';

@Injectable()
export class AuthFacade {
  private readonly timeoutMs: number;

  constructor(
    @Inject(AUTH_CLIENT) private readonly client: ClientProxy,
    config: ConfigService,
  ) {
    this.timeoutMs = config.get<number>('RPC_TIMEOUT_MS', 8000);
  }

  login(email: string, password: string, info: ClientInfo, trace: TraceContext): Promise<IssuedTokens> {
    return this.anonymous(AUTH_PATTERNS.LOGIN, { email, password, ...info }, trace);
  }

  refresh(refreshToken: string, info: ClientInfo, trace: TraceContext): Promise<IssuedTokens> {
    return this.anonymous(AUTH_PATTERNS.REFRESH, { refreshToken, ...info }, trace);
  }

  async logout(refreshToken: string, trace: TraceContext): Promise<void> {
    await this.anonymous(AUTH_PATTERNS.LOGOUT, { refreshToken }, trace);
  }

  private anonymous<T>(pattern: string, data: unknown, trace: TraceContext): Promise<T> {
    const envelope: AnonymousEnvelope<unknown> = { ctx: { requestId: trace.requestId }, data };
    return rpc<T>(this.client, pattern, envelope, this.timeoutMs);
  }

  admin<T>(
    operation: Extract<keyof typeof AUTH_PATTERNS, `ADMIN_${string}`>,
    data: unknown,
    ctx: RequestContext,
  ): Promise<T> {
    const envelope: MessageEnvelope<unknown> = { ctx, data };
    return rpc<T>(this.client, AUTH_PATTERNS[operation], envelope, this.timeoutMs);
  }

  health(): Promise<HealthDto> {
    return rpc(this.client, AUTH_PATTERNS.HEALTH, {}, 2_000);
  }
}
