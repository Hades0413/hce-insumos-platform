import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AUTH_PATTERNS,
  EliminarExcepcionRequest,
  GuardarExcepcionRequest,
  MessageEnvelope,
  Paginated,
  PermisoCatalogoDto,
  RolDto,
  SearchQuery,
  UsuarioAdminDto,
  UsuarioIdRequest,
  UsuarioPermisosDto,
} from '@hce/contracts';
import { UseCase } from '@hce/core';
import { USE_CASES } from '../../application/ports/tokens';

@Controller()
export class AdminNatsController {
  constructor(
    @Inject(USE_CASES.LISTAR_PERMISOS) private readonly permisos: UseCase<unknown, PermisoCatalogoDto[]>,
    @Inject(USE_CASES.LISTAR_ROLES) private readonly roles: UseCase<unknown, RolDto[]>,
    @Inject(USE_CASES.LISTAR_USUARIOS) private readonly usuarios: UseCase<SearchQuery, Paginated<UsuarioAdminDto>>,
    @Inject(USE_CASES.OBTENER_PERMISOS_USUARIO)
    private readonly usuarioPermisos: UseCase<UsuarioIdRequest, UsuarioPermisosDto>,
    @Inject(USE_CASES.GUARDAR_EXCEPCION) private readonly guardar: UseCase<GuardarExcepcionRequest, UsuarioPermisosDto>,
    @Inject(USE_CASES.ELIMINAR_EXCEPCION)
    private readonly eliminar: UseCase<EliminarExcepcionRequest, UsuarioPermisosDto>,
  ) {}

  @MessagePattern(AUTH_PATTERNS.ADMIN_PERMISOS)
  onPermisos(@Payload() msg: MessageEnvelope<unknown>): Promise<PermisoCatalogoDto[]> {
    return this.permisos.execute(msg.data, msg.ctx);
  }

  @MessagePattern(AUTH_PATTERNS.ADMIN_ROLES)
  onRoles(@Payload() msg: MessageEnvelope<unknown>): Promise<RolDto[]> {
    return this.roles.execute(msg.data, msg.ctx);
  }

  @MessagePattern(AUTH_PATTERNS.ADMIN_USUARIOS)
  onUsuarios(@Payload() msg: MessageEnvelope<SearchQuery>): Promise<Paginated<UsuarioAdminDto>> {
    return this.usuarios.execute(msg.data, msg.ctx);
  }

  @MessagePattern(AUTH_PATTERNS.ADMIN_USUARIO_PERMISOS)
  onUsuarioPermisos(@Payload() msg: MessageEnvelope<UsuarioIdRequest>): Promise<UsuarioPermisosDto> {
    return this.usuarioPermisos.execute(msg.data, msg.ctx);
  }

  @MessagePattern(AUTH_PATTERNS.ADMIN_EXCEPCION_GUARDAR)
  onGuardar(@Payload() msg: MessageEnvelope<GuardarExcepcionRequest>): Promise<UsuarioPermisosDto> {
    return this.guardar.execute(msg.data, msg.ctx);
  }

  @MessagePattern(AUTH_PATTERNS.ADMIN_EXCEPCION_ELIMINAR)
  onEliminar(@Payload() msg: MessageEnvelope<EliminarExcepcionRequest>): Promise<UsuarioPermisosDto> {
    return this.eliminar.execute(msg.data, msg.ctx);
  }
}
