import {
  EliminarExcepcionRequest,
  GuardarExcepcionRequest,
  Paginated,
  PermisoCatalogoDto,
  RolDto,
  SearchQuery,
  UsuarioAdminDto,
  UsuarioPermisosDto,
} from '@hce/contracts';

export const PERMISOS_REPOSITORY = Symbol('PERMISOS_REPOSITORY');

export interface PermisosRepository {
  catalogo(): Promise<PermisoCatalogoDto[]>;
  roles(): Promise<RolDto[]>;
  usuarios(query: SearchQuery): Promise<Paginated<UsuarioAdminDto>>;
  permisosDeUsuario(usuarioId: string): Promise<UsuarioPermisosDto | null>;
  guardarExcepcion(req: GuardarExcepcionRequest, actorId: string, requestId: string): Promise<UsuarioPermisosDto>;
  eliminarExcepcion(req: EliminarExcepcionRequest, actorId: string, requestId: string): Promise<UsuarioPermisosDto>;
}
