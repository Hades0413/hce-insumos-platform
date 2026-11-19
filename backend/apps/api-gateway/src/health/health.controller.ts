import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthDto } from '@hce/contracts';
import { AuthFacade } from '../auth/auth.facade';
import { Public } from '../common/decorators/public.decorator';
import { InventarioFacade } from '../inventario/inventario.facade';

@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly auth: AuthFacade,
    private readonly inventario: InventarioFacade,
  ) {}

  /** Liveness: el proceso responde (sin dependencias => no reinicia en cascada). */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: NATS + microservicios + sus bases de datos. */
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness: auth-service, inventory-service y sus BD' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.ping('auth-service', () => this.auth.health()),
      () => this.ping('inventory-service', () => this.inventario.health()),
    ]);
  }

  private async ping(key: string, call: () => Promise<HealthDto>): Promise<HealthIndicatorResult> {
    const session = this.indicator.check(key);
    try {
      const result = await call();
      return result.status === 'up'
        ? session.up({ database: result.database })
        : session.down({ database: result.database });
    } catch {
      return session.down({ reason: 'sin respuesta' });
    }
  }
}
