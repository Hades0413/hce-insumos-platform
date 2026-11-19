import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiCookieAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Rol } from '@hce/contracts';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorador compuesto (patrón Decorator vía applyDecorators): en una sola
 * anotación declara autorización por rol + su documentación OpenAPI.
 */
export function Auth(...roles: Rol[]) {
  return applyDecorators(
    ...(roles.length ? [Roles(...roles)] : []),
    ApiCookieAuth('hce_at'),
    ApiUnauthorizedResponse({ description: 'Sin sesión o token vencido (UNAUTHENTICATED)' }),
    ApiForbiddenResponse({ description: 'Rol sin permiso (FORBIDDEN) o CSRF inválido (CSRF_INVALID)' }),
  );
}
