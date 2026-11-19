import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Paginated, ProductoDto, RequestContext } from '@hce/contracts';
import { ApiProblemResponses } from '../common/decorators/api-problem.decorator';
import { ReqContext } from '../common/decorators/current-user.decorator';
import { Auth } from '../common/decorators/roles.decorator';
import { SearchQueryDto } from '../common/dto/pagination.dto';
import { IdParamPipe } from '../common/pipes';
import { ActualizarProductoDto, CrearProductoDto, ProductoResponse } from './dto/producto.dto';
import { InventarioFacade } from './inventario.facade';

@ApiTags('Productos')
@Controller('productos')
export class ProductosController {
  constructor(private readonly inventario: InventarioFacade) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Listar Producto (con stock según movimientos)' })
  @ApiOkResponse({ type: [ProductoResponse] })
  listar(@Query() query: SearchQueryDto, @ReqContext() ctx: RequestContext): Promise<Paginated<ProductoDto>> {
    return this.inventario.listarProductos(query, ctx);
  }

  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Obtener producto' })
  @ApiOkResponse({ type: ProductoResponse })
  @ApiProblemResponses(404)
  obtener(@Param('id', IdParamPipe) id: number, @ReqContext() ctx: RequestContext): Promise<ProductoDto> {
    return this.inventario.obtenerProducto(id, ctx);
  }

  @Post()
  @Auth('ALMACENERO')
  @ApiOperation({ summary: 'Registrar Producto' })
  @ApiCreatedResponse({ type: ProductoResponse })
  @ApiProblemResponses(400, 409)
  registrar(@Body() dto: CrearProductoDto, @ReqContext() ctx: RequestContext): Promise<ProductoDto> {
    return this.inventario.registrarProducto(dto, ctx);
  }

  @Put(':id')
  @Auth('ALMACENERO')
  @ApiOperation({ summary: 'Actualizar Producto (concurrencia optimista con rowVersion)' })
  @ApiOkResponse({ type: ProductoResponse })
  @ApiProblemResponses(400, 404, 409)
  actualizar(
    @Param('id', IdParamPipe) id: number,
    @Body() dto: ActualizarProductoDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ProductoDto> {
    return this.inventario.actualizarProducto({ ...dto, id }, ctx);
  }

  @Delete(':id')
  @Auth('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar producto (solo si no tiene movimientos)' })
  @ApiNoContentResponse()
  @ApiProblemResponses(404, 409)
  eliminar(@Param('id', IdParamPipe) id: number, @ReqContext() ctx: RequestContext): Promise<void> {
    return this.inventario.eliminarProducto(id, ctx);
  }
}
