import { AppError } from '@hce/common/errors/app-error';
import { Money } from '../shared/money';
import { PoliticaPrecios } from '../shared/politica-precios';

const NOMBRE_MIN = 2;
const NOMBRE_MAX = 150;
const LOTE_MAX = 50;
const LOTE_REGEX = /^[A-Za-z0-9][A-Za-z0-9\-_/.]*$/;

export interface ProductoProps {
  readonly id: number;
  readonly nombre: string;
  readonly nroLote: string;
  readonly fecRegistro: Date;
  readonly costo: Money;
  readonly precioVenta: Money;
  readonly stock: number;
  readonly rowVersion: string;
}

/** Datos validados para crear/actualizar un producto (aún sin identidad persistida). */
export interface DatosProducto {
  readonly nombre: string;
  readonly nroLote: string;
  readonly costo: Money;
  readonly precioVenta: Money;
}

/** Entidad Producto (medicamento/insumo identificado por nombre + lote). */
export class Producto {
  private constructor(private readonly props: ProductoProps) {}

  static rehidratar(props: ProductoProps): Producto {
    return new Producto(props);
  }

  /**
   * Normaliza y valida datos de producto. Si no se informa precio de venta se
   * deriva del costo con la política de precios (costo × 1.35).
   */
  static preparar(
    input: { nombre: unknown; nroLote: unknown; costo?: unknown; precioVenta?: unknown },
    politica: PoliticaPrecios,
  ): DatosProducto {
    const nombre = typeof input.nombre === 'string' ? input.nombre.trim().replace(/\s+/g, ' ') : '';
    if (nombre.length < NOMBRE_MIN || nombre.length > NOMBRE_MAX) {
      throw AppError.validation(`El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`, [
        { field: 'nombre', message: 'Longitud inválida' },
      ]);
    }
    const nroLote = typeof input.nroLote === 'string' ? input.nroLote.trim().toUpperCase() : '';
    if (nroLote.length < 1 || nroLote.length > LOTE_MAX || !LOTE_REGEX.test(nroLote)) {
      throw AppError.validation('Número de lote inválido (letras, números y - _ / .).', [
        { field: 'nroLote', message: 'Formato inválido' },
      ]);
    }
    const costo = Money.fromDecimal(input.costo === undefined ? 0 : (input.costo as number), 'costo');
    const precioVenta =
      input.precioVenta === undefined || input.precioVenta === null
        ? politica.precioVentaDesdeCosto(costo)
        : Money.fromDecimal(input.precioVenta as number, 'precioVenta');
    return { nombre, nroLote, costo, precioVenta };
  }

  get id(): number {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get nroLote(): string {
    return this.props.nroLote;
  }
  get fecRegistro(): Date {
    return this.props.fecRegistro;
  }
  get costo(): Money {
    return this.props.costo;
  }
  get precioVenta(): Money {
    return this.props.precioVenta;
  }
  get stock(): number {
    return this.props.stock;
  }
  get rowVersion(): string {
    return this.props.rowVersion;
  }

  tieneStockPara(cantidad: number): boolean {
    return this.props.stock >= cantidad;
  }
}
