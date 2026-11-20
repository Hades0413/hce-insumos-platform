import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MssqlExecutor } from '@hce/common';
import {
  AnonymousEnvelope,
  AUTH_PATTERNS,
  HealthDto,
  IssuedTokens,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  TraceContext,
} from '@hce/contracts';
import { UseCase } from '@hce/core';
import { USE_CASES } from '../../application/ports/tokens';

@Controller()
export class AuthNatsController {
  constructor(
    @Inject(USE_CASES.LOGIN) private readonly login: UseCase<LoginRequest, IssuedTokens, TraceContext>,
    @Inject(USE_CASES.REFRESH_SESSION) private readonly refresh: UseCase<RefreshRequest, IssuedTokens, TraceContext>,
    @Inject(USE_CASES.LOGOUT) private readonly logout: UseCase<LogoutRequest, void, TraceContext>,
    private readonly db: MssqlExecutor,
  ) {}

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  onLogin(@Payload() msg: AnonymousEnvelope<LoginRequest>): Promise<IssuedTokens> {
    return this.login.execute(msg?.data, ctxOf(msg));
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  onRefresh(@Payload() msg: AnonymousEnvelope<RefreshRequest>): Promise<IssuedTokens> {
    return this.refresh.execute(msg?.data, ctxOf(msg));
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  async onLogout(@Payload() msg: AnonymousEnvelope<LogoutRequest>): Promise<{ ok: true }> {
    await this.logout.execute(msg?.data, ctxOf(msg));
    return { ok: true };
  }

  @MessagePattern(AUTH_PATTERNS.HEALTH)
  async health(): Promise<HealthDto> {
    try {
      await this.db.ping();
      return { status: 'up', database: 'up' };
    } catch {
      return { status: 'down', database: 'down' };
    }
  }
}

function ctxOf(msg: AnonymousEnvelope<unknown> | undefined): TraceContext {
  const requestId = msg?.ctx?.requestId;
  return { requestId: typeof requestId === 'string' ? requestId.slice(0, 64) : 'n/a' };
}
