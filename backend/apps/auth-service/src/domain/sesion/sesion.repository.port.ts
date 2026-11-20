import { InfoCliente } from '../usuario/info-cliente';
import { Usuario } from '../usuario/usuario';

export const SESION_REPOSITORY = Symbol('SESION_REPOSITORY');

export type ResultadoRotacion =
  | { readonly tipo: 'OK'; readonly usuario: Usuario; readonly familiaId: string; readonly expiraEn: Date }
  | { readonly tipo: 'INVALIDO' }
  | {
      readonly tipo: 'EXPIRADO' | 'USUARIO_INACTIVO' | 'REUTILIZADO' | 'CONCURRENTE';
      readonly familiaId?: string;
      readonly idUsuario?: string;
    };

export interface NuevaSesion {
  readonly id: string;
  readonly idUsuario: string;
  readonly familiaId: string;
  readonly tokenHash: Buffer;
  readonly expiraEn: Date;
}

export interface SesionRepository {
  crear(sesion: NuevaSesion, cliente: InfoCliente): Promise<void>;
  rotar(
    tokenHashActual: Buffer,
    nueva: Omit<NuevaSesion, 'idUsuario' | 'familiaId'>,
    cliente: InfoCliente,
  ): Promise<ResultadoRotacion>;
  revocarPorToken(tokenHash: Buffer): Promise<string | null>;
  purgarExpiradas(): Promise<number>;
}
