import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permiso } from '@hce/contracts';
import { PermissionsGuard } from './permissions.guard';

const ctxFor = (permisos?: Permiso[]) =>
  ({
    getType: () => 'http',
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: permisos ? { permisos } : undefined }) }),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
  const guard = new PermissionsGuard(reflector);

  it('sin permisos requeridos solo exige sesión (resuelto por JwtAuthGuard)', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(ctxFor(['ventas.ver']))).toBe(true);
  });

  it('autoriza por permiso efectivo, no por rol (excepción GRANT a un farmacéutico)', () => {
    reflector.getAllAndOverride.mockReturnValue(['compras.registrar']);
    expect(guard.canActivate(ctxFor(['ventas.registrar', 'compras.registrar']))).toBe(true);
    expect(() => guard.canActivate(ctxFor(['ventas.registrar']))).toThrow();
  });
});
