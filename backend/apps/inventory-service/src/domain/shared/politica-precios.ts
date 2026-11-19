import { Money } from './money';

export interface ImportesLinea {
  readonly subTotal: Money;
  readonly igv: Money;
  readonly total: Money;
}

/**
 * Servicio de dominio con las reglas de precios del enunciado:
 *  - Precio de venta = costo × (1 + margen)  -> margen 35% => costo × 1.35
 *  - Subtotal = cantidad × precio
 *  - IGV = subtotal × 18%   (el PDF escribe "cantidad*precio*1.18"; eso sería el
 *    total con IGV, no el impuesto. Se interpreta IGV = 18% del subtotal para que
 *    Total = Subtotal + IGV sea correcto. Ver docs/ARQUITECTURA.md.)
 *  - Total = subtotal + IGV
 * Tasas en puntos básicos y configurables por entorno (IGV_RATE, MARGEN_VENTA).
 */
export class PoliticaPrecios {
  constructor(
    readonly igvBasisPoints: number,
    readonly margenVentaBasisPoints: number,
  ) {
    if (!Number.isInteger(igvBasisPoints) || igvBasisPoints < 0 || igvBasisPoints > 10_000) {
      throw new Error('IGV fuera de rango');
    }
    if (!Number.isInteger(margenVentaBasisPoints) || margenVentaBasisPoints < 0 || margenVentaBasisPoints > 100_000) {
      throw new Error('Margen fuera de rango');
    }
  }

  static fromRates(igvRate: number, margenVenta: number): PoliticaPrecios {
    return new PoliticaPrecios(Math.round(igvRate * 10_000), Math.round(margenVenta * 10_000));
  }

  precioVentaDesdeCosto(costo: Money): Money {
    return costo.applyRate(10_000 + this.margenVentaBasisPoints);
  }

  calcularLinea(cantidad: number, precioUnitario: Money): ImportesLinea {
    const subTotal = precioUnitario.times(cantidad);
    const igv = subTotal.applyRate(this.igvBasisPoints);
    return { subTotal, igv, total: subTotal.add(igv) };
  }
}
