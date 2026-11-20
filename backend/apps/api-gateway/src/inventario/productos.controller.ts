import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiParam,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppError } from '@hce/core';
import { ErrorCode, Paginated, ProductoDto, RequestContext, tienePermiso } from '@hce/contracts';
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
  @Auth('productos.ver')
  @ApiOperation({ summary: 'Listar Producto (con stock según movimientos)' })
  @ApiOkResponse({ type: [ProductoResponse] })
  listar(@Query() query: SearchQueryDto, @ReqContext() ctx: RequestContext): Promise<Paginated<ProductoDto>> {
    return this.inventario.listarProductos(query, ctx);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 1 })
  @Auth('productos.ver')
  @ApiOperation({ summary: 'Obtener producto' })
  @ApiOkResponse({ type: ProductoResponse })
  @ApiProblemResponses(404)
  obtener(@Param('id', IdParamPipe) id: number, @ReqContext() ctx: RequestContext): Promise<ProductoDto> {
    return this.inventario.obtenerProducto(id, ctx);
  }

  @Post()
  @Auth('productos.registrar')
  @ApiOperation({ summary: 'Registrar Producto' })
  @ApiCreatedResponse({ type: ProductoResponse })
  @ApiProblemResponses(400, 409)
  registrar(@Body() dto: CrearProductoDto, @ReqContext() ctx: RequestContext): Promise<ProductoDto> {
    return this.inventario.registrarProducto(dto, ctx);
  }

  @Put(':id')
  @ApiParam({ name: 'id', example: 1 })
  @Auth('productos.editar')
  @ApiOperation({
    summary: 'Actualizar Producto (concurrencia optimista con rowVersion)',
    description:
      'Nombre y lote quedan congelados si el producto tiene movimientos. precioVenta manual: permiso productos.precio_manual y ≥ costo.',
  })
  @ApiOkResponse({ type: ProductoResponse })
  @ApiProblemResponses(400, 404, 409)
  actualizar(
    @Param('id', IdParamPipe) id: number,
    @Body() dto: ActualizarProductoDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ProductoDto> {
    if (dto.precioVenta !== undefined && !tienePermiso(ctx.permisos, 'productos.precio_manual')) {
      throw new AppError(ErrorCode.FORBIDDEN, 'No tiene permiso para fijar manualmente el precio de venta.');
    }
    return this.inventario.actualizarProducto({ ...dto, id }, ctx);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', example: 1 })
  @Auth('productos.eliminar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar producto (eliminación lógica)',
    description:
      'Marca el producto como inactivo con fecha y usuario; sus compras, ventas y movimientos se conservan. ' +
      'Deja de aparecer en el catálogo, el kardex y los documentos nuevos. No se permite si aún tiene stock (422).',
  })
  @ApiNoContentResponse()
  @ApiProblemResponses(404, 422)
  eliminar(@Param('id', IdParamPipe) id: number, @ReqContext() ctx: RequestContext): Promise<void> {
    return this.inventario.eliminarProducto(id, ctx);
  }
}
