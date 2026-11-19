import { AppError } from '@hce/common/errors/app-error';

export const CANTIDAD_MAXIMA_POR_LINEA = 100_000;

/** Regla: cantidades enteras positivas y acotadas (evita overflow y errores de digitación). */
export function validarCantidad(cantidad: unknown, field: string): number {
  if (
    typeof cantidad !== 'number' ||
    !Number.isInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > CANTIDAD_MAXIMA_POR_LINEA
  ) {
    throw AppError.validation(`La cantidad debe ser un entero entre 1 y ${CANTIDAD_MAXIMA_POR_LINEA}.`, [
      { field, message: `Entero entre 1 y ${CANTIDAD_MAXIMA_POR_LINEA}` },
    ]);
  }
  return cantidad;
}

export function validarId(id: unknown, field: string): number {
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw AppError.validation(`Identificador inválido.`, [{ field, message: 'Debe ser un entero positivo' }]);
  }
  return id;
}
