import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompraDetalleDto, DocumentoResumenDto, Paginated, RequestContext } from '@hce/contracts';
import { ApiProblemResponses } from '../common/decorators/api-problem.decorator';
import { ReqContext } from '../common/decorators/current-user.decorator';
import { IdempotencyKey, Idempotent } from '../common/decorators/idempotent.decorator';
import { Auth } from '../common/decorators/roles.decorator';
import { RangoFechasQueryDto } from '../common/dto/pagination.dto';
import { IdParamPipe } from '../common/pipes';
import { DocumentoDetalleResponse, DocumentoResumenResponse, RegistrarCompraDto } from './dto/documento.dto';
import { InventarioFacade } from './inventario.facade';

@ApiTags('Compras')
@Controller('compras')
export class ComprasController {
  constructor(private readonly inventario: InventarioFacade) {}

  @Post()
  @Auth('ALMACENERO')
  @Idempotent()
  @ApiOperation({
    summary: 'Registrar Compra',
    description:
      'CompraCab + CompraDet, actualiza costo y precio venta (costo × 1.35) y registra movimiento de ENTRADA.',
  })
  @ApiCreatedResponse({ type: DocumentoDetalleResponse })
  @ApiProblemResponses(400, 404, 422)
  registrar(
    @Body() dto: RegistrarCompraDto,
    @IdempotencyKey() idempotencyKey: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<CompraDetalleDto> {
    return this.inventario.registrarCompra({ idempotencyKey, items: dto.items }, ctx);
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Listar Compra' })
  @ApiOkResponse({ type: [DocumentoResumenResponse] })
  listar(
    @Query() query: RangoFechasQueryDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<Paginated<DocumentoResumenDto>> {
    return this.inventario.listarCompras(query, ctx);
  }

  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Detalle de compra' })
  @ApiOkResponse({ type: DocumentoDetalleResponse })
  @ApiProblemResponses(404)
  obtener(@Param('id', IdParamPipe) id: number, @ReqContext() ctx: RequestContext): Promise<CompraDetalleDto> {
    return this.inventario.obtenerCompra(id, ctx);
  }
}
