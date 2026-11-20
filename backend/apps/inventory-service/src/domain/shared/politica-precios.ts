import { Money } from './money';

export interface ImportesLinea {
  readonly subTotal: Money;
  readonly igv: Money;
  readonly total: Money;
}

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
