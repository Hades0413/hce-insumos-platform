import { GuardarExcepcionRequest, RequestContext, UsuarioPermisosDto } from '@hce/contracts';
import { AppError, UseCase } from '@hce/core';
import { SessionEventsPublisher } from '../../../domain/events/session-events.port';
import { PermisosRepository } from '../../../domain/permisos/permisos.repository.port';
import { SecurityAudit } from '../../../domain/security/security-audit.port';
import { validarMotivo, validarPermiso, validarUsuarioId, validarVigencia } from './validaciones';

export class GuardarExcepcionUseCase implements UseCase<GuardarExcepcionRequest, UsuarioPermisosDto> {
  constructor(
    private readonly repo: PermisosRepository,
    private readonly events: SessionEventsPublisher,
    private readonly audit: SecurityAudit,
  ) {}

  async execute(input: GuardarExcepcionRequest, ctx: RequestContext): Promise<UsuarioPermisosDto> {
    const usuarioId = validarUsuarioId(input?.usuarioId);
    const permiso = validarPermiso(input.permiso);
    if (input.tipo !== 'GRANT' && input.tipo !== 'DENY') {
      throw AppError.validation('Tipo inválido.', [{ field: 'tipo', message: 'GRANT o DENY' }]);
    }
    const motivo = validarMotivo(input.motivo);
    const vigenteHasta = validarVigencia(input.vigenteHasta);
    if (input.tipo === 'DENY' && usuarioId === ctx.userId && permiso === 'seguridad.administrar') {
      throw AppError.businessRule('No puede quitarse a sí mismo el permiso de administrar seguridad.');
    }

    const resultado = await this.repo.guardarExcepcion(
      { usuarioId, permiso, tipo: input.tipo, motivo, vigenteHasta },
      ctx.userId,
      ctx.requestId,
    );
    this.audit.info('permissions.exception_saved', { actor: ctx.userId, usuarioId, permiso, tipo: input.tipo });
    this.events.permissionsChanged(usuarioId);
    return resultado;
  }
}
