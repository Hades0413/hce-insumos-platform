import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KardexItemDto, KardexMovimientosDto, Paginated, RequestContext } from '@hce/contracts';
import { ApiProblemResponses } from '../common/decorators/api-problem.decorator';
import { ReqContext } from '../common/decorators/current-user.decorator';
import { Auth } from '../common/decorators/roles.decorator';
import { PageQueryDto, SearchQueryDto } from '../common/dto/pagination.dto';
import { IdParamPipe } from '../common/pipes';
import { InventarioFacade } from './inventario.facade';

@ApiTags('Kardex')
@Controller('kardex')
export class KardexController {
  constructor(private readonly inventario: InventarioFacade) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Listar Kardex (Id_producto, nombre, stock actual, costo, precio venta)' })
  @ApiOkResponse({ description: 'Paginated<KardexItemDto>' })
  listar(@Query() query: SearchQueryDto, @ReqContext() ctx: RequestContext): Promise<Paginated<KardexItemDto>> {
    return this.inventario.listarKardex(query, ctx);
  }

  @Get(':productoId/movimientos')
  @Auth()
  @ApiOperation({ summary: 'Movimientos de un producto (fecha, tipo, cantidad, saldo)' })
  @ApiOkResponse({ description: 'KardexMovimientosDto' })
  @ApiProblemResponses(404)
  movimientos(
    @Param('productoId', IdParamPipe) productoId: number,
    @Query() query: PageQueryDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<KardexMovimientosDto> {
    return this.inventario.movimientosProducto(productoId, query, ctx);
  }
}
