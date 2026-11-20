import {
  Paginated,
  PermisoCatalogoDto,
  RequestContext,
  RolDto,
  SearchQuery,
  UsuarioAdminDto,
  UsuarioIdRequest,
  UsuarioPermisosDto,
} from '@hce/contracts';
import { AppError, UseCase } from '@hce/core';
import { PermisosRepository } from '../../../domain/permisos/permisos.repository.port';
import { validarUsuarioId } from './validaciones';

export class ListarPermisosUseCase implements UseCase<unknown, PermisoCatalogoDto[]> {
  constructor(private readonly repo: PermisosRepository) {}
  execute(): Promise<PermisoCatalogoDto[]> {
    return this.repo.catalogo();
  }
}

export class ListarRolesUseCase implements UseCase<unknown, RolDto[]> {
  constructor(private readonly repo: PermisosRepository) {}
  execute(): Promise<RolDto[]> {
    return this.repo.roles();
  }
}

export class ListarUsuariosUseCase implements UseCase<SearchQuery, Paginated<UsuarioAdminDto>> {
  constructor(private readonly repo: PermisosRepository) {}
  execute(query: SearchQuery): Promise<Paginated<UsuarioAdminDto>> {
    return this.repo.usuarios(query ?? {});
  }
}

export class ObtenerPermisosUsuarioUseCase implements UseCase<UsuarioIdRequest, UsuarioPermisosDto> {
  constructor(private readonly repo: PermisosRepository) {}
  async execute(input: UsuarioIdRequest, _ctx: RequestContext): Promise<UsuarioPermisosDto> {
    const r = await this.repo.permisosDeUsuario(validarUsuarioId(input?.usuarioId));
    if (!r) throw AppError.notFound('El usuario no existe.');
    return r;
  }
}
