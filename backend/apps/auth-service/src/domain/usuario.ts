import { Rol, UserDto } from '@hce/contracts';

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
  readonly bloqueadoHasta: Date | null;
}

export function toUserDto(u: Usuario): UserDto {
  return { id: u.id, email: u.email, nombreCompleto: u.nombreCompleto, rol: u.rol };
}

export const POLITICA_BLOQUEO = {
  MAX_INTENTOS: 5,
  MINUTOS_BLOQUEO: 15,
} as const;
