import { Module } from '@nestjs/common';
import { ComprasController } from './compras.controller';
import { InventarioFacade } from './inventario.facade';
import { KardexController } from './kardex.controller';
import { ProductosController } from './productos.controller';
import { VentasController } from './ventas.controller';

@Module({
  controllers: [ProductosController, ComprasController, VentasController, KardexController],
  providers: [InventarioFacade],
  exports: [InventarioFacade],
})
export class InventarioModule {}
