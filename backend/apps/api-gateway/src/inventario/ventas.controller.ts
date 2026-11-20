import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiParam, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentoResumenDto, Paginated, RequestContext, VentaDetalleDto } from '@hce/contracts';
import { ApiProblemResponses } from '../common/decorators/api-problem.decorator';
import { ReqContext } from '../common/decorators/current-user.decorator';
import { IdempotencyKey, Idempotent } from '../common/decorators/idempotent.decorator';
import { Auth } from '../common/decorators/roles.decorator';
import { RangoFechasQueryDto } from '../common/dto/pagination.dto';
import { IdParamPipe } from '../common/pipes';
import { DocumentoDetalleResponse, DocumentoResumenResponse, RegistrarVentaDto } from './dto/documento.dto';
import { InventarioFacade } from './inventario.facade';

@ApiTags('Ventas')
@Controller('ventas')
export class VentasController {
  constructor(private readonly inventario: InventarioFacade) {}

  @Post()
  @Auth('ventas.registrar')
  @Idempotent()
  @ApiOperation({
    summary: 'Registrar Venta',
    description:
      'Valida stock (según movimientos) bajo lock, Subtotal = cantidad × precio venta, IGV = 18% del subtotal, Total = Subtotal + IGV; registra movimiento de SALIDA.',
  })
  @ApiCreatedResponse({ type: DocumentoDetalleResponse })
  @ApiProblemResponses(400, 404, 409, 422)
  registrar(
    @Body() dto: RegistrarVentaDto,
    @IdempotencyKey() idempotencyKey: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<VentaDetalleDto> {
    return this.inventario.registrarVenta({ idempotencyKey, items: dto.items }, ctx);
  }

  @Get()
  @Auth('ventas.ver')
  @ApiOperation({ summary: 'Listar Venta' })
  @ApiOkResponse({ type: [DocumentoResumenResponse] })
  listar(
    @Query() query: RangoFechasQueryDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<Paginated<DocumentoResumenDto>> {
    return this.inventario.listarVentas(query, ctx);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 1 })
  @Auth('ventas.ver')
  @ApiOperation({ summary: 'Detalle de venta' })
  @ApiOkResponse({ type: DocumentoDetalleResponse })
  @ApiProblemResponses(404)
  obtener(@Param('id', IdParamPipe) id: number, @ReqContext() ctx: RequestContext): Promise<VentaDetalleDto> {
    return this.inventario.obtenerVenta(id, ctx);
  }
}
