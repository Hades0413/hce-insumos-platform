import { ErrorCode, IssuedTokens, RefreshRequest, TraceContext } from '@hce/contracts';
import { AppError, UseCase } from '@hce/core';
import { SessionEventsPublisher } from '../../../domain/events/session-events.port';
import { SecurityAudit } from '../../../domain/security/security-audit.port';
import { generarRefreshToken, hashRefreshToken, REFRESH_TOKEN_REGEX } from '../../../domain/sesion/refresh-token';
import { SesionRepository } from '../../../domain/sesion/sesion.repository.port';
import { InfoCliente } from '../../../domain/usuario/info-cliente';
import { SessionIssuer } from '../../session/session-issuer';

const sesionInvalida = () => new AppError(ErrorCode.UNAUTHENTICATED, 'La sesión expiró. Inicie sesión nuevamente.');

export class RefreshSessionUseCase implements UseCase<RefreshRequest, IssuedTokens, TraceContext> {
  constructor(
    private readonly sesiones: SesionRepository,
    private readonly sessions: SessionIssuer,
    private readonly events: SessionEventsPublisher,
    private readonly audit: SecurityAudit,
  ) {}

  async execute(input: RefreshRequest, _ctx?: TraceContext): Promise<IssuedTokens> {
    if (typeof input?.refreshToken !== 'string' || !REFRESH_TOKEN_REGEX.test(input.refreshToken))
      throw sesionInvalida();
    const cliente: InfoCliente = { ip: input.ip, userAgent: input.userAgent };
    const nuevo = generarRefreshToken();
    const resultado = await this.sesiones.rotar(
      hashRefreshToken(input.refreshToken),
      { id: nuevo.id, tokenHash: nuevo.hash, expiraEn: new Date(Date.now() + this.sessions.refreshTtl) },
      cliente,
    );

    switch (resultado.tipo) {
      case 'OK':
        return this.sessions.firmarRotacion(resultado.usuario, resultado.familiaId, nuevo.token, resultado.expiraEn);
      case 'REUTILIZADO':
        this.audit.alert('refresh_token.reuse_detected', { userId: resultado.idUsuario, ip: cliente.ip });
        this.revocar(resultado.familiaId);
        throw sesionInvalida();
      case 'EXPIRADO':
      case 'USUARIO_INACTIVO':
        this.revocar(resultado.familiaId);
        throw sesionInvalida();
      default:
        throw sesionInvalida();
    }
  }

  private revocar(familiaId: string | undefined): void {
    if (familiaId) this.events.sessionRevoked(familiaId, this.sessions.accessTtlSeconds);
  }
}
