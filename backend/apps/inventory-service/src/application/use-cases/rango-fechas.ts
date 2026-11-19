import { AppError } from '@hce/common';
import { RangoFechas } from '../../domain/compra/compra.repository.port';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validarFecha(value: string | undefined, field: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw AppError.validation('Fecha inválida (YYYY-MM-DD).', [{ field, message: 'Formato YYYY-MM-DD' }]);
  }
  return value;
}

export function validarRango(desde?: string, hasta?: string): RangoFechas {
  const d = validarFecha(desde, 'desde');
  const h = validarFecha(hasta, 'hasta');
  if (d && h && d > h) {
    throw AppError.validation('"desde" no puede ser posterior a "hasta".', [
      { field: 'desde', message: 'Rango inválido' },
    ]);
  }
  return { desde: d, hasta: h };
}
