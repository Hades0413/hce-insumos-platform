import { Permiso, Rol, UserDto } from '@hce/contracts';

export interface Usuario {
  readonly id: string;
  readonly email: string;
  readonly nombreCompleto: string;
  readonly rol: Rol;
  readonly activo: boolean;
}

export interface UsuarioConCredenciales extends Usuario {
  readonly passwordHash: Buffer;
  readonly passwordSalt: Buffer;
  readonly hashVersion: number;
}

export function toUserDto(u: Usuario, permisos: Permiso[]): UserDto {
  return { id: u.id, email: u.email, nombreCompleto: u.nombreCompleto, rol: u.rol, permisos };
}

export const POLITICA_BLOQUEO = {
  MAX_INTENTOS: 5,
  MINUTOS_BLOQUEO: 15,
} as const;

export const MENSAJE_LOGIN_FALLIDO =
  'Email o contraseña incorrectos, o la cuenta está bloqueada temporalmente. Intente nuevamente en unos minutos.';
