import { addCents, applyRateBp, fromCents, multiplyCents, toCents } from './money';

export const IGV_RATE = 0.18;
export const MARGEN_VENTA = 0.35;

const IGV_RATE_BP = Math.round(IGV_RATE * 10_000);
const PRECIO_VENTA_FACTOR_BP = Math.round((1 + MARGEN_VENTA) * 10_000);

export interface LineAmounts {
  subTotal: number;
  igv: number;
  total: number;
}

export function calcularLinea(cantidad: number, precioUnitario: number): LineAmounts {
  if (!Number.isFinite(cantidad) || !Number.isFinite(precioUnitario) || cantidad <= 0 || precioUnitario < 0) {
    return { subTotal: 0, igv: 0, total: 0 };
  }
  const qty = Math.trunc(cantidad);
  const subTotal = multiplyCents(toCents(precioUnitario), qty);
  const igv = applyRateBp(subTotal, IGV_RATE_BP);
  const total = addCents(subTotal, igv);
  return {
    subTotal: fromCents(subTotal),
    igv: fromCents(igv),
    total: fromCents(total),
  };
}

export function calcularTotales(lineas: ReadonlyArray<LineAmounts>): LineAmounts {
  const sub = addCents(...lineas.map((l) => toCents(l.subTotal)));
  const igv = addCents(...lineas.map((l) => toCents(l.igv)));
  return {
    subTotal: fromCents(sub),
    igv: fromCents(igv),
    total: fromCents(addCents(sub, igv)),
  };
}

export function precioVentaDesdeCosto(costo: number): number {
  if (!Number.isFinite(costo) || costo < 0) return 0;
  return fromCents(applyRateBp(toCents(costo), PRECIO_VENTA_FACTOR_BP));
}
