import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MssqlExecutor } from '@hce/common';
import { AUTH_PATTERNS, HealthDto, IssuedTokens, LoginRequest, LogoutRequest, RefreshRequest } from '@hce/contracts';
import { AuthUseCases } from '../../application/auth.use-cases';

/** Adaptador de entrada NATS. Solo accesible por el usuario NATS del gateway (permisos en nats.conf). */
@Controller()
export class AuthNatsController {
  constructor(
    private readonly auth: AuthUseCases,
    private readonly db: MssqlExecutor,
  ) {}

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() data: LoginRequest): Promise<IssuedTokens> {
    return this.auth.login(data);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() data: RefreshRequest): Promise<IssuedTokens> {
    return this.auth.refresh(data);
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  async logout(@Payload() data: LogoutRequest): Promise<{ ok: true }> {
    await this.auth.logout(data);
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
