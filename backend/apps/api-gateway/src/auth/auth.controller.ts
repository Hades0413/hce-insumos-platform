import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AppError } from '@hce/common';
import { ClientInfo, ErrorCode, IssuedTokens, SessionDto } from '@hce/contracts';
import type { Response } from 'express';
import { ApiProblemResponses } from '../common/decorators/api-problem.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Auth } from '../common/decorators/roles.decorator';
import { AuthCookiesService } from '../common/security/auth-cookies.service';
import { AuthenticatedUser, GatewayRequest } from '../common/security/authenticated-user';
import { COOKIE_NAMES } from '../common/security/cookies';
import { CsrfTokenService } from '../common/security/csrf-token.service';
import { LOGIN_THROTTLE, REFRESH_THROTTLE } from '../config/gateway.config';
import { AuthFacade } from './auth.facade';
import { CsrfResponse, LoginDto, SessionResponse } from './auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthFacade,
    private readonly cookies: AuthCookiesService,
    private readonly csrf: CsrfTokenService,
  ) {}

  @Public()
  @Get('csrf')
  @ApiOperation({ summary: 'Obtiene el token CSRF (enviar luego en X-CSRF-Token)' })
  @ApiOkResponse({ type: CsrfResponse })
  getCsrf(@Req() req: GatewayRequest, @Res({ passthrough: true }) res: Response): CsrfResponse {
    const current = (req.cookies as Record<string, unknown> | undefined)?.[COOKIE_NAMES.CSRF];
    const token = this.csrf.isValid(current) ? current : this.csrf.generate();
    this.cookies.setCsrf(res, token);
    res.setHeader('Cache-Control', 'no-store');
    return { csrfToken: token };
  }

  @Public()
  @Throttle({ default: LOGIN_THROTTLE })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia sesión: emite cookies HttpOnly (access 30 min + refresh)' })
  @ApiOkResponse({ type: SessionResponse })
  @ApiProblemResponses(400, 429)
  async login(
    @Body() dto: LoginDto,
    @Req() req: GatewayRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionDto> {
    const tokens = await this.auth.login(dto.email, dto.password, clientInfo(req));
    return this.startSession(res, tokens);
  }

  @Public()
  @Throttle({ default: REFRESH_THROTTLE })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rota el refresh token y emite un nuevo access token' })
  @ApiOkResponse({ type: SessionResponse })
  async refresh(@Req() req: GatewayRequest, @Res({ passthrough: true }) res: Response): Promise<SessionDto> {
    const refreshToken = readRefreshCookie(req);
    if (!refreshToken) throw new AppError(ErrorCode.UNAUTHENTICATED, 'Sesión no iniciada.');
    try {
      return this.startSession(res, await this.auth.refresh(refreshToken, clientInfo(req)));
    } catch (error: unknown) {
      if (error instanceof AppError && error.code === ErrorCode.UNAUTHENTICATED) this.cookies.clearSession(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cierra sesión: revoca la familia de refresh tokens y limpia cookies' })
  @ApiNoContentResponse()
  async logout(@Req() req: GatewayRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = readRefreshCookie(req);
    this.cookies.clearSession(res);
    if (refreshToken) await this.auth.logout(refreshToken);
  }

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Usuario de la sesión actual (resuelto localmente desde el JWT)' })
  @ApiOkResponse({ type: SessionResponse })
  me(@CurrentUser() user: AuthenticatedUser): SessionDto {
    return {
      user: { id: user.id, email: user.email, nombreCompleto: user.nombreCompleto, rol: user.rol },
      accessTokenExpiresAt: new Date(user.exp * 1000).toISOString(),
    };
  }

  private startSession(res: Response, tokens: IssuedTokens): SessionDto {
    this.cookies.setSession(res, tokens);
    res.setHeader('Cache-Control', 'no-store');
    return { user: tokens.user, accessTokenExpiresAt: tokens.accessTokenExpiresAt };
  }
}

function readRefreshCookie(req: GatewayRequest): string | undefined {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[COOKIE_NAMES.REFRESH];
  return typeof value === 'string' && value.length > 0 && value.length < 200 ? value : undefined;
}

function clientInfo(req: GatewayRequest): ClientInfo {
  return { ip: req.ip?.replace(/^::ffff:/, ''), userAgent: req.header('user-agent')?.slice(0, 256) };
}
