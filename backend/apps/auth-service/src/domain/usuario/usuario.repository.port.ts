import { Permiso, Rol } from '@hce/contracts';
import { HashedPassword } from '../security/password-hasher.port';
import { InfoCliente } from './info-cliente';
import { Usuario, UsuarioConCredenciales } from './usuario';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

export interface UsuarioRepository {
  contar(): Promise<number>;
  crear(data: { email: string; nombreCompleto: string; password: HashedPassword; rol: Rol }): Promise<Usuario>;
  obtenerPorEmail(email: string): Promise<UsuarioConCredenciales | null>;
  reservarIntento(id: string, cliente: InfoCliente): Promise<boolean>;
  registrarLoginExitoso(id: string, cliente: InfoCliente): Promise<void>;
  registrarIntento(email: string, motivo: string, cliente: InfoCliente, idUsuario?: string): Promise<void>;
  actualizarHash(id: string, password: HashedPassword): Promise<void>;
  permisosEfectivos(id: string): Promise<Permiso[]>;
}
