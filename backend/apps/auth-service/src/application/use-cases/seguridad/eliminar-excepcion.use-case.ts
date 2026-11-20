import { EliminarExcepcionRequest, RequestContext, UsuarioPermisosDto } from '@hce/contracts';
import { UseCase } from '@hce/core';
import { SessionEventsPublisher } from '../../../domain/events/session-events.port';
import { PermisosRepository } from '../../../domain/permisos/permisos.repository.port';
import { SecurityAudit } from '../../../domain/security/security-audit.port';
import { validarPermiso, validarUsuarioId } from './validaciones';

export class EliminarExcepcionUseCase implements UseCase<EliminarExcepcionRequest, UsuarioPermisosDto> {
  constructor(
    private readonly repo: PermisosRepository,
    private readonly events: SessionEventsPublisher,
    private readonly audit: SecurityAudit,
  ) {}

  async execute(input: EliminarExcepcionRequest, ctx: RequestContext): Promise<UsuarioPermisosDto> {
    const usuarioId = validarUsuarioId(input?.usuarioId);
    const permiso = validarPermiso(input.permiso);
    const resultado = await this.repo.eliminarExcepcion({ usuarioId, permiso }, ctx.userId, ctx.requestId);
    this.audit.info('permissions.exception_removed', { actor: ctx.userId, usuarioId, permiso });
    this.events.permissionsChanged(usuarioId);
    return resultado;
  }
}
