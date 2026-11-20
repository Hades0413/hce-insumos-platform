import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiCookieAuth, ApiExtension, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Permiso } from '@hce/contracts';

export const PERMISOS_KEY = 'permisos';

export function Auth(...permisos: Permiso[]) {
  return applyDecorators(
    SetMetadata(PERMISOS_KEY, permisos),
    ApiCookieAuth('hce_at'),
    ...(permisos.length ? [ApiExtension('x-permisos', permisos)] : []),
    ApiUnauthorizedResponse({ description: 'Sin sesión, token vencido o PERMISSIONS_CHANGED (refrescar)' }),
    ApiForbiddenResponse({ description: `Requiere: ${permisos.join(', ') || 'sesión'} (FORBIDDEN) o CSRF inválido` }),
  );
}
