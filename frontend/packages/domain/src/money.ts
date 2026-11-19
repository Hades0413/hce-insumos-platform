/**
 * Aritmética monetaria en CÉNTIMOS ENTEROS.
 *
 * `0.1 + 0.2 !== 0.3` en IEEE-754: sumar montos como `number` decimal acumula
 * errores visibles en un comprobante. Todo cálculo pasa por enteros (céntimos)
 * y solo se convierte a soles al presentar o al serializar hacia la API.
 * Redondeo: half-up (equivalente a `ROUND(x, 2)` de SQL Server para positivos).
 */

export type Cents = number & { readonly __brand: 'Cents' };

const asCents = (value: number): Cents => value as Cents;

/** Convierte soles (number con hasta N decimales) a céntimos sin error binario. */
export function toCents(amount: number): Cents {
  if (!Number.isFinite(amount)) throw new RangeError(`Monto inválido: ${amount}`);
  const negative = amount < 0;
  // toFixed(6) elimina el ruido binario (1.005 -> "1.005000") antes de redondear.
  const [intPart = '0', fracPart = ''] = Math.abs(amount).toFixed(6).split('.');
  const frac = fracPart.padEnd(6, '0');
  const base = Number(intPart) * 100 + Number(frac.slice(0, 2));
  const roundUp = Number(frac.slice(2, 3)) >= 5 ? 1 : 0;
  const cents = base + roundUp;
  return asCents(negative ? -cents : cents);
}

export const fromCents = (cents: Cents): number => cents / 100;

export const addCents = (...values: Cents[]): Cents =>
  asCents(values.reduce<number>((acc, v) => acc + v, 0));

/** cantidad (entera) × precio unitario. */
export function multiplyCents(cents: Cents, quantity: number): Cents {
  if (!Number.isInteger(quantity)) throw new RangeError('La cantidad debe ser entera');
  return asCents(cents * quantity);
}

/** Aplica una tasa expresada en puntos básicos (1800 = 18%) con redondeo half-up. */
export function applyRateBp(cents: Cents, basisPoints: number): Cents {
  const raw = (cents * basisPoints) / 10_000;
  return asCents(Math.sign(raw) * Math.round(Math.abs(raw)));
}

const PEN = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea soles para la UI: `S/ 1,234.50`. */
export const formatPEN = (amount: number): string => PEN.format(amount);
