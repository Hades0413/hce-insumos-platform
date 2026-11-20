import { AppError } from '@hce/core';

const MAX_CENTS = 100_000_000_000;

export class Money {
  private constructor(readonly cents: number) {}

  static readonly ZERO = new Money(0);

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) {
      throw AppError.validation(`Importe fuera de rango: ${cents} céntimos.`);
    }
    return new Money(cents);
  }

  static fromDecimal(value: number, field = 'importe'): Money {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw AppError.validation(`El ${field} debe ser un número mayor o igual a 0.`, [
        { field, message: 'Debe ser un número >= 0' },
      ]);
    }
    const scaled = value * 100;
    const cents = Math.round(scaled);
    if (Math.abs(scaled - cents) > 1e-6) {
      throw AppError.validation(`El ${field} admite como máximo 2 decimales.`, [
        { field, message: 'Máximo 2 decimales' },
      ]);
    }
    return Money.fromCents(cents);
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  times(quantity: number): Money {
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw AppError.validation('La cantidad debe ser un entero positivo.');
    }
    return Money.fromCents(this.cents * quantity);
  }

  applyRate(basisPoints: number): Money {
    return Money.fromCents(Math.round((this.cents * basisPoints) / 10_000));
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  toDecimal(): number {
    return this.cents / 100;
  }

  static sum(values: readonly Money[]): Money {
    return values.reduce((acc, m) => acc.add(m), Money.ZERO);
  }
}
