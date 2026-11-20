import { ProductoDto } from '@hce/contracts';
import { Producto } from '../domain/producto/producto';

export function toProductoDto(p: Producto): ProductoDto {
  return {
    id: p.id,
    nombre: p.nombre,
    nroLote: p.nroLote,
    fecRegistro: p.fecRegistro.toISOString(),
    costo: p.costo.toDecimal(),
    precioVenta: p.precioVenta.toDecimal(),
    stock: p.stock,
    rowVersion: p.rowVersion,
  };
}
