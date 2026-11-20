import { AuditContext, Pagina, Paginacion } from '../shared/audit-context';
import { DatosProducto, Producto } from './producto';

export const PRODUCTO_REPOSITORY = Symbol('PRODUCTO_REPOSITORY');

export interface ProductoRepository {
  crear(datos: DatosProducto, ctx: AuditContext): Promise<Producto>;
  actualizar(id: number, datos: DatosProducto, rowVersion: string, ctx: AuditContext): Promise<Producto>;
  eliminar(id: number, ctx: AuditContext): Promise<void>;
  obtenerPorId(id: number): Promise<Producto | null>;
  obtenerPorIds(ids: readonly number[]): Promise<Producto[]>;
  listar(search: string | undefined, paginacion: Paginacion): Promise<Pagina<Producto>>;
}
