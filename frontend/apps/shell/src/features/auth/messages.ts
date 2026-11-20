import { ApiError } from '@hce/api-client';

export function loginErrorMessage(error: unknown): string {
  const err = ApiError.from(error);
  if (err.status === 401) {
    return err.message && err.code === 'INVALID_CREDENTIALS'
      ? err.message
      : 'Email o contraseña incorrectos, o la cuenta está bloqueada temporalmente. Intenta nuevamente en unos minutos.';
  }
  if (err.status === 429)
    return `Demasiados intentos desde este equipo. Espera ${err.retryAfterSeconds ?? 60} segundos.`;
  if (err.transient) return 'No hay conexión con el servidor. Revisa la red y vuelve a intentarlo.';
  return err.message;
}
