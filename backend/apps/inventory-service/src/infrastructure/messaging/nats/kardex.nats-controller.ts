import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MssqlExecutor } from '@hce/common';
import {
  HealthDto,
  INVENTORY_PATTERNS,
  KardexItemDto,
  KardexMovimientosDto,
  KardexMovimientosRequest,
  MessageEnvelope,
  Paginated,
  SearchQuery,
} from '@hce/contracts';
import { USE_CASES } from '../../../application/ports/tokens';
import { UseCase } from '../../../application/ports/use-case';

@Controller()
export class KardexNatsController {
  constructor(
    @Inject(USE_CASES.LISTAR_KARDEX) private readonly listar: UseCase<SearchQuery, Paginated<KardexItemDto>>,
    @Inject(USE_CASES.LISTAR_MOVIMIENTOS)
    private readonly movimientos: UseCase<KardexMovimientosRequest, KardexMovimientosDto>,
    private readonly db: MssqlExecutor,
  ) {}

  @MessagePattern(INVENTORY_PATTERNS.KARDEX_LISTAR)
  list(@Payload() msg: MessageEnvelope<SearchQuery>): Promise<Paginated<KardexItemDto>> {
    return this.listar.execute(msg.data, msg.ctx);
  }

  @MessagePattern(INVENTORY_PATTERNS.KARDEX_MOVIMIENTOS)
  movements(@Payload() msg: MessageEnvelope<KardexMovimientosRequest>): Promise<KardexMovimientosDto> {
    return this.movimientos.execute(msg.data, msg.ctx);
  }

  @MessagePattern(INVENTORY_PATTERNS.HEALTH)
  async health(): Promise<HealthDto> {
    try {
      await this.db.ping();
      return { status: 'up', database: 'up' };
    } catch {
      return { status: 'down', database: 'down' };
    }
  }
}
