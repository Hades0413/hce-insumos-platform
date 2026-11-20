import { AppError } from '@hce/core';
import { Permiso, esPermiso } from '@hce/contracts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_VIGENCIA_DIAS = 365;

export function validarUsuarioId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw AppError.validation('Identificador de usuario inválido.', [{ field: 'usuarioId', message: 'UUID' }]);
  }
  return value.toLowerCase();
}

export function validarPermiso(value: unknown): Permiso {
  if (!esPermiso(value)) throw AppError.validation('Permiso desconocido.', [{ field: 'permiso', message: 'Inválido' }]);
  return value;
}

export function validarMotivo(value: unknown): string {
  const motivo = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (motivo.length < 10 || motivo.length > 300) {
    throw AppError.validation('El motivo debe tener entre 10 y 300 caracteres.', [
      { field: 'motivo', message: '10 a 300 caracteres' },
    ]);
  }
  return motivo;
}

export function validarVigencia(value: unknown, now = Date.now()): string | null {
  if (value === undefined || value === null || value === '') return null;
  const d = typeof value === 'string' ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime()) || d.getTime() <= now || d.getTime() > now + MAX_VIGENCIA_DIAS * 86_400_000) {
    throw AppError.validation(`La vigencia debe ser una fecha futura (máximo ${MAX_VIGENCIA_DIAS} días).`, [
      { field: 'vigenteHasta', message: 'Fecha futura' },
    ]);
  }
  return d.toISOString();
}
